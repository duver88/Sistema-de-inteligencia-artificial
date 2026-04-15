import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { metaClient } from '@/lib/meta/client';
import { cookies } from 'next/headers';

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function GET(request: NextRequest) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const appUrl = process.env.NEXTAUTH_URL ?? 'https://sia.duberney.online';

  // User denied access
  if (errorParam) {
    return NextResponse.redirect(`${appUrl}/accounts?error=access_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/accounts?error=missing_params`);
  }

  // Verify state to prevent CSRF
  const cookieStore = await cookies();
  const storedState = cookieStore.get('fb_oauth_state')?.value;
  cookieStore.delete('fb_oauth_state');

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${appUrl}/accounts?error=invalid_state`);
  }

  const appId = process.env.FACEBOOK_PAGES_APP_ID;
  const appSecret = process.env.FACEBOOK_PAGES_APP_SECRET;
  const redirectUri = process.env.FACEBOOK_PAGES_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    return NextResponse.redirect(`${appUrl}/accounts?error=server_config`);
  }

  try {
    // 1. Exchange code for short-lived user access token
    const tokenUrl = new URL(`${META_BASE_URL}/oauth/access_token`);
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json() as {
      access_token?: string;
      error?: { message: string };
    };

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[callback] Token exchange failed:', tokenData.error);
      return NextResponse.redirect(`${appUrl}/accounts?error=token_exchange`);
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange for 60-day long-lived token using LionsCore Pages credentials
    const llUrl = new URL(`${META_BASE_URL}/oauth/access_token`);
    llUrl.searchParams.set('grant_type', 'fb_exchange_token');
    llUrl.searchParams.set('client_id', appId);
    llUrl.searchParams.set('client_secret', appSecret);
    llUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const llRes = await fetch(llUrl.toString());
    const llData = await llRes.json() as {
      access_token?: string;
      expires_in?: number;
      error?: { message: string };
    };

    if (!llRes.ok || !llData.access_token) {
      console.error('[callback] Long-lived token exchange failed:', llData.error);
      return NextResponse.redirect(`${appUrl}/accounts?error=token_exchange`);
    }

    const longLivedToken = llData.access_token;

    // 3. Fetch managed pages (with linked Instagram accounts)
    const pages = await metaClient.getManagedPages(longLivedToken);

    // 4. Save each page (and its Instagram account) to the database
    for (const page of pages) {
      const encryptedPageToken = encrypt(page.access_token);

      const fbAccount = await prisma.socialAccount.upsert({
        where: { platform_pageId: { platform: 'FACEBOOK', pageId: page.id } },
        update: {
          tenantId: ctx.tenantId,
          pageName: page.name,
          pageToken: encryptedPageToken,
          pictureUrl: page.picture?.data?.url,
          isActive: true,
        },
        create: {
          tenantId: ctx.tenantId,
          platform: 'FACEBOOK',
          pageId: page.id,
          pageName: page.name,
          pageToken: encryptedPageToken,
          pictureUrl: page.picture?.data?.url,
        },
      });

      // Create default Bot for Facebook page if none exists
      const existingBot = await prisma.bot.findFirst({
        where: { accountId: fbAccount.id, tenantId: ctx.tenantId },
      });
      if (!existingBot) {
        await prisma.bot.create({
          data: {
            tenantId: ctx.tenantId,
            accountId: fbAccount.id,
            name: `Bot ${page.name}`,
            isActive: false,
          },
        });
      }

      // Subscribe Facebook page to webhooks
      if (!fbAccount.webhookSubscribed) {
        try {
          const subscribed = await metaClient.subscribePageToWebhooks(page.id, page.access_token);
          if (subscribed) {
            await prisma.socialAccount.update({
              where: { id: fbAccount.id },
              data: { webhookSubscribed: true },
            });
          }
        } catch (err) {
          console.error(`[callback] Webhook subscription failed for page ${page.id}:`, err);
        }
      }

      // Handle linked Instagram Business Account
      if (page.instagram_business_account) {
        const ig = page.instagram_business_account;
        const encryptedIgToken = encrypt(page.access_token);

        const igAccount = await prisma.socialAccount.upsert({
          where: { platform_pageId: { platform: 'INSTAGRAM', pageId: ig.id } },
          update: {
            tenantId: ctx.tenantId,
            pageName: ig.name,
            pageToken: encryptedIgToken,
            pictureUrl: ig.profile_picture_url,
            isActive: true,
            linkedFacebookPageId: page.id,
          },
          create: {
            tenantId: ctx.tenantId,
            platform: 'INSTAGRAM',
            pageId: ig.id,
            pageName: ig.name,
            pageToken: encryptedIgToken,
            pictureUrl: ig.profile_picture_url,
            linkedFacebookPageId: page.id,
          },
        });

        const existingIgBot = await prisma.bot.findFirst({
          where: { accountId: igAccount.id, tenantId: ctx.tenantId },
        });
        if (!existingIgBot) {
          await prisma.bot.create({
            data: {
              tenantId: ctx.tenantId,
              accountId: igAccount.id,
              name: `Bot Instagram ${ig.name}`,
              isActive: false,
            },
          });
        }
      }
    }

    return NextResponse.redirect(`${appUrl}/accounts?success=true`);
  } catch (err) {
    console.error('[callback] Unexpected error:', err);
    return NextResponse.redirect(`${appUrl}/accounts?error=unexpected`);
  }
}
