-- ============================================================================
-- bootstrap-saas.sql — One-time production bootstrap for the SaaS credentials
-- auth migration (jul 2026).
--
-- What it does (all inside a single transaction, all idempotent):
--   (a) Deletes the three test users together with their NextAuth sessions
--       and accounts. One of them (cmo0eqi3500016vkfs3jdt8j4) shares a tenant
--       with the owner, so ONLY the user rows are deleted — tenants are never
--       touched here.
--   (b) Promotes the owner (cmnzf95rg0001atkf9o0en0cq) to super admin with
--       email duver20ac@gmail.com, a temporary bcrypt password hash and
--       mustChangePassword = true (forced password change on first login).
--   (c) Truncates the "Session" table: with the switch to the JWT session
--       strategy every old database session is dead weight.
--
-- BEFORE RUNNING:
--   1. Run the Prisma migration 20260721000000_saas_credentials_auth first
--      (adds "passwordHash", "status", "mustChangePassword", "lastLoginAt").
--   2. Replace __BCRYPT_HASH_PLACEHOLDER__ below with a real bcrypt hash
--      (cost 12) of the temporary password. Generate it on the server with:
--        node -e "console.log(require('bcryptjs').hashSync('TEMP_PASSWORD', 12))"
--
-- Run on the server:
--   psql "$DATABASE_URL" -f scripts/bootstrap-saas.sql
-- ============================================================================

BEGIN;

-- ─── (a) Remove test users (sessions + accounts + user rows only) ───────────
-- Test user ids:
--   cmqe7ak7j0030cgkf1mqntf81
--   cmqe5lpe30003cgkfgiue4sfr
--   cmo0eqi3500016vkfs3jdt8j4  (shares tenant with the owner → delete ONLY the user)

-- NextAuth sessions of the test users (also covered by (c), kept for clarity)
DELETE FROM "Session"
WHERE "userId" IN (
  'cmqe7ak7j0030cgkf1mqntf81',
  'cmqe5lpe30003cgkfgiue4sfr',
  'cmo0eqi3500016vkfs3jdt8j4'
);

-- NextAuth OAuth accounts of the test users
DELETE FROM "Account"
WHERE "userId" IN (
  'cmqe7ak7j0030cgkf1mqntf81',
  'cmqe5lpe30003cgkfgiue4sfr',
  'cmo0eqi3500016vkfs3jdt8j4'
);

-- The user rows themselves (tenants are intentionally left untouched)
DELETE FROM "User"
WHERE "id" IN (
  'cmqe7ak7j0030cgkf1mqntf81',
  'cmqe5lpe30003cgkfgiue4sfr',
  'cmo0eqi3500016vkfs3jdt8j4'
);

-- ─── (b) Promote the owner to super admin with a temporary password ─────────
-- Replace __BCRYPT_HASH_PLACEHOLDER__ with the real bcrypt hash (see header).
UPDATE "User"
SET "isSuperAdmin"       = true,
    "email"              = 'duver20ac@gmail.com',
    "passwordHash"       = '__BCRYPT_HASH_PLACEHOLDER__',
    "mustChangePassword" = true,
    "status"             = 'ACTIVE'
WHERE "id" = 'cmnzf95rg0001atkf9o0en0cq';

-- ─── (c) Drop every old database session (obsolete with JWT strategy) ───────
TRUNCATE TABLE "Session";

COMMIT;
