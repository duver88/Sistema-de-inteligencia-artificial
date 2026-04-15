import 'dotenv/config';
import { Worker } from 'bullmq';
import { redis } from '@/lib/redis';
import { processComment } from '@/lib/moderation/pipeline';
import type { CommentJobData } from '@/lib/queue';

if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not set');

export const commentWorker = new Worker<CommentJobData>(
  'comment-processing',
  async (job) => {
    const { botId, comment } = job.data;
    await processComment(botId, comment);
  },
  {
    connection: redis,
    concurrency: 10, // Process up to 10 comments simultaneously
  }
);

commentWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

commentWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

commentWorker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

console.log('[Worker] Comment processing worker started');
