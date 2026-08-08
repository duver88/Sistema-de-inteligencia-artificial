import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { metaClient } from '@/lib/meta/client';

// POST /api/accounts/disconnect-all — disconnect every connected page for the
// current tenant in one action. Best-effort unsubscribes each page from Meta
// webhooks (so events actually stop), then deactivates all pages and their
// bots. Reversible: reconnecting a page re-subscribes it. Config and history
// are preserved.
export async function POST() {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const accounts = await prisma.socialAccount.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    select: { id: true, pageId: true, pageToken: true, webhookSubscribed: true, platform: true },
  });

  if (accounts.length === 0) {
    return NextResponse.json({ disconnected: 0 });
  }

  // Stop webhook delivery at Meta for each page. A failure (e.g. an expired
  // token) is non-fatal — we still deactivate locally.
  await Promise.all(
    accounts.map(async (account) => {
      if (!account.webhookSubscribed) return;
      try {
        const token = decrypt(account.pageToken);
        // Instagram subscriptions live on the IG user, not the linked Page.
        if (account.platform === 'INSTAGRAM') {
          await metaClient.unsubscribeInstagramFromWebhooks(account.pageId, token);
        } else {
          await metaClient.unsubscribePageFromWebhooks(account.pageId, token);
        }
      } catch (err) {
        console.error(
          `[disconnect-all] Failed to unsubscribe ${account.platform} ${account.pageId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }),
  );

  await prisma.$transaction([
    prisma.socialAccount.updateMany({
      where: { tenantId: ctx.tenantId },
      data: { isActive: false, webhookSubscribed: false },
    }),
    prisma.bot.updateMany({
      where: { tenantId: ctx.tenantId },
      data: { isActive: false },
    }),
  ]);

  return NextResponse.json({ disconnected: accounts.length });
}
