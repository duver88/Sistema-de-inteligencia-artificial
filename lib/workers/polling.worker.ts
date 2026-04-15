import dotenv from 'dotenv';
// Load .env.local first (production server), then .env as fallback
dotenv.config({ path: '.env.local' });
dotenv.config();

import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { commentQueue } from '@/lib/queue';
import type { ParsedComment } from '@/lib/meta/webhook';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set');
if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not set');

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const META_API_VERSION = 'v25.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// How far back to look on the very first poll (no lastPolledAt stored yet)
const INITIAL_LOOKBACK_MS = 10 * 60 * 1000; // 10 minutes

interface FeedComment {
  id: string;
  message: string;
  from?: { id: string; name: string };
  created_time: string;
  parent?: { id: string };
}

interface FeedPost {
  id: string;
  message?: string;
  created_time: string;
  comments?: { data: FeedComment[] };
}

interface FeedResponse {
  data?: FeedPost[];
  error?: { message: string; code: number; type: string };
}

async function pollAccount(account: {
  id: string;
  pageId: string;
  pageName: string;
  pageToken: string;
  lastPolledAt: Date | null;
  bots: Array<{ id: string }>;
}): Promise<void> {
  const bot = account.bots[0];
  if (!bot) return;

  let pageToken: string;
  try {
    pageToken = decrypt(account.pageToken);
  } catch (err) {
    console.error(`[Polling] ${account.pageName}: Error al descifrar token:`, err);
    return;
  }

  // Use lastPolledAt or INITIAL_LOOKBACK_MS ago for the first poll
  const sinceMs = account.lastPolledAt
    ? account.lastPolledAt.getTime()
    : Date.now() - INITIAL_LOOKBACK_MS;
  const sinceUnix = Math.floor(sinceMs / 1000);

  const url = new URL(`${META_BASE_URL}/${account.pageId}/feed`);
  url.searchParams.set(
    'fields',
    'id,message,created_time,comments{id,message,from,created_time,parent}'
  );
  url.searchParams.set('since', sinceUnix.toString());
  url.searchParams.set('limit', '50');
  url.searchParams.set('access_token', pageToken);

  let feedData: FeedResponse;
  try {
    const res = await fetch(url.toString());
    feedData = (await res.json()) as FeedResponse;
  } catch (err) {
    console.error(`[Polling] ${account.pageName}: Error de red:`, err);
    return;
  }

  if (feedData.error) {
    console.error(
      `[Polling] ${account.pageName}: Error API (${feedData.error.code}): ${feedData.error.message}`
    );
    return;
  }

  const posts = feedData.data ?? [];
  let newCommentsCount = 0;

  for (const post of posts) {
    const comments = post.comments?.data ?? [];

    for (const comment of comments) {
      // Skip replies — top-level comments have no parent
      if (comment.parent) continue;

      const commentId = comment.id;

      // Deduplication: skip if already in CommentLog
      const existing = await prisma.commentLog.findFirst({
        where: { commentId, platform: 'FACEBOOK' },
        select: { id: true },
      });
      if (existing) continue;

      const parsed: ParsedComment = {
        commentId,
        postId: post.id,
        pageId: account.pageId,
        authorName: comment.from?.name ?? 'Unknown',
        authorId: comment.from?.id ?? '',
        commentText: comment.message ?? '',
        isReply: false,
        platform: 'FACEBOOK',
      };

      await commentQueue.add(
        'process-comment',
        { botId: bot.id, comment: parsed },
        {
          // Same jobId format as webhook handler — prevents duplicates in queue
          jobId: `FACEBOOK:${commentId}`,
        }
      );

      newCommentsCount++;
    }
  }

  console.log(
    `[Polling] ${account.pageName}: ${newCommentsCount} comentario(s) nuevo(s) encontrado(s)`
  );

  // Update lastPolledAt so next poll only fetches newer comments
  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { lastPolledAt: new Date() },
  });
}

async function runPoll(): Promise<void> {
  console.log('[Polling] Iniciando ciclo de polling...');

  let accounts: Array<{
    id: string;
    pageId: string;
    pageName: string;
    pageToken: string;
    lastPolledAt: Date | null;
    bots: Array<{ id: string }>;
  }>;

  try {
    accounts = await prisma.socialAccount.findMany({
      where: {
        platform: 'FACEBOOK',
        isActive: true,
        webhookSubscribed: true,
        bots: { some: { isActive: true } },
      },
      include: {
        bots: {
          where: { isActive: true },
          take: 1,
        },
      },
    });
  } catch (err) {
    console.error('[Polling] Error al obtener cuentas:', err);
    return;
  }

  if (accounts.length === 0) {
    console.log('[Polling] No hay cuentas activas para hacer polling');
    return;
  }

  console.log(`[Polling] Revisando ${accounts.length} cuenta(s)...`);

  // Poll each account independently — failure on one doesn't affect others
  const results = await Promise.allSettled(
    accounts.map((account) => pollAccount(account))
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    for (const result of failed) {
      if (result.status === 'rejected') {
        console.error('[Polling] Error en cuenta:', result.reason);
      }
    }
  }
}

// Run immediately on start, then every POLL_INTERVAL_MS
runPoll().catch(console.error);
const interval = setInterval(() => {
  runPoll().catch(console.error);
}, POLL_INTERVAL_MS);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Polling] Recibido SIGTERM, cerrando...');
  clearInterval(interval);
  prisma.$disconnect().then(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[Polling] Recibido SIGINT, cerrando...');
  clearInterval(interval);
  prisma.$disconnect().then(() => process.exit(0));
});

console.log(`[Polling] Worker iniciado — intervalo: ${POLL_INTERVAL_MS / 1000}s`);
