import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
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
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 });

  // Require OpenAI key
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { openaiApiKey: true },
  });
  if (!tenant?.openaiApiKey) {
    return NextResponse.json(
      { error: 'Configura tu clave API de OpenAI antes de importar documentos' },
      { status: 400 }
    );
  }
  const apiKey = decrypt(tenant.openaiApiKey);

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Error al leer el archivo' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'El archivo excede el límite de 10MB' }, { status: 400 });
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
    } else if (
      filename.endsWith('.xlsx') ||
      filename.endsWith('.xls') ||
      filename.endsWith('.csv')
    ) {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheets: string[] = [];
      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        if (sheet) sheets.push(XLSX.utils.sheet_to_csv(sheet));
      }
      text = sheets.join('\n\n');
    } else {
      return NextResponse.json(
        { error: 'Formato no soportado. Usa PDF, TXT, DOCX, XLSX o CSV.' },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error('[import] text extraction error:', err);
    return NextResponse.json({ error: 'Error al extraer el texto del archivo' }, { status: 500 });
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: 'No se pudo extraer texto del documento. Asegúrate de que no sea una imagen escaneada.' },
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

    const raw = completion.choices[0]?.message?.content ?? '{"entries":[]}';

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'La IA devolvió una respuesta inválida' }, { status: 500 });
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

    return NextResponse.json({ entries: sanitized });
  } catch (err) {
    console.error('[import] OpenAI error:', err);
    return NextResponse.json({ error: 'Error al procesar el documento con IA' }, { status: 500 });
  }
}
