-- Migration: add_openai_key_to_tenant
-- Adds encrypted OpenAI API key storage to the Tenant model

ALTER TABLE "Tenant" ADD COLUMN "openaiApiKey" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "openaiKeySetAt" TIMESTAMP(3);
