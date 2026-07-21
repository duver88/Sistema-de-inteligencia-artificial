-- ============================================================================
-- cleanup-duplicate-bots.sql
--
-- Repairs the damage caused by the account-reassignment bug in
-- app/api/accounts/callback/route.ts: when a page already connected under
-- another tenant was re-connected, the SocialAccount moved to the new tenant
-- but its Bots/CommentLogs stayed behind, and an empty duplicate bot was
-- created. Production symptom: 34 bots for 31 accounts, orphan bots holding
-- the real configuration under old tenants.
--
-- What this script does, in one transaction:
--   1. For every SocialAccount with MORE THAN ONE bot, picks a keeper bot.
--      CommentLog volume does NOT identify the configured bot (the pre-fix
--      webhook picked an unordered `take: 1` among active bots, and the fixed
--      webhook routes new comments to the tenant-matching — often empty —
--      duplicate), so the keeper preference is, in order:
--        a. a CONFIGURED bot (has knowledge entries, projects, system
--           instructions or keyword rules) over an unconfigured one — the
--           whole point of this cleanup is to rescue that configuration;
--        b. among equally-configured bots, the bot already under the
--           account's CURRENT tenant (product contract: the page belongs to
--           the last tenant that connected it, and that tenant's user can
--           only have configured the bot they can see);
--        c. then most CommentLogs, oldest createdAt, lowest id (determinism).
--   2. Snapshots every row it is about to delete into persistent backup
--      tables ("CleanupBackup_Bot", "CleanupBackup_KnowledgeEntry",
--      "CleanupBackup_Project") so nothing is lost irreversibly. Inspect or
--      restore from them after the run; drop them once verified.
--   3. Reassigns the CommentLogs of the discarded bots to the kept bot.
--   4. Deletes KnowledgeEntry and Project rows of the discarded bots, then
--      the discarded bots themselves.
--   5. Aligns Bot.tenantId and CommentLog.tenantId with the tenantId of the
--      bot's SocialAccount, so nothing remains under a stale tenant.
--
-- Idempotent: after a successful run every account has at most one bot and
-- all tenantIds are aligned, so re-running the script finds nothing to change
-- (the backup tables persist and simply receive no new rows).
--
-- Preview first (dry run): run everything up to the DELETEs and inspect
--   SELECT * FROM tmp_bots_to_delete;  then ROLLBACK — or just check the
--   backup tables after a real run before dropping them.
--
-- Run with:  psql "$DATABASE_URL" -f scripts/cleanup-duplicate-bots.sql
-- ============================================================================

BEGIN;

-- ── Step 1: pick the keeper bot for each account that has duplicates ────────
CREATE TEMP TABLE tmp_bot_keepers ON COMMIT DROP AS
SELECT keeper."accountId", keeper.id AS keeper_id
FROM (
    SELECT DISTINCT ON (b."accountId")
           b."accountId",
           b.id
    FROM "Bot" b
    JOIN "SocialAccount" sa ON sa.id = b."accountId"
    LEFT JOIN (
        SELECT "botId", COUNT(*) AS log_count
        FROM "CommentLog"
        GROUP BY "botId"
    ) c ON c."botId" = b.id
    ORDER BY b."accountId",
             -- (a) configured bots win over empty duplicates
             (EXISTS (SELECT 1 FROM "KnowledgeEntry" ke WHERE ke."botId" = b.id)
              OR EXISTS (SELECT 1 FROM "Project" p WHERE p."botId" = b.id)
              OR (b."systemInstructions" IS NOT NULL
                  AND btrim(b."systemInstructions") <> '')
              OR b."deleteKeywords"::text <> '[]'
              OR b."spamKeywords"::text <> '[]') DESC,
             -- (b) then the bot already under the account's current tenant
             (b."tenantId" = sa."tenantId") DESC,
             -- (c) then usage volume, age, id
             COALESCE(c.log_count, 0) DESC,
             b."createdAt" ASC,
             b.id ASC
) keeper
-- Only accounts that actually have duplicates
WHERE keeper."accountId" IN (
    SELECT "accountId"
    FROM "Bot"
    GROUP BY "accountId"
    HAVING COUNT(*) > 1
);

-- All bots on those accounts that are NOT the keeper get discarded.
CREATE TEMP TABLE tmp_bots_to_delete ON COMMIT DROP AS
SELECT b.id AS bot_id, k.keeper_id
FROM "Bot" b
JOIN tmp_bot_keepers k ON k."accountId" = b."accountId"
WHERE b.id <> k.keeper_id;

-- ── Step 2: back up everything that will be deleted ─────────────────────────
-- Persistent tables (no constraints/indexes — pure snapshots). Restoring a
-- row is a plain INSERT ... SELECT back into the original table.
CREATE TABLE IF NOT EXISTS "CleanupBackup_Bot"
    AS SELECT * FROM "Bot" WHERE false;
CREATE TABLE IF NOT EXISTS "CleanupBackup_KnowledgeEntry"
    AS SELECT * FROM "KnowledgeEntry" WHERE false;
CREATE TABLE IF NOT EXISTS "CleanupBackup_Project"
    AS SELECT * FROM "Project" WHERE false;

INSERT INTO "CleanupBackup_Bot"
SELECT b.* FROM "Bot" b
WHERE b.id IN (SELECT bot_id FROM tmp_bots_to_delete);

INSERT INTO "CleanupBackup_KnowledgeEntry"
SELECT ke.* FROM "KnowledgeEntry" ke
WHERE ke."botId" IN (SELECT bot_id FROM tmp_bots_to_delete);

INSERT INTO "CleanupBackup_Project"
SELECT p.* FROM "Project" p
WHERE p."botId" IN (SELECT bot_id FROM tmp_bots_to_delete);

-- ── Step 3: move CommentLogs from discarded bots to the keeper ───────────────
UPDATE "CommentLog" cl
SET "botId" = d.keeper_id
FROM tmp_bots_to_delete d
WHERE cl."botId" = d.bot_id;

-- ── Step 4: delete the discarded bots' children, then the bots ───────────────
-- KnowledgeEntry references Project, so knowledge entries go first.
DELETE FROM "KnowledgeEntry"
WHERE "botId" IN (SELECT bot_id FROM tmp_bots_to_delete);

DELETE FROM "Project"
WHERE "botId" IN (SELECT bot_id FROM tmp_bots_to_delete);

DELETE FROM "Bot"
WHERE id IN (SELECT bot_id FROM tmp_bots_to_delete);

-- ── Step 5: align tenantIds with the owning SocialAccount ────────────────────
-- Every bot must live in the same tenant as its account (product contract:
-- the page belongs to the tenant that last connected it via OAuth).
UPDATE "Bot" b
SET "tenantId" = sa."tenantId"
FROM "SocialAccount" sa
WHERE sa.id = b."accountId"
  AND b."tenantId" <> sa."tenantId";

-- And every CommentLog must live in the same tenant as its bot's account.
UPDATE "CommentLog" cl
SET "tenantId" = sa."tenantId"
FROM "Bot" b
JOIN "SocialAccount" sa ON sa.id = b."accountId"
WHERE cl."botId" = b.id
  AND cl."tenantId" <> sa."tenantId";

COMMIT;

-- ── Post-run verification (read-only, optional) ──────────────────────────────
-- Should return 0 rows: accounts with more than one bot.
--   SELECT "accountId", COUNT(*) FROM "Bot" GROUP BY "accountId" HAVING COUNT(*) > 1;
-- Should return 0 rows: bots whose tenant differs from their account's tenant.
--   SELECT b.id FROM "Bot" b JOIN "SocialAccount" sa ON sa.id = b."accountId"
--   WHERE b."tenantId" <> sa."tenantId";
-- Should return 0 rows: comment logs whose tenant differs from their bot's tenant.
--   SELECT cl.id FROM "CommentLog" cl JOIN "Bot" b ON b.id = cl."botId"
--   WHERE cl."tenantId" <> b."tenantId";
-- What was removed (and can be restored from) is in:
--   SELECT * FROM "CleanupBackup_Bot";
--   SELECT * FROM "CleanupBackup_KnowledgeEntry";
--   SELECT * FROM "CleanupBackup_Project";
-- Once verified, the backup tables can be dropped:
--   DROP TABLE "CleanupBackup_KnowledgeEntry", "CleanupBackup_Project", "CleanupBackup_Bot";
