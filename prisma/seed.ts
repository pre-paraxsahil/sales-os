import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BroStartup Sales OS development seed...');

  // 1. Core Default User (Single-User Personal Sales System)
  const defaultUser = await prisma.user.upsert({
    where: { email: 'founder@brostartup.com' },
    update: {},
    create: {
      email: 'founder@brostartup.com',
      name: 'BroStartup Founder',
      role: 'OWNER',
      status: 'ACTIVE',
      userSetting: {
        create: {
          theme: 'dark',
          preferences: JSON.stringify({
            currency: 'INR',
            workingHours: { start: '09:00', end: '19:00' },
          }),
        },
      },
    },
  });

  console.log(`✅ Default user configured: ${defaultUser.email} (${defaultUser.id})`);

  console.log('📌 Product Knowledge seed note: Product pricing and features are stored in PostgreSQL data tables (ProductOffering, Plan, PlanPrice, PlanFeature) and can be populated from verified product sheets without hardcoding in application logic.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
