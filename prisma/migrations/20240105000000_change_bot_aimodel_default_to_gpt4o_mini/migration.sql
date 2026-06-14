-- Bot.aiModel default changed to the model the code actually uses (OpenAI gpt-4o-mini).
-- The previous default ('claude-sonnet-4-20250514') was a dead/misleading value:
-- lib/ai/classifier.ts and lib/ai/responder.ts hardcode 'gpt-4o-mini' via the OpenAI SDK.
ALTER TABLE "Bot" ALTER COLUMN "aiModel" SET DEFAULT 'gpt-4o-mini';

-- Fix existing rows that still carry the old misleading default.
UPDATE "Bot" SET "aiModel" = 'gpt-4o-mini' WHERE "aiModel" = 'claude-sonnet-4-20250514';
