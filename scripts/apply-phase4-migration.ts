import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🚀 Running safe Phase 4 Fast Call Logging & Soft-Delete schema migration...');

  // 1. Additive enum value for LeadStatus
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';`);
    console.log('✅ LeadStatus.ARCHIVED enum added or already exists.');
  } catch (e: any) {
    console.log(`Note for LeadStatus ARCHIVED: ${e.message}`);
  }

  // 2. Additive column on Lead for soft-deletion / archiving
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);`);
    console.log('✅ Lead.archivedAt column added or already exists.');
  } catch (e: any) {
    console.log(`Note for Lead.archivedAt column: ${e.message}`);
  }

  // 3. Performance Index on Lead.archivedAt
  try {
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Lead_archivedAt_idx" ON "Lead"("archivedAt");`);
    console.log('✅ Lead_archivedAt_idx index created or already exists.');
  } catch (e: any) {
    console.log(`Note for Lead_archivedAt_idx: ${e.message}`);
  }

  console.log('✅ Phase 4 schema migration completed safely and additively.');
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
