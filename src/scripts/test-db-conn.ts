import { PrismaClient } from '@prisma/client';

async function main() {
  const p1 = new PrismaClient({
    datasourceUrl: 'postgresql://postgres:Sahil@0987@localhost:5432/brostartup_sales_os?schema=public'
  });
  const c1 = await p1.lead.count();
  console.log('p1 count (unencoded @):', c1);
  await p1.$disconnect();

  const p2 = new PrismaClient({
    datasourceUrl: 'postgresql://postgres:Sahil%400987@localhost:5432/brostartup_sales_os?schema=public'
  });
  const c2 = await p2.lead.count();
  console.log('p2 count (percent-encoded %40):', c2);
  await p2.$disconnect();
}

main().catch(console.error);
