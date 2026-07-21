import { prisma } from '@/lib/prisma';

/** Token counts consumed by a single OpenAI call. */
export interface AiUsageTokens {
  promptTokens: number;
  completionTokens: number;
}

/** Usage info returned by classifier/responder so the pipeline can record it. */
export interface AiCallUsage extends AiUsageTokens {
  model: string;
}

/**
 * Record aggregated AI usage for a tenant: one row per (tenant, UTC day, model),
 * incremented atomically on every call.
 *
 * NEVER throws — usage accounting must never break the moderation pipeline,
 * so any failure is logged and swallowed.
 */
export async function recordAiUsage(
  tenantId: string,
  model: string,
  tokens: AiUsageTokens
): Promise<void> {
  try {
    const now = new Date();
    // Current date truncated to UTC midnight
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    await prisma.aiUsage.upsert({
      where: { tenantId_day_model: { tenantId, day, model } },
      create: {
        tenantId,
        day,
        model,
        calls: 1,
        promptTokens: tokens.promptTokens,
        completionTokens: tokens.completionTokens,
      },
      update: {
        calls: { increment: 1 },
        promptTokens: { increment: tokens.promptTokens },
        completionTokens: { increment: tokens.completionTokens },
      },
    });
  } catch (err) {
    console.error('[AiUsage] Failed to record AI usage:', err);
  }
}
