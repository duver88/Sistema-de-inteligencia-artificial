import { prisma } from '@/lib/prisma';
import { matchesKeywords } from './keyword-detector';
import { classifyComment } from '@/lib/ai/classifier';
import { generateReply } from '@/lib/ai/responder';
import { metaClient } from '@/lib/meta/client';
import { decrypt } from '@/lib/crypto';
import type { ParsedComment } from '@/lib/meta/webhook';
import type { CommentAction, Platform, Project, KnowledgeEntry } from '@/lib/generated/prisma';

// ── Project Detection ─────────────────────────────────────────────────────────

function detectProject(
  postCaption: string,
  projects: Pick<Project, 'id' | 'name' | 'detectionKeywords' | 'isDefault'>[]
): Pick<Project, 'id' | 'name' | 'isDefault'> | null {
  const captionLower = postCaption.toLowerCase();

  // Check non-default projects first
  for (const project of projects) {
    if (project.isDefault) continue;
    const keywords = project.detectionKeywords as string[];
    const matches = keywords.some(kw => captionLower.includes(kw.toLowerCase()));
    if (matches) return project;
  }

  // Fall back to the default project
  return projects.find(p => p.isDefault) ?? null;
}

// ── Comment Logging ───────────────────────────────────────────────────────────

interface LogParams {
  tenantId: string;
  botId: string;
  comment: ParsedComment;
  action: CommentAction;
  aiReply?: string;
  aiReplyId?: string;
  projectDetected?: string;
  processingMs: number;
  errorMessage?: string;
}

async function logComment(params: LogParams): Promise<void> {
  try {
    await prisma.commentLog.create({
      data: {
        tenantId: params.tenantId,
        botId: params.botId,
        platform: params.comment.platform,
        commentId: params.comment.commentId,
        postId: params.comment.postId,
        authorName: params.comment.authorName,
        authorId: params.comment.authorId,
        originalText: params.comment.commentText,
        action: params.action,
        aiReply: params.aiReply,
        aiReplyId: params.aiReplyId,
        projectDetected: params.projectDetected,
        processingMs: params.processingMs,
        errorMessage: params.errorMessage,
        deletedAt: params.action === 'DELETED' || params.action === 'MANUAL_DELETE'
          ? new Date()
          : undefined,
        repliedAt: params.action === 'REPLIED' || params.action === 'MANUAL_REPLY'
          ? new Date()
          : undefined,
      },
    });
  } catch (err) {
    console.error('[Pipeline] Failed to log comment:', err);
  }
}

// ── Main Pipeline ─────────────────────────────────────────────────────────────

/**
 * Main comment processing pipeline.
 * Runs each comment through moderation steps in strict order.
 * Each step can short-circuit by returning early after taking action.
 */
export async function processComment(
  botId: string,
  comment: ParsedComment
): Promise<void> {
  const startTime = Date.now();
  let action: CommentAction = 'IGNORED';
  let aiReply: string | undefined;
  let aiReplyId: string | undefined;
  let projectDetected: string | undefined;
  let errorMessage: string | undefined;

  // Load bot config with related data (including tenant for API key)
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    include: {
      account: true,
      tenant: { select: { openaiApiKey: true } },
      projects: {
        orderBy: { createdAt: 'asc' },
      },
      knowledgeEntries: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!bot) {
    console.warn(`[Pipeline] Bot ${botId} not found`);
    return;
  }

  // Resolve and validate the OpenAI API key before doing any AI work
  let openaiApiKey: string | null = null;
  if (bot.aiEnabled || bot.autoReply) {
    if (!bot.tenant.openaiApiKey) {
      await logComment({
        tenantId: bot.tenantId,
        botId,
        comment,
        action: 'IGNORED',
        processingMs: Date.now() - startTime,
        errorMessage: 'OpenAI API key not configured',
      });
      return;
    }
    openaiApiKey = decrypt(bot.tenant.openaiApiKey);
  }

  // Pre-flight check: bot must be active
  if (!bot.isActive) {
    await logComment({
      tenantId: bot.tenantId,
      botId,
      comment,
      action: 'IGNORED',
      processingMs: Date.now() - startTime,
    });
    return;
  }

  // Pre-flight check: skip replies to comments (avoid reply loops)
  if (comment.isReply) {
    await logComment({
      tenantId: bot.tenantId,
      botId,
      comment,
      action: 'IGNORED',
      processingMs: Date.now() - startTime,
    });
    return;
  }

  const pageToken = decrypt(bot.account.pageToken);

  try {
    // ── STEP 1: Keyword Delete Check ─────────────────────────────────────────
    if (bot.deleteNegative) {
      const deletePatterns = bot.deleteKeywords as string[];
      if (matchesKeywords(comment.commentText, deletePatterns)) {
        await metaClient.deleteComment(comment.commentId, pageToken);
        action = 'DELETED';
        await logComment({
          tenantId: bot.tenantId, botId, comment, action,
          processingMs: Date.now() - startTime,
        });
        return;
      }
    }

    // ── STEP 2: Spam Hide Check ───────────────────────────────────────────────
    if (bot.hideSpam) {
      const spamPatterns = bot.spamKeywords as string[];
      if (matchesKeywords(comment.commentText, spamPatterns)) {
        if (comment.platform === 'FACEBOOK') {
          await metaClient.hideComment(comment.commentId, pageToken);
        } else {
          // Instagram does not support hiding — delete spam instead
          await metaClient.deleteComment(comment.commentId, pageToken);
        }
        action = 'HIDDEN';
        await logComment({
          tenantId: bot.tenantId, botId, comment, action,
          processingMs: Date.now() - startTime,
        });
        return;
      }
    }

    // ── STEP 3: AI Classification ─────────────────────────────────────────────
    if (bot.aiEnabled) {
      const classification = await classifyComment(comment.commentText, openaiApiKey!);

      if (classification === 'DELETE') {
        await metaClient.deleteComment(comment.commentId, pageToken);
        action = 'DELETED';
        await logComment({
          tenantId: bot.tenantId, botId, comment, action,
          processingMs: Date.now() - startTime,
        });
        return;
      }

      if (classification === 'HIDE') {
        if (comment.platform === 'FACEBOOK') {
          await metaClient.hideComment(comment.commentId, pageToken);
        } else {
          await metaClient.deleteComment(comment.commentId, pageToken);
        }
        action = 'HIDDEN';
        await logComment({
          tenantId: bot.tenantId, botId, comment, action,
          processingMs: Date.now() - startTime,
        });
        return;
      }

      if (classification === 'IGNORE') {
        await logComment({
          tenantId: bot.tenantId, botId, comment, action: 'IGNORED',
          processingMs: Date.now() - startTime,
        });
        return;
      }

      // classification === 'REPLY' — fall through to reply generation
    }

    // ── STEP 4 + 5: Project Detection + AI Reply ──────────────────────────────
    if (bot.autoReply) {
      // Fetch post caption for project detection (run in parallel with nothing else to wait for)
      let postCaption = '';
      try {
        if (comment.platform === 'FACEBOOK') {
          postCaption = await metaClient.getFacebookPostMessage(comment.postId, pageToken);
        } else {
          postCaption = await metaClient.getInstagramMediaCaption(comment.postId, pageToken);
        }
      } catch {
        postCaption = ''; // Graceful fallback — reply without post context
      }

      // Detect which project this post belongs to
      const detectedProject = detectProject(postCaption, bot.projects);
      projectDetected = detectedProject?.name ?? 'Generic';

      // Load knowledge entries for the detected project (project-specific + global)
      const knowledgeEntries = (bot.knowledgeEntries as KnowledgeEntry[]).filter(
        e => !e.projectId || e.projectId === detectedProject?.id
      );

      // Generate the AI reply
      aiReply = await generateReply({
        commentText: comment.commentText,
        authorName: comment.authorName,
        postCaption,
        projectName: projectDetected ?? 'Generic',
        knowledgeEntries: knowledgeEntries.map(e => ({
          key: e.key,
          value: e.value,
          category: e.category,
        })),
        systemInstructions: bot.systemInstructions ?? '',
        maxChars: bot.replyMaxChars,
        tone: bot.replyTone,
        language: bot.language,
        platform: comment.platform,
        openaiApiKey: openaiApiKey!,
      });

      // Post the reply to Meta
      if (comment.platform === 'FACEBOOK') {
        aiReplyId = await metaClient.replyToFacebookComment(
          comment.commentId, aiReply, pageToken
        );
      } else {
        aiReplyId = await metaClient.replyToInstagramComment(
          comment.commentId, aiReply, pageToken
        );
      }

      action = 'REPLIED';
    }
  } catch (err) {
    action = 'ERROR';
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Pipeline] Error processing comment ${comment.commentId}:`, err);
  }

  await logComment({
    tenantId: bot.tenantId,
    botId,
    comment,
    action,
    aiReply,
    aiReplyId,
    projectDetected,
    processingMs: Date.now() - startTime,
    errorMessage,
  });
}
