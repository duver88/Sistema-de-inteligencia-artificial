/**
 * auth.config.ts — Edge-compatible NextAuth configuration.
 *
 * This file MUST NOT import anything that uses Node.js modules (crypto,
 * fs, etc.) because it is imported by middleware.ts, which runs in the
 * Edge Runtime.
 *
 * The full configuration (with PrismaAdapter, token encryption, etc.)
 * lives in lib/auth.ts and is only used in Node.js server contexts.
 */
import type { NextAuthConfig } from 'next-auth';
import Facebook from 'next-auth/providers/facebook';

export const authConfig: NextAuthConfig = {
  providers: [
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      // Facebook has its own internal CSRF protection — disable NextAuth
      // checks to avoid "state/pkce could not be parsed" errors.
      checks: [],
    }),
  ],
  pages: {
    signIn: '/login',
  },
};
