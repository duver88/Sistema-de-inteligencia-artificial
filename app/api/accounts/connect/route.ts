import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export async function GET() {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const appId = process.env.FACEBOOK_PAGES_APP_ID;
  const redirectUri = process.env.FACEBOOK_PAGES_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return NextResponse.json(
      { error: 'Facebook Pages app not configured' },
      { status: 500 }
    );
  }

  // Generate a random state token to prevent CSRF
  const state = crypto.randomBytes(16).toString('hex');

  // Store state in an HttpOnly cookie (valid 10 minutes)
  const cookieStore = await cookies();
  cookieStore.set('fb_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  const scope = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_metadata',
  ].join(',');

  const authUrl = new URL('https://www.facebook.com/dialog/oauth');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  return NextResponse.json({ authUrl: authUrl.toString() });
}
