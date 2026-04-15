/**
 * Account management operations — fetching Facebook Pages and Instagram accounts
 * and persisting them to the database.
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

    const fbAccount = await prisma.socialAccount.upsert({
      where: { platform_pageId: { platform: 'FACEBOOK', pageId: page.id } },
      update: {
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

    // Ensure a default Bot exists for this account
    const existingBot = await prisma.bot.findFirst({
      where: { accountId: fbAccount.id, tenantId },
    });
    if (!existingBot) {
      await prisma.bot.create({
        data: {
          tenantId,
          accountId: fbAccount.id,
          name: `Bot ${page.name}`,
          isActive: false,
        },
      });
    }

    // Handle linked Instagram account
    if (page.instagram_business_account) {
      const ig = page.instagram_business_account;
      const encryptedIgToken = encrypt(page.access_token);

      const igAccount = await prisma.socialAccount.upsert({
        where: { platform_pageId: { platform: 'INSTAGRAM', pageId: ig.id } },
        update: {
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

      const existingIgBot = await prisma.bot.findFirst({
        where: { accountId: igAccount.id, tenantId },
      });
      if (!existingIgBot) {
        await prisma.bot.create({
          data: {
            tenantId,
            accountId: igAccount.id,
            name: `Bot Instagram ${ig.name}`,
            isActive: false,
          },
        });
      }
    }
  }
}

/**
 * Disconnect a social account — deactivate it and optionally delete its bot.
 */
export async function disconnectAccount(
  accountId: string,
  tenantId: string
): Promise<void> {
  const account = await prisma.socialAccount.findFirst({
    where: { id: accountId, tenantId },
  });

  if (!account) throw new Error('Account not found');

  await prisma.socialAccount.update({
    where: { id: accountId },
    data: { isActive: false },
  });
}
