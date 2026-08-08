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
  // expired or downgraded token must not block the disconnection.
  //
  // Only Facebook Pages are unsubscribed: an Instagram account has no
  // subscription of its own in the Facebook Login flow (its events flow through
  // the linked Page), so unsubscribing the Page below covers it too.
  if (account.webhookSubscribed && account.platform === 'FACEBOOK') {
    try {
      const token = decrypt(account.pageToken);
      await metaClient.unsubscribePageFromWebhooks(account.pageId, token);
    } catch (err) {
      console.error(
        `[accounts] Failed to unsubscribe page ${account.pageId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Disconnecting a Facebook Page also disconnects the Instagram account linked
  // to it: they are a single Meta connection (same page token, one shared bot),
  // so leaving Instagram behind would show it as connected while its bot is off
  // and no event can reach it.
  const linkedIgIds =
    account.platform === 'FACEBOOK'
      ? (
          await prisma.socialAccount.findMany({
            where: { linkedFacebookPageId: accountId },
            select: { id: true },
          })
        ).map((a) => a.id)
      : [];

  // Deactivate the account and ALL of its bots — including any orphaned bots
  // left under a previous tenant, so they can never be picked up again by the
  // webhook if the page is later reconnected. Ownership of the account itself
  // was already verified against ctx.tenantId above.
  await prisma.$transaction([
    prisma.socialAccount.updateMany({
      where: { id: { in: [accountId, ...linkedIgIds] } },
      data: { isActive: false, webhookSubscribed: false },
    }),
    prisma.bot.updateMany({
      where: { accountId: { in: [accountId, ...linkedIgIds] } },
      data: { isActive: false },
    }),
  ]);

  return NextResponse.json({ success: true });
}
