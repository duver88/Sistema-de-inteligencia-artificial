/**
 * Higher-level comment operations that combine Meta API calls with DB logging.
 * Used by manual reply/delete API routes in the dashboard.
 */
import { metaClient } from './client';
import { decrypt } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';

/**
 * Manually reply to a comment and update the CommentLog.
 */
export async function manualReply(
  commentLogId: string,
  replyText: string,
  tenantId: string
): Promise<{ replyId: string }> {
  const log = await prisma.commentLog.findFirst({
    where: { id: commentLogId, tenantId },
    include: {
      bot: {
        include: { account: true },
      },
    },
  });

  if (!log) throw new Error('Comment not found');

  const pageToken = decrypt(log.bot.account.pageToken);

  let replyId: string;
  if (log.platform === 'FACEBOOK') {
    replyId = await metaClient.replyToFacebookComment(log.commentId, replyText, pageToken);
  } else {
    replyId = await metaClient.replyToInstagramComment(log.commentId, replyText, pageToken);
  }

  await prisma.commentLog.update({
    where: { id: commentLogId },
    data: {
      action: 'MANUAL_REPLY',
      aiReply: replyText,
      aiReplyId: replyId,
      repliedAt: new Date(),
    },
  });

  return { replyId };
}

/**
 * Manually delete a comment and update the CommentLog.
 */
export async function manualDelete(
  commentLogId: string,
  tenantId: string
): Promise<void> {
  const log = await prisma.commentLog.findFirst({
    where: { id: commentLogId, tenantId },
    include: {
      bot: {
        include: { account: true },
      },
    },
  });

  if (!log) throw new Error('Comment not found');

  const pageToken = decrypt(log.bot.account.pageToken);

  await metaClient.deleteComment(log.commentId, pageToken);

  await prisma.commentLog.update({
    where: { id: commentLogId },
    data: {
      action: 'MANUAL_DELETE',
      deletedAt: new Date(),
    },
  });
}
