-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('OWNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('START', 'PRO', 'PREMIUM', 'ULTIMATE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('PAYME', 'CLICK');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED');

-- CreateTable
CREATE TABLE "developers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "qrCodeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "district" TEXT,
    "description" TEXT,
    "advantages" TEXT[],
    "mapEmbedUrl" TEXT,
    "totalFloors" INTEGER,
    "totalUnits" INTEGER,
    "badgeVerified" BOOLEAN NOT NULL DEFAULT false,
    "badgeTrusted" BOOLEAN NOT NULL DEFAULT false,
    "topInCatalog" BOOLEAN NOT NULL DEFAULT false,
    "topInHome" BOOLEAN NOT NULL DEFAULT false,
    "deliveryDate" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT 'https://via.placeholder.com/800x600?text=Project+Image',
    "videoUrl" TEXT,
    "developerId" INTEGER NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "developerId" INTEGER NOT NULL,
    "role" "ProjectMemberRole" NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_sessions" (
    "id" SERIAL NOT NULL,
    "developerId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_subscriptions" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'START',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialStartsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "provider" "BillingProvider",
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "amountUsd" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "externalRef" TEXT,
    "checkoutUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_webhook_events" (
    "id" SERIAL NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "externalRef" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartments" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "rooms" INTEGER NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "floor" INTEGER NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "apartments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "apartmentId" INTEGER,
    "projectId" INTEGER,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_media" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_reviews" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_feedback" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "developers_email_key" ON "developers"("email");

-- CreateIndex
CREATE INDEX "projects_developerId_idx" ON "projects"("developerId");

-- CreateIndex
CREATE INDEX "project_members_developerId_idx" ON "project_members"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_projectId_developerId_key" ON "project_members"("projectId", "developerId");

-- CreateIndex
CREATE UNIQUE INDEX "developer_sessions_token_key" ON "developer_sessions"("token");

-- CreateIndex
CREATE INDEX "developer_sessions_developerId_idx" ON "developer_sessions"("developerId");

-- CreateIndex
CREATE INDEX "developer_sessions_token_idx" ON "developer_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "project_subscriptions_projectId_key" ON "project_subscriptions"("projectId");

-- CreateIndex
CREATE INDEX "project_subscriptions_status_idx" ON "project_subscriptions"("status");

-- CreateIndex
CREATE INDEX "project_subscriptions_plan_idx" ON "project_subscriptions"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoices_externalRef_key" ON "billing_invoices"("externalRef");

-- CreateIndex
CREATE INDEX "billing_invoices_projectId_idx" ON "billing_invoices"("projectId");

-- CreateIndex
CREATE INDEX "billing_invoices_provider_status_idx" ON "billing_invoices"("provider", "status");

-- CreateIndex
CREATE INDEX "billing_webhook_events_externalRef_idx" ON "billing_webhook_events"("externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "billing_webhook_events_provider_externalRef_status_key" ON "billing_webhook_events"("provider", "externalRef", "status");

-- CreateIndex
CREATE INDEX "apartments_projectId_idx" ON "apartments"("projectId");

-- CreateIndex
CREATE INDEX "leads_projectId_idx" ON "leads"("projectId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_apartmentId_idx" ON "leads"("apartmentId");

-- CreateIndex
CREATE INDEX "project_media_projectId_idx" ON "project_media"("projectId");

-- CreateIndex
CREATE INDEX "project_reviews_projectId_idx" ON "project_reviews"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_feedback_leadId_key" ON "lead_feedback"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_feedback_token_key" ON "lead_feedback"("token");

-- CreateIndex
CREATE INDEX "lead_feedback_token_idx" ON "lead_feedback"("token");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_sessions" ADD CONSTRAINT "developer_sessions_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_subscriptions" ADD CONSTRAINT "project_subscriptions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_reviews" ADD CONSTRAINT "project_reviews_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_feedback" ADD CONSTRAINT "lead_feedback_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

