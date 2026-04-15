import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';
import type { ParsedComment } from '@/lib/meta/webhook';

export interface CommentJobData {
  botId: string;
  comment: ParsedComment;
}

export const commentQueue = new Queue<CommentJobData>('comment-processing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s → 4s → 8s
    },
    removeOnComplete: { count: 1000 }, // Keep last 1000 completed jobs
    removeOnFail: { count: 500 },
  },
});
