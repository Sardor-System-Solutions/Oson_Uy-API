-- Promo codes and redemptions

DO $$ BEGIN
  CREATE TYPE "PromoBenefitType" AS ENUM ('FREE_DAYS', 'PERCENT_OFF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "promo_codes" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "benefit_type" "PromoBenefitType" NOT NULL,
  "free_days" INTEGER,
  "percent_off" INTEGER,
  "plan" "SubscriptionPlan",
  "starts_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "max_redemptions" INTEGER,
  "redeemed_count" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_key" ON "promo_codes"("code");
CREATE INDEX IF NOT EXISTS "promo_codes_active_idx" ON "promo_codes"("active");
CREATE INDEX IF NOT EXISTS "promo_codes_expires_at_idx" ON "promo_codes"("expires_at");

CREATE TABLE IF NOT EXISTS "promo_redemptions" (
  "id" SERIAL NOT NULL,
  "promo_code_id" INTEGER NOT NULL,
  "developer_id" INTEGER,
  "project_id" INTEGER,
  "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "promo_redemptions_promo_code_id_idx" ON "promo_redemptions"("promo_code_id");
CREATE INDEX IF NOT EXISTS "promo_redemptions_developer_id_idx" ON "promo_redemptions"("developer_id");
CREATE INDEX IF NOT EXISTS "promo_redemptions_project_id_idx" ON "promo_redemptions"("project_id");

ALTER TABLE "promo_redemptions"
  ADD CONSTRAINT "promo_redemptions_promo_code_id_fkey"
  FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "promo_redemptions"
  ADD CONSTRAINT "promo_redemptions_developer_id_fkey"
  FOREIGN KEY ("developer_id") REFERENCES "developers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "promo_redemptions"
  ADD CONSTRAINT "promo_redemptions_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Allow only one redemption per (promo,developer,project) combination
DO $$ BEGIN
  ALTER TABLE "promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_unique_combo"
    UNIQUE ("promo_code_id", "developer_id", "project_id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

