import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🚀 Running safe Phase 2 Target schema migration...');

  // Safe additive columns for Target
  const queries = [
    'ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetInterested" INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetFollowUps" INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetColdCalls" INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "targetInboundCalls" INTEGER NOT NULL DEFAULT 0;',
    'ALTER TABLE "Target" ADD COLUMN IF NOT EXISTS "notes" TEXT;',
    'CREATE INDEX IF NOT EXISTS "Target_userId_period_idx" ON "Target"("userId", "period");',
    'CREATE INDEX IF NOT EXISTS "Target_startDate_endDate_idx" ON "Target"("startDate", "endDate");',
  ];

  for (const q of queries) {
    await prisma.$executeRawUnsafe(q);
  }

  console.log('✅ Target columns and indexes added safely without data alteration.');
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
