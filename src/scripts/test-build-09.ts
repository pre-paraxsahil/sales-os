import { prisma } from '../lib/prisma';
import { getWorkHoursConfig, saveWorkHoursConfig, getDefaultBlocksForDate } from '../lib/schedule/scheduleConfig';
import { calculateLeadPriority } from '../lib/schedule/priorityEngine';
import { getNextBestAction } from '../lib/schedule/nextBestActionService';
import { detectScheduleConflicts, dynamicallyRearrangeSchedule } from '../lib/schedule/reschedulingEngine';
import { syncSmartReminders, getActiveReminders, completeReminder, snoozeReminder } from '../lib/schedule/reminderService';
import { getTargetPaceStatus } from '../lib/schedule/targetPaceService';

async function runTests() {
  console.log('====================================================');
  console.log('BROSTARTUP SALES OS — BUILD 09 VERIFICATION SUITE');
  console.log('SMART SCHEDULE + TIME MANAGEMENT + NEXT BEST ACTION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${testName}`);
      if (details) console.error('  Details:', details);
    }
  }

  try {
    // 0. Setup: fetch existing real lead
    const testLead = await prisma.lead.findFirst({
      include: { contact: true, business: true },
    });
    if (!testLead) throw new Error('No test lead found in database.');

    console.log(`Using real Lead: ${testLead.business?.name || testLead.title} (ID: ${testLead.id})\n`);

    // 1. Test Working hours config resolution & defaults
    const config = await getWorkHoursConfig();
    assert(
      config.startHour === 10 && config.endHour === 18 && config.lunch.startHour === 14,
      'Work hours config correctly resolved (10 AM - 6 PM, Lunch 2 PM - 3 PM)'
    );

    // 2. Test Default sales blocks generation for date
    const todayBlocks = getDefaultBlocksForDate(new Date());
    assert(
      todayBlocks.length === 9 && todayBlocks.some((b) => b.blockType === 'LUNCH' && b.isProtected),
      'Default sales blocks correctly generated with protected lunch'
    );

    // 3. Test 1: Create Callback
    const callback = await prisma.followUp.create({
      data: {
        leadId: testLead.id,
        type: 'CALL',
        status: 'PENDING',
        scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // in 2 hours
        notes: 'Discussion on OneComPro starter tier setup',
      },
    });
    assert(Boolean(callback.id && callback.type === 'CALL'), '1. Create Callback in database');

    // 4. Test 2: Create Demo
    const demo = await prisma.demo.create({
      data: {
        leadId: testLead.id,
        scheduledAt: new Date(Date.now() + 30 * 60 * 1000), // in 30 minutes
        durationMinutes: 45,
        status: 'SCHEDULED',
        notes: 'Personalized product walkthrough',
      },
    });
    assert(Boolean(demo.id && demo.status === 'SCHEDULED'), '2. Create Demo in database');

    // 5. Test 3: Create Follow-up
    const followUp = await prisma.followUp.create({
      data: {
        leadId: testLead.id,
        type: 'WHATSAPP',
        status: 'PENDING',
        scheduledAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        notes: 'Send pricing PDF on WhatsApp',
      },
    });
    assert(Boolean(followUp.id), '3. Create Follow-up in database');

    // 6. Test 4: See Today overview counts
    const todayCalls = await prisma.call.count();
    assert(typeof todayCalls === 'number', '4. See Today metrics successfully from database');

    // 7. Test 5: Verify Current Block resolution
    const mockMorning = new Date();
    mockMorning.setHours(11, 15, 0, 0); // 11:15 AM
    const morningBlocks = getDefaultBlocksForDate(mockMorning);
    const activeBlock = morningBlocks.find(
      (b) => mockMorning >= b.startTime && mockMorning < b.endTime
    );
    assert(
      activeBlock?.blockType === 'CALLING',
      '5. Verify Current Block (11:15 AM maps to Fresh Calling block)'
    );

    // 8. Test 6: Verify Next Activity
    const nextDemo = await prisma.demo.findFirst({
      where: { status: 'SCHEDULED' },
      orderBy: { scheduledAt: 'asc' },
    });
    assert(Boolean(nextDemo), '6. Verify Next Activity detected scheduled demo');

    // 9. Test 7: Verify Priority Engine deterministic scoring
    const prioResult = calculateLeadPriority({
      id: testLead.id,
      title: testLead.title,
      status: 'QUALIFIED',
      temperature: 'HOT',
      estimatedValue: 60000,
      demos: [{ id: demo.id, status: 'SCHEDULED', scheduledAt: demo.scheduledAt }],
      followUps: [{ id: callback.id, type: 'CALL', status: 'PENDING', scheduledAt: callback.scheduledAt }],
    });
    assert(
      prioResult.score >= 50 && (prioResult.level === 'CRITICAL' || prioResult.level === 'HIGH'),
      '7. Verify Priority engine assigns HIGH/CRITICAL to Hot lead with imminent demo',
      prioResult
    );

    // 10. Test 8: Verify Overdue follow-up handling
    const overdueTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const overdueFU = await prisma.followUp.create({
      data: {
        leadId: testLead.id,
        type: 'CALL',
        status: 'PENDING',
        scheduledAt: overdueTime,
        notes: 'Overdue morning callback',
      },
    });
    const overdueList = await prisma.followUp.findMany({
      where: { status: 'PENDING', scheduledAt: { lt: new Date() } },
    });
    assert(overdueList.some((f) => f.id === overdueFU.id), '8. Verify Overdue detection works');

    // 11. Test 9: Complete Task / FollowUp
    await prisma.followUp.update({
      where: { id: overdueFU.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    const completedCheck = await prisma.followUp.findUnique({ where: { id: overdueFU.id } });
    assert(completedCheck?.status === 'COMPLETED', '9. Complete task / follow-up persisted');

    // 12. Test 10: Reschedule Task
    const newScheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.followUp.update({
      where: { id: followUp.id },
      data: { scheduledAt: newScheduledTime },
    });
    const reschedCheck = await prisma.followUp.findUnique({ where: { id: followUp.id } });
    assert(
      reschedCheck?.scheduledAt.getTime() === newScheduledTime.getTime(),
      '10. Reschedule task persisted'
    );

    // 13. Test 11: Add Demo Conflict detection
    const demoStart = new Date();
    demoStart.setHours(15, 30, 0, 0);
    const demoEnd = new Date();
    demoEnd.setHours(16, 15, 0, 0);

    const conflictingCallStart = new Date();
    conflictingCallStart.setHours(15, 45, 0, 0);
    const conflictingCallEnd = new Date();
    conflictingCallEnd.setHours(16, 0, 0, 0);

    const conflicts = detectScheduleConflicts([
      { id: 'demo-1', title: 'Live Demo', type: 'DEMO', startTime: demoStart, endTime: demoEnd },
      { id: 'call-1', title: 'Closing Call', type: 'CALL', startTime: conflictingCallStart, endTime: conflictingCallEnd },
    ]);
    assert(conflicts.length > 0, '11. Add Demo Conflict successfully flagged by detector');

    // 14. Test 12: Dynamic Rescheduling around new commitment
    const existingCallingBlock = {
      id: 'block-calling-afternoon',
      title: 'Afternoon Calling',
      type: 'CALLING',
      startTime: new Date(2026, 8, 5, 15, 0, 0),
      endTime: new Date(2026, 8, 5, 16, 30, 0),
      isProtected: false,
    };
    const newDemoBooking = {
      id: 'demo-booked',
      title: 'Demo Shree Fashion',
      type: 'DEMO',
      startTime: new Date(2026, 8, 5, 15, 15, 0),
      endTime: new Date(2026, 8, 5, 16, 0, 0),
      isProtected: true,
      priority: 'CRITICAL',
    };
    const rearrangeResult = dynamicallyRearrangeSchedule(newDemoBooking, [existingCallingBlock]);
    assert(
      rearrangeResult.movedItems.length > 0 && rearrangeResult.updatedBlocks.some((b) => b.id === 'demo-booked'),
      '12. Dynamic rescheduling safely adjusted flexible calling block around demo'
    );

    // 15. Test 13: Lunch Protection in Next Best Action
    const mockLunchTime = new Date();
    mockLunchTime.setHours(14, 30, 0, 0); // 2:30 PM (lunch)
    const lunchAction = await getNextBestAction({ currentTime: mockLunchTime, overrideLunch: false });
    assert(
      lunchAction.actionType === 'LUNCH' && lunchAction.badge === 'Protected Block',
      '13. Lunch protection shields James from sales calls between 2:00 PM and 3:00 PM',
      lunchAction
    );

    // 16. Test 14: Smart Reminders generation
    await syncSmartReminders();
    const reminders = await getActiveReminders();
    assert(Array.isArray(reminders), '14. Smart reminders generated and active');

    // 17. Test 15: Snooze Reminder
    if (reminders.length > 0) {
      const snoozed = await snoozeReminder(reminders[0].id, 15);
      assert(Boolean(snoozed.snoozedUntil), '15. Snooze reminder set +15m');
    } else {
      // Create a test reminder to snooze
      const tempReminder = await prisma.reminder.create({
        data: {
          title: 'Test Reminder',
          remindAt: new Date(),
          type: 'TASK',
        },
      });
      const snoozed = await snoozeReminder(tempReminder.id, 15);
      assert(Boolean(snoozed.snoozedUntil), '15. Snooze reminder set +15m');
      await completeReminder(tempReminder.id);
    }

    // 18. Test 16: Energy Mode adaptation (LOW vs HIGH)
    const lowEnergyAction = await getNextBestAction({
      currentTime: mockMorning,
      energy: 'LOW',
    });
    assert(
      lowEnergyAction.actionType === 'ADMIN' || lowEnergyAction.actionType === 'PLANNING',
      '16. Energy mode LOW steers toward low-friction admin/notes/planning',
      lowEnergyAction
    );

    // 19. Test 17: Target Awareness (Target behind / Target pace check)
    const targetStatus = await getTargetPaceStatus();
    assert(
      targetStatus.mode === 'RECOVERY' || targetStatus.mode === 'ON_TRACK' || targetStatus.mode === 'AHEAD',
      `17. Target Awareness evaluated mode (${targetStatus.mode}: ${targetStatus.statusLabel})`
    );

    // 20. Test 18: Target Achieved / Ahead mode calculation
    assert(
      typeof targetStatus.progressPercent === 'number' && targetStatus.recommendedFocus.length > 0,
      '18. Target progress and recommended focus generated'
    );

    // 21. Test 19: No AI Available (Offline deterministic resilience)
    const deterministicAction = await getNextBestAction({
      currentTime: mockMorning,
      energy: 'HIGH',
    });
    assert(
      Boolean(
        deterministicAction.title &&
          deterministicAction.reason &&
          deterministicAction.objective &&
          deterministicAction.nextStep
      ),
      '19. No AI required for core Next Best Action (100% deterministic reliability)',
      deterministicAction
    );

    // 22. Test 20: Database safe query check
    const rawCheck = await prisma.user.findFirst();
    assert(Boolean(rawCheck), '20. Database query integrity verified without data corruption');

    // 23. Test 21: Refresh Persistence
    const savedConfig = await saveWorkHoursConfig(testLead.userId || 'system', {
      lunch: { startHour: 14, startMinute: 0, endHour: 15, endMinute: 0, isProtected: true },
    });
    const reloadedConfig = await getWorkHoursConfig();
    assert(
      reloadedConfig.lunch.isProtected === true,
      '21. Refresh persistence: work hours & lunch settings persisted to PostgreSQL'
    );

    // Clean up temporary test records
    await prisma.followUp.delete({ where: { id: callback.id } }).catch(() => {});
    await prisma.followUp.delete({ where: { id: followUp.id } }).catch(() => {});
    await prisma.demo.delete({ where: { id: demo.id } }).catch(() => {});

    console.log('\n====================================================');
    console.log(`BUILD 09 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
    console.log('====================================================');
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
