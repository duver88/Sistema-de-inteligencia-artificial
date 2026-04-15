import OpenAI from 'openai';
import { PROMPTS } from './prompts';

export type Classification = 'DELETE' | 'HIDE' | 'REPLY' | 'IGNORE';

const VALID_CLASSIFICATIONS = new Set<Classification>(['DELETE', 'HIDE', 'REPLY', 'IGNORE']);

/**
 * Classify a social media comment into one of four moderation actions.
 *
 * Requires a per-tenant OpenAI API key — throws "OpenAI API key not configured"
 * if the tenant has none, so the pipeline can log it as IGNORED.
 *
 * Fail-open strategy: on any *other* error, returns 'REPLY' so comments are
 * never accidentally deleted due to a transient AI service failure.
 */
export async function classifyComment(
  commentText: string,
  openaiApiKey: string
): Promise<Classification> {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 10,
      temperature: 0, // Deterministic — single word output
      messages: [
        { role: 'system', content: PROMPTS.classifier.system },
        { role: 'user', content: `Comment: "${commentText}"` },
      ],
    });

    const text = (response.choices[0]?.message?.content ?? '').trim().toUpperCase();

    if (VALID_CLASSIFICATIONS.has(text as Classification)) {
      return text as Classification;
    }

    return 'IGNORE';
  } catch (err) {
    console.error('[Classifier] AI call failed, defaulting to REPLY (fail-open):', err);
    return 'REPLY'; // Fail open — safer than accidentally deleting real comments
  }
}
