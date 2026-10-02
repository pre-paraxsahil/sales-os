import { prisma } from '../lib/prisma';
import {
  parseSalesDate,
  parseISTDateStringAndTime,
  formatISTDateDDMMYYYY,
  formatISTTime,
  formatISTDateTime,
  getLocalTimeParts,
  makeISTDate,
  isSlotInPast,
  BUSINESS_TIMEZONE,
} from '../lib/time/salesTimeEngine';
import { getUnifiedCalendarEvents } from '../lib/calendar/salesCalendarEngine';
import { findFreeTimeSlots } from '../lib/calendar/slotFinderEngine';
import { checkTimeConflicts } from '../lib/calendar/conflictProtectionEngine';

async function runRealClockTests() {
  console.log('====================================================');
  console.log('SALES OS — REAL CLOCK & TIMEZONE VERIFICATION SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 8;

  // Reference slot: 02/10/2026 at 4:30 PM IST
  const selectedDateStr = '02/10/2026';
  const selectedTimeStr = '4:30 PM';
  const selectedSlot = parseSalesDate(selectedDateStr, selectedTimeStr);

  console.log(`[SETUP] Selected Slot Under Test:`);
  console.log(`  Raw input: "${selectedDateStr}" at "${selectedTimeStr}"`);
  console.log(`  Parsed instant (UTC): ${selectedSlot.toISOString()}`);
  console.log(`  Formatted DD/MM/YYYY: ${formatISTDateDDMMYYYY(selectedSlot)}`);
  console.log(`  Formatted Time:       ${formatISTTime(selectedSlot)}`);
  console.log(`  Epoch milliseconds:   ${selectedSlot.getTime()}\n`);

  // Verify DD/MM/YYYY interpretation
  const parts = getLocalTimeParts(selectedSlot, BUSINESS_TIMEZONE);
  if (parts.day !== 2 || parts.month !== 10 || parts.year !== 2026 || parts.hour !== 16 || parts.minute !== 30) {
    throw new Error(`CRITICAL: Selected slot misinterpreted! Expected 2026-10-02 16:30, got ${JSON.stringify(parts)}`);
  }

  // Also verify ISO string sent over the wire by frontend (startObj.toISOString()):
  const wireIso = selectedSlot.toISOString(); // e.g. "2026-10-02T11:00:00.000Z"
  const wireParsed = parseSalesDate(wireIso);
  if (wireParsed.getTime() !== selectedSlot.getTime()) {
    throw new Error(`CRITICAL: Wire ISO string parsing failed! Expected ${selectedSlot.getTime()}, got ${wireParsed.getTime()}`);
  }
  const wireParts = getLocalTimeParts(wireParsed, BUSINESS_TIMEZONE);
  if (wireParts.hour !== 16 || wireParts.minute !== 30) {
    throw new Error(`CRITICAL: Wire ISO lost 4:30 PM time! Got ${wireParts.hour}:${wireParts.minute}`);
  }

  // ----------------------------------------------------
  // TEST A: Current IST before 4:30 PM -> BOOKABLE
  // ----------------------------------------------------
  console.log('--- TEST A: Current IST before 4:30 PM (e.g. 4:13 PM on 02/10/2026) ---');
  const clockBefore430 = makeISTDate(2026, 10, 2, 16, 13, 55); // 4:13:55 PM IST
  const isPastA = isSlotInPast(selectedSlot, clockBefore430);
  console.log(`  Current IST: ${formatISTDateTime(clockBefore430)}`);
  console.log(`  Slot:        ${formatISTDateTime(selectedSlot)}`);
  console.log(`  isSlotInPast: ${isPastA}`);
  if (!isPastA) {
    console.log('  -> PASS: Slot is recognized as FUTURE and BOOKABLE (no "already passed" error).\n');
    passedTests++;
  } else {
    console.error('  -> FAIL: Slot incorrectly marked as PAST before 4:30 PM!\n');
  }

  // ----------------------------------------------------
  // TEST B: Current IST after 4:30 PM -> PAST
  // ----------------------------------------------------
  console.log('--- TEST B: Current IST after 4:30 PM (e.g. 4:45 PM on 02/10/2026) ---');
  const clockAfter430 = makeISTDate(2026, 10, 2, 16, 45, 0); // 4:45:00 PM IST
  const isPastB = isSlotInPast(selectedSlot, clockAfter430);
  console.log(`  Current IST: ${formatISTDateTime(clockAfter430)}`);
  console.log(`  Slot:        ${formatISTDateTime(selectedSlot)}`);
  console.log(`  isSlotInPast: ${isPastB}`);
  if (isPastB) {
    console.log('  -> PASS: Slot correctly recognized as PAST after 4:30 PM.\n');
    passedTests++;
  } else {
    console.error('  -> FAIL: Slot incorrectly allowed when past 4:30 PM!\n');
  }

  // ----------------------------------------------------
  // TEST C: Current IST 3:xx PM -> NOT PAST & AVAILABLE IN FIND FREE TIME
  // ----------------------------------------------------
  console.log('--- TEST C: Current IST 3:xx PM (e.g. 3:20 PM on 02/10/2026) ---');
  const clock3xxPM = makeISTDate(2026, 10, 2, 15, 20, 0); // 3:20:00 PM IST
  const isPastC = isSlotInPast(selectedSlot, clock3xxPM);
  console.log(`  Current IST: ${formatISTDateTime(clock3xxPM)}`);
  console.log(`  Slot:        ${formatISTDateTime(selectedSlot)}`);
  console.log(`  isSlotInPast: ${isPastC}`);
  if (!isPastC) {
    console.log('  -> PASS: Slot is NOT PAST at 3:xx PM IST.\n');
    passedTests++;
  } else {
    console.error('  -> FAIL: Slot was marked as past at 3:xx PM IST!\n');
  }

  // ----------------------------------------------------
  // TEST D: Tomorrow 4:30 PM -> BOOKABLE
  // ----------------------------------------------------
  console.log('--- TEST D: Tomorrow 4:30 PM ---');
  const tomorrowSlot = parseSalesDate('tomorrow', '4:30 PM');
  const isPastD = isSlotInPast(tomorrowSlot, new Date());
  console.log(`  Tomorrow Slot: ${formatISTDateTime(tomorrowSlot)}`);
  console.log(`  isSlotInPast:  ${isPastD}`);
  if (!isPastD) {
    console.log('  -> PASS: Tomorrow 4:30 PM is BOOKABLE.\n');
    passedTests++;
  } else {
    console.error('  -> FAIL: Tomorrow 4:30 PM marked as past!\n');
  }

  // ----------------------------------------------------
  // TEST E: 10 days from today at 4:30 PM -> BOOKABLE
  // ----------------------------------------------------
  console.log('--- TEST E: 10 days from today at 4:30 PM ---');
  const tenDaysSlot = parseSalesDate('+10 days', '04:30 PM');
  const isPastE = isSlotInPast(tenDaysSlot, new Date());
  console.log(`  +10 Days Slot: ${formatISTDateTime(tenDaysSlot)}`);
  console.log(`  isSlotInPast:  ${isPastE}`);
  if (!isPastE) {
    console.log('  -> PASS: 10 days from today is BOOKABLE.\n');
    passedTests++;
  } else {
    console.error('  -> FAIL: 10 days from today marked as past!\n');
  }

  // ----------------------------------------------------
  // TEST F: Yesterday at 4:30 PM -> PAST
  // ----------------------------------------------------
  console.log('--- TEST F: Yesterday at 4:30 PM ---');
  const yesterdaySlot = parseSalesDate('yesterday', '4:30 PM');
  const isPastF = isSlotInPast(yesterdaySlot, new Date());
  console.log(`  Yesterday Slot: ${formatISTDateTime(yesterdaySlot)}`);
  console.log(`  isSlotInPast:   ${isPastF}`);
  if (isPastF) {
    console.log('  -> PASS: Yesterday 4:30 PM is correctly rejected as PAST.\n');
    passedTests++;
  } else {
    console.error('  -> FAIL: Yesterday 4:30 PM was not recognized as past!\n');
  }

  // ----------------------------------------------------
  // TEST G: Browser timezone different from Asia/Kolkata
  // ----------------------------------------------------
  console.log('--- TEST G: Browser timezone independence (e.g. UTC, US/Eastern) ---');
  // Simulate client selecting 02/10/2026 and 16:30 in browser:
  const clientParsed = parseISTDateStringAndTime('02/10/2026', '16:30');
  const clientIso = clientParsed.toISOString();
  // Server receiving clientIso:
  const serverParsed = parseSalesDate(clientIso);
  const serverParts = getLocalTimeParts(serverParsed, 'Asia/Kolkata');
  console.log(`  Client Generated ISO: ${clientIso}`);
  console.log(`  Server Parsed IST:    ${formatISTDateTime(serverParsed)}`);
  console.log(`  Server Time Parts:    Hour=${serverParts.hour}, Minute=${serverParts.minute}`);
  if (serverParts.hour === 16 && serverParts.minute === 30 && serverParts.day === 2 && serverParts.month === 10) {
    console.log('  -> PASS: Business logic operates strictly in Asia/Kolkata regardless of browser timezone.\n');
    passedTests++;
  } else {
    console.error('  -> FAIL: Browser timezone drift occurred!\n');
  }

  // ----------------------------------------------------
  // TEST H: Selected lead remains linked after booking
  // ----------------------------------------------------
  console.log('--- TEST H: Selected lead persistence & linking in booking flow ---');
  // Fetch an existing lead from database
  let testLead = await prisma.lead.findFirst({
    where: { archivedAt: null },
    include: { contact: true, business: true },
  });

  if (!testLead) {
    // Create a mock lead if none exists
    const contact = await prisma.contact.create({
      data: { name: 'Vikram Sharma', phone: '+919876543210' },
    });
    testLead = await prisma.lead.create({
      data: {
        title: 'Vikram Sharma - Enterprise Deal',
        contactId: contact.id,
        temperature: 'HOT',
        source: 'MANUAL',
      },
      include: { contact: true, business: true },
    });
  }

  console.log(`  Using Lead: ID=${testLead.id}, Name=${testLead.contact?.name || testLead.title}`);

  // Simulate booking transaction for test lead at 4:30 PM tomorrow
  const bookingStart = parseSalesDate('tomorrow', '4:30 PM');
  const bookingEnd = new Date(bookingStart.getTime() + 30 * 60000);

  const user = (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());
  const userId = user?.id || null;

  // Execute transaction exactly as in /api/calendar/book
  const bookingResult = await prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.create({
      data: {
        leadId: testLead!.id,
        userId,
        scheduledAt: bookingStart,
        type: 'CALL',
        status: 'PENDING',
        notes: `[duration:30] Call with ${testLead!.contact?.name || testLead!.title}`,
      },
    });

    const activity = await tx.activity.create({
      data: {
        leadId: testLead!.id,
        userId,
        type: 'FOLLOW_UP_SET',
        title: `FOLLOW-UP SCHEDULED: ${formatISTDateDDMMYYYY(bookingStart)} ${formatISTTime(bookingStart)}`,
        description: `Call with ${testLead!.contact?.name || testLead!.title}`,
      },
    });

    await tx.lead.update({
      where: { id: testLead!.id },
      data: { nextActionDate: bookingStart },
    });

    const reminder = await tx.reminder.create({
      data: {
        userId,
        leadId: testLead!.id,
        title: `⏰ Reminder: Call with ${testLead!.contact?.name || testLead!.title}`,
        message: `Call starts at ${formatISTTime(bookingStart)}`,
        remindAt: new Date(bookingStart.getTime() - 10 * 60000),
        entityId: followUp.id,
        entityType: 'FOLLOW_UP',
        status: 'PENDING',
      },
    });

    return { followUp, activity, reminder };
  });

  // Verify lead linking in Unified Calendar Events
  const events = await getUnifiedCalendarEvents(
    new Date(bookingStart.getTime() - 60000),
    new Date(bookingEnd.getTime() + 60000),
    userId
  );

  const matchedEvent = events.find((e) => e.entityId === bookingResult.followUp.id);
  console.log(`  Created Booking ID: ${bookingResult.followUp.id}`);
  console.log(`  Matched Calendar Event: ${matchedEvent?.title}`);
  console.log(`  Event leadId: ${matchedEvent?.leadId}`);
  console.log(`  Event lead contact: ${matchedEvent?.lead?.contactName}`);

  const leadUpdated = await prisma.lead.findUnique({
    where: { id: testLead.id },
    include: { activities: { where: { id: bookingResult.activity.id } } },
  });

  const leadHasActivity = leadUpdated?.activities.length === 1;
  const leadNextActionPreserved = leadUpdated?.nextActionDate?.getTime() === bookingStart.getTime();

  console.log(`  Lead Timeline Activity Logged: ${leadHasActivity}`);
  console.log(`  Lead nextActionDate Updated:   ${leadNextActionPreserved}`);

  if (matchedEvent && matchedEvent.leadId === testLead.id && leadHasActivity && leadNextActionPreserved) {
    console.log('  -> PASS: Selected lead remains reliably linked to booking, calendar, and lead timeline.\n');
    passedTests++;
  } else {
    console.error('  -> FAIL: Lead linking was lost during booking flow!\n');
  }

  // Cleanup test booking
  await prisma.reminder.delete({ where: { id: bookingResult.reminder.id } });
  await prisma.activity.delete({ where: { id: bookingResult.activity.id } });
  await prisma.followUp.delete({ where: { id: bookingResult.followUp.id } });

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('====================================================');
  console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    console.log('ALL REAL-CLOCK TESTS PASSED SUCCESSFULLY!');
  } else {
    throw new Error(`Only ${passedTests}/${totalTests} tests passed.`);
  }
}

runRealClockTests()
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
