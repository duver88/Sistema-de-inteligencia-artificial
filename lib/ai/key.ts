import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

/** AppSetting key under which the platform-wide OpenAI API key is stored (encrypted). */
export const OPENAI_KEY_SETTING = 'openai_api_key';

/**
 * Resolve the OpenAI API key to use for AI calls.
 *
 * Resolution order:
 *  1. Platform-wide key from AppSetting (key = 'openai_api_key'), decrypted.
 *  2. Legacy fallback: the tenant's own encrypted key, decrypted.
 *  3. null when neither is configured.
 *
 * SECURITY: the decrypted key must NEVER be logged.
 */
export async function getOpenAiApiKey(
  tenantOpenaiKeyEncrypted: string | null
): Promise<string | null> {
  // 1) Platform-wide key
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: OPENAI_KEY_SETTING },
    });
    if (setting?.value) {
      return decrypt(setting.value);
    }
  } catch (err) {
    console.error('[AiKey] Failed to load/decrypt platform OpenAI key:', err);
  }

  // 2) Legacy per-tenant key
  if (tenantOpenaiKeyEncrypted) {
    try {
      return decrypt(tenantOpenaiKeyEncrypted);
    } catch (err) {
      console.error('[AiKey] Failed to decrypt tenant OpenAI key:', err);
    }
  }

  // 3) No key available
  return null;
}
