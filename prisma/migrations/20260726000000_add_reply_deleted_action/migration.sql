-- Add REPLY_DELETED to CommentAction: the reply published by the Page was
-- deleted, while the user's original comment is still live.
--
-- This migration is intentionally isolated: Postgres does not allow using a
-- newly added enum value inside the same transaction that adds it, so no
-- statement here may reference 'REPLY_DELETED'.

-- AlterEnum
ALTER TYPE "CommentAction" ADD VALUE IF NOT EXISTS 'REPLY_DELETED';
