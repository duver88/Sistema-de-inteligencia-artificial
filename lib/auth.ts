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

  await prisma.user.updateMany({
    where: { id: userId },
    data: { tenantId: tenant.id, role: 'OWNER' },
  });

  return tenant.id;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      authorization: {
        params: {
          // Minimal login scope. This Meta app uses Facebook Login for
          // Business, which rejects the dialog unless at least ONE business
          // permission is requested — public_profile alone shows "app needs
          // at least one supported permission", and "email" doesn't exist in
          // Business apps (Invalid Scopes). pages_show_list is the lightest
          // approved option. The rest of the page permissions are requested
          // in context, in the "Connect account" flow (FACEBOOK_SCOPES).
          scope: process.env.FACEBOOK_LOGIN_SCOPES || 'public_profile,pages_show_list',
        },
      },
      // Facebook has its own internal CSRF protection and does not work
      // reliably with NextAuth v5 PKCE or state cookie checks.
      // Disabling checks avoids "pkceCodeVerifier/state could not be parsed".
      checks: [],
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Facebook appends #_=_ to the redirect URL — strip it so NextAuth
      // doesn't pass the fragment to the session/signIn callbacks.
      url = url.replace('#_=_', '');
      // Standard NextAuth redirect logic: allow relative URLs and same-origin
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
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
          await resolveOrCreateTenant(
            dbUser?.tenantId,
            userId,
            (profile as { name?: string })?.name || user.name || user.email
          );

          // 2. Exchange short-lived token for long-lived token (60 days)
          const longLivedToken = await exchangeForLongLivedToken(account.access_token);
          const encryptedToken = encrypt(longLivedToken);

          // 3. Store the long-lived token on the user record
          await prisma.user.updateMany({
            where: { id: userId },
            data: {
              facebookToken: encryptedToken,
              tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            },
          });

          // Pages are NOT discovered at login. They connect via /accounts
          // "Connect account", which requests the full page permissions and
          // subscribes webhooks. Doing it here overwrote good page tokens
          // with weak ones (login scope lacks pages_manage_engagement) and
          // left pages without webhookSubscribed.
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
