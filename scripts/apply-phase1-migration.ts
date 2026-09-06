import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🚀 Running safe Phase 1 schema migration...');

  // 1. Create WorkSession table if it doesn't exist
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

  // 2. Add Foreign Key if not exists
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkSession_userId_fkey'
      ) THEN
        ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  console.log('✅ Foreign key constraint verified.');

  // 3. Create Indexes safely
  const indexes = [
    'CREATE INDEX IF NOT EXISTS "WorkSession_userId_workDate_idx" ON "WorkSession"("userId", "workDate");',
    'CREATE INDEX IF NOT EXISTS "WorkSession_workDate_idx" ON "WorkSession"("workDate");',
    'CREATE INDEX IF NOT EXISTS "WorkSession_clockIn_idx" ON "WorkSession"("clockIn");',
    'CREATE INDEX IF NOT EXISTS "Call_userId_occurredAt_idx" ON "Call"("userId", "occurredAt");',
    'CREATE INDEX IF NOT EXISTS "Call_outcome_occurredAt_idx" ON "Call"("outcome", "occurredAt");',
    'CREATE INDEX IF NOT EXISTS "FollowUp_userId_status_scheduledAt_idx" ON "FollowUp"("userId", "status", "scheduledAt");',
    'CREATE INDEX IF NOT EXISTS "Demo_userId_status_scheduledAt_idx" ON "Demo"("userId", "status", "scheduledAt");',
    'CREATE INDEX IF NOT EXISTS "Reminder_userId_isRead_remindAt_idx" ON "Reminder"("userId", "isRead", "remindAt");',
  ];

  for (const idxSql of indexes) {
    await prisma.$executeRawUnsafe(idxSql);
  }
  console.log('✅ Performance indexes created/verified.');
  console.log('🎉 Phase 1 DB migration completed safely without data loss.');
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
