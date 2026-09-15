ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "access_token_expires_at" timestamp with time zone;
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "refresh_token_expires_at" timestamp with time zone;
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "scope" text;
