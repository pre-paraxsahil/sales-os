import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBaseline() {
  console.log('--- BUILD 13: BASELINE DATA INVENTORY ---');
  const leads = await prisma.lead.count();
  const calls = await prisma.call.count();
  const demos = await prisma.demo.count();
  const followUps = await prisma.followUp.count();
  const tasks = await prisma.task.count();
  const whatsAppMsgs = await prisma.whatsAppMessage.count();
  const sales = await prisma.sale.count();
  const memories = await prisma.customerMemory.count();
  const dailyReports = await prisma.dailyReport.count();
  const weeklyReports = await prisma.weeklyReport.count();
  const targets = await prisma.target.count();

  console.log(`Leads: ${leads}`);
  console.log(`Calls: ${calls}`);
  console.log(`Demos: ${demos}`);
  console.log(`Follow-ups: ${followUps}`);
  console.log(`Tasks: ${tasks}`);
  console.log(`WhatsApp Messages: ${whatsAppMsgs}`);
  console.log(`Sales: ${sales}`);
  console.log(`Customer Memories: ${memories}`);
  console.log(`Daily Reports: ${dailyReports}`);
  console.log(`Weekly Reports: ${weeklyReports}`);
  console.log(`Sales Targets: ${targets}`);
  console.log('-----------------------------------------');

  await prisma.$disconnect();
}

checkBaseline().catch((err) => {
  console.error(err);
  process.exit(1);
});
