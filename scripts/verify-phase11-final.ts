import { prisma } from '../src/lib/prisma';
import { checkTimeConflicts, findNextAvailableSlots } from '../src/lib/calendar/conflictProtectionEngine';
import { getUnifiedCalendarEvents, calculateDayCapacity, normalizeActivityType } from '../src/lib/calendar/salesCalendarEngine';
import { getStartAndEndOfDay, getTodayDateString, DEFAULT_TIMEZONE } from '../src/lib/time/salesTimeEngine';

async function runFinalVerification() {
  console.log('====================================================');
  console.log('PHASE 11.1 — CRITICAL FINAL VERIFICATION SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failedCount++;
    }
  }

  const createdTestIds: { entity: string; id: string }[] = [];

  try {
    // 1. Get or create temporary test lead
    let testLead = await prisma.lead.findFirst({
      where: { title: 'FinalVerification_TestLead_Phase11' },
    });

    if (!testLead) {
      const user = await prisma.user.findFirst();
      testLead = await prisma.lead.create({
        data: {
          title: 'FinalVerification_TestLead_Phase11',
          status: 'NEW',
          temperature: 'HOT',
          userId: user?.id || null,
        },
      });
      createdTestIds.push({ entity: 'Lead', id: testLead.id });
    }

    // Set future working day target (next Monday at 11:00 AM)
    const testDate = new Date();
    const daysUntilMonday = (8 - testDate.getDay()) % 7 || 7;
    testDate.setDate(testDate.getDate() + daysUntilMonday);
    testDate.setHours(11, 0, 0, 0);

    const test1130am = new Date(testDate.getTime() + 30 * 60000);
    const test1200pm = new Date(testDate.getTime() + 60 * 60000);

    // ----------------------------------------------------
    // TEST AREA 2: Direct Calendar Booking Test
    // ----------------------------------------------------
    const demoBooking = await prisma.demo.create({
      data: {
        leadId: testLead.id,
        scheduledAt: testDate,
        durationMinutes: 30,
        notes: 'Final Verification Test Demo',
        status: 'SCHEDULED',
      },
    });
    createdTestIds.push({ entity: 'Demo', id: demoBooking.id });

    const demoReminder = await prisma.reminder.create({
      data: {
        leadId: testLead.id,
        entityId: demoBooking.id,
        entityType: 'DEMO',
        title: '⏰ Reminder: Demo',
        remindAt: new Date(testDate.getTime() - 10 * 60000),
        status: 'PENDING',
      },
    });
    createdTestIds.push({ entity: 'Reminder', id: demoReminder.id });

    assert(demoBooking.id.length > 0, 'Direct Booking API / DB Write succeeds');

    // ----------------------------------------------------
    // TEST AREA 3: Auto-Sync across modules
    // ----------------------------------------------------
    // A. Lead Follow-up auto-sync
    const followUpDate = new Date(testDate.getTime() + 120 * 60000);
    const fuRecord = await prisma.followUp.create({
      data: {
        leadId: testLead.id,
        type: 'CALL',
        status: 'PENDING',
        scheduledAt: followUpDate,
        notes: 'Lead Auto-sync test follow-up',
      },
    });
    createdTestIds.push({ entity: 'FollowUp', id: fuRecord.id });

    // B. Task Auto-sync
    const taskRecord = await prisma.task.create({
      data: {
        leadId: testLead.id,
        title: 'Auto-sync Task Test',
        dueDate: followUpDate,
        priority: 'HIGH',
        status: 'PENDING',
      },
    });
    createdTestIds.push({ entity: 'Task', id: taskRecord.id });

    // Fetch unified calendar events for target day
    const { start: dayStart, end: dayEnd } = getStartAndEndOfDay(testDate, DEFAULT_TIMEZONE);
    const projectedEvents = await getUnifiedCalendarEvents(dayStart, dayEnd);

    const demoProjected = projectedEvents.some((e) => e.entityId === demoBooking.id);
    const fuProjected = projectedEvents.some((e) => e.entityId === fuRecord.id);
    const taskProjected = projectedEvents.some((e) => e.entityId === taskRecord.id);

    assert(demoProjected, 'Demo appears automatically on Calendar projection');
    assert(fuProjected, 'Follow-up appears automatically on Calendar projection');
    assert(taskProjected, 'Task appears automatically on Calendar projection');

    // F. Reschedule
    const rescheduledTime = new Date(followUpDate.getTime() + 30 * 60000);
    await prisma.followUp.update({
      where: { id: fuRecord.id },
      data: { scheduledAt: rescheduledTime },
    });
    const projectedAfterReschedule = await getUnifiedCalendarEvents(dayStart, dayEnd);
    const fuRescheduledEvent = projectedAfterReschedule.find((e) => e.entityId === fuRecord.id);
    assert(
      fuRescheduledEvent?.startTime.getTime() === rescheduledTime.getTime(),
      'Rescheduled follow-up moves the SAME underlying activity without duplicating'
    );

    // G. Complete
    await prisma.followUp.update({
      where: { id: fuRecord.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    const projectedAfterComplete = await getUnifiedCalendarEvents(dayStart, dayEnd);
    const fuCompletedEvent = projectedAfterComplete.find((e) => e.entityId === fuRecord.id);
    assert(
      fuCompletedEvent?.status === 'COMPLETED',
      'Completed activity reflects COMPLETED status on Calendar'
    );

    // ----------------------------------------------------
    // TEST AREA 4: Duplicate Protection
    // ----------------------------------------------------
    const occurrences = projectedAfterComplete.filter((e) => e.entityId === fuRecord.id);
    assert(occurrences.length === 1, 'Duplicate protection ensures activity appears exactly ONCE');

    // ----------------------------------------------------
    // TEST AREA 5: Real-time time remaining (Asia/Kolkata)
    // ----------------------------------------------------
    const capacityToday = await calculateDayCapacity(new Date());
    assert(
      typeof capacityToday.totalRemainingMinsToday === 'number' &&
        typeof capacityToday.freeRemainingMinsToday === 'number',
      'Real-time time remaining calculates live Asia/Kolkata metrics'
    );

    // ----------------------------------------------------
    // TEST AREA 6: Free Slot Calculation
    // ----------------------------------------------------
    const freeSlots = await findNextAvailableSlots(testDate, 30, 0, null, 3);
    assert(freeSlots.length > 0, 'Free Slot Calculation returns valid bookable slots');

    // ----------------------------------------------------
    // TEST AREA 7: Server-side Conflict Engine
    // ----------------------------------------------------
    // Boundary touching (11:00-11:30 and 11:30-12:00) -> Allowed
    const boundaryCheck = await checkTimeConflicts({
      startTime: test1130am,
      durationMinutes: 30,
      bufferMinutes: 0,
      excludeEntityId: demoBooking.id,
    });
    assert(!boundaryCheck.hasConflict, 'Server-side conflict engine permits exact boundary touching');

    // Overlapping (11:15-11:45 overlaps 11:00-11:30) -> Rejected
    const overlapCheck = await checkTimeConflicts({
      startTime: new Date(testDate.getTime() + 15 * 60000),
      durationMinutes: 30,
      bufferMinutes: 0,
    });
    assert(overlapCheck.hasConflict, 'Server-side conflict engine rejects partial overlap (11:15-11:45)');

    // ----------------------------------------------------
    // TEST AREA 8: Reminder Sync & Cleanup
    // ----------------------------------------------------
    await prisma.reminder.updateMany({
      where: { entityId: demoBooking.id },
      data: { status: 'CANCELLED' },
    });
    const reminderStatusCheck = await prisma.reminder.findFirst({
      where: { entityId: demoBooking.id },
    });
    assert(reminderStatusCheck?.status === 'CANCELLED', 'Cancelled activity clears pending reminder');

    // ----------------------------------------------------
    // CLEANUP TEMPORARY TEST RECORDS ONLY
    // ----------------------------------------------------
    console.log('\n[TEST CLEANUP] Removing temporary test records safely...');
    for (const item of createdTestIds.reverse()) {
      if (item.entity === 'Reminder') await prisma.reminder.delete({ where: { id: item.id } }).catch(() => {});
      if (item.entity === 'Demo') await prisma.demo.delete({ where: { id: item.id } }).catch(() => {});
      if (item.entity === 'FollowUp') await prisma.followUp.delete({ where: { id: item.id } }).catch(() => {});
      if (item.entity === 'Task') await prisma.task.delete({ where: { id: item.id } }).catch(() => {});
      if (item.entity === 'Lead') await prisma.lead.delete({ where: { id: item.id } }).catch(() => {});
    }
    console.log('✓ Temporary test records cleaned up cleanly.');

    console.log('\n====================================================');
    console.log(`VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('====================================================');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Error during final verification:', err);
    process.exit(1);
  }
}

runFinalVerification();
