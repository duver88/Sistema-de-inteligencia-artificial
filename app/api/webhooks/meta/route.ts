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
    console.log('[Webhook] ✅ Verificación de challenge OK — devolviendo hub.challenge');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[Webhook] ❌ Verificación de challenge FALLÓ (hub.verify_token no coincide) — 403');
  return new NextResponse('Forbidden', { status: 403 });
}

// ── POST — Receive webhook events ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Read the raw body BEFORE any parsing — required for HMAC verification
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get('x-hub-signature-256');

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('[Webhook] ❌ Firma X-Hub-Signature-256 inválida o ausente — 401 (evento rechazado)');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Always return 200 immediately — Meta requires a fast acknowledgment
  // Process the event asynchronously after responding
  console.log('[Webhook] ✅ Recibido y firma VÁLIDA — respondiendo 200 y procesando async');
  void processWebhookAsync(rawBody);

  return new NextResponse('OK', { status: 200 });
}

/** Short, log-safe preview of a comment body (no giant raw payloads in logs). */
function preview(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 60 ? `${clean.slice(0, 60)}…` : clean;
}

async function processWebhookAsync(rawBody: Buffer): Promise<void> {
  try {
    const body = JSON.parse(rawBody.toString()) as WebhookBody;
    console.log(`[Webhook] 📥 Evento Meta: object=${body.object} · entradas=${body.entry?.length ?? 0}`);

    // Diagnóstico compacto: forma de cada change (para ver por qué se acepta/descarta)
    type RawChange = { field?: string; value?: Record<string, unknown> };
    type RawEntry = { id?: string; changes?: RawChange[] };
    for (const entry of ((body.entry ?? []) as unknown as RawEntry[])) {
      for (const ch of entry.changes ?? []) {
        const v = ch.value ?? {};
        const from = v.from as { name?: string } | undefined;
        console.log(
          `[Webhook] 🔬 change: field=${ch.field ?? '-'} · item=${v.item ?? '-'} · verb=${v.verb ?? '-'} · ` +
          `parent_id=${v.parent_id ?? '-'} · post_id=${v.post_id ?? '-'} · comment_id=${v.comment_id ?? '-'} · from=${from?.name ?? '-'}`
        );
      }
    }

    const comments = parseWebhookComments(body);

    if (comments.length === 0) {
      console.log('[Webhook] ℹ️ Sin comentarios nuevos de nivel superior (reply, edición o evento no-comentario) — nada que encolar');
      return;
    }

    for (const comment of comments) {
      console.log(
        `[Webhook] 💬 Parseado: commentId=${comment.commentId} · pageId=${comment.pageId} · ` +
        `plataforma=${comment.platform} · autor="${comment.authorName}" · texto="${preview(comment.commentText)}"`
      );

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

      if (!account) {
        console.warn(
          `[Webhook] ⚠️ Sin SocialAccount ACTIVA para pageId=${comment.pageId} (${comment.platform}) — ` +
          'comentario descartado (¿página conectada y activa?)'
        );
        continue;
      }

      if (!account.bots?.[0]) {
        console.warn(
          `[Webhook] ⚠️ La página "${account.pageName}" no tiene BOT ACTIVO — comentario descartado. ` +
          'Activa el bot para que el comentario llegue al pipeline y aparezca en /comments.'
        );
        continue;
      }

      const bot = account.bots[0];
      // Use underscore separator — BullMQ does not allow colons in custom jobIds
      const jobId = `${comment.platform}_${comment.commentId}`;

      await commentQueue.add(
        'process-comment',
        { botId: bot.id, comment },
        { jobId }
      );

      console.log(`[Webhook] 📤 Encolado en BullMQ: jobId=${jobId} · página="${account.pageName}" · bot="${bot.name}"`);
    }
  } catch (err) {
    console.error('[Webhook] ❌ Error procesando evento:', err instanceof Error ? err.message : err);
  }
}
