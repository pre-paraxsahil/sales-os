import { prisma } from '@/lib/prisma';

let isEnsured = false;
let ongoingPromise: Promise<void> | null = null;

/**
 * Safe, idempotent runtime database schema synchronizer.
 * Ensures missing tables, columns, and enums exist on the production database without any data loss.
 * Runs once per container lifecycle.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (isEnsured) return;
  if (ongoingPromise) return ongoingPromise;

  ongoingPromise = (async () => {
    try {
      // 1. WorkSession Table
      await prisma.$executeRawUnsafe(`
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
      `);

      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkSession_userId_fkey') THEN
            ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WorkSession_userId_workDate_idx" ON "WorkSession"("userId", "workDate");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WorkSession_workDate_idx" ON "WorkSession"("workDate");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WorkSession_clockIn_idx" ON "WorkSession"("clockIn");`);

      // 2. Lead Soft-Delete & Enum
      try {
        await prisma.$executeRawUnsafe(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ARCHIVED' AND enumtypid = 'public."LeadStatus"'::regtype) THEN
              ALTER TYPE "LeadStatus" ADD VALUE 'ARCHIVED';
            END IF;
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END $$;
        `);
      } catch {
        // Safe to ignore if already exists or concurrent
      }

      await prisma.$executeRawUnsafe(`ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Lead_archivedAt_idx" ON "Lead"("archivedAt");`);

      // 3. Target Extended Columns
      await prisma.$executeRawUnsafe(`ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetInterested" INTEGER NOT NULL DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetFollowUps" INTEGER NOT NULL DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetColdCalls" INTEGER NOT NULL DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetInboundCalls" INTEGER NOT NULL DEFAULT 0;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "notes" TEXT;`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Target_userId_period_idx" ON "Target"("userId", "period");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Target_startDate_endDate_idx" ON "Target"("startDate", "endDate");`);

      // 4. MonthlyReport & Reminder Supporting Fields
      await prisma.$executeRawUnsafe(`
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
      `);

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyReport_userId_monthStartDate_key" ON "MonthlyReport"("userId", "monthStartDate");
      `);

      await prisma.$executeRawUnsafe(`ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PENDING';`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Reminder_status_idx" ON "Reminder"("status");`);

      // 5. Enum values
      const enumQueries = [
        `DO $$ BEGIN ALTER TYPE "CallOutcome" ADD VALUE IF NOT EXISTS 'CALLBACK_REQUESTED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'MEETING'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'SAMPLE_SENT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'PROPOSAL_SENT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'EMAIL_SENT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'RESEARCH'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'CLIENT_VISIT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'NEGOTIATION'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'OTHER_ACTIVITY'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      ];

      for (const eq of enumQueries) {
        try {
          await prisma.$executeRawUnsafe(eq);
        } catch {
          // Safe to ignore duplicate enum values
        }
      }

      isEnsured = true;
    } catch (err) {
      console.warn('ensureDatabaseSchema notice:', err);
    } finally {
      ongoingPromise = null;
    }
  })();

  return ongoingPromise;
}
