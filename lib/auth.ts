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
// Two independent limits, both keyed in the same Map ("email:<x>" / "ip:<x>"):
//   - per email: 5 failed attempts / 15 min (protects one account)
//   - per IP:   20 failed attempts / 15 min (stops attackers rotating emails)
// Module-level Map is enough because PM2 runs a single fork in production.
const MAX_FAILED_ATTEMPTS = 5;
const MAX_FAILED_ATTEMPTS_PER_IP = 20;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
// Hard cap on tracked keys so an attacker spraying millions of unique
// random emails cannot grow the Map (and process memory) without bound.
const MAX_TRACKED_EMAILS = 10_000;

const failedAttempts = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string, max: number): boolean {
  const entry = failedAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    failedAttempts.delete(key);
    return false;
  }
  return entry.count >= max;
}

// Client IP as forwarded by nginx (X-Real-IP / first hop of X-Forwarded-For).
function clientIp(request: Request | undefined): string {
  const real = request?.headers?.get('x-real-ip');
  if (real) return real.trim();
  const fwd = request?.headers?.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
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

function recordFailedAttempt(key: string) {
  const now = Date.now();
  if (!failedAttempts.has(key) && failedAttempts.size >= MAX_TRACKED_EMAILS) {
    pruneFailedAttempts(now);
  }
  const entry = failedAttempts.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    failedAttempts.set(key, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

function clearFailedAttempts(key: string) {
  failedAttempts.delete(key);
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
      async authorize(credentials, request) {
        const email = typeof credentials?.email === 'string'
          ? credentials.email.trim().toLowerCase()
          : '';
        const password = typeof credentials?.password === 'string'
          ? credentials.password
          : '';

        // Length caps: emails beyond RFC size or absurdly long passwords are
        // never legitimate; rejecting early also bounds bcrypt input size.
        if (!email || !password || email.length > 254 || password.length > 256) {
          return null;
        }

        const ip = clientIp(request);
        const emailKey = `email:${email}`;
        const ipKey = `ip:${ip}`;

        const fail = (reason: string) => {
          recordFailedAttempt(emailKey);
          if (ip !== 'unknown') recordFailedAttempt(ipKey);
          console.warn(`[Auth] Failed login (${reason}) email=${email} ip=${ip}`);
          return null;
        };

        if (
          isRateLimited(emailKey, MAX_FAILED_ATTEMPTS) ||
          (ip !== 'unknown' && isRateLimited(ipKey, MAX_FAILED_ATTEMPTS_PER_IP))
        ) {
          console.warn(`[Auth] Rate-limited login attempt email=${email} ip=${ip}`);
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            status: true,
            isSuperAdmin: true,
            accessExpiresAt: true,
          },
        });

        if (!user?.passwordHash) {
          // Burn the same bcrypt time as a real comparison so latency does
          // not reveal whether the email exists.
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          return fail('unknown-or-passwordless');
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) return fail('bad-password');

        if (user.status !== 'ACTIVE') return fail('not-active');

        // Access-validity deadline. Superadmins never expire; for everyone
        // else an accessExpiresAt in the past blocks login with the same
        // generic error the client sees for bad credentials.
        if (
          !user.isSuperAdmin &&
          user.accessExpiresAt &&
          user.accessExpiresAt <= new Date()
        ) {
          return fail('expired');
        }

        clearFailedAttempts(emailKey);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        console.info(`[Auth] Successful login email=${email} ip=${ip}`);
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
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
          accessExpiresAt: true,
        },
      });

      if (!dbUser || dbUser.status !== 'ACTIVE') return unauthenticated();

      // Kill active sessions of non-superadmin users whose access validity
      // deadline has passed (superadmins never expire).
      if (
        !dbUser.isSuperAdmin &&
        dbUser.accessExpiresAt &&
        dbUser.accessExpiresAt <= new Date()
      ) {
        return unauthenticated();
      }

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
    // 7 days instead of the 30-day default: this is an admin-capable SaaS,
    // shorter sessions shrink the window a stolen cookie is useful. Combined
    // with the fresh-DB session callback, revocation is still immediate.
    maxAge: 7 * 24 * 60 * 60,
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
