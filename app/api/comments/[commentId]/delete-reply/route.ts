import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { deleteReply } from '@/lib/meta/comments';

type Params = { params: Promise<{ commentId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { commentId } = await params;

  try {
    const result = await deleteReply(commentId, ctx.tenantId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete reply';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
