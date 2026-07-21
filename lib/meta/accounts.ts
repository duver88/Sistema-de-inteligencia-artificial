/**
 * Account management operations — fetching Facebook Pages and Instagram accounts
 * and persisting them to the database.
 *
 * NOTE: these helpers are not wired to any route today (the live connect path
 * is the OAuth callback in app/api/accounts/callback/route.ts and the manual
 * POST /api/accounts). They are kept in sync with the same ownership contract
 * so that re-wiring them (e.g. an accounts-page "Refresh" action) can never
 * reintroduce the cross-tenant reassignment bug: the page belongs to the last
 * tenant that proves admin access, and EVERYTHING tied to the account — the
 * SocialAccount, its Bots (config/knowledge/projects follow the bot) and their
 * CommentLogs — moves to that tenant in one transaction. A default bot is
 * created only if the account has NO bot at all.
 */
import { metaClient } from './client';
import { encrypt, decrypt } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';

/**
 * Re-fetch all Facebook Pages for a user and upsert them into the DB.
 * Called from the accounts page "Refresh" action.
 */
export async function syncSocialAccounts(
  userId: string,
  tenantId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { facebookToken: true },
  });

  if (!user?.facebookToken) {
    throw new Error('No Facebook token found for user — please reconnect');
  }

  const longLivedToken = decrypt(user.facebookToken);
  const pages = await metaClient.getManagedPages(longLivedToken);

  for (const page of pages) {
    const encryptedPageToken = encrypt(page.access_token);

    const fbAccount = await prisma.$transaction(async (tx) => {
      const account = await tx.socialAccount.upsert({
        where: { platform_pageId: { platform: 'FACEBOOK', pageId: page.id } },
        update: {
          tenantId,
          pageName: page.name,
          pageToken: encryptedPageToken,
          pictureUrl: page.picture?.data?.url,
          isActive: true,
        },
        create: {
          tenantId,
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
        where: { accountId: account.id, tenantId: { not: tenantId } },
        data: { tenantId },
      });
      // ...and move their CommentLogs along with them.
      await tx.commentLog.updateMany({
        where: { bot: { accountId: account.id }, tenantId: { not: tenantId } },
        data: { tenantId },
      });

      // Create a default Bot ONLY if the account has no bot at all
      // (no tenant filter — a moved bot must never be duplicated).
      const existingBot = await tx.bot.findFirst({
        where: { accountId: account.id },
      });
      if (!existingBot) {
        await tx.bot.create({
          data: {
            tenantId,
            accountId: account.id,
            name: `Bot ${page.name}`,
            isActive: false,
          },
        });
      }

      return account;
    });

    // Subscribe to webhooks if not already subscribed
    if (!fbAccount.webhookSubscribed) {
      try {
        const subscribed = await metaClient.subscribePageToWebhooks(
          page.id,
          page.access_token
        );
        if (subscribed) {
          await prisma.socialAccount.update({
            where: { id: fbAccount.id },
            data: { webhookSubscribed: true },
          });
        }
      } catch (err) {
        console.error(`[Accounts] Failed to subscribe page ${page.id} to webhooks:`, err);
      }
    }

    // Handle linked Instagram account (same ownership contract)
    if (page.instagram_business_account) {
      const ig = page.instagram_business_account;
      const encryptedIgToken = encrypt(page.access_token);

      await prisma.$transaction(async (tx) => {
        const igAccount = await tx.socialAccount.upsert({
          where: { platform_pageId: { platform: 'INSTAGRAM', pageId: ig.id } },
          update: {
            tenantId,
            pageName: ig.name,
            pageToken: encryptedIgToken,
            pictureUrl: ig.profile_picture_url,
            isActive: true,
            linkedFacebookPageId: fbAccount.id,
          },
          create: {
            tenantId,
            platform: 'INSTAGRAM',
            pageId: ig.id,
            pageName: ig.name,
            pageToken: encryptedIgToken,
            pictureUrl: ig.profile_picture_url,
            linkedFacebookPageId: fbAccount.id,
          },
        });

        // Move ALL bots of this account and their CommentLogs to the
        // connecting tenant (configuration/knowledge/projects follow the bot).
        await tx.bot.updateMany({
          where: { accountId: igAccount.id, tenantId: { not: tenantId } },
          data: { tenantId },
        });
        await tx.commentLog.updateMany({
          where: { bot: { accountId: igAccount.id }, tenantId: { not: tenantId } },
          data: { tenantId },
        });

        // Create a default Bot ONLY if the account has no bot at all
        const existingIgBot = await tx.bot.findFirst({
          where: { accountId: igAccount.id },
        });
        if (!existingIgBot) {
          await tx.bot.create({
            data: {
              tenantId,
              accountId: igAccount.id,
              name: `Bot Instagram ${ig.name}`,
              isActive: false,
            },
          });
        }
      });
    }
  }
}

/**
 * Disconnect a social account — deactivate it AND all of its bots (including
 * any orphaned bots left under a previous tenant), mirroring the DELETE
 * /api/accounts/[accountId] route, so the webhook can never pick a bot of a
 * disconnected account back up.
 */
export async function disconnectAccount(
  accountId: string,
  tenantId: string
): Promise<void> {
  const account = await prisma.socialAccount.findFirst({
    where: { id: accountId, tenantId },
  });

  if (!account) throw new Error('Account not found');

  await prisma.$transaction([
    prisma.socialAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    }),
    prisma.bot.updateMany({
      where: { accountId },
      data: { isActive: false },
    }),
  ]);
}
