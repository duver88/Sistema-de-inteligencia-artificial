import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { getOpenAiApiKey } from '@/lib/ai/key';
import { recordAiUsage } from '@/lib/ai/usage';
import { isKnowledgeExportHeader, parseCsv, rowsToKnowledge } from '@/lib/knowledge/csv';
import OpenAI from 'openai';

type Params = { params: Promise<{ botId: string }> };

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 15000; // chars sent to OpenAI

export async function POST(request: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { botId } = await params;

  // Verify bot belongs to tenant
  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId: ctx.tenantId },
  });
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Failed to read the file' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 });

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds the 10MB limit' }, { status: 400 });
  }

  const filename = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  let text = '';

  try {
    if (filename.endsWith('.pdf')) {
      // pdf-parse v1 is a plain CJS function — use createRequire to load it
      // without triggering its test-file side effect at module evaluation time
      const { createRequire } = await import('module');
      const req = createRequire(import.meta.url);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const pdfParse = req('pdf-parse') as (
        data: Buffer
      ) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (filename.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else if (filename.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (filename.endsWith('.csv')) {
      const raw = buffer.toString('utf-8');
      // Round-trip path: a file produced by the Export button is parsed
      // deterministically and handed back verbatim. No AI is involved — it is
      // lossy, costs tokens and would reword the entries — and no OpenAI key is
      // required, so restoring a backup works even when AI is not configured.
      const rows = parseCsv(raw);
      if (isKnowledgeExportHeader(rows[0])) {
        return NextResponse.json({ entries: rowsToKnowledge(rows), source: 'export' });
      }
      text = raw;
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Same round-trip path when someone opens the export in Excel and saves
      // it as a spreadsheet. `raw: false` keeps the cells as formatted strings.
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (firstSheet) {
        const grid = XLSX.utils.sheet_to_json<string[]>(firstSheet, {
          header: 1,
          raw: false,
          defval: '',
        });
        const header = grid[0]?.map(c => String(c ?? ''));
        if (isKnowledgeExportHeader(header)) {
          const rows = grid.map(r => r.map(c => String(c ?? '')));
          return NextResponse.json({ entries: rowsToKnowledge(rows), source: 'export' });
        }
      }

      const sheets: string[] = [];
      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        if (sheet) sheets.push(XLSX.utils.sheet_to_csv(sheet));
      }
      text = sheets.join('\n\n');
    } else {
      return NextResponse.json(
        { error: 'Unsupported format. Use PDF, TXT, DOCX, XLSX or CSV.' },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error('[import] text extraction error:', err);
    return NextResponse.json({ error: 'Failed to extract text from the file' }, { status: 500 });
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: 'Could not extract text from the document. Make sure it is not a scanned image.' },
      { status: 400 }
    );
  }

  // From here on the document is arbitrary content, so the AI extracts the
  // knowledge pairs. Only this path needs an OpenAI key.
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { openaiApiKey: true },
  });
  const apiKey = await getOpenAiApiKey(tenant?.openaiApiKey ?? null);
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI service is not configured — contact your administrator' },
      { status: 400 }
    );
  }

  // Truncate to avoid exceeding token limits
  const truncated = text.slice(0, MAX_TEXT_LENGTH);

  // Extract knowledge pairs with OpenAI
  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente experto en extraer información estructurada de documentos. Siempre respondes SOLO con JSON válido, sin texto adicional, sin bloques de código markdown.',
        },
        {
          role: 'user',
          content: `Analiza este documento y extrae todos los datos importantes en formato de pares clave-valor. Responde SOLO con un JSON array con objetos {"key": string, "value": string, "category": string} donde category es uno de: pricing, location, contact, features, general.\n\nDocumento:\n${truncated}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    await recordAiUsage(ctx.tenantId, completion.model, {
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
    });

    const raw = completion.choices[0]?.message?.content ?? '{"entries":[]}';

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'The AI returned an invalid response' }, { status: 500 });
    }

    // Handle both {"entries": [...]} and direct array responses
    let entries: Array<{ key: string; value: string; category: string }>;
    if (Array.isArray(parsed)) {
      entries = parsed as typeof entries;
    } else if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'entries' in parsed &&
      Array.isArray((parsed as Record<string, unknown>).entries)
    ) {
      entries = (parsed as { entries: typeof entries }).entries;
    } else {
      // Try to find any array value in the response object
      const values = Object.values(parsed as object);
      const arr = values.find(v => Array.isArray(v));
      entries = (arr as typeof entries) ?? [];
    }

    // Sanitize entries
    const sanitized = entries
      .filter(
        (e) =>
          e &&
          typeof e.key === 'string' &&
          typeof e.value === 'string' &&
          e.key.trim() &&
          e.value.trim()
      )
      .map((e) => ({
        key: e.key.trim(),
        value: e.value.trim(),
        category: typeof e.category === 'string' ? e.category.trim() : 'general',
      }));

    return NextResponse.json({ entries: sanitized, source: 'ai' });
  } catch (err) {
    console.error('[import] OpenAI error:', err);
    return NextResponse.json({ error: 'Failed to process the document with AI' }, { status: 500 });
  }
}
