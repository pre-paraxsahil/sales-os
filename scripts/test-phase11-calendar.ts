import { prisma } from '../src/lib/prisma';
import { checkTimeConflicts, findNextAvailableSlots } from '../src/lib/calendar/conflictProtectionEngine';
import { getUnifiedCalendarEvents, calculateDayCapacity, normalizeActivityType } from '../src/lib/calendar/salesCalendarEngine';
import { getStartAndEndOfDay, getTodayDateString, DEFAULT_TIMEZONE } from '../src/lib/time/salesTimeEngine';

async function runPhase11Tests() {
  console.log('====================================================');
  console.log('STARTING PHASE 11.1 — CALENDAR REAL-TIME & AUTO-SYNC TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Get or create test lead
    let testLead = await prisma.lead.findFirst({
      where: { title: { contains: 'Test Phase11 Lead' } },
    });

    if (!testLead) {
      const user = await prisma.user.findFirst();
      testLead = await prisma.lead.create({
        data: {
          title: 'Test Phase11 Lead',
          status: 'NEW',
          temperature: 'HOT',
          userId: user?.id || null,
        },
      });
    }

    console.log(`[TEST SETUP] Using Test Lead ID: ${testLead.id}`);

    // TEST 1: Activity type normalization
    assert(normalizeActivityType('DEMO_CALL') === 'DEMO', 'Normalize DEMO activity type');
    assert(normalizeActivityType('CALLBACK_REQUEST') === 'CALLBACK', 'Normalize CALLBACK activity type');
    assert(normalizeActivityType('WHATSAPP_DETAILS') === 'SEND_DETAILS', 'Normalize SEND_DETAILS activity type');

    // TEST 2: Conflict Engine — Permitted Boundary Touching (on working day Monday)
    const testDate = new Date();
    // Jump to next Monday
    const daysUntilMonday = (8 - testDate.getDay()) % 7 || 7;
    testDate.setDate(testDate.getDate() + daysUntilMonday);
    testDate.setHours(11, 0, 0, 0);

    const test1130am = new Date(testDate.getTime() + 30 * 60000);

    // Create a temporary block from 11:00 to 11:30 with 0 buffer
    const tempBlock = await prisma.scheduleBlock.create({
      data: {
        title: 'Phase11 Test Event 11:00-11:30',
        blockType: 'CALLING',
        startTime: testDate,
        endTime: test1130am,
        status: 'ACTIVE',
        leadId: testLead.id,
      },
    });

    // Check conflict at 11:30 AM (boundary touching) with 0 buffer
    const boundaryCheck = await checkTimeConflicts({
      startTime: test1130am,
      durationMinutes: 30,
      bufferMinutes: 0,
    });

    assert(
      !boundaryCheck.hasConflict,
      'Conflict Engine allows exact boundary touching (11:00-11:30 and 11:30-12:00)',
      boundaryCheck.message
    );

    // TEST 3: Conflict Engine — Overlap Rejection
    const overlap1129 = new Date(testDate.getTime() + 29 * 60000);
    const overlapCheck = await checkTimeConflicts({
      startTime: overlap1129,
      durationMinutes: 30,
      bufferMinutes: 0,
    });

    assert(
      overlapCheck.hasConflict,
      'Conflict Engine rejects 1-minute overlap (10:29-10:59 overlaps 10:00-10:30)',
      `hasConflict=${overlapCheck.hasConflict}`
    );

    // TEST 4: Free Time Finder
    const slots = await findNextAvailableSlots(testDate, 30, 0, null, 3);
    assert(slots.length > 0, 'Free Time Finder returns available slots');

    // TEST 5: Real-Time Capacity Calculation
    const capacity = await calculateDayCapacity(new Date());
    assert(
      typeof capacity.totalRemainingMinsToday === 'number' &&
        typeof capacity.freeRemainingMinsToday === 'number',
      'Real-time day capacity calculation returns valid remaining metrics'
    );
    assert(
      typeof capacity.freeFormatted === 'string' && typeof capacity.bookedFormatted === 'string',
      'Capacity formatted strings are present'
    );

    // TEST 6: Unified Calendar Projection Layer (no duplication)
    const { start: dayStart, end: dayEnd } = getStartAndEndOfDay(testDate, DEFAULT_TIMEZONE);
    const events = await getUnifiedCalendarEvents(dayStart, dayEnd);
    assert(Array.isArray(events), 'Unified calendar events query returns array');

    // Clean up temporary test block
    await prisma.scheduleBlock.delete({ where: { id: tempBlock.id } });

    console.log('\n====================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error running Phase 11 tests:', err);
    process.exit(1);
  }
}

runPhase11Tests();
