import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { metaClient } from '@/lib/meta/client';

// DELETE — Disconnect (deactivate) an account
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { accountId } = await params;

  const account = await prisma.socialAccount.findFirst({
    where: { id: accountId, tenantId: ctx.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  // Stop webhook delivery at Meta before deactivating locally — otherwise Meta
  // keeps sending events for a page the user has disconnected. Best effort: an
  // expired or downgraded token must not block the disconnection. Instagram
  // subscriptions live on the IG user, so they need their own endpoint.
  if (account.webhookSubscribed) {
    try {
      const token = decrypt(account.pageToken);
      if (account.platform === 'INSTAGRAM') {
        await metaClient.unsubscribeInstagramFromWebhooks(account.pageId, token);
      } else {
        await metaClient.unsubscribePageFromWebhooks(account.pageId, token);
      }
    } catch (err) {
      console.error(
        `[accounts] Failed to unsubscribe ${account.platform} ${account.pageId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Deactivate the account and ALL of its bots — including any orphaned bots
  // left under a previous tenant, so they can never be picked up again by the
  // webhook if the page is later reconnected. Ownership of the account itself
  // was already verified against ctx.tenantId above.
  await prisma.$transaction([
    prisma.socialAccount.update({
      where: { id: accountId },
      data: { isActive: false, webhookSubscribed: false },
    }),
    prisma.bot.updateMany({
      where: { accountId },
      data: { isActive: false },
    }),
  ]);

  return NextResponse.json({ success: true });
}
