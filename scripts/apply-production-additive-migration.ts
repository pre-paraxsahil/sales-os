import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🚀 Running Safe Minimal Additive Production Migration...');

  // 1. Attendance / WorkSession Table
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
  console.log('✅ Table "WorkSession" created/verified.');

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkSession_userId_fkey') THEN
        ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  console.log('✅ Foreign key WorkSession_userId_fkey verified.');

  const sessionIndexes = [
    'CREATE INDEX IF NOT EXISTS "WorkSession_userId_workDate_idx" ON "WorkSession"("userId", "workDate");',
    'CREATE INDEX IF NOT EXISTS "WorkSession_workDate_idx" ON "WorkSession"("workDate");',
    'CREATE INDEX IF NOT EXISTS "WorkSession_clockIn_idx" ON "WorkSession"("clockIn");',
  ];
  for (const idx of sessionIndexes) {
    await prisma.$executeRawUnsafe(idx);
  }
  console.log('✅ WorkSession indexes verified.');

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
    console.log('✅ LeadStatus.ARCHIVED enum verified.');
  } catch (e: any) {
    console.log(`Note on LeadStatus enum: ${e.message}`);
  }

  await prisma.$executeRawUnsafe(`ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Lead_archivedAt_idx" ON "Lead"("archivedAt");`);
  console.log('✅ Lead.archivedAt column and index verified.');

  // 3. Target Extended Columns
  const targetCols = [
    'ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetInterested" INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetFollowUps" INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetColdCalls" INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetInboundCalls" INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "notes" TEXT;',
    'CREATE INDEX IF NOT EXISTS "Target_userId_period_idx" ON "Target"("userId", "period");',
    'CREATE INDEX IF NOT EXISTS "Target_startDate_endDate_idx" ON "Target"("startDate", "endDate");',
  ];
  for (const q of targetCols) {
    await prisma.$executeRawUnsafe(q);
  }
  console.log('✅ Target extended columns and indexes verified.');

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
  console.log('✅ MonthlyReport table and index verified.');

  await prisma.$executeRawUnsafe(`ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PENDING';`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Reminder_status_idx" ON "Reminder"("status");`);
  console.log('✅ Reminder.status column and index verified.');

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
    } catch (e: any) {
      console.log(`Note on enum: ${e.message}`);
    }
  }
  console.log('✅ ActivityType and CallOutcome enums verified.');

  console.log('🎉 Production Additive Migration Completed with ZERO data modification.');
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
