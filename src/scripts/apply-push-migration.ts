import { prisma } from '../lib/prisma';

async function main() {
  console.log('Applying PushSubscription migration SQL safely...');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."Reminder"
    ADD COLUMN IF NOT EXISTS "isSent" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "clickUrl" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."PushSubscription" (
        "id" TEXT NOT NULL,
        "userId" TEXT,
        "endpoint" TEXT NOT NULL,
        "p256dh" TEXT NOT NULL,
        "auth" TEXT NOT NULL,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "lastUsedAt" TIMESTAMP(3),
        "revokedAt" TIMESTAMP(3),

        CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "public"."PushSubscription"("endpoint");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "public"."PushSubscription"("userId");
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PushSubscription_userId_fkey'
      ) THEN
        ALTER TABLE "public"."PushSubscription"
        ADD CONSTRAINT "PushSubscription_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  console.log('Migration SQL applied cleanly and non-destructively!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
