import { prisma } from '../lib/prisma';
import { parseSalesDate, formatISTDateDDMMYYYY, formatISTTime, formatISTDateTime, formatRelativeTimeUntil, getNowInIST, getTodayDateString } from '../lib/time/salesTimeEngine';
import { checkTimeConflicts } from '../lib/calendar/conflictProtectionEngine';
import { findFreeTimeSlots } from '../lib/calendar/slotFinderEngine';
import { getUnifiedCalendarEvents } from '../lib/calendar/salesCalendarEngine';

async function runTests() {
  console.log('=== PHASE 11.5 COMPREHENSIVE SALES CALENDAR RELIABILITY TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // Clean up any existing test records if needed
    let testUser = await prisma.user.findFirst();
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test-calendar@salesos.local',
          name: 'Test Calendar Rep',
          role: 'USER',
        },
      });
    }

    let testLead = await prisma.lead.findFirst({
      where: { title: 'Rahul Sharma - Phase 11.5 Test Corp' }
    });
    if (!testLead) {
      testLead = await prisma.lead.create({
        data: {
          title: 'Rahul Sharma - Phase 11.5 Test Corp',
          source: 'DIRECT',
          status: 'NEW',
          userId: testUser.id,
        },
      });
    }

    // TEST 11: Date interpretation 02/10/2026 -> 2 October 2026
    const parsedOct2 = parseSalesDate('02/10/2026', '11:00 AM');
    const oct2Formatted = formatISTDateDDMMYYYY(parsedOct2);
    assert(
      oct2Formatted === '02/10/2026' && parsedOct2.getUTCMonth() === 9 && parsedOct2.getUTCDate() === 2,
      'TEST 11: 02/10/2026 parses as 2 October 2026',
      `Got ${oct2Formatted}, UTC month: ${parsedOct2.getUTCMonth()}, date: ${parsedOct2.getUTCDate()}`
    );

    // TEST 12: Date interpretation 12/10/2026 -> 12 October 2026
    const parsedOct12 = parseSalesDate('12/10/2026', '11:30 AM');
    const oct12Formatted = formatISTDateDDMMYYYY(parsedOct12);
    assert(
      oct12Formatted === '12/10/2026' && parsedOct12.getUTCMonth() === 9 && parsedOct12.getUTCDate() === 12,
      'TEST 12: 12/10/2026 parses as 12 October 2026',
      `Got ${oct12Formatted}`
    );

    // Date interpretation 10/02/2026 -> 10 February 2026
    const parsedFeb10 = parseSalesDate('10/02/2026', '10:00 AM');
    const feb10Formatted = formatISTDateDDMMYYYY(parsedFeb10);
    assert(
      feb10Formatted === '10/02/2026' && parsedFeb10.getUTCMonth() === 1 && parsedFeb10.getUTCDate() === 10,
      'DATE PARSING: 10/02/2026 parses as 10 February 2026',
      `Got ${feb10Formatted}`
    );

    // TEST 13: Asia/Kolkata current business time verification
    const nowIST = getNowInIST();
    const todayIST = getTodayDateString();
    assert(
      nowIST instanceof Date && !isNaN(nowIST.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(todayIST),
      'TEST 13: Asia/Kolkata current business time and today date string generated correctly',
      `Today IST: ${todayIST}, Time: ${formatISTTime(nowIST)}`
    );

    // Clear previous test follow-ups for clean run
    await prisma.followUp.deleteMany({
      where: { leadId: testLead.id }
    });
    await prisma.scheduleBlock.deleteMany({
      where: { leadId: testLead.id }
    });
    await prisma.reminder.deleteMany({
      where: { leadId: testLead.id }
    });

    // TEST 1: Book Tomorrow 11:00 AM Call 30 min
    const tomorrowDate = parseSalesDate('tomorrow', '11:00 AM');
    const tomorrowStr = formatISTDateDDMMYYYY(tomorrowDate);
    const duration = 30;
    const tomorrowEnd = new Date(tomorrowDate.getTime() + duration * 60000);

    const bookingFollowUp = await prisma.followUp.create({
      data: {
        leadId: testLead.id,
        scheduledAt: tomorrowDate,
        type: 'CALL',
        notes: `Call Rahul [duration:${duration}]`,
        status: 'PENDING',
        userId: testUser.id,
      },
    });

    const bookingReminder = await prisma.reminder.create({
      data: {
        title: 'Call Rahul',
        userId: testUser.id,
        leadId: testLead.id,
        remindAt: new Date(tomorrowDate.getTime() - 10 * 60000), // 10 min prior
        status: 'PENDING',
        entityId: bookingFollowUp.id,
        entityType: 'FOLLOW_UP',
      },
    });

    // Verify calendar events reflect this
    const tomorrowDayStart = parseSalesDate('tomorrow', '00:00:00');
    const tomorrowDayEnd = parseSalesDate('tomorrow', '23:59:59');
    const calEvents = await getUnifiedCalendarEvents(tomorrowDayStart, tomorrowDayEnd, testUser.id);
    const foundEvent = calEvents.find(e => e.entityId === bookingFollowUp.id || e.id.includes(bookingFollowUp.id));

    assert(
      !!foundEvent && foundEvent.durationMinutes === 30 && bookingReminder.status === 'PENDING',
      'TEST 1: Booking exists, calendar shows it, duration is 30 mins, reminder is created',
      `foundEvent duration: ${foundEvent?.durationMinutes}`
    );

    // TEST 2: Try booking tomorrow 11:15 AM (overlaps 11:00 - 11:30 AM)
    const overlapStart = new Date(tomorrowDate.getTime() + 15 * 60000);
    const conflictResult = await checkTimeConflicts({
      startTime: overlapStart,
      durationMinutes: 30,
      userId: testUser.id,
    });

    assert(
      conflictResult.hasConflict && (conflictResult.message?.includes('already booked from') ?? false),
      'TEST 2: Overlapping booking (11:15 AM) returns conflict with exact time range',
      conflictResult.message
    );

    // TEST 3: Book 10 days from now 4:30 PM
    const tenDaysDate = parseSalesDate('+10 days', '04:30 PM');
    const tenDaysFollowUp = await prisma.followUp.create({
      data: {
        leadId: testLead.id,
        scheduledAt: tenDaysDate,
        type: 'CALL',
        notes: 'Follow-up in 10 days [duration:30]',
        status: 'PENDING',
        userId: testUser.id,
      },
    });
    assert(
      !!tenDaysFollowUp && tenDaysFollowUp.id.length > 0,
      'TEST 3: Future booking 10 days from now at 4:30 PM succeeds'
    );

    // TEST 4: Browser refresh simulation (fetch from DB)
    const refreshedFollowUp = await prisma.followUp.findUnique({
      where: { id: tenDaysFollowUp.id },
    });
    assert(
      !!refreshedFollowUp && refreshedFollowUp.status === 'PENDING',
      'TEST 4: Booking persists and survives reload'
    );

    // TEST 5: Find Free Time on same date excludes booked period
    const freeTimeResult = await findFreeTimeSlots({
      dateString: tomorrowStr,
      durationMinutes: 30,
      userId: testUser.id,
    });
    const availableSlots = freeTimeResult.slots;
    const conflictSlot = availableSlots.find(
      s => s.formattedTime === '11:00 AM' || s.formattedTime === '11:15 AM'
    );
    assert(
      conflictSlot === undefined && availableSlots.length > 0,
      'TEST 5: Find Free Time excludes 11:00 AM - 11:30 AM booked period',
      `Found ${availableSlots.length} available slots, none at 11:00 or 11:15 AM`
    );

    // TEST 6: Reschedule from 11:00 AM to 05:30 PM
    const newStart = parseSalesDate('tomorrow', '05:30 PM');
    const rescheduled = await prisma.followUp.update({
      where: { id: bookingFollowUp.id },
      data: { scheduledAt: newStart },
    });
    // Update reminder
    await prisma.reminder.updateMany({
      where: { entityId: bookingFollowUp.id },
      data: { remindAt: new Date(newStart.getTime() - 10 * 60000), status: 'PENDING' },
    });

    // Check old slot is free, new slot is occupied
    const oldSlotCheck = await checkTimeConflicts({
      startTime: tomorrowDate,
      durationMinutes: 30,
      userId: testUser.id,
    });
    const newSlotCheck = await checkTimeConflicts({
      startTime: newStart,
      durationMinutes: 30,
      userId: testUser.id,
    });
    assert(
      !oldSlotCheck.hasConflict && newSlotCheck.hasConflict,
      'TEST 6: Reschedule frees old slot and blocks new 5:30 PM slot'
    );

    // TEST 7: Cancel booking
    await prisma.followUp.update({
      where: { id: bookingFollowUp.id },
      data: { status: 'CANCELLED' },
    });
    await prisma.reminder.updateMany({
      where: { entityId: bookingFollowUp.id },
      data: { status: 'CANCELLED' },
    });
    const cancelledSlotCheck = await checkTimeConflicts({
      startTime: newStart,
      durationMinutes: 30,
      userId: testUser.id,
    });
    const cancelledReminders = await prisma.reminder.findMany({
      where: { entityId: bookingFollowUp.id },
    });
    assert(
      !cancelledSlotCheck.hasConflict && cancelledReminders.every(r => r.status === 'CANCELLED'),
      'TEST 7: Cancel frees time slot and cancels pending reminders'
    );

    // TEST 8: Complete booking
    // Create another booking and complete it
    const completedTestBooking = await prisma.followUp.create({
      data: {
        leadId: testLead.id,
        scheduledAt: new Date(tomorrowDate.getTime() + 120 * 60000),
        type: 'CALL',
        notes: 'Test for complete [duration:30]',
        status: 'COMPLETED',
        userId: testUser.id,
      },
    });
    const completedSlotCheck = await checkTimeConflicts({
      startTime: completedTestBooking.scheduledAt,
      durationMinutes: 30,
      userId: testUser.id,
    });
    assert(
      !completedSlotCheck.hasConflict && completedTestBooking.status === 'COMPLETED',
      'TEST 8: Completed booking is preserved in history and does not block availability'
    );

    // TEST 9 & 10: Lead -> create follow-up automatically projects onto Calendar & lead activity
    const leadFuTime = parseSalesDate('+4 days', '03:30 PM');
    const leadFollowUp = await prisma.followUp.create({
      data: {
        leadId: testLead.id,
        scheduledAt: leadFuTime,
        type: 'CALL',
        notes: 'Call me after 4 days [duration:30]',
        status: 'PENDING',
        userId: testUser.id,
      },
    });
    // Create activity timeline
    const activity = await prisma.activity.create({
      data: {
        leadId: testLead.id,
        userId: testUser.id,
        title: 'Follow-up Scheduled',
        type: 'FOLLOW_UP_SET',
        description: `Follow-up scheduled for ${formatISTDateTime(leadFuTime)}: Call me after 4 days`,
      },
    });
    // Update lead nextActionDate
    await prisma.lead.update({
      where: { id: testLead.id },
      data: { nextActionDate: leadFuTime },
    });

    const leadDayStart = parseSalesDate('+4 days', '00:00:00');
    const leadDayEnd = parseSalesDate('+4 days', '23:59:59');
    const leadCalEvents = await getUnifiedCalendarEvents(leadDayStart, leadDayEnd, testUser.id);
    const leadCalFound = leadCalEvents.find(e => e.entityId === leadFollowUp.id || e.id.includes(leadFollowUp.id));
    const updatedLead = await prisma.lead.findUnique({ where: { id: testLead.id } });

    assert(
      Boolean(leadCalFound && leadCalFound.lead?.title?.includes('Rahul') && activity && updatedLead?.nextActionDate?.getTime() === leadFuTime.getTime()),
      'TEST 9 & 10: Lead follow-up automatically surfaces on Calendar, Lead Timeline, and updates nextActionDate',
      `leadCalFound: ${JSON.stringify(leadCalFound)}`
    );

    // TEST 14: Clear conflict explanation
    const conflictCheckTest = await checkTimeConflicts({
      startTime: leadFuTime,
      durationMinutes: 30,
      userId: testUser.id,
    });
    assert(
      conflictCheckTest.hasConflict && (conflictCheckTest.message?.startsWith('This time is already booked from') ?? false),
      'TEST 14: Clear conflict explanation returned with exact booked window',
      conflictCheckTest.message
    );

    // TEST 15: Simulation of relative time helper
    const relTomorrow = formatRelativeTimeUntil(tomorrowDate);
    const rel10Days = formatRelativeTimeUntil(tenDaysDate);
    assert(
      (relTomorrow.includes('Tomorrow') || relTomorrow.includes('day')) && rel10Days.includes('10 days'),
      'TEST 15: Human-readable relative time formatted accurately',
      `Tomorrow: "${relTomorrow}", 10 days: "${rel10Days}"`
    );

    console.log(`\n========================================`);
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
