import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function generatePreCleanupReport() {
  console.log('--- 1. CREATING FULL DATABASE BACKUP ---');
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

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
      },
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

  const fullData = {
    backupTimestamp: new Date().toISOString(),
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
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `backup_before_phase10_cleanup_${timestamp}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(fullData, null, 2), 'utf8');
  console.log(`Backup successfully written to: ${backupFilePath}`);

  console.log('\n--- 2. IDENTIFYING PRESERVED VS PROPOSED CLEANUP RECORDS ---');

  // Real vs Test classification rules:
  // PRESERVED LEADS:
  // 1. "furniture - Adarsh" (Real active customer lead)
  // 2. "CLothing - Tarun" (Real archived customer lead)
  const realLeadIds = new Set([
    'f2457e20-0814-47cc-9fd0-dbbab9f26867', // furniture - Adarsh
    '06ab122f-78d7-4ba2-87c8-72458e71e172', // CLothing - Tarun
  ]);

  // Real Contacts & Businesses linked to real leads
  const realBusinessIds = new Set<string>();
  const realContactIds = new Set<string>();

  leads.forEach((l) => {
    if (realLeadIds.has(l.id)) {
      if (l.businessId) realBusinessIds.add(l.businessId);
      if (l.contactId) realContactIds.add(l.contactId);
    }
  });

  // Categorize Leads
  const preservedLeads = leads.filter((l) => realLeadIds.has(l.id));
  const proposedDeleteLeads = leads.filter((l) => !realLeadIds.has(l.id));

  // Categorize Calls
  const preservedCalls = calls.filter((c) => c.leadId && realLeadIds.has(c.leadId));
  const proposedDeleteCalls = calls.filter((c) => !c.leadId || !realLeadIds.has(c.leadId));

  // Categorize Demos
  const preservedDemos = demos.filter((d) => d.leadId && realLeadIds.has(d.leadId));
  const proposedDeleteDemos = demos.filter((d) => !d.leadId || !realLeadIds.has(d.leadId));

  // Categorize Sales
  const preservedSales = sales.filter((s) => s.leadId && realLeadIds.has(s.leadId));
  const proposedDeleteSales = sales.filter((s) => !s.leadId || !realLeadIds.has(s.leadId));

  // Categorize FollowUps
  const preservedFollowUps = followUps.filter((f) => f.leadId && realLeadIds.has(f.leadId));
  const proposedDeleteFollowUps = followUps.filter((f) => !f.leadId || !realLeadIds.has(f.leadId));

  // Categorize Reminders
  const preservedReminders = reminders.filter((r) => r.leadId && realLeadIds.has(r.leadId));
  const proposedDeleteReminders = reminders.filter((r) => !r.leadId || !realLeadIds.has(r.leadId));

  // Categorize Tasks
  const preservedTasks = tasks.filter((t) => t.leadId && realLeadIds.has(t.leadId));
  const proposedDeleteTasks = tasks.filter((t) => !t.leadId || !realLeadIds.has(t.leadId));

  // Categorize Activities
  const preservedActivities = activities.filter((a) => a.leadId && realLeadIds.has(a.leadId));
  const proposedDeleteActivities = activities.filter((a) => !a.leadId || !realLeadIds.has(a.leadId));

  // Categorize CustomerMemories
  const preservedMemories = customerMemories.filter((m) => m.leadId && realLeadIds.has(m.leadId));
  const proposedDeleteMemories = customerMemories.filter((m) => !m.leadId || !realLeadIds.has(m.leadId));

  // Categorize WhatsAppMessages
  const preservedWhatsAppMsgs = whatsAppMessages.filter((w) => w.leadId && realLeadIds.has(w.leadId));
  const proposedDeleteWhatsAppMsgs = whatsAppMessages.filter((w) => !w.leadId || !realLeadIds.has(w.leadId));

  // Categorize ScheduleBlocks
  const preservedScheduleBlocks = scheduleBlocks.filter((sb) => sb.leadId && realLeadIds.has(sb.leadId));
  const proposedDeleteScheduleBlocks = scheduleBlocks.filter((sb) => !sb.leadId || !realLeadIds.has(sb.leadId));

  // Categorize Reports (Historical QA Test artifacts)
  const proposedDeleteReports = [
    ...dailyReports.map((r) => ({ ...r, reportType: 'DailyReport' })),
    ...weeklyReports.map((r) => ({ ...r, reportType: 'WeeklyReport' })),
    ...monthlyReports.map((r) => ({ ...r, reportType: 'MonthlyReport' })),
  ];

  // Categorize Businesses & Contacts
  const preservedBusinesses = businesses.filter((b) => realBusinessIds.has(b.id));
  const proposedDeleteBusinesses = businesses.filter((b) => !realBusinessIds.has(b.id));

  const preservedContacts = contacts.filter((c) => realContactIds.has(c.id));
  const proposedDeleteContacts = contacts.filter((c) => !realContactIds.has(c.id));

  const totalPreservedCount =
    productOfferings.length +
    plans.length +
    features.length +
    planFeatures.length +
    addons.length +
    whatsAppTemplates.length +
    users.length +
    userSettings.length +
    targets.length +
    workSessions.length +
    preservedLeads.length +
    preservedBusinesses.length +
    preservedContacts.length +
    preservedCalls.length +
    preservedDemos.length +
    preservedSales.length +
    preservedFollowUps.length +
    preservedReminders.length +
    preservedTasks.length +
    preservedActivities.length +
    preservedMemories.length +
    preservedWhatsAppMsgs.length +
    preservedScheduleBlocks.length;

  const totalDeleteCount =
    proposedDeleteLeads.length +
    proposedDeleteCalls.length +
    proposedDeleteDemos.length +
    proposedDeleteSales.length +
    proposedDeleteFollowUps.length +
    proposedDeleteReminders.length +
    proposedDeleteTasks.length +
    proposedDeleteActivities.length +
    proposedDeleteMemories.length +
    proposedDeleteWhatsAppMsgs.length +
    proposedDeleteScheduleBlocks.length +
    proposedDeleteReports.length +
    proposedDeleteBusinesses.length +
    proposedDeleteContacts.length;

  console.log('SUMMARY OF PROPOSED DATA ACTION:');
  console.log(`Total Records to PRESERVE: ${totalPreservedCount}`);
  console.log(`Total Records to CLEAN UP: ${totalDeleteCount}`);

  // Write a comprehensive detailed inventory to scratch JSON / Markdown for full transparency
  const reportSummary = {
    backupFile: backupFilePath,
    totalPreservedCount,
    totalDeleteCount,
    preservedBreakdown: {
      ProductOffering: productOfferings.length,
      Plan: plans.length,
      Feature: features.length,
      PlanFeature: planFeatures.length,
      Addon: addons.length,
      WhatsAppTemplate: whatsAppTemplates.length,
      User: users.length,
      UserSetting: userSettings.length,
      Target: targets.length,
      WorkSession: workSessions.length,
      Lead: preservedLeads.length,
      Business: preservedBusinesses.length,
      Contact: preservedContacts.length,
      Call: preservedCalls.length,
      Reminder: preservedReminders.length,
      FollowUp: preservedFollowUps.length,
      Activity: preservedActivities.length,
    },
    proposedDeleteBreakdown: {
      Lead: proposedDeleteLeads.length,
      Call: proposedDeleteCalls.length,
      Demo: proposedDeleteDemos.length,
      Sale: proposedDeleteSales.length,
      FollowUp: proposedDeleteFollowUps.length,
      Reminder: proposedDeleteReminders.length,
      Task: proposedDeleteTasks.length,
      Activity: proposedDeleteActivities.length,
      CustomerMemory: proposedDeleteMemories.length,
      WhatsAppMessage: proposedDeleteWhatsAppMsgs.length,
      ScheduleBlock: proposedDeleteScheduleBlocks.length,
      Reports: proposedDeleteReports.length,
      Business: proposedDeleteBusinesses.length,
      Contact: proposedDeleteContacts.length,
    },
    proposedDeleteLeads: proposedDeleteLeads.map((l) => ({
      id: l.id,
      title: l.title,
      createdAt: l.createdAt,
      status: l.status,
      business: l.business?.name,
      contact: l.contact?.name,
      reason: 'Synthetic QA/Test Lead from previous verification phase',
    })),
    proposedDeleteCalls: proposedDeleteCalls.map((c) => ({
      id: c.id,
      type: c.callType,
      outcome: c.outcome,
      createdAt: c.createdAt,
      leadTitle: c.lead?.title || 'ORPHANED',
      reason: c.leadId ? 'Synthetic call attached to test lead' : 'Orphaned call record without lead',
    })),
    proposedDeleteDemos: proposedDeleteDemos.map((d) => ({
      id: d.id,
      status: d.status,
      createdAt: d.createdAt,
      leadTitle: d.lead?.title || 'ORPHANED',
      reason: d.leadId ? 'Synthetic demo attached to test lead' : 'Orphaned demo record without lead',
    })),
    proposedDeleteSales: proposedDeleteSales.map((s) => ({
      id: s.id,
      amount: s.amount,
      createdAt: s.createdAt,
      leadTitle: s.lead?.title || 'ORPHANED',
      reason: 'Synthetic test sale created in previous QA run',
    })),
    proposedDeleteReminders: proposedDeleteReminders.map((r) => ({
      id: r.id,
      title: r.title,
      remindAt: r.remindAt,
      createdAt: r.createdAt,
      leadTitle: r.lead?.title || 'ORPHANED',
      reason: r.leadId ? 'Test reminder attached to test lead' : 'Orphaned reminder without lead',
    })),
    proposedDeleteFollowUps: proposedDeleteFollowUps.map((f) => ({
      id: f.id,
      type: f.type,
      scheduledAt: f.scheduledAt,
      createdAt: f.createdAt,
      leadTitle: f.lead?.title || 'ORPHANED',
      reason: 'Test follow-up attached to test lead',
    })),
    proposedDeleteTasks: proposedDeleteTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      createdAt: t.createdAt,
      leadTitle: t.lead?.title || 'NONE',
      reason: 'Temporary test task created in Phase 9 verification',
    })),
    proposedDeleteActivities: proposedDeleteActivities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      createdAt: a.createdAt,
      leadTitle: a.lead?.title || 'ORPHANED',
      reason: 'Test activity event log generated by QA runs',
    })),
    proposedDeleteMemories: proposedDeleteMemories.map((m) => ({
      id: m.id,
      key: m.key,
      value: m.value,
      createdAt: m.createdAt,
      leadTitle: m.lead?.title || 'ORPHANED',
      reason: 'Test customer memory generated in previous phases',
    })),
    proposedDeleteScheduleBlocks: proposedDeleteScheduleBlocks.map((sb) => ({
      id: sb.id,
      title: sb.title,
      createdAt: sb.createdAt,
      leadTitle: sb.lead?.title || 'ORPHANED',
      reason: 'Test schedule block generated in previous phases',
    })),
    proposedDeleteReports: proposedDeleteReports.map((rp) => ({
      id: rp.id,
      reportType: rp.reportType,
      createdAt: rp.createdAt,
      reason: 'Historical report generated during Phase 6/8 QA verification runs',
    })),
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'backups', 'pre_cleanup_audit_details.json'),
    JSON.stringify(reportSummary, null, 2)
  );

  console.log('Saved detailed pre-cleanup audit JSON to backups/pre_cleanup_audit_details.json');
}

generatePreCleanupReport()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
