/**
 * Higher-level comment operations that combine Meta API calls with DB logging.
 * Used by manual reply/delete API routes in the dashboard.
 */
import { metaClient, MetaApiClientError } from './client';
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
 * Delete only the reply published by the Page, leaving the user's original
 * comment untouched. Works on both Facebook and Instagram — unlike editing,
 * deleting a comment is supported on both platforms.
 */
export async function deleteReply(
  commentLogId: string,
  tenantId: string
): Promise<{ success: true }> {
  const log = await prisma.commentLog.findFirst({
    where: { id: commentLogId, tenantId },
    include: {
      bot: {
        include: { account: true },
      },
    },
  });

  if (!log) throw new Error('Comment not found');
  if (!log.aiReplyId) throw new Error('This comment has no published reply to delete');
  if (log.action !== 'REPLIED' && log.action !== 'MANUAL_REPLY') {
    throw new Error('Only replied comments can have their reply deleted');
  }

  const pageToken = decrypt(log.bot.account.pageToken);

  try {
    await metaClient.deleteComment(log.aiReplyId, pageToken);
  } catch (err) {
    // The reply may already be gone on Meta (deleted straight from the
    // Facebook/Instagram UI, or garbage-collected). Graph answers with
    // "(#100) Object with ID '...' does not exist" — treat that as already
    // deleted and fall through so the log reconciles instead of staying
    // stuck as REPLIED with a stale aiReplyId that no action can clear.
    if (!(err instanceof MetaApiClientError && err.code === 100)) throw err;
  }

  await prisma.commentLog.update({
    where: { id: commentLogId },
    data: {
      action: 'REPLY_DELETED',
      aiReply: null,
      aiReplyId: null,
      repliedAt: null,
    },
  });

  return { success: true };
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
