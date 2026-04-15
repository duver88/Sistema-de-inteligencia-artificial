import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { manualReply } from '@/lib/meta/comments';

type Params = { params: Promise<{ commentId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { commentId } = await params;
  const { replyText } = await request.json() as { replyText: string };

  if (!replyText?.trim()) {
    return NextResponse.json({ error: 'replyText is required' }, { status: 400 });
  }

  try {
    const result = await manualReply(commentId, replyText.trim(), ctx.tenantId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reply';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
