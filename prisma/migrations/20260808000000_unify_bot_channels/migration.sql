-- Unify Facebook + Instagram under a single bot.
--
-- Until now connecting a Page created one bot for the Page and a SECOND bot for
-- its linked Instagram account, each with its own configuration, knowledge base
-- and rules. From now on a bot is anchored to the Facebook Page and serves both
-- channels, with a switch per channel.

-- 1. Per-channel switches. Default true so every existing Facebook bot keeps
--    behaving exactly as it does today.
ALTER TABLE "Bot" ADD COLUMN "facebookEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Bot" ADD COLUMN "instagramEnabled" BOOLEAN NOT NULL DEFAULT true;

-- 2. Merge each Instagram bot into the bot of the Facebook Page it is linked
--    to. Everything the Instagram bot owns is reassigned first, so no history
--    or configuration is lost even if it had been set up. Where several bots
--    exist for the Page, pick the same one the webhook would: active first,
--    then oldest.
--
--    An Instagram bot whose Page is not connected (or has no bot) has no target
--    to merge into and is deliberately left untouched rather than deleted.

WITH ig_bot_map AS (
  SELECT ig_bot.id AS ig_bot_id,
         (SELECT b.id FROM "Bot" b
           WHERE b."accountId" = fb_acc.id AND b."tenantId" = fb_acc."tenantId"
           ORDER BY b."isActive" DESC, b."createdAt" ASC
           LIMIT 1) AS fb_bot_id
    FROM "Bot" ig_bot
    JOIN "SocialAccount" ig_acc ON ig_acc.id = ig_bot."accountId" AND ig_acc.platform = 'INSTAGRAM'
    JOIN "SocialAccount" fb_acc ON fb_acc.id = ig_acc."linkedFacebookPageId"
)
UPDATE "CommentLog" cl SET "botId" = m.fb_bot_id
  FROM ig_bot_map m
 WHERE cl."botId" = m.ig_bot_id AND m.fb_bot_id IS NOT NULL;

WITH ig_bot_map AS (
  SELECT ig_bot.id AS ig_bot_id,
         (SELECT b.id FROM "Bot" b
           WHERE b."accountId" = fb_acc.id AND b."tenantId" = fb_acc."tenantId"
           ORDER BY b."isActive" DESC, b."createdAt" ASC
           LIMIT 1) AS fb_bot_id
    FROM "Bot" ig_bot
    JOIN "SocialAccount" ig_acc ON ig_acc.id = ig_bot."accountId" AND ig_acc.platform = 'INSTAGRAM'
    JOIN "SocialAccount" fb_acc ON fb_acc.id = ig_acc."linkedFacebookPageId"
)
UPDATE "Project" p SET "botId" = m.fb_bot_id
  FROM ig_bot_map m
 WHERE p."botId" = m.ig_bot_id AND m.fb_bot_id IS NOT NULL;

WITH ig_bot_map AS (
  SELECT ig_bot.id AS ig_bot_id,
         (SELECT b.id FROM "Bot" b
           WHERE b."accountId" = fb_acc.id AND b."tenantId" = fb_acc."tenantId"
           ORDER BY b."isActive" DESC, b."createdAt" ASC
           LIMIT 1) AS fb_bot_id
    FROM "Bot" ig_bot
    JOIN "SocialAccount" ig_acc ON ig_acc.id = ig_bot."accountId" AND ig_acc.platform = 'INSTAGRAM'
    JOIN "SocialAccount" fb_acc ON fb_acc.id = ig_acc."linkedFacebookPageId"
)
UPDATE "KnowledgeEntry" ke SET "botId" = m.fb_bot_id
  FROM ig_bot_map m
 WHERE ke."botId" = m.ig_bot_id AND m.fb_bot_id IS NOT NULL;

WITH ig_bot_map AS (
  SELECT ig_bot.id AS ig_bot_id,
         (SELECT b.id FROM "Bot" b
           WHERE b."accountId" = fb_acc.id AND b."tenantId" = fb_acc."tenantId"
           ORDER BY b."isActive" DESC, b."createdAt" ASC
           LIMIT 1) AS fb_bot_id
    FROM "Bot" ig_bot
    JOIN "SocialAccount" ig_acc ON ig_acc.id = ig_bot."accountId" AND ig_acc.platform = 'INSTAGRAM'
    JOIN "SocialAccount" fb_acc ON fb_acc.id = ig_acc."linkedFacebookPageId"
)
DELETE FROM "Bot" b
  USING ig_bot_map m
 WHERE b.id = m.ig_bot_id AND m.fb_bot_id IS NOT NULL;
