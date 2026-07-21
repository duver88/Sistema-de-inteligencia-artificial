/**
 * middleware.ts — Edge-compatible auth guard.
 *
 * We use a plain cookie existence check instead of NextAuth's auth().
 * Our main config uses session strategy: 'jwt'; the JWT session cookie
 * keeps the same names (authjs.session-token / __Secure-authjs.session-token
 * over HTTPS), so an existence check remains a valid fast first gate.
 *
 * Security model: cookie existence is a fast first gate. Every protected
 * API route and server component additionally calls requireTenant() which
 * does the real database-backed verification (user exists and is ACTIVE).
 *
 * Note: /change-password is intentionally NOT public — it requires a session.
 */
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes — always allow
  const publicRoutes = ['/login', '/api/auth', '/api/webhooks/meta', '/privacy', '/terms', '/data-deletion'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for a session cookie (JWT sessions use __Secure- prefix over HTTPS)
  const sessionCookie =
    req.cookies.get('__Secure-authjs.session-token') ??
    req.cookies.get('authjs.session-token');

  if (!sessionCookie) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect all routes except static files, images, and Next internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
