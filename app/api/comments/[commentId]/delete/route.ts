import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { manualDelete } from '@/lib/meta/comments';

type Params = { params: Promise<{ commentId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { commentId } = await params;

  try {
    await manualDelete(commentId, ctx.tenantId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
