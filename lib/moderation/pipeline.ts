import { prisma } from '@/lib/prisma';
import { matchesKeywords } from './keyword-detector';
import { classifyComment } from '@/lib/ai/classifier';
import { generateReply } from '@/lib/ai/responder';
import { getOpenAiApiKey } from '@/lib/ai/key';
import { recordAiUsage } from '@/lib/ai/usage';
import { metaClient } from '@/lib/meta/client';
import { decrypt } from '@/lib/crypto';
import type { ParsedComment } from '@/lib/meta/webhook';
import type { CommentAction, Platform, Project, KnowledgeEntry } from '@/lib/generated/prisma/client';

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
    console.log(
      `[Pipeline] 💾 Guardado en DB: commentId=${params.comment.commentId} · action=${params.action} · ` +
      `${params.processingMs}ms${params.errorMessage ? ` · motivo="${params.errorMessage}"` : ''} → visible en /comments`
    );
  } catch (err) {
    console.error(`[Pipeline] ❌ Falló al guardar commentId=${params.comment.commentId} en DB:`, err);
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

  console.log(`[Pipeline] ▶️ Procesando commentId=${comment.commentId} (botId=${botId}, plataforma=${comment.platform})`);

  // Load bot config with related data (including tenant for API key)
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    include: {
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

  // The account the comment actually came from. A bot is anchored to a Facebook
  // Page but also serves the Instagram account linked to it, so the bot's own
  // account is not necessarily the source. Resolving by the comment's platform
  // + pageId gives the right page token and the right tenant to verify.
  const sourceAccount = await prisma.socialAccount.findUnique({
    where: {
      platform_pageId: { platform: comment.platform, pageId: comment.pageId },
    },
  });

  if (!sourceAccount) {
    console.warn(
      `[Pipeline] ⚠️ Sin SocialAccount para ${comment.platform} ${comment.pageId} — ` +
      `comentario ${comment.commentId} descartado`
    );
    return;
  }

  // Tenant integrity guard: the bot must belong to the same tenant as the
  // account the comment came from. An orphan bot (left behind when the account
  // moved to another tenant) must never process comments — it would moderate
  // with the old tenant's config, bill the old tenant's OpenAI key and write
  // the CommentLog into the wrong tenant.
  if (bot.tenantId !== sourceAccount.tenantId) {
    console.warn(
      `[Pipeline] ⚠️ Bot ${botId} (tenant ${bot.tenantId}) does not match the comment's account tenant ` +
      `(${sourceAccount.tenantId}) — comment ${comment.commentId} skipped`
    );
    return;
  }

  // Per-channel switch. Re-checked here and not only at the webhook: a job
  // enqueued before the owner turned the channel off must not still act on it.
  const channelEnabled =
    comment.platform === 'INSTAGRAM' ? bot.instagramEnabled : bot.facebookEnabled;
  if (!channelEnabled) {
    await logComment({
      tenantId: bot.tenantId,
      botId,
      comment,
      action: 'IGNORED',
      processingMs: Date.now() - startTime,
      errorMessage: `${comment.platform} channel is disabled for this bot`,
    });
    return;
  }

  // Idempotency guard: if this comment already produced an action (reply,
  // delete, hide, or a reply that was later deleted by hand), a redelivered
  // webhook must NOT run the pipeline again — otherwise the bot posts a second
  // public reply for the same comment, including on comments whose reply the
  // user deliberately removed.
  const alreadyProcessed = await prisma.commentLog.findFirst({
    where: {
      platform: comment.platform,
      commentId: comment.commentId,
      action: { in: ['REPLIED', 'DELETED', 'HIDDEN', 'MANUAL_REPLY', 'MANUAL_DELETE', 'REPLY_DELETED'] },
    },
    select: { id: true },
  });
  if (alreadyProcessed) {
    console.warn(`[Pipeline] Comment ${comment.commentId} already processed — skipping duplicate delivery`);
    return;
  }

  // Resolve the OpenAI API key before doing any AI work:
  // platform-wide AppSetting first, legacy tenant key as fallback.
  let openaiApiKey: string | null = null;
  if (bot.aiEnabled || bot.autoReply) {
    openaiApiKey = await getOpenAiApiKey(bot.tenant.openaiApiKey);
    if (!openaiApiKey) {
      await logComment({
        tenantId: bot.tenantId,
        botId,
        comment,
        action: 'IGNORED',
        processingMs: Date.now() - startTime,
        errorMessage: 'OpenAI API key not configured — contact your administrator',
      });
      return;
    }
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

  try {
    // Decrypt inside the try so a corrupt token is logged as ERROR instead of
    // throwing and dropping the comment with no CommentLog trail.
    const pageToken = decrypt(sourceAccount.pageToken);

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
          await metaClient.hideInstagramComment(comment.commentId, pageToken);
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
      const { classification, usage: classifyUsage } = await classifyComment(
        comment.commentText,
        openaiApiKey!,
        {
          deleteInstructions: bot.deleteInstructions,
          spamInstructions: bot.spamInstructions,
          // The owner's own description of the account, so the classifier
          // judges a dental clinic, a news page or a developer by what they
          // actually are instead of a hardcoded industry.
          businessContext: bot.systemInstructions,
        }
      );

      if (classifyUsage) {
        await recordAiUsage(bot.tenantId, classifyUsage.model, classifyUsage);
      }

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
          await metaClient.hideInstagramComment(comment.commentId, pageToken);
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
      const replyResult = await generateReply({
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

      if (replyResult.usage) {
        await recordAiUsage(bot.tenantId, replyResult.usage.model, replyResult.usage);
      }

      aiReply = replyResult.reply;

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
