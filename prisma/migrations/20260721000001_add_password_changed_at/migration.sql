-- Track the last password change so JWTs issued before it can be rejected
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
