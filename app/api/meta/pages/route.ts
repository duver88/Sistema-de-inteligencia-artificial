import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { metaClient } from '@/lib/meta/client';

export async function GET() {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  // Get the user's long-lived Facebook token
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { facebookToken: true },
  });

  if (!user?.facebookToken) {
    return NextResponse.json(
      { error: 'No Facebook token found. Please reconnect your account.' },
      { status: 400 }
    );
  }

  try {
    const longLivedToken = decrypt(user.facebookToken);
    const pages = await metaClient.getManagedPages(longLivedToken);
    return NextResponse.json({ pages });
  } catch (err) {
    console.error('[API /meta/pages] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook pages. Your token may have expired.' },
      { status: 502 }
    );
  }
}
