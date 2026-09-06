import { prisma } from '../src/lib/prisma';

async function auditDatabase() {
  console.log('====================================================');
  console.log('REAL DATA AUDIT — BROSTARTUP SALES OS (PRODUCTION DB)');
  console.log('====================================================\n');

  // 1. Core Counts
  const [
    productOfferings,
    plans,
    features,
    planFeatures,
    addons,
    whatsAppTemplates,
    users,
    userSettings,
    businesses,
    contacts,
    leads,
    calls,
    demos,
    opportunities,
    sales,
    followUps,
    reminders,
    tasks,
    activities,
    customerMemories,
    whatsAppMessages,
    targets,
    scheduleBlocks,
    workSessions,
    dailyReports,
    weeklyReports,
    monthlyReports,
  ] = await Promise.all([
    prisma.productOffering.findMany(),
    prisma.plan.findMany(),
    prisma.feature.findMany(),
    prisma.planFeature.findMany(),
    prisma.addon.findMany(),
    prisma.whatsAppTemplate.findMany(),
    prisma.user.findMany(),
    prisma.userSetting.findMany(),
    prisma.business.findMany(),
    prisma.contact.findMany(),
    prisma.lead.findMany({
      include: {
        business: true,
        contact: true,
        _count: {
          select: {
            calls: true,
            demos: true,
            sales: true,
            reminders: true,
            followUps: true,
            tasks: true,
            opportunities: true,
            activities: true,
            memories: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.call.findMany({ include: { lead: true } }),
    prisma.demo.findMany({ include: { lead: true } }),
    prisma.opportunity.findMany({ include: { lead: true } }),
    prisma.sale.findMany({ include: { lead: true } }),
    prisma.followUp.findMany({ include: { lead: true } }),
    prisma.reminder.findMany({ include: { lead: true } }),
    prisma.task.findMany({ include: { lead: true } }),
    prisma.activity.findMany({ include: { lead: true } }),
    prisma.customerMemory.findMany({ include: { lead: true } }),
    prisma.whatsAppMessage.findMany({ include: { lead: true } }),
    prisma.target.findMany(),
    prisma.scheduleBlock.findMany({ include: { lead: true } }),
    prisma.workSession.findMany(),
    prisma.dailyReport.findMany(),
    prisma.weeklyReport.findMany(),
    prisma.monthlyReport.findMany(),
  ]);

  console.log('TABLE RECORD COUNTS:');
  console.log('-----------------------------------------');
  console.log(`ProductOffering:      ${productOfferings.length}`);
  console.log(`Plan:                 ${plans.length}`);
  console.log(`Feature:              ${features.length}`);
  console.log(`PlanFeature:          ${planFeatures.length}`);
  console.log(`Addon:                ${addons.length}`);
  console.log(`WhatsAppTemplate:     ${whatsAppTemplates.length}`);
  console.log(`User:                 ${users.length}`);
  console.log(`UserSetting:          ${userSettings.length}`);
  console.log(`Business:             ${businesses.length}`);
  console.log(`Contact:              ${contacts.length}`);
  console.log(`Lead:                 ${leads.length}`);
  console.log(`Call:                 ${calls.length}`);
  console.log(`Demo:                 ${demos.length}`);
  console.log(`Opportunity:          ${opportunities.length}`);
  console.log(`Sale:                 ${sales.length}`);
  console.log(`FollowUp:             ${followUps.length}`);
  console.log(`Reminder:             ${reminders.length}`);
  console.log(`Task:                 ${tasks.length}`);
  console.log(`Activity:             ${activities.length}`);
  console.log(`CustomerMemory:       ${customerMemories.length}`);
  console.log(`WhatsAppMessage:      ${whatsAppMessages.length}`);
  console.log(`Target:               ${targets.length}`);
  console.log(`ScheduleBlock:        ${scheduleBlocks.length}`);
  console.log(`WorkSession:          ${workSessions.length}`);
  console.log(`DailyReport:          ${dailyReports.length}`);
  console.log(`WeeklyReport:         ${weeklyReports.length}`);
  console.log(`MonthlyReport:        ${monthlyReports.length}`);
  console.log('-----------------------------------------\n');

  // Classification logic
  // Clearly identifiable test markers:
  // - Title containing: 'Scenario', 'Test', 'Verification', 'PHASE', 'Mock', 'Sample', 'Temporary'
  // - Business name containing: 'Test', 'Temporary'
  // - Contact name containing: 'Test', 'Fake'
  // - Seed test leads from QA runs: 'Sahil Tech Ventures - Sahil Sharma' (generated 20+ artificial QA test calls/demos/sales across past QA suites)
  // - Real leads: manual user entries such as 'furniture - Adarsh'
  
  const testLeadIds = new Set<string>();
  const realLeadIds = new Set<string>();

  leads.forEach((l) => {
    const isTest =
      l.title.includes('Scenario') ||
      l.title.includes('Test') ||
      l.title.includes('Verification') ||
      l.title.includes('PHASE') ||
      l.title.includes('Mock') ||
      l.title.includes('Sample') ||
      l.title.includes('Temporary') ||
      l.title.includes('Sahil Tech') ||
      (l.business?.name && l.business.name.includes('Test')) ||
      (l.contact?.name && l.contact.name.includes('Test'));

    if (isTest) {
      testLeadIds.add(l.id);
    } else {
      realLeadIds.add(l.id);
    }
  });

  console.log('LEAD CLASSIFICATION:');
  console.log(`Total Leads: ${leads.length}`);
  console.log(`Test/Dummy Leads: ${testLeadIds.size}`);
  console.log(`Real Business Leads: ${realLeadIds.size}`);
  console.log('Real Leads List:');
  leads
    .filter((l) => realLeadIds.has(l.id))
    .forEach((l) => {
      console.log(`  - [ID: ${l.id}] "${l.title}" | Status: ${l.status} | CreatedAt: ${l.createdAt.toISOString()} | Archived: ${l.archivedAt ? 'YES' : 'NO'}`);
    });

  console.log('\nSample Test Leads List (first 10):');
  leads
    .filter((l) => testLeadIds.has(l.id))
    .slice(0, 10)
    .forEach((l) => {
      console.log(`  - [ID: ${l.id}] "${l.title}" | Status: ${l.status} | CreatedAt: ${l.createdAt.toISOString()}`);
    });

  // Orphan audits
  const orphanCalls = calls.filter((c) => !c.leadId || !c.lead);
  const orphanDemos = demos.filter((d) => !d.leadId || !d.lead);
  const orphanSales = sales.filter((s) => !s.leadId || !s.lead);
  const orphanFollowUps = followUps.filter((f) => !f.leadId || !f.lead);
  const orphanReminders = reminders.filter((r) => !r.leadId || !r.lead);
  const orphanTasks = tasks.filter((t) => t.leadId && !t.lead);
  const orphanActivities = activities.filter((a) => a.leadId && !a.lead);
  const orphanMemories = customerMemories.filter((m) => !m.leadId || !m.lead);

  console.log('\nORPHANED RECORDS SUMMARY:');
  console.log(`Orphaned Calls:           ${orphanCalls.length}`);
  console.log(`Orphaned Demos:           ${orphanDemos.length}`);
  console.log(`Orphaned Sales:           ${orphanSales.length}`);
  console.log(`Orphaned FollowUps:       ${orphanFollowUps.length}`);
  console.log(`Orphaned Reminders:       ${orphanReminders.length}`);
  console.log(`Orphaned Tasks:           ${orphanTasks.length}`);
  console.log(`Orphaned Activities:      ${orphanActivities.length}`);
  console.log(`Orphaned CustomerMemories:${orphanMemories.length}`);

  // Records linked to archived leads
  const archivedLeadIds = new Set(leads.filter((l) => l.archivedAt !== null).map((l) => l.id));
  const callsOnArchived = calls.filter((c) => c.leadId && archivedLeadIds.has(c.leadId));
  const remindersOnArchived = reminders.filter((r) => r.leadId && archivedLeadIds.has(r.leadId));
  const followUpsOnArchived = followUps.filter((f) => f.leadId && archivedLeadIds.has(f.leadId));
  const tasksOnArchived = tasks.filter((t) => t.leadId && archivedLeadIds.has(t.leadId));

  console.log(`\nRECORDS LINKED TO ARCHIVED LEADS (Archived Leads Count: ${archivedLeadIds.size}):`);
  console.log(`Calls on archived leads:     ${callsOnArchived.length}`);
  console.log(`Reminders on archived leads: ${remindersOnArchived.length}`);
  console.log(`FollowUps on archived leads: ${followUpsOnArchived.length}`);
  console.log(`Tasks on archived leads:     ${tasksOnArchived.length}`);

  // Transaction breakdown (Test vs Real)
  const testCalls = calls.filter((c) => !c.leadId || testLeadIds.has(c.leadId));
  const realCalls = calls.filter((c) => c.leadId && realLeadIds.has(c.leadId));

  const testDemos = demos.filter((d) => !d.leadId || testLeadIds.has(d.leadId));
  const realDemos = demos.filter((d) => d.leadId && realLeadIds.has(d.leadId));

  const testSales = sales.filter((s) => !s.leadId || testLeadIds.has(s.leadId));
  const realSales = sales.filter((s) => s.leadId && realLeadIds.has(s.leadId));

  const testReminders = reminders.filter((r) => !r.leadId || testLeadIds.has(r.leadId));
  const realReminders = reminders.filter((r) => r.leadId && realLeadIds.has(r.leadId));

  const testFollowUps = followUps.filter((f) => !f.leadId || testLeadIds.has(f.leadId));
  const realFollowUps = followUps.filter((f) => f.leadId && realLeadIds.has(f.leadId));

  const testTasks = tasks.filter((t) => !t.leadId || testLeadIds.has(t.leadId));
  const realTasks = tasks.filter((t) => t.leadId && realLeadIds.has(t.leadId));

  console.log('\nACTIVITY & TRANSACTION CLASSIFICATION:');
  console.log(`Calls:       ${testCalls.length} test / ${realCalls.length} real (Total: ${calls.length})`);
  console.log(`Demos:       ${testDemos.length} test / ${realDemos.length} real (Total: ${demos.length})`);
  console.log(`Sales:       ${testSales.length} test / ${realSales.length} real (Total: ${sales.length})`);
  console.log(`Reminders:   ${testReminders.length} test / ${realReminders.length} real (Total: ${reminders.length})`);
  console.log(`FollowUps:   ${testFollowUps.length} test / ${realFollowUps.length} real (Total: ${followUps.length})`);
  console.log(`Tasks:       ${testTasks.length} test / ${realTasks.length} real (Total: ${tasks.length})`);
}

auditDatabase()
  .catch((e) => {
    console.error('Audit failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

