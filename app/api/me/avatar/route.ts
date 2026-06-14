import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

const META_BASE_URL = 'https://graph.facebook.com/v21.0';

/**
 * Proxy the current user's Facebook profile picture through our own origin.
 * Facebook's `platform-lookaside` URLs expire, so storing them on User.image
 * leaves a broken avatar. Here we resolve the photo on demand using the user's
 * Facebook id (from the linked Account) + their stored long-lived token, and
 * stream the image bytes back. The token never reaches the client.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });

  const [account, user] = await Promise.all([
    prisma.account.findFirst({
      where: { userId: session.user.id, provider: 'facebook' },
      select: { providerAccountId: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { facebookToken: true },
    }),
  ]);

  if (!account || !user?.facebookToken) return new NextResponse(null, { status: 404 });

  let token: string;
  try {
    token = decrypt(user.facebookToken);
  } catch {
    return new NextResponse(null, { status: 500 });
  }

  const url =
    `${META_BASE_URL}/${account.providerAccountId}/picture` +
    `?width=96&height=96&redirect=true&access_token=${encodeURIComponent(token)}`;

  let res: Response;
  try {
    res = await fetch(url, { redirect: 'follow' });
  } catch {
    return new NextResponse(null, { status: 502 });
  }

  if (!res.ok) return new NextResponse(null, { status: 502 });

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'image/jpeg',
      // Cache in the browser for a day so we don't hit Graph on every render
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
