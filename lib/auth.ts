import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is not set');

// Precomputed cost-12 bcrypt hash of a throwaway string. When the email does
// not exist (or has no passwordHash) we still run bcrypt.compare against this
// hash so the response takes the same time as a real comparison — otherwise
// the ~200ms difference is a timing oracle that reveals which emails exist.
const DUMMY_PASSWORD_HASH =
  '$2b$12$5rcgyoI5RvxZKoZwnYRekOVSgiFs7141y3KfBNZJlBXvyGYiORGVK';

// ─── In-memory rate limit for failed login attempts ───────────────────────
// Max 5 failed attempts per email in a 15-minute window. Module-level Map is
// enough because PM2 runs a single fork in production.
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
// Hard cap on tracked emails so an attacker spraying millions of unique
// random emails cannot grow the Map (and process memory) without bound.
const MAX_TRACKED_EMAILS = 10_000;

const failedAttempts = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(email: string): boolean {
  const entry = failedAttempts.get(email);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    failedAttempts.delete(email);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

function pruneFailedAttempts(now: number) {
  // Drop entries whose rate-limit window has already expired.
  for (const [key, entry] of failedAttempts) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      failedAttempts.delete(key);
    }
  }
  // Still at capacity: evict the oldest entries to make room (a Map
  // iterates in insertion order, so the first keys are the oldest).
  for (const key of failedAttempts.keys()) {
    if (failedAttempts.size < MAX_TRACKED_EMAILS) break;
    failedAttempts.delete(key);
  }
}

function recordFailedAttempt(email: string) {
  const now = Date.now();
  if (!failedAttempts.has(email) && failedAttempts.size >= MAX_TRACKED_EMAILS) {
    pruneFailedAttempts(now);
  }
  const entry = failedAttempts.get(email);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    failedAttempts.set(email, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

function clearFailedAttempts(email: string) {
  failedAttempts.delete(email);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      // Return null on ANY failure so the client always sees the same
      // generic "Invalid email or password" error, never whether the
      // email exists, is suspended, or is rate limited.
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string'
          ? credentials.email.trim().toLowerCase()
          : '';
        const password = typeof credentials?.password === 'string'
          ? credentials.password
          : '';

        if (!email || !password) return null;
        if (isRateLimited(email)) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            status: true,
          },
        });

        if (!user?.passwordHash) {
          // Burn the same bcrypt time as a real comparison so latency does
          // not reveal whether the email exists.
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          recordFailedAttempt(email);
          return null;
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
          recordFailedAttempt(email);
          return null;
        }

        if (user.status !== 'ACTIVE') {
          recordFailedAttempt(email);
          return null;
        }

        clearFailedAttempts(email);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return { id: user.id, name: user.name, email: user.email };
      },
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
    async jwt({ token, user }) {
      // On sign-in, persist the user id and the sign-in time in the token.
      // authTime lets the session callback reject tokens issued before the
      // user's last password change (see passwordChangedAt below).
      if (user?.id) {
        token.sub = user.id;
        token.authTime = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      // Always load FRESH user data from the database so changes like a
      // suspension or a role change take effect on the very next request.
      //
      // Fail closed: when the token has no subject, the user no longer
      // exists, is not ACTIVE, or the token was issued before the last
      // password change, return a session WITHOUT a user identity. Every
      // consumer (dashboard pages, API routes, lib/tenant.ts) checks
      // session.user.id / tenantId / isSuperAdmin, so an empty user means
      // the request is treated as unauthenticated — a suspension, deletion
      // or password reset cuts access on the very next request.
      const unauthenticated = () =>
        ({ expires: session.expires } as typeof session);

      if (!token.sub) return unauthenticated();

      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          id: true,
          tenantId: true,
          role: true,
          isSuperAdmin: true,
          mustChangePassword: true,
          status: true,
          name: true,
          email: true,
          passwordChangedAt: true,
        },
      });

      if (!dbUser || dbUser.status !== 'ACTIVE') return unauthenticated();

      // Invalidate JWTs issued before the last password change (admin reset
      // or self-service change) so a stolen cookie dies as soon as the
      // password is rotated. Tokens without authTime predate this check and
      // are rejected whenever a password change has happened.
      if (dbUser.passwordChangedAt) {
        const authTime = typeof token.authTime === 'number' ? token.authTime : 0;
        if (authTime < dbUser.passwordChangedAt.getTime()) return unauthenticated();
      }

      session.user.id = dbUser.id;
      session.user.tenantId = dbUser.tenantId ?? '';
      session.user.role = dbUser.role;
      session.user.isSuperAdmin = dbUser.isSuperAdmin;
      session.user.mustChangePassword = dbUser.mustChangePassword;
      session.user.status = dbUser.status;
      session.user.name = dbUser.name;
      session.user.email = dbUser.email ?? session.user.email;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});

// Augment NextAuth types to include tenant/auth fields on session
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: string;
      isSuperAdmin: boolean;
      mustChangePassword: boolean;
      status: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// Note: token.authTime (millisecond timestamp of the sign-in that issued the
// token) is stored via the JWT's Record<string, unknown> index signature, so
// no module augmentation is needed for '@auth/core/jwt'.
