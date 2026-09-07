-- 1. Attendance / WorkSession Table
CREATE TABLE IF NOT EXISTS "WorkSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workDate" TEXT NOT NULL,
  "clockIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "clockOut" TIMESTAMP(3),
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkSession_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkSession_userId_fkey') THEN
    ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "WorkSession_userId_workDate_idx" ON "WorkSession"("userId", "workDate");
CREATE INDEX IF NOT EXISTS "WorkSession_workDate_idx" ON "WorkSession"("workDate");
CREATE INDEX IF NOT EXISTS "WorkSession_clockIn_idx" ON "WorkSession"("clockIn");

-- 2. Lead Soft-Delete & Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ARCHIVED' AND enumtypid = 'public."LeadStatus"'::regtype) THEN
    ALTER TYPE "LeadStatus" ADD VALUE 'ARCHIVED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Lead_archivedAt_idx" ON "Lead"("archivedAt");

-- 3. Target Extended Columns
ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetInterested" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetFollowUps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetColdCalls" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetInboundCalls" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "notes" TEXT;
CREATE INDEX IF NOT EXISTS "Target_userId_period_idx" ON "Target"("userId", "period");
CREATE INDEX IF NOT EXISTS "Target_startDate_endDate_idx" ON "Target"("startDate", "endDate");

-- 4. MonthlyReport & Reminder Supporting Fields
CREATE TABLE IF NOT EXISTS "MonthlyReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "monthStartDate" TIMESTAMP(3) NOT NULL,
  "monthEndDate" TIMESTAMP(3) NOT NULL,
  "totalCalls" INTEGER NOT NULL DEFAULT 0,
  "totalDemos" INTEGER NOT NULL DEFAULT 0,
  "totalSalesAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "rawData" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonthlyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyReport_userId_monthStartDate_key" ON "MonthlyReport"("userId", "monthStartDate");

ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PENDING';
CREATE INDEX IF NOT EXISTS "Reminder_status_idx" ON "Reminder"("status");

-- 5. Enum values
DO $$ BEGIN ALTER TYPE "CallOutcome" ADD VALUE IF NOT EXISTS 'CALLBACK_REQUESTED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'MEETING'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'SAMPLE_SENT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'PROPOSAL_SENT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'EMAIL_SENT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'RESEARCH'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'CLIENT_VISIT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'NEGOTIATION'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'OTHER_ACTIVITY'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
