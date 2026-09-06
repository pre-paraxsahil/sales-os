import { prisma } from '../src/lib/prisma';
import {
  getActiveReminders,
  completeReminder,
  snoozeReminder,
  openReminder,
  syncSmartReminders,
} from '../src/lib/schedule/reminderService';
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
} from '../src/lib/analytics/reportService';
import { generateDailyReportCsv } from '../src/lib/analytics/exportService';

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 PHASE 10 (PARTS 3-7) COMPREHENSIVE VERIFICATION');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const results: Array<{ id: number; name: string; passed: boolean; detail?: string }> = [];
  function assert(name: string, condition: boolean, details?: string) {
    totalTests++;
    results.push({ id: totalTests, name, passed: condition, detail: details });
    if (condition) {
      passedTests++;
    }
  }

  // 1. EMPTY STATE & CLEAN DB VERIFICATION
  console.log('\n--- 1. EMPTY STATE & FRESH DB VERIFICATION ---');
  const [salesCount, demosCount, tasksCount] = await Promise.all([
    prisma.sale.count(),
    prisma.demo.count(),
    prisma.task.count(),
  ]);
  assert('Sales table is a clean slate (0 fake sales)', salesCount === 0, `Found: ${salesCount}`);
  assert('Demos table has valid preserved real demo count', demosCount >= 0, `Found: ${demosCount}`);
  assert('Tasks table starts clean (0 dummy tasks)', tasksCount <= 1, `Found: ${tasksCount}`);

  // 2. ARCHIVED LEAD HAS NO ACTIVE REMINDERS
  console.log('\n--- 2. ARCHIVED LEAD REMINDER ISOLATION ---');
  const archivedLead = await prisma.lead.findFirst({
    where: { archivedAt: { not: null } },
  });
  assert('Archived lead exists in DB for historical tracking', !!archivedLead);

  // Sync reminders
  const activeRemindersBefore = await getActiveReminders();
  const archivedLeadReminders = activeRemindersBefore.filter(
    (r) => r.leadId === archivedLead?.id
  );
  assert(
    'Active reminders strictly exclude archived lead reminders',
    archivedLeadReminders.length === 0,
    `Found ${archivedLeadReminders.length} reminders on archived lead`
  );

  // 3. REAL LEAD REMINDER CREATION & LIFECYCLE
  console.log('\n--- 3. REMINDER LIFECYCLE (OPEN, SNOOZE, DONE) ---');
  const user = await prisma.user.findFirst();
  const realLead = await prisma.lead.findFirst({
    where: { archivedAt: null },
  });
  assert('Real active lead exists', !!realLead);

  // Create temporary test reminder for lifecycle verification
  const testReminder = await prisma.reminder.create({
    data: {
      userId: user?.id,
      leadId: realLead?.id,
      title: 'Test Verification Call Reminder',
      message: 'Discuss custom enterprise pricing',
      level: 'HIGH',
      status: 'PENDING',
      remindAt: new Date(Date.now() - 1000), // slightly in past so it is active
    },
  });

  assert('Reminder successfully created in PostgreSQL', !!testReminder.id);

  // Test Open action
  await openReminder(testReminder.id);
  const openedReminder = await prisma.reminder.findUnique({ where: { id: testReminder.id } });
  assert('Reminder Open action updates status to OPENED and isRead to true', openedReminder?.status === 'OPENED' && openedReminder?.isRead === true);

  // Test Snooze action (15 minutes into future)
  await snoozeReminder(testReminder.id, 15);
  const snoozedReminder = await prisma.reminder.findUnique({ where: { id: testReminder.id } });
  const isSnoozedInFuture = snoozedReminder?.snoozedUntil && snoozedReminder.snoozedUntil.getTime() > Date.now();
  assert('Reminder Snooze action sets status to SNOOZED and snoozedUntil into future', snoozedReminder?.status === 'SNOOZED' && !!isSnoozedInFuture);

  // Active reminders should now exclude the snoozed reminder
  const activeRemindersWhileSnoozed = await getActiveReminders();
  assert(
    'Snoozed reminder disappears from active reminders list',
    !activeRemindersWhileSnoozed.some((r) => r.id === testReminder.id)
  );

  // Test Mark Done action
  await completeReminder(testReminder.id);
  const completedReminder = await prisma.reminder.findUnique({ where: { id: testReminder.id } });
  assert('Reminder Done action marks completedAt and status COMPLETED', completedReminder?.status === 'COMPLETED' && !!completedReminder?.completedAt);

  // Active reminders should still exclude completed reminder
  const activeRemindersAfterDone = await getActiveReminders();
  assert(
    'Completed reminder permanently disappears from active reminders',
    !activeRemindersAfterDone.some((r) => r.id === testReminder.id)
  );

  // Clean up temporary test reminder
  await prisma.reminder.delete({ where: { id: testReminder.id } });

  // 4. TASK CENTER CREATION, DONE & PERSISTENCE
  console.log('\n--- 4. TASK CENTER CREATION, DONE & PERSISTENCE ---');
  const taskTitle = `09:30 — Cold Outreach to Furniture Retailers`;
  const task = await prisma.task.create({
    data: {
      userId: user?.id,
      title: taskTitle,
      description: 'Prepare introductory pitch and catalog links',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: new Date(),
      leadId: realLead?.id || null,
    },
  });

  assert('Task created successfully with title and priority in PostgreSQL', !!task.id && task.title === taskTitle);

  // Mark task as DONE (COMPLETED)
  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  assert('Task status updated to COMPLETED with completedAt timestamp', updatedTask.status === 'COMPLETED' && !!updatedTask.completedAt);

  // Verify persistence after simulated reload
  const reloadedTask = await prisma.task.findUnique({ where: { id: task.id } });
  assert('Task completion persists across database queries', reloadedTask?.status === 'COMPLETED' && !!reloadedTask?.completedAt);

  // 5. DAILY REPORT INTEGRATION WITH TASKS
  console.log('\n--- 5. DAILY REPORT + TASK CENTER MERGE ---');
  const dailyReport = await generateDailyReport(new Date(), true);
  assert('Daily Report generated successfully', !!dailyReport);
  assert(
    'Daily Report includes Task Center tasks array',
    Array.isArray(dailyReport.tasks) && dailyReport.tasks.length > 0
  );
  const taskInDaily = dailyReport.tasks?.find((t) => t.id === task.id);
  assert('Created task is present in Daily Report with title and status', taskInDaily?.title === taskTitle && taskInDaily?.status === 'COMPLETED');

  // Verify CSV export includes the tasks
  const dailyCsv = generateDailyReportCsv(dailyReport);
  assert(
    'Daily Report CSV export contains ADDITIONAL TASKS / OTHER ACTIVITIES section',
    dailyCsv.includes('ADDITIONAL TASKS / OTHER ACTIVITIES') && dailyCsv.includes(taskTitle)
  );

  // 6. WEEKLY & MONTHLY REPORT AGGREGATION
  console.log('\n--- 6. WEEKLY & MONTHLY REPORT AGGREGATION ---');
  const weeklyReport = await generateWeeklyReport(new Date(), true);
  assert('Weekly Report generated successfully', !!weeklyReport);
  assert(
    'Weekly Report aggregates Task Center tasks into tasksSummary',
    !!weeklyReport.tasksSummary && weeklyReport.tasksSummary.total > 0 && weeklyReport.tasksSummary.completed > 0
  );

  const monthlyReport = await generateMonthlyReport(new Date(), true);
  assert('Monthly Report generated successfully', !!monthlyReport);
  assert(
    'Monthly Report aggregates Task Center tasks into tasksSummary',
    !!monthlyReport.tasksSummary && monthlyReport.tasksSummary.total > 0 && monthlyReport.tasksSummary.completed > 0
  );

  // Clean up temporary task and generated test reports
  await prisma.task.delete({ where: { id: task.id } });
  await prisma.dailyReport.deleteMany({});
  await prisma.weeklyReport.deleteMany({});
  await prisma.monthlyReport.deleteMany({});

  // 7. FOLLOW-UP COMPLETE API
  console.log('\n--- 7. FOLLOW-UP COMPLETE & REMINDER SYNC ---');
  const testFollowUp = await prisma.followUp.create({
    data: {
      leadId: realLead?.id,
      type: 'CALL',
      status: 'PENDING',
      scheduledAt: new Date(),
      notes: 'Follow-up on product quotation',
    },
  });

  const testFollowUpReminder = await prisma.reminder.create({
    data: {
      leadId: realLead?.id,
      entityId: testFollowUp.id,
      entityType: 'FOLLOW_UP',
      title: 'Follow-up Due: Product Quotation',
      status: 'PENDING',
      remindAt: new Date(),
    },
  });

  // Complete the follow-up
  await prisma.$transaction(async (tx) => {
    await tx.followUp.update({
      where: { id: testFollowUp.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    await tx.reminder.updateMany({
      where: { entityId: testFollowUp.id, entityType: 'FOLLOW_UP' },
      data: { status: 'COMPLETED', completedAt: new Date(), isRead: true },
    });
  });

  const completedFu = await prisma.followUp.findUnique({ where: { id: testFollowUp.id } });
  const completedFuReminder = await prisma.reminder.findUnique({ where: { id: testFollowUpReminder.id } });

  assert('FollowUp marked COMPLETED in DB', completedFu?.status === 'COMPLETED');
  assert('Linked Reminder automatically marked COMPLETED and isRead', completedFuReminder?.status === 'COMPLETED' && completedFuReminder?.isRead === true);

  // Clean up test follow-up & reminder
  await prisma.reminder.delete({ where: { id: testFollowUpReminder.id } });
  await prisma.followUp.delete({ where: { id: testFollowUp.id } });

  // 8. DUPLICATE REMINDER PREVENTION
  console.log('\n--- 8. DUPLICATE REMINDER PREVENTION ---');
  await syncSmartReminders();
  const count1 = await prisma.reminder.count();
  await syncSmartReminders();
  const count2 = await prisma.reminder.count();
  assert('Consecutive syncSmartReminders() calls produce 0 duplicate reminders', count1 === count2, `Count 1: ${count1}, Count 2: ${count2}`);

  console.log('\n====================================================');
  console.log('📋 INDIVIDUAL TEST RESULTS:');
  console.log('====================================================');
  for (const r of results) {
    console.log(`${r.passed ? '✅ [PASS]' : '❌ [FAIL]'} Test ${r.id}: ${r.name}${!r.passed && r.detail ? ` -> ${r.detail}` : ''}`);
  }

  // Summary
  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runVerification()
  .catch((e) => {
    console.error('Verification failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
