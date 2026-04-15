import NextAuth from 'next-auth';
import Facebook from 'next-auth/providers/facebook';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

if (!process.env.FACEBOOK_CLIENT_ID) throw new Error('FACEBOOK_CLIENT_ID is not set');
if (!process.env.FACEBOOK_CLIENT_SECRET) throw new Error('FACEBOOK_CLIENT_SECRET is not set');
if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is not set');

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Exchange a short-lived user token for a 60-day long-lived token
async function exchangeForLongLivedToken(shortLivedToken: string): Promise<string> {
  const url = new URL(`${META_BASE_URL}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', process.env.FACEBOOK_CLIENT_ID!);
  url.searchParams.set('client_secret', process.env.FACEBOOK_CLIENT_SECRET!);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const res = await fetch(url.toString());
  const data = await res.json() as { access_token?: string; error?: { message: string } };

  if (!res.ok || !data.access_token) {
    throw new Error(`Token exchange failed: ${JSON.stringify(data.error)}`);
  }

  return data.access_token;
}

// Resolve an existing tenantId or create a new Tenant for the user
async function resolveOrCreateTenant(
  existingTenantId: string | null | undefined,
  userId: string,
  displayName: string | null | undefined
): Promise<string> {
  if (existingTenantId) return existingTenantId;

  const tenant = await prisma.tenant.create({
    data: { name: displayName ?? 'My Workspace' },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { tenantId: tenant.id, role: 'OWNER' },
  });

  return tenant.id;
}

// Fetch all Facebook Pages the user manages, plus their linked Instagram accounts
async function fetchAndStoreSocialAccounts(
  longLivedToken: string,
  userId: string,
  tenantId: string
): Promise<void> {
  const url = new URL(`${META_BASE_URL}/me/accounts`);
  url.searchParams.set('access_token', longLivedToken);
  url.searchParams.set(
    'fields',
    'id,name,picture,access_token,instagram_business_account{id,name,profile_picture_url}'
  );

  const res = await fetch(url.toString());
  const data = await res.json() as {
    data?: Array<{
      id: string;
      name: string;
      picture?: { data?: { url?: string } };
      access_token: string;
      instagram_business_account?: {
        id: string;
        name: string;
        profile_picture_url?: string;
      };
    }>;
    error?: { message: string };
  };

  if (!res.ok || !data.data) {
    console.error('Failed to fetch pages:', data.error);
    return;
  }

  for (const page of data.data) {
    const encryptedPageToken = encrypt(page.access_token);

    // Upsert the Facebook Page
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

    // Create a default Bot for this account if one doesn't exist
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

    // Upsert linked Instagram Business Account if present
    if (page.instagram_business_account) {
      const ig = page.instagram_business_account;
      // Instagram uses the same page access token
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

      // Create a default Bot for the Instagram account if one doesn't exist
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      authorization: {
        params: {
          scope: process.env.FACEBOOK_SCOPES ||
            'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_comments,instagram_basic,instagram_manage_comments,business_management,public_profile,email',
        },
      },
      // Facebook does not support PKCE — use state-only check to avoid
      // "pkceCodeVerifier value could not be parsed" errors in NextAuth v5
      checks: ['state'],
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Attach user ID and tenantId to the session
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, tenantId: true, role: true, isSuperAdmin: true },
      });
      if (dbUser) {
        session.user.id = dbUser.id;
        session.user.tenantId = dbUser.tenantId ?? '';
        session.user.role = dbUser.role;
        session.user.isSuperAdmin = dbUser.isSuperAdmin;
      }
      return session;
    },
    async signIn({ account, user, profile }) {
      if (account?.provider === 'facebook' && account.access_token && user.id) {
        const userId = user.id; // Narrowed to string within this block
        try {
          // 1. Ensure this user has a tenant
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { tenantId: true },
          });

          // Resolve (or create) the tenant for this user
          const tenantId: string = await resolveOrCreateTenant(
            dbUser?.tenantId,
            userId,
            (profile as { name?: string })?.name || user.name || user.email
          );

          // 2. Exchange short-lived token for long-lived token (60 days)
          const longLivedToken = await exchangeForLongLivedToken(account.access_token);
          const encryptedToken = encrypt(longLivedToken);

          // 3. Store the long-lived token on the user record
          await prisma.user.update({
            where: { id: userId },
            data: {
              facebookToken: encryptedToken,
              tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            },
          });

          // 4. Fetch pages and create SocialAccounts + default Bots
          await fetchAndStoreSocialAccounts(longLivedToken, userId, tenantId);
        } catch (err) {
          console.error('Error during Facebook sign-in flow:', err);
          // Don't block sign-in — user can still access the dashboard
        }
      }

      return true;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'database',
  },
});

// Augment NextAuth types to include tenantId and role on session
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: string;
      isSuperAdmin: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
