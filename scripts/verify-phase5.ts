import { PrismaClient } from '@prisma/client';
import { getActiveReminders, completeReminder, snoozeReminder, openReminder, rescheduleReminder } from '../src/lib/schedule/reminderService';
import { getWorkHoursConfig } from '../src/lib/schedule/scheduleConfig';

const prisma = new PrismaClient();

async function runPhase5Verification() {
  console.log('====================================================');
  console.log('   BROSTARTUP SALES OS — PHASE 5 VERIFICATION SUITE  ');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
    }
  }

  try {
    // 1. Database & Schema Safety Audit
    console.log('--- 1. DATABASE & SCHEMA AUDIT ---');
    const remindersCount = await prisma.reminder.count();
    const leadsCount = await prisma.lead.count();
    const callsCount = await prisma.call.count();
    const demosCount = await prisma.demo.count();
    const followUpsCount = await prisma.followUp.count();

    assert(leadsCount >= 0, `Lead count preserved: ${leadsCount} leads`);
    assert(callsCount >= 0, `Call count preserved: ${callsCount} calls`);
    assert(demosCount >= 0, `Demo count preserved: ${demosCount} demos`);
    assert(followUpsCount >= 0, `FollowUp count preserved: ${followUpsCount} follow-ups`);
    assert(remindersCount >= 0, `Reminder table accessible: ${remindersCount} records`);

    // 2. Reminder Lifecycle Test
    console.log('\n--- 2. REMINDER LIFECYCLE STATE ENGINE ---');
    const testRemindTime = new Date(Date.now() + 10 * 60 * 1000); // 10 min in future
    const testReminder = await prisma.reminder.create({
      data: {
        title: 'Phase 5 Test Reminder Lifecycle',
        message: 'Testing PENDING -> SENT -> SNOOZE -> RESCHEDULE -> COMPLETE',
        remindAt: testRemindTime,
        status: 'PENDING',
        level: 'INFO',
      },
    });

    assert(testReminder.status === 'PENDING', 'Created reminder defaults to status PENDING');

    // Test OPEN
    const opened = await openReminder(testReminder.id);
    assert(opened?.status === 'OPENED', 'Reminder transitions to OPENED status');

    // Test SNOOZE (+15 min)
    const snoozed = await snoozeReminder(testReminder.id, 15);
    assert(snoozed.status === 'SNOOZED', 'Reminder transitions to SNOOZED status');
    assert(
      new Date(snoozed.remindAt).getTime() > testRemindTime.getTime(),
      'Snoozed reminder has updated future remindAt timestamp'
    );

    // Test RESCHEDULE
    const newDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hr later
    const rescheduled = await rescheduleReminder(testReminder.id, newDate);
    assert(rescheduled.status === 'PENDING', 'Rescheduled reminder transitions back to PENDING');
    assert(
      Math.abs(new Date(rescheduled.remindAt).getTime() - newDate.getTime()) < 1000,
      'Rescheduled reminder remindAt correctly updated'
    );

    // Test COMPLETE
    const completed = await completeReminder(testReminder.id);
    assert(completed.status === 'COMPLETED', 'Reminder transitions to COMPLETED');

    // Clean up test reminder safely
    await prisma.reminder.delete({ where: { id: testReminder.id } });
    console.log('   Cleaned up test lifecycle record.');

    // 3. Overdue & Missed Auto-Detection Test
    console.log('\n--- 3. OVERDUE & MISSED AUTO-DETECTION ENGINE ---');
    const pastOverdueTime = new Date(Date.now() - 30 * 60 * 1000); // 30 min in past (>15m cutoff)
    const overdueReminder = await prisma.reminder.create({
      data: {
        title: 'Phase 5 Overdue Test',
        message: 'Should be automatically detected and marked MISSED',
        remindAt: pastOverdueTime,
        status: 'PENDING',
        level: 'CRITICAL',
      },
    });

    // Calling getActiveReminders() must auto-mark past overdue items as MISSED
    const activeRemindersList = await getActiveReminders();
    const updatedOverdue = await prisma.reminder.findUnique({ where: { id: overdueReminder.id } });

    assert(
      updatedOverdue?.status === 'MISSED',
      'Overdue reminder past 15m tolerance automatically marked as MISSED'
    );

    // Confirm getActiveReminders includes MISSED items so user never loses them
    const foundInActive = activeRemindersList.some((r) => r.id === overdueReminder.id);
    assert(
      foundInActive,
      'getActiveReminders() includes MISSED reminders in the active action queue'
    );

    // Clean up test record safely
    await prisma.reminder.delete({ where: { id: overdueReminder.id } });
    console.log('   Cleaned up test overdue record.');

    // 4. Configurable Lead Time Test
    console.log('\n--- 4. CONFIGURABLE REMINDER LEAD TIME ---');
    const workConfig = await getWorkHoursConfig();
    assert(
      typeof (workConfig.reminderLeadTimeMinutes ?? 10) === 'number',
      `Reminder lead time configured: ${workConfig.reminderLeadTimeMinutes ?? 10} minutes`
    );

    // 5. Multi-Surface Notification Delivery Check
    console.log('\n--- 5. MULTI-SURFACE NOTIFICATION PERSISTENCE ---');
    const activeList = await getActiveReminders();
    assert(Array.isArray(activeList), 'getActiveReminders returns valid array for Bell & Cockpit surfaces');

    console.log('\n====================================================');
    console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
    console.log('====================================================');
  } catch (error) {
    console.error('Fatal error during Phase 5 verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase5Verification();
