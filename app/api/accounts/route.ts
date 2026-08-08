import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { metaClient, META_BASE_URL } from '@/lib/meta/client';
import { Platform } from '@/lib/generated/prisma/client';

// GET — List all connected accounts for the current tenant
export async function GET() {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  // Explicit select — the encrypted pageToken ciphertext must never leave the server
  const accounts = await prisma.socialAccount.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    select: {
      id: true,
      platform: true,
      pageId: true,
      pageName: true,
      pictureUrl: true,
      isActive: true,
      connectedAt: true,
      tokenExpiresAt: true,
      webhookSubscribed: true,
      linkedFacebookPageId: true,
      bots: {
        select: { id: true, name: true, isActive: true },
        take: 1,
      },
    },
    orderBy: { connectedAt: 'desc' },
  });

  return NextResponse.json({ accounts });
}

// POST — Connect a Facebook Page or Instagram Account
export async function POST(request: NextRequest) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json() as {
    pageId: string;
    pageName: string;
    pageToken: string;
    pictureUrl?: string;
    platform: Platform;
    linkedFacebookPageId?: string;
  };

  const { pageId, pageName, pageToken, pictureUrl, platform, linkedFacebookPageId } = body;

  if (!pageId || !pageName || !pageToken || !platform) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Proof of ownership: the supplied token must BE the page's own access
  // token, not merely a token that can READ the page node (public metadata is
  // readable with many tokens — Analyst roles, Page Public Content Access —
  // which would let any authenticated tenant hijack another tenant's page).
  // A real Page access token acts as the page itself, so GET /me returns the
  // page's own id. For Instagram accounts the token is the linked Facebook
  // Page's token, so we additionally require that page to be linked to this
  // exact IG business account.
  try {
    const meUrl = new URL(`${META_BASE_URL}/me`);
    meUrl.searchParams.set('fields', 'id');
    meUrl.searchParams.set('access_token', pageToken);
    const meRes = await fetch(meUrl.toString());
    const meData = await meRes.json() as { id?: string };

    let ownershipProven = false;
    if (meRes.ok && meData.id) {
      if (platform === 'INSTAGRAM') {
        // The token must be a Page token whose page links to this IG account
        const igUrl = new URL(`${META_BASE_URL}/${meData.id}`);
        igUrl.searchParams.set('fields', 'instagram_business_account');
        igUrl.searchParams.set('access_token', pageToken);
        const igRes = await fetch(igUrl.toString());
        const igData = await igRes.json() as {
          instagram_business_account?: { id: string };
        };
        ownershipProven =
          igRes.ok && igData.instagram_business_account?.id === pageId;
      } else {
        // The token must act as the page itself
        ownershipProven = meData.id === pageId;
      }
    }

    if (!ownershipProven) {
      return NextResponse.json(
        { error: 'The provided token is not an access token for this page' },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Could not verify page access with Meta' },
      { status: 502 }
    );
  }

  const encryptedToken = encrypt(pageToken);

  // Product contract: the page belongs to the connecting tenant. EVERYTHING tied
  // to the account moves with it in one transaction — the SocialAccount itself,
  // its Bots (keeping their config/knowledge/projects intact) and their
  // CommentLogs. A default bot is created only if the account has NO bot at all.
  const account = await prisma.$transaction(async (tx) => {
    const acc = await tx.socialAccount.upsert({
      where: { platform_pageId: { platform, pageId } },
      update: {
        tenantId: ctx.tenantId,
        pageName,
        pageToken: encryptedToken,
        pictureUrl,
        isActive: true,
        linkedFacebookPageId,
      },
      create: {
        tenantId: ctx.tenantId,
        platform,
        pageId,
        pageName,
        pageToken: encryptedToken,
        pictureUrl,
        linkedFacebookPageId,
      },
    });

    const existingBots = await tx.bot.findMany({
      where: { accountId: acc.id },
      select: { id: true },
    });

    if (existingBots.length > 0) {
      // Move the account's bots (and their comment logs) to the connecting tenant
      const botIds = existingBots.map(b => b.id);
      await tx.bot.updateMany({
        where: { id: { in: botIds } },
        data: { tenantId: ctx.tenantId },
      });
      await tx.commentLog.updateMany({
        where: { botId: { in: botIds } },
        data: { tenantId: ctx.tenantId },
      });
    } else if (platform === 'FACEBOOK') {
      // Account has no bot at all — create the default one. Only Facebook Pages
      // get a bot: an Instagram account is served as a second channel by the bot
      // of the Page it is linked to, sharing one configuration.
      await tx.bot.create({
        data: {
          tenantId: ctx.tenantId,
          accountId: acc.id,
          name: `Bot ${pageName}`,
          isActive: false,
        },
      });
    }

    return acc;
  });

  // Subscribe Facebook pages to webhooks
  if (platform === 'FACEBOOK' && !account.webhookSubscribed) {
    try {
      const subscribed = await metaClient.subscribePageToWebhooks(pageId, pageToken);
      if (subscribed) {
        await prisma.socialAccount.update({
          where: { id: account.id },
          data: { webhookSubscribed: true },
        });
      }
    } catch (err) {
      console.error('[API /accounts] Webhook subscription failed:', err);
    }
  }

  // Never return the encrypted pageToken to the browser
  const { pageToken: _pageToken, ...safeAccount } = account;

  return NextResponse.json({ account: safeAccount }, { status: 201 });
}
