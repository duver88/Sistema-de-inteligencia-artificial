import OpenAI from 'openai';

export type Classification = 'DELETE' | 'HIDE' | 'REPLY' | 'IGNORE';

const VALID_CLASSIFICATIONS = new Set<Classification>(['DELETE', 'HIDE', 'REPLY', 'IGNORE']);

interface ClassifierConfig {
  /** Additional natural-language instructions for DELETE decisions */
  deleteInstructions?: string | null;
  /** Additional natural-language instructions for HIDE decisions */
  spamInstructions?: string | null;
}

function buildSystemPrompt(config?: ClassifierConfig): string {
  const deleteExtra = config?.deleteInstructions?.trim()
    ? ` Additional custom criteria: ${config.deleteInstructions.trim()}`
    : '';
  const hideExtra = config?.spamInstructions?.trim()
    ? ` Additional custom criteria: ${config.spamInstructions.trim()}`
    : '';

  return `You are a social media comment moderation system for a real estate company.

Classify the comment into exactly one of these actions:

DELETE — The comment is: offensive, threatening, uses insults, profanity, extreme negativity, false fraud accusations, or content that could seriously damage the brand.${deleteExtra}
HIDE — The comment is: spam, unsolicited advertising, crypto/gambling links, follow-for-follow requests, or irrelevant commercial content.${hideExtra}
REPLY — The comment is: a genuine question about a property, price inquiry, location question, positive reaction, or neutral interaction that deserves a response.
IGNORE — The comment is: ambiguous, a single emoji, a very short generic reaction ("ok", "nice", "!"), or something that clearly needs no action.

Respond with ONLY the single action word. No explanation. No punctuation. Just the word.`;
}

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
  openaiApiKey: string,
  config?: ClassifierConfig
): Promise<Classification> {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 10,
      temperature: 0, // Deterministic — single word output
      messages: [
        { role: 'system', content: buildSystemPrompt(config) },
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
