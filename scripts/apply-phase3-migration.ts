import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🚀 Running safe Phase 3 Reporting & Activity schema migration...');

  // 1. Additive enum values for ActivityType
  const activityEnumValues = [
    'MEETING',
    'SAMPLE_SENT',
    'PROPOSAL_SENT',
    'EMAIL_SENT',
    'RESEARCH',
    'CLIENT_VISIT',
    'NEGOTIATION',
    'OTHER_ACTIVITY',
  ];

  for (const val of activityEnumValues) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS '${val}';`);
    } catch (e: any) {
      console.log(`Note for ActivityType value ${val}: ${e.message}`);
    }
  }

  // 2. Additive enum value for CallOutcome
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "CallOutcome" ADD VALUE IF NOT EXISTS 'CALLBACK_REQUESTED';`);
  } catch (e: any) {
    console.log(`Note for CallOutcome value CALLBACK_REQUESTED: ${e.message}`);
  }

  // 3. Create MonthlyReport table if not exists
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

  // 4. Performance Indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS "Activity_occurredAt_type_idx" ON "Activity"("occurredAt", "type");',
    'CREATE INDEX IF NOT EXISTS "Call_occurredAt_callType_idx" ON "Call"("occurredAt", "callType");',
    'CREATE INDEX IF NOT EXISTS "Call_occurredAt_outcome_idx" ON "Call"("occurredAt", "outcome");',
  ];

  for (const idx of indexes) {
    try {
      await prisma.$executeRawUnsafe(idx);
    } catch (e: any) {
      console.log(`Index note: ${e.message}`);
    }
  }

  console.log('✅ Phase 3 schema migration completed safely and additively.');
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
