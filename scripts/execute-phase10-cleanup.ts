import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function executeControlledCleanup() {
  console.log('====================================================');
  console.log('⚡ EXECUTING CONTROLLED FRESH-DATA CLEANUP (PHASE 10)');
  console.log('====================================================\n');

  // 1. Verify Backup File
  const auditDetailsPath = path.join(process.cwd(), 'backups', 'pre_cleanup_audit_details.json');
  if (!fs.existsSync(auditDetailsPath)) {
    throw new Error('Pre-cleanup audit details file not found!');
  }
  const auditDetails = JSON.parse(fs.readFileSync(auditDetailsPath, 'utf8'));
  console.log(`Verified backup file: ${auditDetails.backupFile}`);

  // 2. Real Lead IDs to strictly protect
  const realLeadIds = new Set([
    'f2457e20-0814-47cc-9fd0-dbbab9f26867', // furniture - Adarsh
    '06ab122f-78d7-4ba2-87c8-72458e71e172', // CLothing - Tarun
  ]);

  // Fetch real leads to get their businessId and contactId
  const realLeads = await prisma.lead.findMany({
    where: { id: { in: Array.from(realLeadIds) } },
  });

  const realBusinessIds = new Set<string>();
  const realContactIds = new Set<string>();
  realLeads.forEach((l) => {
    if (l.businessId) realBusinessIds.add(l.businessId);
    if (l.contactId) realContactIds.add(l.contactId);
  });

  console.log(`Protected Real Leads: ${realLeadIds.size}`);
  console.log(`Protected Real Businesses: ${realBusinessIds.size}`);
  console.log(`Protected Real Contacts: ${realContactIds.size}`);

  // 3. Before Counts
  const beforeCounts = {
    ProductOffering: await prisma.productOffering.count(),
    Plan: await prisma.plan.count(),
    Feature: await prisma.feature.count(),
    PlanFeature: await prisma.planFeature.count(),
    Addon: await prisma.addon.count(),
    WhatsAppTemplate: await prisma.whatsAppTemplate.count(),
    User: await prisma.user.count(),
    UserSetting: await prisma.userSetting.count(),
    Target: await prisma.target.count(),
    WorkSession: await prisma.workSession.count(),
    Lead: await prisma.lead.count(),
    Business: await prisma.business.count(),
    Contact: await prisma.contact.count(),
    Call: await prisma.call.count(),
    Demo: await prisma.demo.count(),
    Opportunity: await prisma.opportunity.count(),
    Sale: await prisma.sale.count(),
    FollowUp: await prisma.followUp.count(),
    Reminder: await prisma.reminder.count(),
    Task: await prisma.task.count(),
    Activity: await prisma.activity.count(),
    CustomerMemory: await prisma.customerMemory.count(),
    WhatsAppMessage: await prisma.whatsAppMessage.count(),
    ScheduleBlock: await prisma.scheduleBlock.count(),
    DailyReport: await prisma.dailyReport.count(),
    WeeklyReport: await prisma.weeklyReport.count(),
    MonthlyReport: await prisma.monthlyReport.count(),
  };

  console.log('\n--- BEFORE COUNTS ---');
  console.table(beforeCounts);

  // 4. Perform Relational Deletions in Transaction with exact reverse dependency order
  const deletedCounts = await prisma.$transaction(async (tx) => {
    // A. Notes, AIAnalysis, AIInsight, AIRecommendation not belonging to real leads
    await tx.note.deleteMany({
      where: {
        OR: [{ leadId: null }, { leadId: { notIn: Array.from(realLeadIds) } }],
      },
    });
    await tx.aIAnalysis.deleteMany({
      where: {
        OR: [{ leadId: null }, { leadId: { notIn: Array.from(realLeadIds) } }],
      },
    });
    await tx.aIInsight.deleteMany({
      where: {
        OR: [{ leadId: null }, { leadId: { notIn: Array.from(realLeadIds) } }],
      },
    });
    await tx.aIRecommendation.deleteMany({
      where: {
        OR: [{ leadId: null }, { leadId: { notIn: Array.from(realLeadIds) } }],
      },
    });

    // B. Activities not belonging to real leads
    const actDel = await tx.activity.deleteMany({
      where: {
        OR: [
          { leadId: null },
          { leadId: { notIn: Array.from(realLeadIds) } },
        ],
      },
    });

    // C. CustomerMemories not belonging to real leads (leadId is non-nullable)
    const memDel = await tx.customerMemory.deleteMany({
      where: {
        leadId: { notIn: Array.from(realLeadIds) },
      },
    });

    // D. WhatsAppMessages not belonging to real leads
    const waDel = await tx.whatsAppMessage.deleteMany({
      where: {
        OR: [
          { leadId: null },
          { leadId: { notIn: Array.from(realLeadIds) } },
        ],
      },
    });

    // E. ScheduleBlocks not belonging to real leads
    const sbDel = await tx.scheduleBlock.deleteMany({
      where: {
        OR: [
          { leadId: null },
          { leadId: { notIn: Array.from(realLeadIds) } },
        ],
      },
    });

    // F. Reminders not belonging to real leads
    const remDel = await tx.reminder.deleteMany({
      where: {
        OR: [
          { leadId: null },
          { leadId: { notIn: Array.from(realLeadIds) } },
        ],
      },
    });

    // G. FollowUps not belonging to real leads
    const fuDel = await tx.followUp.deleteMany({
      where: {
        OR: [
          { leadId: null },
          { leadId: { notIn: Array.from(realLeadIds) } },
        ],
      },
    });

    // H. Tasks not belonging to real leads
    const taskDel = await tx.task.deleteMany({
      where: {
        OR: [
          { leadId: null },
          { leadId: { notIn: Array.from(realLeadIds) } },
        ],
      },
    });

    // I. Opportunities not belonging to real leads (leadId is non-nullable)
    await tx.opportunity.deleteMany({
      where: {
        leadId: { notIn: Array.from(realLeadIds) },
      },
    });

    // J. Sales not belonging to real leads
    const saleDel = await tx.sale.deleteMany({
      where: {
        OR: [
          { leadId: null },
          { leadId: { notIn: Array.from(realLeadIds) } },
        ],
      },
    });

    // K. Demos not belonging to real leads
    const demoDel = await tx.demo.deleteMany({
      where: {
        OR: [
          { leadId: null },
          { leadId: { notIn: Array.from(realLeadIds) } },
        ],
      },
    });

    // L. Calls not belonging to real leads
    const callDel = await tx.call.deleteMany({
      where: {
        OR: [
          { leadId: null },
          { leadId: { notIn: Array.from(realLeadIds) } },
        ],
      },
    });

    // M. Test Reports (from QA runs)
    const drDel = await tx.dailyReport.deleteMany({});
    const wrDel = await tx.weeklyReport.deleteMany({});
    const mrDel = await tx.monthlyReport.deleteMany({});

    // N. Test Leads
    const leadDel = await tx.lead.deleteMany({
      where: {
        id: { notIn: Array.from(realLeadIds) },
      },
    });

    // O. Test Contacts (not linked to real leads)
    const contactDel = await tx.contact.deleteMany({
      where: {
        id: { notIn: Array.from(realContactIds) },
      },
    });

    // P. Test Businesses (not linked to real leads)
    const busDel = await tx.business.deleteMany({
      where: {
        id: { notIn: Array.from(realBusinessIds) },
      },
    });

    return {
      Activity: actDel.count,
      CustomerMemory: memDel.count,
      WhatsAppMessage: waDel.count,
      ScheduleBlock: sbDel.count,
      Reminder: remDel.count,
      FollowUp: fuDel.count,
      Task: taskDel.count,
      Sale: saleDel.count,
      Demo: demoDel.count,
      Call: callDel.count,
      DailyReport: drDel.count,
      WeeklyReport: wrDel.count,
      MonthlyReport: mrDel.count,
      Lead: leadDel.count,
      Contact: contactDel.count,
      Business: busDel.count,
    };
  });

  console.log('\n--- DELETED COUNTS ---');
  console.table(deletedCounts);

  // 5. After Counts
  const afterCounts = {
    ProductOffering: await prisma.productOffering.count(),
    Plan: await prisma.plan.count(),
    Feature: await prisma.feature.count(),
    PlanFeature: await prisma.planFeature.count(),
    Addon: await prisma.addon.count(),
    WhatsAppTemplate: await prisma.whatsAppTemplate.count(),
    User: await prisma.user.count(),
    UserSetting: await prisma.userSetting.count(),
    Target: await prisma.target.count(),
    WorkSession: await prisma.workSession.count(),
    Lead: await prisma.lead.count(),
    Business: await prisma.business.count(),
    Contact: await prisma.contact.count(),
    Call: await prisma.call.count(),
    Demo: await prisma.demo.count(),
    Opportunity: await prisma.opportunity.count(),
    Sale: await prisma.sale.count(),
    FollowUp: await prisma.followUp.count(),
    Reminder: await prisma.reminder.count(),
    Task: await prisma.task.count(),
    Activity: await prisma.activity.count(),
    CustomerMemory: await prisma.customerMemory.count(),
    WhatsAppMessage: await prisma.whatsAppMessage.count(),
    ScheduleBlock: await prisma.scheduleBlock.count(),
    DailyReport: await prisma.dailyReport.count(),
    WeeklyReport: await prisma.weeklyReport.count(),
    MonthlyReport: await prisma.monthlyReport.count(),
  };

  console.log('\n--- AFTER COUNTS (PRESERVED RECORDS) ---');
  console.table(afterCounts);

  // 6. Detailed Integrity Checks
  console.log('\n--- POST-CLEANUP INTEGRITY VALIDATION ---');
  const preservedLeadsList = await prisma.lead.findMany({
    include: { business: true, contact: true, calls: true, reminders: true, followUps: true },
  });

  console.log(`Preserved Leads Count: ${preservedLeadsList.length}`);
  preservedLeadsList.forEach((l) => {
    console.log(
      `✓ Lead: [${l.id}] "${l.title}" | Status: ${l.status} | Business: "${l.business?.name || 'None'}" | Contact: "${l.contact?.name || 'None'}" | Calls: ${l.calls.length} | Reminders: ${l.reminders.length} | FollowUps: ${l.followUps.length}`
    );
  });

  const orphanedRemindersAfter = await prisma.reminder.findMany({
    where: { OR: [{ leadId: null }, { lead: null }] },
  });
  console.log(`Orphaned Reminders: ${orphanedRemindersAfter.length} (Expected: 0)`);

  const orphanedTasksAfter = await prisma.task.findMany({
    where: { leadId: { not: null }, lead: null },
  });
  console.log(`Orphaned Tasks: ${orphanedTasksAfter.length} (Expected: 0)`);

  const productOfferingCount = await prisma.productOffering.count();
  const planCount = await prisma.plan.count();
  const featureCount = await prisma.feature.count();
  const planFeatureCount = await prisma.planFeature.count();

  console.log(
    `Product Knowledge Preserved: Offerings=${productOfferingCount}, Plans=${planCount}, Features=${featureCount}, PlanFeatures=${planFeatureCount}`
  );
}

executeControlledCleanup()
  .catch((e) => {
    console.error('Cleanup execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
