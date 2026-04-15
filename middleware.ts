/**
 * middleware.ts — Edge-compatible auth guard.
 *
 * Uses the lightweight authConfig (no PrismaAdapter, no Node.js crypto)
 * so this file can safely run in the Edge Runtime. The full NextAuth
 * config (with adapter + token encryption) is in lib/auth.ts and only
 * runs in Node.js server contexts.
 */
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public routes — always allow
  const publicRoutes = ['/login', '/api/auth', '/api/webhooks/meta'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Protected routes — redirect to login if not authenticated
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Protect all routes except static files, images, and Next internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
