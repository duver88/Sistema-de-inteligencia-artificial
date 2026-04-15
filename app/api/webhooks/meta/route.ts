import { type NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, parseWebhookComments, type WebhookBody } from '@/lib/meta/webhook';
import { commentQueue } from '@/lib/queue';
import { prisma } from '@/lib/prisma';

if (!process.env.META_WEBHOOK_VERIFY_TOKEN) {
  throw new Error('META_WEBHOOK_VERIFY_TOKEN is not set');
}

// ── GET — Meta webhook verification challenge ─────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// ── POST — Receive webhook events ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Read the raw body BEFORE any parsing — required for HMAC verification
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get('x-hub-signature-256');

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Always return 200 immediately — Meta requires a fast acknowledgment
  // Process the event asynchronously after responding
  void processWebhookAsync(rawBody);

  return new NextResponse('OK', { status: 200 });
}

async function processWebhookAsync(rawBody: Buffer): Promise<void> {
  try {
    const body = JSON.parse(rawBody.toString()) as WebhookBody;
    const comments = parseWebhookComments(body);

    for (const comment of comments) {
      // Look up the SocialAccount by pageId and platform
      const account = await prisma.socialAccount.findFirst({
        where: {
          pageId: comment.pageId,
          platform: comment.platform,
          isActive: true,
        },
        include: {
          bots: {
            where: { isActive: true },
            take: 1,
          },
        },
      });

      if (!account?.bots?.[0]) {
        // No active bot for this account — silently skip
        continue;
      }

      const bot = account.bots[0];

      await commentQueue.add(
        'process-comment',
        { botId: bot.id, comment },
        {
          // Use commentId as deduplication key within a short window
          jobId: `${comment.platform}:${comment.commentId}`,
        }
      );
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
}
