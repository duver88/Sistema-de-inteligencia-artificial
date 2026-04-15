-- Make User.tenantId nullable so the PrismaAdapter can create the User
-- record on first OAuth login before the signIn callback assigns a tenant.
ALTER TABLE "User" ALTER COLUMN "tenantId" DROP NOT NULL;
