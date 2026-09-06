import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- DB INSPECTION START ---');
  try {
    const userCount = await prisma.user.count();
    const businessCount = await prisma.business.count();
    const contactCount = await prisma.contact.count();
    const leadCount = await prisma.lead.count();
    const opportunityCount = await prisma.opportunity.count();
    const saleCount = await prisma.sale.count();
    const callCount = await prisma.call.count();
    const demoCount = await prisma.demo.count();
    const noteCount = await prisma.note.count();
    const activityCount = await prisma.activity.count();
    const taskCount = await prisma.task.count();
    const followUpCount = await prisma.followUp.count();
    const reminderCount = await prisma.reminder.count();
    const scheduleBlockCount = await prisma.scheduleBlock.count();
    const whatsAppMessageCount = await prisma.whatsAppMessage.count();
    const whatsAppTemplateCount = await prisma.whatsAppTemplate.count();
    const userSettingCount = await prisma.userSetting.count();
    const productOfferingCount = await prisma.productOffering.count();
    const planCount = await prisma.plan.count();
    const featureCount = await prisma.feature.count();

    console.log('COUNTS:', JSON.stringify({
      users: userCount,
      businesses: businessCount,
      contacts: contactCount,
      leads: leadCount,
      opportunities: opportunityCount,
      sales: saleCount,
      calls: callCount,
      demos: demoCount,
      notes: noteCount,
      activities: activityCount,
      tasks: taskCount,
      followUps: followUpCount,
      reminders: reminderCount,
      scheduleBlocks: scheduleBlockCount,
      whatsAppMessages: whatsAppMessageCount,
      whatsAppTemplates: whatsAppTemplateCount,
      userSettings: userSettingCount,
      productOfferings: productOfferingCount,
      plans: planCount,
      features: featureCount,
    }, null, 2));

    const sampleLeads = await prisma.lead.findMany({
      take: 10,
      select: { id: true, title: true, source: true, status: true, createdAt: true, temperature: true }
    });
    console.log('Sample Leads:', JSON.stringify(sampleLeads, null, 2));

    const sampleCalls = await prisma.call.findMany({
      take: 10,
      select: { id: true, callType: true, outcome: true, occurredAt: true, notes: true, leadId: true }
    });
    console.log('Sample Calls:', JSON.stringify(sampleCalls, null, 2));

    const sampleSettings = await prisma.userSetting.findMany();
    console.log('User Settings:', JSON.stringify(sampleSettings, null, 2));

    const sampleUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    });
    console.log('Users:', JSON.stringify(sampleUsers, null, 2));

  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
