import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🚀 Running safe Phase 5 Real Sales Reminder & Notification Engine schema migration...');

  // 1. Additive column on Reminder for status lifecycle
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PENDING';`);
    console.log('✅ Reminder.status column added or already exists.');
  } catch (e: any) {
    console.log(`Note for Reminder.status column: ${e.message}`);
  }

  // 2. Performance Index on Reminder.status
  try {
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Reminder_status_idx" ON "Reminder"("status");`);
    console.log('✅ Reminder_status_idx index created or already exists.');
  } catch (e: any) {
    console.log(`Note for Reminder_status_idx: ${e.message}`);
  }

  console.log('✅ Phase 5 schema migration completed safely and additively.');
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
