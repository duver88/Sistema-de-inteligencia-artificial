import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';
import { metaClient } from '@/lib/meta/client';
import { getPlanLimits, isUnlimited } from '@/lib/plans';
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

  const appUrl = process.env.NEXTAUTH_URL ?? 'https://sia.lionscore.ai';

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

    // Update the connecting user's profile with their Facebook name + photo,
    // so the app shows their real identity in the top bar and admin. Best
    // effort — never block the connection if this fails.
    try {
      const meUrl = new URL(`${META_BASE_URL}/me`);
      meUrl.searchParams.set('fields', 'id,name,picture.width(200).height(200)');
      meUrl.searchParams.set('access_token', longLivedToken);
      const meRes = await fetch(meUrl.toString());
      if (meRes.ok) {
        const me = (await meRes.json()) as {
          name?: string;
          picture?: { data?: { url?: string } };
        };
        const profile: { name?: string; image?: string } = {};
        if (me.name) profile.name = me.name;
        if (me.picture?.data?.url) profile.image = me.picture.data.url;
        if (Object.keys(profile).length > 0) {
          await prisma.user.update({ where: { id: ctx.userId }, data: profile });
        }
      }
    } catch (err) {
      console.error('[callback] Failed to fetch Facebook profile:', err instanceof Error ? err.message : err);
    }

    // 3. Fetch managed pages (with linked Instagram accounts)
    const pages = await metaClient.getManagedPages(longLivedToken);

    // Enforce the tenant's plan page limit before creating any new
    // SocialAccount. A page (or Instagram account) already owned by THIS tenant
    // is a reconnection and does not count; a brand-new page — or one being
    // pulled in from another tenant — does. `projectedPages` tracks the running
    // owned count so a single OAuth batch can't blow past the ceiling.
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { plan: true },
    });
    const maxPages = getPlanLimits(tenant?.plan ?? 'FREE').maxPages;
    const pagesUnlimited = isUnlimited(maxPages);
    let projectedPages = await prisma.socialAccount.count({
      where: { tenantId: ctx.tenantId },
    });
    let planLimitHit = false;

    // 4. Save each page (and its Instagram account) to the database.
    // Ownership contract: the page belongs to the last user who proves Facebook
    // admin access via OAuth. Everything tied to the account — the SocialAccount,
    // its Bots (with their config/knowledge/projects, which follow the bot) and
    // their CommentLogs — moves to the connecting tenant atomically.
    for (const page of pages) {
      // Does this Facebook page already belong to the connecting tenant? If so
      // it's a reconnection and is exempt from the page-limit check.
      const existingFb = await prisma.socialAccount.findUnique({
        where: { platform_pageId: { platform: 'FACEBOOK', pageId: page.id } },
        select: { tenantId: true },
      });
      const fbIsNewForTenant = existingFb?.tenantId !== ctx.tenantId;
      if (!pagesUnlimited && fbIsNewForTenant && projectedPages >= maxPages) {
        // Adding this page (and its linked Instagram account) would exceed the
        // plan. Skip the whole page and flag it so the user is told why.
        planLimitHit = true;
        continue;
      }
      if (fbIsNewForTenant) projectedPages++;

      const encryptedPageToken = encrypt(page.access_token);

      const fbAccount = await prisma.$transaction(async (tx) => {
        const account = await tx.socialAccount.upsert({
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

        // Move ALL bots of this account (from any previous tenant) to the
        // connecting tenant, keeping their configuration intact...
        await tx.bot.updateMany({
          where: { accountId: account.id, tenantId: { not: ctx.tenantId } },
          data: { tenantId: ctx.tenantId },
        });
        // ...and move their CommentLogs along with them.
        await tx.commentLog.updateMany({
          where: { bot: { accountId: account.id }, tenantId: { not: ctx.tenantId } },
          data: { tenantId: ctx.tenantId },
        });

        // Create a default Bot ONLY if the account has no bot at all
        // (no tenant filter — a moved bot must never be duplicated).
        const existingBot = await tx.bot.findFirst({
          where: { accountId: account.id },
        });
        if (!existingBot) {
          await tx.bot.create({
            data: {
              tenantId: ctx.tenantId,
              accountId: account.id,
              name: `Bot ${page.name}`,
              isActive: false,
            },
          });
        }

        return account;
      });

      // Subscribe Facebook page to webhooks
      let pageSubscribed = fbAccount.webhookSubscribed;
      if (!pageSubscribed) {
        try {
          const subscribed = await metaClient.subscribePageToWebhooks(page.id, page.access_token);
          if (subscribed) {
            pageSubscribed = true;
            await prisma.socialAccount.update({
              where: { id: fbAccount.id },
              data: { webhookSubscribed: true },
            });
          }
        } catch (err) {
          console.error(`[callback] Webhook subscription failed for page ${page.id}:`, err);
        }
      }

      // Handle linked Instagram Business Account (same ownership contract:
      // account + bots + comment logs move to the connecting tenant atomically)
      if (page.instagram_business_account) {
        const ig = page.instagram_business_account;

        // An Instagram Business account is its own SocialAccount row, so it
        // also consumes a page slot. Same reconnection exemption applies.
        const existingIg = await prisma.socialAccount.findUnique({
          where: { platform_pageId: { platform: 'INSTAGRAM', pageId: ig.id } },
          select: { tenantId: true },
        });
        const igIsNewForTenant = existingIg?.tenantId !== ctx.tenantId;
        if (!pagesUnlimited && igIsNewForTenant && projectedPages >= maxPages) {
          planLimitHit = true;
          continue;
        }
        if (igIsNewForTenant) projectedPages++;

        const encryptedIgToken = encrypt(page.access_token);

        // Instagram comments are delivered through the app's subscription to the
        // `instagram` object plus the LINKED PAGE's subscription — there is no
        // per-Instagram-account subscription in the Facebook Login flow. So the
        // Instagram account is reachable exactly when its Page is.
        await prisma.$transaction(async (tx) => {
          const igAccount = await tx.socialAccount.upsert({
            where: { platform_pageId: { platform: 'INSTAGRAM', pageId: ig.id } },
            update: {
              tenantId: ctx.tenantId,
              pageName: ig.name,
              pageToken: encryptedIgToken,
              pictureUrl: ig.profile_picture_url,
              isActive: true,
              linkedFacebookPageId: fbAccount.id,
              webhookSubscribed: pageSubscribed,
            },
            create: {
              tenantId: ctx.tenantId,
              platform: 'INSTAGRAM',
              pageId: ig.id,
              pageName: ig.name,
              pageToken: encryptedIgToken,
              pictureUrl: ig.profile_picture_url,
              linkedFacebookPageId: fbAccount.id,
              webhookSubscribed: pageSubscribed,
            },
          });

          // Move ALL bots of this account and their CommentLogs to the
          // connecting tenant (configuration/knowledge/projects follow the bot).
          await tx.bot.updateMany({
            where: { accountId: igAccount.id, tenantId: { not: ctx.tenantId } },
            data: { tenantId: ctx.tenantId },
          });
          await tx.commentLog.updateMany({
            where: { bot: { accountId: igAccount.id }, tenantId: { not: ctx.tenantId } },
            data: { tenantId: ctx.tenantId },
          });

          // No bot is created for the Instagram account: the Page's bot serves
          // both channels with one shared configuration (see Bot.accountId).
        });
      }
    }

    // Report how many pages were actually connected so the UI doesn't claim
    // success when the user deselected every page (or manages none).
    if (pages.length === 0) {
      return NextResponse.redirect(`${appUrl}/accounts?error=no_pages`);
    }
    // At least one page was blocked by the plan's page limit. Some pages may
    // still have connected; surface the limit so the user knows why not all did.
    if (planLimitHit) {
      return NextResponse.redirect(`${appUrl}/accounts?error=plan_limit`);
    }
    return NextResponse.redirect(`${appUrl}/accounts?success=true&count=${pages.length}`);
  } catch (err) {
    console.error('[callback] Unexpected error:', err);
    return NextResponse.redirect(`${appUrl}/accounts?error=unexpected`);
  }
}
