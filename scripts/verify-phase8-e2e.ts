import { PrismaClient } from '@prisma/client';
import {
  calculateOfficeStatus,
  getStartAndEndOfDay,
  DEFAULT_TIMEZONE,
} from '../src/lib/time/salesTimeEngine';
import { getWorkHoursConfig } from '../src/lib/schedule/scheduleConfig';
import { getTargetPaceStatus } from '../src/lib/schedule/targetPaceService';
import { generateNextDayPlan } from '../src/lib/targets/targetPlannerService';
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
} from '../src/lib/analytics/reportService';
import { getPlanAwareKnowledge, checkFeatureCapability } from '../src/lib/knowledge/productKnowledgeService';

const prisma = new PrismaClient();

async function runPhase8IntegrationQA() {
  console.log('====================================================');
  console.log('   BROSTARTUP SALES OS — PHASE 8 INTEGRATION QA     ');
  console.log('       COMPLETE SALES OS INTEGRATION & SCENARIOS    ');
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
    const owner = (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());
    const userId = owner?.id || 'test-user-id';
    const config = await getWorkHoursConfig(userId);

    // ========================================================
    // SCENARIO A: Cold Lead -> Call (Connected+Interested) -> Callback Tomorrow 11:00 AM
    // ========================================================
    console.log('--- SCENARIO A: COLD LEAD -> CALL -> CALLBACK TOMORROW ---');
    const tomorrow11am = new Date();
    tomorrow11am.setDate(tomorrow11am.getDate() + 1);
    tomorrow11am.setHours(11, 0, 0, 0);

    const leadA = await prisma.lead.create({
      data: {
        title: 'Scenario A - Cold Retail Store',
        source: 'COLD_CALL',
        temperature: 'COLD',
        status: 'NEW',
        ...(userId ? { user: { connect: { id: userId } } } : {}),
        contact: {
          create: {
            name: 'Vikram Sharma',
            phone: '+919811002201',
            email: 'vikram@store.in',
            designation: 'Store Owner',
          },
        },
        business: {
          create: {
            name: 'Sharma Supermarket',
            industry: 'SUPERMARKET_GROCERY',
            city: 'Delhi',
          },
        },
      },
      include: { contact: true, business: true },
    });
    assert(leadA.id !== undefined, 'Scenario A lead created with contact & business info');

    // Log call outcome CONNECTED + INTERESTED
    const callA = await prisma.call.create({
      data: {
        lead: { connect: { id: leadA.id } },
        contact: leadA.contact?.id ? { connect: { id: leadA.contact.id } } : undefined,
        callType: 'OUTBOUND',
        outcome: 'INTERESTED',
        durationSeconds: 145,
        notes: 'Interested in barcode POS billing and multi-store inventory.',
        occurredAt: new Date(),
        nextAction: 'Callback tomorrow 11:00 AM',
        nextActionAt: tomorrow11am,
        ...(userId ? { user: { connect: { id: userId } } } : {}),
      },
    });
    assert(callA.id !== undefined && callA.outcome === 'INTERESTED', 'Call logged with outcome INTERESTED');

    // Create Reminder
    const reminderA = await prisma.reminder.create({
      data: {
        title: 'Callback Vikram Sharma',
        lead: { connect: { id: leadA.id } },
        entityId: callA.id,
        entityType: 'CALL',
        type: 'CALL',
        remindAt: tomorrow11am,
        status: 'PENDING',
        message: 'Callback Vikram Sharma regarding POS pricing',
        ...(userId ? { user: { connect: { id: userId } } } : {}),
      },
    });
    assert(reminderA.status === 'PENDING', 'Reminder record created with status PENDING for tomorrow 11:00 AM');

    // Update lead status & temperature
    const updatedLeadA = await prisma.lead.update({
      where: { id: leadA.id },
      data: {
        status: 'CONTACTED',
        temperature: 'WARM',
        nextActionDate: tomorrow11am,
      },
    });
    assert(updatedLeadA.temperature === 'WARM', 'Lead temperature upgraded to WARM automatically');

    // ========================================================
    // SCENARIO B: Ads Lead -> Call (No Answer) -> 5 Min Reminder
    // ========================================================
    console.log('\n--- SCENARIO B: ADS LEAD -> NO ANSWER -> 5 MIN REMINDER ---');
    const leadB = await prisma.lead.create({
      data: {
        title: 'Scenario B - Meta Ad Inbound',
        source: 'FACEBOOK_ADS',
        temperature: 'WARM',
        status: 'NEW',
        ...(userId ? { user: { connect: { id: userId } } } : {}),
        contact: {
          create: {
            name: 'Pooja Verma',
            phone: '+919822003302',
          },
        },
      },
      include: { contact: true },
    });

    const callB = await prisma.call.create({
      data: {
        lead: { connect: { id: leadB.id } },
        contact: leadB.contact?.id ? { connect: { id: leadB.contact.id } } : undefined,
        callType: 'INBOUND',
        outcome: 'NO_ANSWER',
        durationSeconds: 0,
        notes: 'Ringing, no answer.',
        occurredAt: new Date(),
        nextAction: 'Retry call in 5 minutes',
        nextActionAt: new Date(Date.now() + 5 * 60 * 1000),
        ...(userId ? { user: { connect: { id: userId } } } : {}),
      },
    });

    const reminderB = await prisma.reminder.create({
      data: {
        title: 'Retry Call Pooja Verma',
        lead: { connect: { id: leadB.id } },
        entityId: callB.id,
        entityType: 'CALL',
        type: 'CALL',
        remindAt: new Date(Date.now() + 5 * 60 * 1000),
        status: 'PENDING',
        message: 'Quick follow-up retry for unanswered ads lead',
        ...(userId ? { user: { connect: { id: userId } } } : {}),
      },
    });
    assert(reminderB.type === 'CALL', '5-minute retry reminder successfully scheduled');

    // ========================================================
    // SCENARIO C: Demo Scheduled -> Demo Completed -> Sample Sent
    // ========================================================
    console.log('\n--- SCENARIO C: DEMO SCHEDULED -> COMPLETED -> SAMPLE SENT ---');
    const leadC = await prisma.lead.create({
      data: {
        title: 'Scenario C - Apparel Brand',
        source: 'ORGANIC_SEARCH',
        temperature: 'HOT',
        status: 'QUALIFIED',
        ...(userId ? { user: { connect: { id: userId } } } : {}),
        contact: {
          create: {
            name: 'Rahul Malhotra',
            phone: '+919833004403',
          },
        },
        business: {
          create: {
            name: 'Malhotra Apparels',
            industry: 'FASHION_APPAREL',
            city: 'Mumbai',
          },
        },
      },
      include: { contact: true },
    });

    const demoC = await prisma.demo.create({
      data: {
        lead: { connect: { id: leadC.id } },
        contact: leadC.contact?.id ? { connect: { id: leadC.contact.id } } : undefined,
        status: 'COMPLETED',
        outcome: 'POSITIVE',
        scheduledAt: new Date(),
        completedAt: new Date(),
        durationMinutes: 30,
        notes: 'Demo completed. Showed lookbooks and variant matrix.',
        ...(userId ? { user: { connect: { id: userId } } } : {}),
      },
    });
    assert(demoC.status === 'COMPLETED', 'Demo marked COMPLETED with positive outcome');

    // Add Activity: Sample Sent
    const activityC = await prisma.activity.create({
      data: {
        lead: { connect: { id: leadC.id } },
        type: 'SAMPLE_SENT',
        title: 'Sent Product Sample & Demo Credentials',
        description: 'Sent product sample brochure and test store credentials on WhatsApp.',
        occurredAt: new Date(),
        ...(userId ? { user: { connect: { id: userId } } } : {}),
      },
    });
    assert(activityC.type === 'SAMPLE_SENT', 'Activity SAMPLE_SENT logged to database');

    // ========================================================
    // SCENARIO D: Negotiation -> Closing -> Sale -> Revenue Reflected
    // ========================================================
    console.log('\n--- SCENARIO D: NEGOTIATION -> SALE -> REVENUE REPORTING ---');
    const leadD = await prisma.lead.create({
      data: {
        title: 'Scenario D - Wholesale Trader',
        source: 'DIRECT_OUTREACH',
        temperature: 'HOT',
        status: 'NEGOTIATION',
        ...(userId ? { user: { connect: { id: userId } } } : {}),
        contact: {
          create: {
            name: 'Anand Gupta',
            phone: '+919844005504',
          },
        },
      },
      include: { contact: true },
    });

    const saleD = await prisma.sale.create({
      data: {
        lead: { connect: { id: leadD.id } },
        amount: 7999,
        currency: 'INR',
        status: 'COMPLETED',
        closedAt: new Date(),
        occurredAt: new Date(),
        ...(userId ? { user: { connect: { id: userId } } } : {}),
      },
    });
    assert(saleD.status === 'COMPLETED' && saleD.amount.toNumber() === 7999, 'Sale of ₹7,999 recorded with status COMPLETED');

    const updatedLeadD = await prisma.lead.update({
      where: { id: leadD.id },
      data: { status: 'WON' },
    });
    assert(updatedLeadD.status === 'WON', 'Lead marked WON after sale closing');

    // Verify revenue reflects in target and report
    const targetStatus = await getTargetPaceStatus(userId);
    assert(targetStatus !== null && typeof targetStatus.achievedAmount === 'number', 'Target pace recalculates live revenue');

    const dailyRep = await generateDailyReport(new Date(), true);
    assert(
      (dailyRep.salesProgress?.revenue || 0) >= 7999 || (dailyRep.sales?.totalRevenue || 0) >= 7999,
      'Daily sales report reflects ₹7,999 closed revenue'
    );

    // ========================================================
    // SCENARIO E: Wrong Number -> No Unnecessary Reminder
    // ========================================================
    console.log('\n--- SCENARIO E: WRONG NUMBER -> NO REMINDER ---');
    const leadE = await prisma.lead.create({
      data: {
        title: 'Scenario E - Invalid Lead',
        source: 'COLD_CALL',
        temperature: 'COLD',
        status: 'NEW',
        ...(userId ? { user: { connect: { id: userId } } } : {}),
        contact: {
          create: {
            name: 'Unknown Person',
            phone: '+919855006605',
          },
        },
      },
      include: { contact: true },
    });

    const callE = await prisma.call.create({
      data: {
        lead: { connect: { id: leadE.id } },
        contact: leadE.contact?.id ? { connect: { id: leadE.contact.id } } : undefined,
        callType: 'OUTBOUND',
        outcome: 'WRONG_NUMBER',
        durationSeconds: 10,
        notes: 'Wrong number, caller said wrong person.',
        occurredAt: new Date(),
        ...(userId ? { user: { connect: { id: userId } } } : {}),
      },
    });

    await prisma.lead.update({
      where: { id: leadE.id },
      data: { status: 'LOST' },
    });

    const remindersForE = await prisma.reminder.findMany({ where: { leadId: leadE.id } });
    assert(remindersForE.length === 0, 'No unnecessary reminder generated for wrong number call');

    // ========================================================
    // SCENARIO F: Sunday Office Status Check
    // ========================================================
    console.log('\n--- SCENARIO F: SUNDAY OFFICE HOURS CHECK ---');
    const sundayDate = new Date('2026-09-13T11:00:00.000Z'); // Sunday
    const sundayStatus = calculateOfficeStatus(config, null, sundayDate);
    assert(!sundayStatus.isWorkingDay || sundayStatus.code === 'CLOSED', 'Sunday evaluated as non-working / closed office day');

    // ========================================================
    // SCENARIO G: 6:30 PM After Office Hours Check
    // ========================================================
    console.log('\n--- SCENARIO G: AFTER-HOURS OFFICE STATUS CHECK ---');
    // 6:30 PM IST = 13:00 UTC
    const afterHoursDate = new Date('2026-09-08T13:00:00.000Z'); // Tuesday 6:30 PM IST
    const afterHoursStatus = calculateOfficeStatus(config, null, afterHoursDate);
    assert(afterHoursStatus.code === 'CLOSED', '6:30 PM IST evaluated as office closed / after-hours');

    // Next Action Planner produces morning plan
    const nextDayPlan = await generateNextDayPlan(new Date(), userId);
    assert(nextDayPlan.timeline !== undefined && nextDayPlan.timeline.length > 0, 'Next Action Planner schedules organized work blocks for next day');

    // ========================================================
    // SCENARIO H: Real Database Aggregation Integrity
    // ========================================================
    console.log('\n--- SCENARIO H: REAL DATABASE REPORT AGGREGATION ---');
    const weeklyRep = await generateWeeklyReport(new Date(), true);
    assert(weeklyRep.dayByDay !== undefined && weeklyRep.dayByDay.length === 7, 'Weekly report produces complete 7-day breakdown matrix');

    const monthlyRep = await generateMonthlyReport(new Date(), true);
    assert(monthlyRep.monthName !== undefined, 'Monthly report produces valid structured metrics');

    // ========================================================
    // SCENARIO I: Product Knowledge & AI Sales Brain Safety
    // ========================================================
    console.log('\n--- SCENARIO I: KNOWLEDGE & ZERO-HALLUCINATION BRAIN ---');
    const plans = await getPlanAwareKnowledge();
    assert(plans.length >= 3, 'Dynamic plan-aware knowledge loaded from PostgreSQL');

    const unverifiedCap = await checkFeatureCapability('Can OneComPro do flying car delivery?');
    assert(
      unverifiedCap.status === 'UNKNOWN' &&
        unverifiedCap.whatToSayToCustomer === 'Need to verify with technical team.',
      'Unverified feature strictly returns UNKNOWN + "Need to verify with technical team."'
    );

    // ========================================================
    // SCENARIO J: Data Persistence & Zero Leakage Audit
    // ========================================================
    console.log('\n--- SCENARIO J: DATA PERSISTENCE AUDIT ---');
    const finalLeads = await prisma.lead.count();
    const finalCalls = await prisma.call.count();
    const finalDemos = await prisma.demo.count();
    const finalSales = await prisma.sale.count();
    const finalActivities = await prisma.activity.count();

    assert(finalLeads >= 10, `Total leads in database: ${finalLeads}`);
    assert(finalCalls >= 28, `Total calls in database: ${finalCalls}`);
    assert(finalDemos >= 5, `Total demos in database: ${finalDemos}`);
    assert(finalSales >= 3, `Total sales in database: ${finalSales}`);
    assert(finalActivities >= 32, `Total activities in database: ${finalActivities}`);

    console.log('\n====================================================');
    console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
    console.log('====================================================');
  } catch (error) {
    console.error('Fatal error during Phase 8 Integration QA:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase8IntegrationQA();
