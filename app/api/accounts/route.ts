import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { metaClient } from '@/lib/meta/client';
import { Platform } from '@/lib/generated/prisma/client';

// GET — List all connected accounts for the current tenant
export async function GET() {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const accounts = await prisma.socialAccount.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    include: {
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

  const encryptedToken = encrypt(pageToken);

  const account = await prisma.socialAccount.upsert({
    where: { platform_pageId: { platform, pageId } },
    update: {
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

  // Create default Bot if none exists
  const existingBot = await prisma.bot.findFirst({
    where: { accountId: account.id, tenantId: ctx.tenantId },
  });

  if (!existingBot) {
    await prisma.bot.create({
      data: {
        tenantId: ctx.tenantId,
        accountId: account.id,
        name: `Bot ${pageName}`,
        isActive: false,
      },
    });
  }

  return NextResponse.json({ account }, { status: 201 });
}
