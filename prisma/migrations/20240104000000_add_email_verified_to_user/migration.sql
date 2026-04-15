-- Add emailVerified field to User, required by @auth/prisma-adapter
ALTER TABLE "User" ADD COLUMN "emailVerified" TIMESTAMP(3);
