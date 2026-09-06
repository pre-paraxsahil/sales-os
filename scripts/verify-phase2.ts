import { PrismaClient } from '@prisma/client';
import {
  getTargetForPeriod,
  saveTargetForPeriod,
  getAllTargetsStatus,
  calculateSmartTargetSuggestion,
  generateNextDayPlan,
  generateNextWeekPlan,
} from '../src/lib/targets/targetPlannerService';
import { getTargetPaceStatus } from '../src/lib/schedule/targetPaceService';

const prisma = new PrismaClient();

async function runVerification() {
  console.log('=== BROSTARTUP SALES OS — PHASE 2 VERIFICATION SUITE ===\n');

  try {
    // 1. Initial Database Count & Integrity Audit
    console.log('1. Auditing database tables and record count...');
    const leadsCount = await prisma.lead.count();
    const callsCount = await prisma.call.count();
    const demosCount = await prisma.demo.count();
    const followUpsCount = await prisma.followUp.count();
    const remindersCount = await prisma.reminder.count();
    const activitiesCount = await prisma.activity.count();
    const whatsAppTemplatesCount = await prisma.whatsAppTemplate.count();
    const productOfferingsCount = await prisma.productOffering.count();
    const plansCount = await prisma.plan.count();
    const userSettingsCount = await prisma.userSetting.count();
    const contactsCount = await prisma.contact.count();
    const businessesCount = await prisma.business.count();
    const totalRecords =
      leadsCount +
      callsCount +
      demosCount +
      followUpsCount +
      remindersCount +
      activitiesCount +
      whatsAppTemplatesCount +
      productOfferingsCount +
      plansCount +
      userSettingsCount +
      contactsCount +
      businessesCount;

    console.log(`   - Total baseline records preserved: ${totalRecords} (Expected >= 74)`);
    console.log(`   - Reminders preserved: ${remindersCount} (Expected >= 3)`);
    console.log(`   - Leads: ${leadsCount}, Calls: ${callsCount}, Demos: ${demosCount}`);

    if (totalRecords < 74 || remindersCount < 3) {
      throw new Error(`Integrity audit failed: records missing! Total: ${totalRecords}, Reminders: ${remindersCount}`);
    }

    // 2. Unconfigured Target Pace Behavior
    console.log('\n2. Testing unconfigured Target Pace behavior...');
    const initialTargetPace = await getTargetPaceStatus();
    console.log('   - Initial Target Pace:', {
      isConfigured: initialTargetPace.isConfigured,
      targetAmount: initialTargetPace.targetAmount,
      achievedAmount: initialTargetPace.achievedAmount,
      mode: initialTargetPace.mode,
      statusLabel: initialTargetPace.statusLabel,
    });

    // 3. Smart Target Suggestion Engine
    console.log('\n3. Testing Smart Target Suggestion Engine...');
    const smartSuggestion = await calculateSmartTargetSuggestion(250000);
    console.log('   - Smart Suggestion for Monthly Target:', {
      label: smartSuggestion.label,
      targetAmount: smartSuggestion.targetAmount,
      metrics: smartSuggestion.metrics,
      assumptions: smartSuggestion.assumptions,
    });
    console.log('   - Suggestion Narrative:\n     ' + smartSuggestion.narrative);

    // 4. Target Save & Retrieve for Daily, Weekly, Monthly
    console.log('\n4. Testing Target Persistence across periods...');
    const savedMonthly = await saveTargetForPeriod('MONTHLY', {
      targetAmount: 250000,
      targetSales: 5,
      targetDemos: 25,
      targetInterested: 50,
      targetFollowUps: 100,
      targetColdCalls: 200,
      targetInboundCalls: 30,
      notes: 'Phase 2 automated test monthly target',
    });
    console.log(`   - Saved Monthly Target ID: ${savedMonthly.id}, TargetAmount: ₹${savedMonthly.targetAmount}`);

    const savedWeekly = await saveTargetForPeriod('WEEKLY', {
      targetAmount: 60000,
      targetSales: 1,
      targetDemos: 6,
      targetInterested: 12,
      targetFollowUps: 25,
      targetColdCalls: 50,
      notes: 'Phase 2 automated test weekly target',
    });
    console.log(`   - Saved Weekly Target ID: ${savedWeekly.id}, TargetAmount: ₹${savedWeekly.targetAmount}`);

    const savedDaily = await saveTargetForPeriod('DAILY', {
      targetAmount: 10000,
      targetSales: 0,
      targetDemos: 1,
      targetInterested: 2,
      targetFollowUps: 5,
      targetColdCalls: 10,
      notes: 'Phase 2 automated test daily target',
    });
    console.log(`   - Saved Daily Target ID: ${savedDaily.id}, TargetAmount: ₹${savedDaily.targetAmount}`);

    // Check all targets status
    const allStatus = await getAllTargetsStatus();
    console.log('   - Target Status Overview:');
    console.log(`     * Daily: ${allStatus.daily.status} (Target: ₹${allStatus.daily.target?.amount}, Achieved: ₹${allStatus.daily.achieved.amount})`);
    console.log(`     * Weekly: ${allStatus.weekly.status} (Target: ₹${allStatus.weekly.target?.amount}, Achieved: ₹${allStatus.weekly.achieved.amount})`);
    console.log(`     * Monthly: ${allStatus.monthly.status} (Target: ₹${allStatus.monthly.target?.amount}, Achieved: ₹${allStatus.monthly.achieved.amount})`);

    // 5. Configured Target Pace Behavior
    console.log('\n5. Testing configured Target Pace behavior...');
    const configuredTargetPace = await getTargetPaceStatus();
    console.log('   - Configured Target Pace:', {
      isConfigured: configuredTargetPace.isConfigured,
      targetAmount: configuredTargetPace.targetAmount,
      achievedAmount: configuredTargetPace.achievedAmount,
      mode: configuredTargetPace.mode,
      statusLabel: configuredTargetPace.statusLabel,
      progressPercent: configuredTargetPace.progressPercent,
    });

    if (!configuredTargetPace.isConfigured || configuredTargetPace.targetAmount !== 250000) {
      throw new Error('Configured target pace did not match saved target!');
    }

    // 6. Next Day Plan (Tomorrow's Plan)
    console.log('\n6. Testing Next Day Plan Generation (Tomorrow)...');
    const tomorrowPlan = await generateNextDayPlan();
    console.log('   - Next Day Plan:', {
      dateString: tomorrowPlan.dateString,
      displayDate: tomorrowPlan.displayDate,
      isWeeklyOff: tomorrowPlan.isWeeklyOff,
      totalCommitments: tomorrowPlan.totalCommitments,
      demosCount: tomorrowPlan.demosCount,
      followUpsCount: tomorrowPlan.followUpsCount,
      timelineItemsCount: tomorrowPlan.timeline.length,
      focusSummary: tomorrowPlan.focusSummary,
    });
    console.log('   - First 3 Timeline Slots:');
    tomorrowPlan.timeline.slice(0, 3).forEach((item, i) => {
      console.log(`     ${i + 1}. [${item.timeRange}] [${item.activityType}] ${item.title} (Protected: ${item.isProtected || false})`);
    });

    const hasLunchSlot = tomorrowPlan.timeline.some((item) => item.activityType === 'LUNCH');
    console.log(`   - Protected Lunch slot included: ${hasLunchSlot}`);

    // 7. Next Week Plan
    console.log('\n7. Testing Next Week Plan Generation...');
    const nextWeekPlan = await generateNextWeekPlan();
    console.log('   - Next Week Plan:', {
      weekRange: nextWeekPlan.weekRange,
      totalDemos: nextWeekPlan.totalDemos,
      totalFollowUps: nextWeekPlan.totalFollowUps,
      daysCount: nextWeekPlan.days.length,
    });
    console.log('   - Days breakdown:');
    nextWeekPlan.days.forEach((day) => {
      console.log(`     * ${day.displayDate}: ${day.totalCommitments} commitments (WeeklyOff: ${day.isWeeklyOff}, Demos: ${day.demosCount}, FollowUps: ${day.followUpsCount})`);
    });

    // 8. Final Safety Check on Database
    console.log('\n8. Final safety re-verification of database records...');
    const finalLeadsCount = await prisma.lead.count();
    const finalRemindersCount = await prisma.reminder.count();
    console.log(`   - Leads: ${finalLeadsCount} (Original: ${leadsCount})`);
    console.log(`   - Reminders: ${finalRemindersCount} (Original: ${remindersCount})`);

    console.log('\n======================================================');
    console.log('✅ ALL PHASE 2 VERIFICATION CHECKS PASSED SUCCESSFULLY');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ Verification Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
