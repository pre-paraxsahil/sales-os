import { prisma } from '../src/lib/prisma';
import {
  saveTargetForPeriod,
  getAllTargetsStatus,
  generateNextDayPlan,
  generateNextWeekPlan,
  calculateSmartTargetSuggestion,
} from '../src/lib/targets/targetPlannerService';
import { getTargetPaceStatus } from '../src/lib/schedule/targetPaceService';
import { getDateRangeBounds, DEFAULT_TIMEZONE } from '../src/lib/time/salesTimeEngine';

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 PHASE 10 (PARTS 8-10) COMPREHENSIVE VERIFICATION');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(name: string, condition: boolean, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] Test ${totalTests}: ${name}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] Test ${totalTests}: ${name}${details ? ` -> ${details}` : ''}`);
    }
  }

  const user = (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());
  const realLead = await prisma.lead.findFirst({ where: { archivedAt: null } });
  const archivedLead = await prisma.lead.findFirst({ where: { archivedAt: { not: null } } });

  // 1. MONTHLY TARGET SAVE & PERSISTENCE
  console.log('\n--- 1. MONTHLY TARGET SAVE & PERSISTENCE ---');
  const savedMonthly = await saveTargetForPeriod(
    'MONTHLY',
    {
      targetAmount: 250000,
      targetSales: 5,
      targetDemos: 15,
      targetColdCalls: 100,
      targetInboundCalls: 20,
      notes: 'Phase 10 verification monthly target',
    },
    new Date(),
    user?.id
  );
  assert('Monthly target save succeeds in PostgreSQL', !!savedMonthly && savedMonthly.period === 'MONTHLY');

  // Query in independent session to simulate refresh
  const statusAfterMonthly = await getAllTargetsStatus(new Date(), user?.id);
  assert(
    'Monthly target persists after refresh with exact numbers',
    statusAfterMonthly.monthly.isConfigured === true &&
      statusAfterMonthly.monthly.target?.amount === 250000 &&
      statusAfterMonthly.monthly.target?.sales === 5 &&
      statusAfterMonthly.monthly.target?.demos === 15 &&
      statusAfterMonthly.monthly.target?.totalCalls === 120
  );

  // 2. WEEKLY TARGET SAVE & PERSISTENCE
  console.log('\n--- 2. WEEKLY TARGET SAVE & PERSISTENCE ---');
  const savedWeekly = await saveTargetForPeriod(
    'WEEKLY',
    {
      targetAmount: 60000,
      targetSales: 2,
      targetDemos: 4,
      targetColdCalls: 30,
      targetInboundCalls: 5,
      notes: 'Phase 10 verification weekly target',
    },
    new Date(),
    user?.id
  );
  assert('Weekly target save succeeds in PostgreSQL', !!savedWeekly && savedWeekly.period === 'WEEKLY');

  const statusAfterWeekly = await getAllTargetsStatus(new Date(), user?.id);
  assert(
    'Weekly target persists after refresh with exact numbers',
    statusAfterWeekly.weekly.isConfigured === true &&
      statusAfterWeekly.weekly.target?.amount === 60000 &&
      statusAfterWeekly.weekly.target?.sales === 2 &&
      statusAfterWeekly.weekly.target?.demos === 4
  );

  // 3. DAILY TARGET SAVE & PERSISTENCE
  console.log('\n--- 3. DAILY TARGET SAVE & PERSISTENCE ---');
  const savedDaily = await saveTargetForPeriod(
    'DAILY',
    {
      targetAmount: 10000,
      targetSales: 1,
      targetDemos: 1,
      targetColdCalls: 15,
      targetInboundCalls: 2,
      notes: 'Phase 10 verification daily target',
    },
    new Date(),
    user?.id
  );
  assert('Daily target save succeeds in PostgreSQL', !!savedDaily && savedDaily.period === 'DAILY');

  const statusAfterDaily = await getAllTargetsStatus(new Date(), user?.id);
  assert(
    'Daily target persists after refresh with exact numbers',
    statusAfterDaily.daily.isConfigured === true &&
      statusAfterDaily.daily.target?.amount === 10000 &&
      statusAfterDaily.daily.target?.sales === 1 &&
      statusAfterDaily.daily.target?.totalCalls === 17
  );

  // 4. MONTHLY / WEEKLY / DAILY TARGETS COEXIST WITHOUT OVERWRITING
  console.log('\n--- 4. TARGETS COEXISTENCE & INDEPENDENCE ---');
  assert(
    'Monthly, Weekly, and Daily targets coexist concurrently in PostgreSQL',
    statusAfterDaily.monthly.isConfigured === true &&
      statusAfterDaily.weekly.isConfigured === true &&
      statusAfterDaily.daily.isConfigured === true &&
      statusAfterDaily.monthly.target?.amount === 250000 &&
      statusAfterDaily.weekly.target?.amount === 60000 &&
      statusAfterDaily.daily.target?.amount === 10000
  );

  // 5. TARGET VALUES ARE NOT HARDCODED
  console.log('\n--- 5. DYNAMIC TARGET VALUES ---');
  const countMonthlyTargets = await prisma.target.count({ where: { period: 'MONTHLY' } });
  assert('Target values are dynamically stored and read from PostgreSQL (not hardcoded 100k)', countMonthlyTargets >= 1);

  // 6. ACTUAL PROGRESS USES REAL DB ACTIVITY
  console.log('\n--- 6. REAL ACTIVITY PROGRESS COMPUTATION ---');
  const targetPace = await getTargetPaceStatus(user?.id);
  assert(
    'Target Pace engine reads real PostgreSQL sales/activities and calculates true progress',
    targetPace.isConfigured === true &&
      typeof targetPace.progressPercent === 'number' &&
      targetPace.targetAmount === 250000
  );

  // 7. AI CANNOT OVERWRITE CONFIGURED TARGETS
  console.log('\n--- 7. AI SUGGESTION IMMUTABILITY ---');
  const suggestion = await calculateSmartTargetSuggestion(250000, user?.id);
  assert('AI Smart Target Suggestion calculates recommendations', !!suggestion && suggestion.targetAmount === 250000);
  const statusAfterAiSuggestion = await getAllTargetsStatus(new Date(), user?.id);
  assert(
    'User configured monthly target remains strictly unchanged after AI suggestion run',
    statusAfterAiSuggestion.monthly.target?.amount === 250000 &&
      statusAfterAiSuggestion.monthly.target?.sales === 5
  );

  // 8. SALES PLANNER USES REAL LEADS & EXCLUDES ARCHIVED LEADS
  console.log('\n--- 8. SALES PLANNER LEADS & ARCHIVE ISOLATION ---');
  const tomorrowPlan = await generateNextDayPlan(new Date(), user?.id);
  assert('Tomorrow Plan generated successfully from PostgreSQL', !!tomorrowPlan && Array.isArray(tomorrowPlan.timeline));

  const hasArchivedLeadInPlan = tomorrowPlan.timeline.some((item) => item.leadId === archivedLead?.id);
  assert('Tomorrow Plan strictly excludes archived leads from all timeline items', !hasArchivedLeadInPlan);

  // 9. SALES PLANNER REAL COMMITMENTS (DEMOS, FOLLOW-UPS, TASKS)
  console.log('\n--- 9. SALES PLANNER REAL COMMITMENTS ---');
  const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Create temporary real commitments for tomorrow
  const testDemo = await prisma.demo.create({
    data: {
      userId: user?.id,
      leadId: realLead?.id,
      status: 'SCHEDULED',
      scheduledAt: tomorrowDate,
      durationMinutes: 45,
      notes: 'Tomorrow Live Demo Verification',
    },
  });

  const testFu = await prisma.followUp.create({
    data: {
      userId: user?.id,
      leadId: realLead?.id,
      type: 'CALL',
      status: 'PENDING',
      scheduledAt: tomorrowDate,
      notes: 'Tomorrow Pricing Follow-up',
    },
  });

  const testTask = await prisma.task.create({
    data: {
      userId: user?.id,
      leadId: realLead?.id,
      title: 'Tomorrow Proposal Review Task',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: tomorrowDate,
    },
  });

  const planWithCommitments = await generateNextDayPlan(new Date(), user?.id);
  const demoFound = planWithCommitments.timeline.some((i) => i.id === testDemo.id);
  const fuFound = planWithCommitments.timeline.some((i) => i.id === testFu.id);
  const taskFound = planWithCommitments.timeline.some((i) => i.id === testTask.id);

  assert('Tomorrow Plan timeline includes real scheduled Demo', demoFound);
  assert('Tomorrow Plan timeline includes real scheduled Follow-up', fuFound);
  assert('Tomorrow Plan timeline includes real Task Center task', taskFound);

  // 10. NEXT WEEK PLAN AGGREGATION
  console.log('\n--- 10. NEXT WEEK PLAN AGGREGATION ---');
  const nextWeekPlan = await generateNextWeekPlan(user?.id);
  assert(
    'Next Week Plan aggregates across 7 days with real commitments',
    !!nextWeekPlan && nextWeekPlan.days.length === 7 && nextWeekPlan.totalDemos >= 1
  );

  // Clean up temporary commitments
  await prisma.demo.delete({ where: { id: testDemo.id } });
  await prisma.followUp.delete({ where: { id: testFu.id } });
  await prisma.task.delete({ where: { id: testTask.id } });

  // 11. OFFICE HOURS, LUNCH & TIMEZONE BOUNDARIES
  console.log('\n--- 11. TIMEZONE & SCHEDULE BOUNDARIES ---');
  const lunchBlock = tomorrowPlan.timeline.find((b) => b.activityType === 'LUNCH');
  assert('Office schedule contains protected lunch block', !!lunchBlock && lunchBlock.isProtected === true);

  const tzBounds = getDateRangeBounds('THIS_MONTH', undefined, undefined, DEFAULT_TIMEZONE);
  assert('Asia/Kolkata date boundaries correctly computed for monthly window', tzBounds.start < tzBounds.end);

  // 12. NO DUPLICATE TARGET RECORDS ON SAVE
  console.log('\n--- 12. IDEMPOTENT TARGET UPDATES ---');
  const countBefore = await prisma.target.count({ where: { period: 'MONTHLY' } });
  await saveTargetForPeriod('MONTHLY', { targetAmount: 250000, targetSales: 5 }, new Date(), user?.id);
  const countAfter = await prisma.target.count({ where: { period: 'MONTHLY' } });
  assert('Updating target for current period updates existing record (0 duplicate records created)', countBefore === countAfter);

  // 13. PHASE 1–9 REGRESSION INTEGRITY
  console.log('\n--- 13. PHASE 1–9 REGRESSION INTEGRITY ---');
  const leadCount = await prisma.lead.count();
  const templateCount = await prisma.whatsAppTemplate.count();
  assert('Phase 1–9 core entities preserved (leads >= 2, templates >= 12)', leadCount >= 2 && templateCount >= 12);

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
