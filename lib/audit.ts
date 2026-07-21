import { prisma } from '@/lib/prisma';

/**
 * Audit action constants. Every privileged admin mutation records exactly one
 * of these as the `action` string. Keep this the single source of truth so
 * callers cannot drift into typo'd action names.
 */
export const AUDIT_ACTIONS = {
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_SUSPEND: 'user.suspend',
  USER_REACTIVATE: 'user.reactivate',
  USER_DELETE: 'user.delete',
  USER_RESET_PASSWORD: 'user.reset_password',
  OPENAI_SET: 'openai.set',
  OPENAI_DELETE: 'openai.delete',
  PLAN_UPDATE: 'plan.update',
  ACCOUNT_DISCONNECT: 'account.disconnect',
  BOT_TOGGLE: 'bot.toggle',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface RecordAuditInput {
  actorId: string;
  actorEmail: string;
  action: AuditAction | string;
  targetType?: string;
  targetId?: string;
  /**
   * Arbitrary structured context. MUST NEVER contain secrets — no API keys,
   * access tokens or password hashes. Only non-sensitive descriptors
   * (old/new plan, page name, toggled state, ...).
   */
  metadata?: Record<string, unknown>;
}

/**
 * Insert a single audit-log row. This helper is best-effort: it ALWAYS
 * swallows its own errors (logging them) and never throws, so an audit
 * failure can never break the calling business flow.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorEmail: input.actorEmail,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata:
          input.metadata === undefined
            ? undefined
            : (input.metadata as object),
      },
    });
  } catch (error) {
    console.error('[audit] failed to record audit log', error);
  }
}
