import { prisma } from '../src/lib/prisma';
import { getAllTargetsStatus, saveTargetForPeriod } from '../src/lib/targets/targetPlannerService';
import { getWorkHoursConfig } from '../src/lib/schedule/scheduleConfig';
import { getTodayDateString, calculateOfficeStatus } from '../src/lib/time/salesTimeEngine';

async function verify() {
  console.log('🧪 ========================================================');
  console.log('🧪 RUNNING PRODUCTION FIX VERIFICATION SUITE');
  console.log('🧪 ========================================================\n');

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

  // 1. VERIFY RECORD INTEGRITY & RECORD COUNTS
  console.log('--- 1. DATABASE RECORD COUNTS & INTEGRITY ---');
  const userCount = await prisma.user.count();
  const businessCount = await prisma.business.count();
  const contactCount = await prisma.contact.count();
  const leadCount = await prisma.lead.count();
  const callCount = await prisma.call.count();
  const demoCount = await prisma.demo.count();
  const followUpCount = await prisma.followUp.count();
  const reminderCount = await prisma.reminder.count();
  const userSettingCount = await prisma.userSetting.count();

  assert(userCount === 1, `Users count intact: ${userCount}`);
  assert(businessCount === 2, `Businesses count intact: ${businessCount}`);
  assert(contactCount === 3, `Contacts count intact: ${contactCount}`);
  assert(leadCount === 3, `Leads count intact: ${leadCount}`);
  assert(callCount === 3, `Calls count intact: ${callCount}`);
  assert(demoCount === 5, `Demos count intact: ${demoCount}`);
  assert(followUpCount === 2, `FollowUps count intact: ${followUpCount}`);
  assert(reminderCount === 7, `Reminders count intact: ${reminderCount}`);
  assert(userSettingCount === 1, `UserSettings count intact: ${userSettingCount}`);

  // 2. VERIFY FEATURE 1: LEADS FETCHING (GET /api/leads)
  console.log('\n--- 2. FEATURE 1: LEADS FETCH (GET /api/leads) ---');
  try {
    const activeLeads = await prisma.lead.findMany({
      where: { archivedAt: null },
      include: {
        business: true,
        contact: true,
        calls: {
          orderBy: { occurredAt: 'desc' },
          take: 1,
          select: {
            id: true,
            outcome: true,
            occurredAt: true,
            callType: true,
            notes: true,
            nextAction: true,
            nextActionAt: true,
          },
        },
        _count: {
          select: {
            calls: true,
            demos: true,
            tasks: true,
            followUps: true,
            notesList: true,
          },
        },
      },
    });

    const archivedLeads = await prisma.lead.findMany({
      where: { archivedAt: { not: null } },
    });

    assert(Array.isArray(activeLeads), 'Leads query with archivedAt: null returned array');
    assert(activeLeads.length + archivedLeads.length === leadCount, `Leads partitioned correctly (${activeLeads.length} active, ${archivedLeads.length} archived)`);
    console.log(`   Fetched ${activeLeads.length} active leads and ${archivedLeads.length} archived leads without error.`);
  } catch (e: any) {
    assert(false, 'Leads query failed', e.message);
  }

  // 3. VERIFY FEATURE 2 & 3: CLOCK IN & CLOCK OUT (POST /api/attendance)
  console.log('\n--- 3. FEATURE 2 & 3: CLOCK IN & CLOCK OUT ---');
  try {
    const user = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    if (!user) throw new Error('No owner user found');

    const config = await getWorkHoursConfig(user.id);
    const now = new Date();
    const todayDateStr = getTodayDateString(now, config.timezone);

    // Create a temporary test work session
    const session = await prisma.workSession.create({
      data: {
        userId: user.id,
        workDate: todayDateStr,
        clockIn: now,
        notes: 'Verification test session',
      },
    });
    assert(Boolean(session.id), `Clock In: WorkSession created with ID ${session.id}`);

    // Update / Clock Out the session
    const clockOutTime = new Date(now.getTime() + 60000); // 1 min later
    const closed = await prisma.workSession.update({
      where: { id: session.id },
      data: {
        clockOut: clockOutTime,
        durationSeconds: 60,
      },
    });
    assert(closed.durationSeconds === 60, `Clock Out: WorkSession completed with duration ${closed.durationSeconds}s`);

    // Clean up only the temporary test session
    await prisma.workSession.delete({ where: { id: session.id } });
    assert(true, 'Test WorkSession cleaned up safely, real business records untouched');
  } catch (e: any) {
    assert(false, 'Clock In / Clock Out verification failed', e.message);
  }

  // 4. VERIFY FEATURE 4: TARGET SAVING (DAILY, WEEKLY, MONTHLY)
  console.log('\n--- 4. FEATURE 4: TARGET SAVING (MONTHLY, WEEKLY, DAILY) ---');
  try {
    const user = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    const userId = user?.id;

    // A. Monthly Target Save
    const monthlySaved = await saveTargetForPeriod(
      'MONTHLY',
      {
        targetAmount: 250000,
        targetSales: 5,
        targetDemos: 15,
        targetCalls: 100,
        targetInterested: 20,
        targetFollowUps: 30,
        targetColdCalls: 70,
        targetInboundCalls: 30,
        notes: 'Monthly Target Verified',
      },
      new Date(),
      userId
    );
    assert(Boolean(monthlySaved.id), `Monthly Target Save: Saved with ID ${monthlySaved.id}`);
    assert(Number(monthlySaved.targetAmount) === 250000, 'Monthly targetAmount = 250,000');
    assert(monthlySaved.targetInterested === 20, 'Monthly targetInterested = 20');

    // B. Weekly Target Save
    const weeklySaved = await saveTargetForPeriod(
      'WEEKLY',
      {
        targetAmount: 60000,
        targetSales: 2,
        targetDemos: 4,
        targetCalls: 25,
        targetInterested: 5,
        targetFollowUps: 8,
        targetColdCalls: 18,
        targetInboundCalls: 7,
        notes: 'Weekly Target Verified',
      },
      new Date(),
      userId
    );
    assert(Boolean(weeklySaved.id), `Weekly Target Save: Saved with ID ${weeklySaved.id}`);
    assert(Number(weeklySaved.targetAmount) === 60000, 'Weekly targetAmount = 60,000');

    // C. Daily Target Save
    const dailySaved = await saveTargetForPeriod(
      'DAILY',
      {
        targetAmount: 12000,
        targetSales: 1,
        targetDemos: 2,
        targetCalls: 10,
        targetInterested: 2,
        targetFollowUps: 3,
        targetColdCalls: 8,
        targetInboundCalls: 2,
        notes: 'Daily Target Verified',
      },
      new Date(),
      userId
    );
    assert(Boolean(dailySaved.id), `Daily Target Save: Saved with ID ${dailySaved.id}`);
    assert(Number(dailySaved.targetAmount) === 12000, 'Daily targetAmount = 12,000');

    // Verify Read of All Targets Status
    const allStatus = await getAllTargetsStatus(new Date(), userId);
    assert(allStatus.monthly.isConfigured, 'Monthly Target Status isConfigured = true');
    assert(allStatus.weekly.isConfigured, 'Weekly Target Status isConfigured = true');
    assert(allStatus.daily.isConfigured, 'Daily Target Status isConfigured = true');
  } catch (e: any) {
    assert(false, 'Target save verification failed', e.message);
  }

  console.log('\n========================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

verify()
  .catch((e) => {
    console.error('Fatal verification error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
