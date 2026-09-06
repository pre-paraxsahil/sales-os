import { prisma } from '../src/lib/prisma';
import {
  getLocalTimeParts,
  getStartAndEndOfDay,
  getTodayDateString,
  calculateOfficeStatus,
  DEFAULT_TIMEZONE,
} from '../src/lib/time/salesTimeEngine';
import { getWorkHoursConfig, saveWorkHoursConfig } from '../src/lib/schedule/scheduleConfig';
import { getNextBestAction } from '../src/lib/schedule/nextBestActionService';

async function runVerification() {
  console.log('🧪 Starting Phase 1 Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. TIMEZONE & DATE ENGINE TESTS
  console.log('--- 1. Timezone & Sales Time Engine ---');
  const now = new Date();
  const parts = getLocalTimeParts(now, 'Asia/Kolkata');
  assert(Boolean(parts.year && parts.month && parts.day && parts.formattedTime), 'Local time parts parsed for Asia/Kolkata');
  
  const todayStr = getTodayDateString(now, 'Asia/Kolkata');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(todayStr), `Today date string formatted as YYYY-MM-DD: ${todayStr}`);

  const { start, end } = getStartAndEndOfDay(now, 'Asia/Kolkata');
  assert(start < end, 'Day start is before day end');
  assert(end.getTime() - start.getTime() > 86000000, 'Day interval covers 24 hours');

  // 2. OFFICE STATUS CALCULATIONS
  console.log('\n--- 2. Office Status Calculations ---');
  const testConfig = {
    startHour: 10,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
    workingDays: [1, 2, 3, 4, 5, 6],
    weeklyOffDays: [0], // Sunday
    timezone: 'Asia/Kolkata',
    lunch: { startHour: 14, startMinute: 0, endHour: 15, endMinute: 0, isProtected: true },
    reminderThresholds: { demoMinutesBefore: 20, overdueCheckMinutes: 30 },
  };

  // Test Sunday (Day 0)
  // 2026-09-06 is Sunday
  const sundayDate = new Date('2026-09-06T12:00:00.000+05:30');
  const sundayStatus = calculateOfficeStatus(testConfig, null, sundayDate);
  assert(sundayStatus.code === 'CLOSED', 'Sunday is calculated as CLOSED');
  assert(sundayStatus.badgeLabel.includes('Office Closed'), 'Sunday badge shows Office Closed');
  assert(sundayStatus.title.includes('Sunday — Office Closed'), `Sunday title is "${sundayStatus.title}"`);

  // Test Working Day (Monday 11:00 AM) - Not Clocked In
  const mondayWorkTime = new Date('2026-09-07T11:00:00.000+05:30');
  const mondayUnclockedStatus = calculateOfficeStatus(testConfig, null, mondayWorkTime);
  assert(mondayUnclockedStatus.code === 'NOT_CLOCKED_IN', 'Working day within office hours unclocked is NOT_CLOCKED_IN');
  assert(mondayUnclockedStatus.badgeLabel.includes('Not Clocked In'), 'Badge shows ⚪ Not Clocked In');

  // Test Working Day (Monday 11:00 AM) - Clocked In
  const mondayClockedSession = {
    id: 'test-sess-1',
    clockIn: new Date('2026-09-07T10:05:00.000+05:30'),
    clockOut: null,
    durationSeconds: 0,
  };
  const mondayClockedStatus = calculateOfficeStatus(testConfig, mondayClockedSession, mondayWorkTime);
  assert(mondayClockedStatus.code === 'WORKING', 'Clocked-in session during work hours is WORKING');
  assert(mondayClockedStatus.badgeLabel.includes('Working'), 'Badge shows 🟢 Working');

  // Test Lunch Time (Monday 2:30 PM)
  const mondayLunchTime = new Date('2026-09-07T14:30:00.000+05:30');
  const mondayLunchStatus = calculateOfficeStatus(testConfig, mondayClockedSession, mondayLunchTime);
  assert(mondayLunchStatus.code === 'LUNCH', 'Time within lunch window is LUNCH');
  assert(mondayLunchStatus.badgeLabel.includes('Lunch'), 'Badge shows 🟡 Lunch');

  // Test After Office Hours (Monday 7:30 PM)
  const mondayEveningTime = new Date('2026-09-07T19:30:00.000+05:30');
  const mondayEveningStatus = calculateOfficeStatus(testConfig, mondayClockedSession, mondayEveningTime);
  assert(mondayEveningStatus.code === 'CLOSED', 'Time after office hours is CLOSED');
  assert(mondayEveningStatus.badgeLabel.includes('Office Closed'), 'Evening badge shows 🔴 Office Closed');

  // 3. NEXT BEST ACTION TIME ENGINE TESTS
  console.log('\n--- 3. Time-Aware Next Action Engine ---');
  const user = await prisma.user.findFirst();
  assert(Boolean(user), 'Database user found');

  // Sunday action
  const sundayAction = await getNextBestAction({ currentTime: sundayDate, userId: user?.id });
  assert(sundayAction.badge === 'Office Closed', `Sunday action badge is Office Closed (${sundayAction.title})`);

  // Lunch action
  const lunchAction = await getNextBestAction({ currentTime: mondayLunchTime, userId: user?.id });
  assert(lunchAction.actionType === 'LUNCH', `Lunch action type is LUNCH (${lunchAction.title})`);

  // After-hours action
  const eveningAction = await getNextBestAction({ currentTime: mondayEveningTime, userId: user?.id });
  assert(eveningAction.badge === 'Office Closed', `Evening action badge is Office Closed (${eveningAction.title})`);

  // 4. ATTENDANCE & DATABASE PERSISTENCE TESTS
  console.log('\n--- 4. WorkSession & DB Persistence ---');
  if (user) {
    const testDateStr = '2026-09-06';
    // Create test clock in
    const session = await prisma.workSession.create({
      data: {
        userId: user.id,
        workDate: testDateStr,
        clockIn: new Date(),
        notes: 'Verification test session',
      },
    });
    assert(Boolean(session.id), `WorkSession created with ID: ${session.id}`);

    // Update clock out
    const clockOutTime = new Date(Date.now() + 3600000); // 1 hour later
    const updatedSession = await prisma.workSession.update({
      where: { id: session.id },
      data: {
        clockOut: clockOutTime,
        durationSeconds: 3600,
      },
    });
    assert(updatedSession.durationSeconds === 3600, 'Clock out duration recorded correctly');
    assert(Boolean(updatedSession.clockOut), 'Clock out timestamp recorded');

    // Clean up our verification test session
    await prisma.workSession.delete({ where: { id: session.id } });
    assert(true, 'Test session cleaned up cleanly');
  }

  // 5. REGRESSION & ZERO-DELETION CHECK
  console.log('\n--- 5. Regression & Data Preservation Check ---');
  const leadCount = await prisma.lead.count();
  const callCount = await prisma.call.count();
  const demoCount = await prisma.demo.count();
  const followUpCount = await prisma.followUp.count();
  const templateCount = await prisma.whatsAppTemplate.count();
  const productOfferingCount = await prisma.productOffering.count();

  assert(leadCount >= 2, `All 2+ Leads preserved (count: ${leadCount})`);
  assert(callCount >= 11, `All 11+ Calls preserved (count: ${callCount})`);
  assert(demoCount >= 3, `All 3+ Demos preserved (count: ${demoCount})`);
  assert(followUpCount >= 6, `All 6+ Follow-ups preserved (count: ${followUpCount})`);
  assert(templateCount >= 12, `All 12+ WhatsApp templates preserved (count: ${templateCount})`);
  assert(productOfferingCount >= 1, `Product offerings preserved (count: ${productOfferingCount})`);

  console.log(`\n========================================`);
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification()
  .catch((e) => {
    console.error('Verification failed with error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
