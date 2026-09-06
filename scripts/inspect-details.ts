import { prisma } from '../src/lib/prisma';

async function checkDetails() {
  const demos = await prisma.demo.findMany({
    select: { id: true, leadId: true, status: true, scheduledAt: true, notes: true, createdAt: true }
  });
  console.log('DEMOS:', JSON.stringify(demos, null, 2));

  const sales = await prisma.sale.findMany({
    select: { id: true, leadId: true, amount: true, status: true, closedAt: true, createdAt: true }
  });
  console.log('SALES:', JSON.stringify(sales, null, 2));

  const followUps = await prisma.followUp.findMany({
    select: { id: true, leadId: true, type: true, status: true, scheduledAt: true, notes: true, createdAt: true }
  });
  console.log('FOLLOW-UPS:', JSON.stringify(followUps, null, 2));

  const reminders = await prisma.reminder.findMany({
    select: { id: true, leadId: true, title: true, type: true, remindAt: true, isRead: true, createdAt: true }
  });
  console.log('REMINDERS:', JSON.stringify(reminders, null, 2));

  const scheduleBlocks = await prisma.scheduleBlock.findMany({
    take: 10,
    select: { id: true, title: true, blockType: true, startTime: true, endTime: true, status: true }
  });
  console.log('SCHEDULE BLOCKS (10):', JSON.stringify(scheduleBlocks, null, 2));
}

checkDetails().finally(() => prisma.$disconnect());
