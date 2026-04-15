import OpenAI from 'openai';
import type { Platform } from '@/lib/generated/prisma/client';

export interface KnowledgeEntry {
  key: string;
  value: string;
  category: string | null;
}

export interface ReplyGeneratorParams {
  commentText: string;
  authorName: string;           // username (Instagram) or full name (Facebook)
  postCaption: string;
  projectName: string;
  knowledgeEntries: KnowledgeEntry[];
  systemInstructions: string;
  maxChars: number;
  tone: string;                 // friendly | formal | casual
  language: string;             // es | en | pt
  platform: Platform;
  openaiApiKey: string;
}

const TONE_MAP: Record<string, string> = {
  friendly: 'amable, cálido y cercano',
  formal: 'profesional y formal',
  casual: 'casual y conversacional',
};

const LANGUAGE_MAP: Record<string, string> = {
  es: 'español',
  en: 'English',
  pt: 'português',
};

function formatKnowledgeBase(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return 'No hay datos específicos disponibles.';
  return entries.map(e => `${e.key}: ${e.value}`).join('\n');
}

function buildSystemPrompt(params: ReplyGeneratorParams, knowledgeBase: string): string {
  const platformLabel = params.platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook';
  const authorMention =
    params.platform === 'INSTAGRAM' ? `@${params.authorName}` : params.authorName;
  const toneInstruction = TONE_MAP[params.tone] ?? TONE_MAP.friendly;
  const languageLabel = LANGUAGE_MAP[params.language] ?? LANGUAGE_MAP.es;

  return `Eres el asistente virtual de atención al cliente en ${platformLabel}.

PUBLICACIÓN A LA QUE COMENTARON:
"${params.postCaption.substring(0, 500)}"

PROYECTO: ${params.projectName}

DATOS EXACTOS DEL PROYECTO (usa ÚNICAMENTE estos datos — jamás inventes):
${knowledgeBase}

INSTRUCCIONES ADICIONALES:
${params.systemInstructions || 'Ninguna.'}

REGLAS OBLIGATORIAS:
- Máximo ${params.maxChars} caracteres. Respeta este límite sin excepciones.
- Tono: ${toneInstruction}
- Idioma: ${languageLabel}
- Usa 1-2 emojis relevantes y profesionales (no uses emojis infantiles)
- Menciona al usuario: ${authorMention}
- Si el dato solicitado NO está en la sección "DATOS EXACTOS", invita a contactar por WhatsApp o DM. Usa el número de WhatsApp de los datos si está disponible.
- NUNCA inventes precios, áreas, fechas, teléfonos, ni ningún otro dato
- No uses hashtags
- No uses comillas al inicio o final de tu respuesta`;
}

function buildFallbackReply(params: ReplyGeneratorParams): string {
  const authorMention =
    params.platform === 'INSTAGRAM' ? `@${params.authorName}` : params.authorName;
  return `Hola ${authorMention}, gracias por tu comentario. Para más información escríbenos por DM y con gusto te atendemos. 😊`;
}

/**
 * Generate a contextual AI reply for a comment using the knowledge base.
 * Fails gracefully with a generic fallback message on any error.
 */
export async function generateReply(params: ReplyGeneratorParams): Promise<string> {
  const openai = new OpenAI({ apiKey: params.openaiApiKey });
  const knowledgeBase = formatKnowledgeBase(params.knowledgeEntries);
  const systemPrompt = buildSystemPrompt(params, knowledgeBase);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Comentario de ${params.authorName}: "${params.commentText}"\n\nResponde de manera útil y precisa usando los datos del proyecto. Respeta el límite de ${params.maxChars} caracteres.`,
        },
      ],
    });

    let reply = (response.choices[0]?.message?.content ?? '').trim();

    // Cleanup: remove wrapping quotes, hashtags, excess whitespace, enforce length
    reply = reply
      .replace(/^["']|["']$/g, '')
      .replace(/#\w+/g, '')
      .trim()
      .substring(0, params.maxChars);

    return reply || buildFallbackReply(params);
  } catch (err) {
    console.error('[Responder] AI call failed, using fallback reply:', err);
    return buildFallbackReply(params);
  }
}
