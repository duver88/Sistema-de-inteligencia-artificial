/**
 * auth.config.ts — kept for reference but no longer imported by middleware.
 *
 * middleware.ts now uses a plain cookie existence check (no NextAuth calls)
 * because our database session tokens are opaque strings, not JWTs, and
 * calling NextAuth auth() in the Edge Runtime throws JWTSessionError.
 *
 * The active configuration is lib/auth.ts.
 */
export {};
