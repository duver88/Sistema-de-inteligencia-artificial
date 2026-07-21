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
 * Edit a previously published reply and update the CommentLog.
 * Facebook only — Instagram does not support editing comments.
 */
export async function editReply(
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
  if (log.platform !== 'FACEBOOK') {
    throw new Error('Editing replies is only supported on Facebook');
  }
  if (!log.aiReplyId) throw new Error('This comment has no published reply to edit');
  if (log.action !== 'REPLIED' && log.action !== 'MANUAL_REPLY') {
    throw new Error('Only replied comments can be edited');
  }

  const pageToken = decrypt(log.bot.account.pageToken);

  await metaClient.editFacebookComment(log.aiReplyId, replyText, pageToken);

  await prisma.commentLog.update({
    where: { id: commentLogId },
    data: {
      aiReply: replyText,
    },
  });

  return { replyId: log.aiReplyId };
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
