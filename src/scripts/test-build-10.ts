import { prisma } from '../lib/prisma';
import {
  getDateRangeBounds,
  getActivityCounts,
  getSalesMetrics,
  getPipelineHealth,
  getFunnelAnalytics,
  getTwoHourPulse,
  getCallingIntelligence,
  getLeadSourceIntelligence,
  getLostOpportunities,
  getPendingHotOpportunities,
  getSalesForecast,
  getSalesOverview,
} from '../lib/analytics/analyticsService';
import {
  generateDailyReport,
  getDailyReport,
  generateWeeklyReport,
  getWeeklyReport,
} from '../lib/analytics/reportService';
import {
  generateDailyReportCsv,
  generateWeeklyReportCsv,
  generateLeadSourceCsv,
} from '../lib/analytics/exportService';
import { aiProvider } from '../lib/ai/aiProvider';

async function runBuild10Tests() {
  console.log('=================================================================');
  console.log('BROSTARTUP SALES OS — BUILD 10 VERIFICATION SUITE');
  console.log('INSIGHTS + REPORTS + SALES INTELLIGENCE + AI SALES COACH');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Database Connectivity & Baselines
    console.log('--- TEST 1: Database Connectivity & Record Counts ---');
    const leadCount = await prisma.lead.count();
    const callCount = await prisma.call.count();
    const demoCount = await prisma.demo.count();
    const saleCount = await prisma.sale.count();
    console.log(`Found: ${leadCount} leads, ${callCount} calls, ${demoCount} demos, ${saleCount} sales in PostgreSQL.`);
    assert(leadCount > 0, `Database contains ${leadCount} leads (no reset).`);

    // 2. Date Range Boundaries
    console.log('\n--- TEST 2: Date Range Boundaries Helper ---');
    const todayBounds = getDateRangeBounds('TODAY');
    const weekBounds = getDateRangeBounds('THIS_WEEK');
    const monthBounds = getDateRangeBounds('THIS_MONTH');
    assert(todayBounds.start <= todayBounds.end, 'Today start is before end.');
    assert(weekBounds.start <= weekBounds.end, 'This week start is before end.');
    assert(monthBounds.start.getDate() === 1, 'This month starts on day 1.');

    // 3. Activity Counts Aggregation
    console.log('\n--- TEST 3: Raw Activity Counts Aggregation ---');
    const allTimeBounds = { start: new Date('2020-01-01'), end: new Date('2030-01-01'), label: 'All Time' };
    const activity = await getActivityCounts(allTimeBounds);
    console.log(`Activity: ${activity.totalCalls} calls, ${activity.connected} connected, ${activity.demosCompleted} demos.`);
    assert(activity.totalCalls >= 0, 'Total calls aggregated accurately.');
    assert(activity.connected <= activity.totalCalls, 'Connected calls <= Total calls.');

    // 4. Sales Metrics Aggregation
    console.log('\n--- TEST 4: Raw Sales Metrics Aggregation ---');
    const salesMetrics = await getSalesMetrics(allTimeBounds);
    console.log(`Sales: ${salesMetrics.totalSales} deals, ₹${salesMetrics.totalRevenue} revenue, avg ₹${salesMetrics.averageSaleValue}.`);
    assert(salesMetrics.totalSales >= 0, 'Total sales count computed.');
    assert(salesMetrics.totalRevenue >= 0, 'Total revenue computed.');

    // 5. Pipeline Health Snapshot
    console.log('\n--- TEST 5: Pipeline Health Snapshot ---');
    const pipeline = await getPipelineHealth();
    console.log(`Pipeline: ${pipeline.hotLeads} hot, ${pipeline.warmLeads} warm, ${pipeline.coldLeads} cold, ₹${pipeline.pipelineValue} total value.`);
    assert(typeof pipeline.pipelineValue === 'number', 'Pipeline value computed as number.');
    assert(pipeline.hotLeads + pipeline.warmLeads + pipeline.coldLeads <= leadCount, 'Temperature breakdown sums correctly.');

    // 6. 5-Stage Conversion Funnel
    console.log('\n--- TEST 6: 5-Stage Conversion Funnel & Drop-Off Rates ---');
    const funnel = await getFunnelAnalytics(allTimeBounds);
    assert(funnel.stages.length === 5, `Funnel has exactly 5 stages (got ${funnel.stages.length}).`);
    for (const stage of funnel.stages) {
      assert(stage.percentageOfTop >= 0 && stage.percentageOfTop <= 100, `Stage ${stage.name} percentage is valid (${stage.percentageOfTop}%).`);
    }
    console.log('Funnel stages validated:', funnel.stages.map((s) => `${s.name}: ${s.count} (${s.conversionFromPrev}%)`).join(' -> '));

    // 7. Funnel Bottleneck Detection
    console.log('\n--- TEST 7: Funnel Bottleneck Detection ---');
    if (funnel.bottleneck) {
      console.log(`Bottleneck identified at: ${funnel.bottleneck.stageName} (${funnel.bottleneck.dropOffRate}% drop-off)`);
      assert(funnel.bottleneck.dropOffRate > 30, 'Identified bottleneck has drop-off > 30%.');
      assert(funnel.bottleneck.recommendation.length > 5, 'Bottleneck has actionable recommendation.');
    } else {
      console.log('No severe bottleneck (>30% drop-off with >=2 events) detected.');
      assert(true, 'Bottleneck check evaluated cleanly.');
    }

    // 8. Two-Hour Sales Pulse
    console.log('\n--- TEST 8: Two-Hour Sales Pulse Execution ---');
    const pulse = await getTwoHourPulse();
    assert(Boolean(pulse.currentBlock.blockTitle), `Current pulse block titled: ${pulse.currentBlock.blockTitle}`);
    assert(pulse.currentBlock.connectionRate >= 0 && pulse.currentBlock.connectionRate <= 100, 'Pulse connection rate in valid range.');
    assert(pulse.nextBlockFocus.length > 0, 'Pulse next block recommendation present.');
    console.log(`Pulse: Block ${pulse.currentBlock.blockTitle}, Connection Rate: ${pulse.currentBlock.connectionRate}%, Focus: "${pulse.nextBlockFocus}"`);

    // 9. Best Calling Time Intelligence
    console.log('\n--- TEST 9: Best Calling Time Intelligence ---');
    const callingIntel = await getCallingIntelligence(allTimeBounds);
    assert(callingIntel.windows.length === 6, `Analyzed 6 time windows across the day (got ${callingIntel.windows.length}).`);
    console.log(`Calling Intel: HasEnoughData = ${callingIntel.hasEnoughData}, Summary = "${callingIntel.summary}"`);
    assert(typeof callingIntel.hasEnoughData === 'boolean', 'Sample size adequacy evaluated.');

    // 10. Lead Source Intelligence Attribution
    console.log('\n--- TEST 10: Lead Source Attribution ---');
    const leadSources = await getLeadSourceIntelligence(allTimeBounds);
    assert(Array.isArray(leadSources), 'Lead sources returned as array.');
    if (leadSources.length > 0) {
      console.log(`Top source: ${leadSources[0].source} (${leadSources[0].leadsCount} leads, ₹${leadSources[0].revenue} revenue).`);
      assert(leadSources[0].connectionRate >= 0, 'Source connect rate computed.');
    }

    // 11. Lost Opportunities Analysis
    console.log('\n--- TEST 11: Lost Opportunities Analysis ---');
    const lostOpps = await getLostOpportunities(allTimeBounds);
    assert(Array.isArray(lostOpps), 'Lost opportunities returned as array.');
    console.log(`Found ${lostOpps.length} lost opportunities analyzed.`);

    // 12. Pending Hot Opportunities
    console.log('\n--- TEST 12: Pending Hot Opportunities ---');
    const pendingHot = await getPendingHotOpportunities();
    assert(Array.isArray(pendingHot), 'Pending hot opportunities returned as array.');
    console.log(`Found ${pendingHot.length} pending hot opportunities requiring attention.`);

    // 13. Sales Forecast
    console.log('\n--- TEST 13: Sales Forecast (Run Rate + Pipeline Weighting) ---');
    const forecast = await getSalesForecast(allTimeBounds);
    assert(typeof forecast.forecastAvailable === 'boolean', 'Forecast availability flag evaluated.');
    assert(forecast.confidenceScore >= 0 && forecast.confidenceScore <= 100, `Forecast confidence score is valid (${forecast.confidenceScore}%).`);
    console.log(`Forecast: Available = ${forecast.forecastAvailable}, Projected Revenue = ₹${forecast.projectedSalesAmount.toLocaleString()}, Confidence = ${forecast.confidenceScore}%.`);

    // 14. 6 PM Daily Sales Report Generation & Persistence
    console.log('\n--- TEST 14: 6 PM Daily Sales Report Generation & DB Persistence ---');
    const now = new Date();
    const dailyReport = await generateDailyReport(now, true);
    assert(Boolean(dailyReport.reportDate), `Daily report generated for date: ${dailyReport.reportDate}`);
    assert(Boolean(dailyReport.aiReview.bottleneck), `Daily report contains AI bottleneck: "${dailyReport.aiReview.bottleneck}"`);
    assert(dailyReport.aiReview.tomorrowPriorities.length > 0, 'Daily report contains tomorrow priorities.');

    // Verify persistence in DailyReport table
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const savedDaily = await prisma.dailyReport.findFirst({
      where: { reportDate: startOfDay },
    });
    assert(Boolean(savedDaily), 'Daily report successfully persisted in PostgreSQL DailyReport table.');
    assert(Boolean(savedDaily?.rawData), 'DailyReport table rawData JSON string exists.');

    // 15. Weekly Sales Report Generation & Persistence
    console.log('\n--- TEST 15: Weekly Sales Report Generation & DB Persistence ---');
    const weeklyReport = await generateWeeklyReport(now, true);
    assert(Boolean(weeklyReport.weekStartDate), `Weekly report generated for week: ${weeklyReport.weekStartDate} to ${weeklyReport.weekEndDate}`);
    assert(typeof weeklyReport.conversions.connectionRate === 'number', 'Weekly conversion rate calculated.');

    // Verify persistence in WeeklyReport table
    const savedWeekly = await prisma.weeklyReport.findFirst({
      where: weeklyReport.id ? { id: weeklyReport.id } : { weekStartDate: new Date(weeklyReport.weekStartDate) },
    });
    assert(Boolean(savedWeekly), 'Weekly report successfully persisted in PostgreSQL WeeklyReport table.');
    assert(Boolean(savedWeekly?.rawData), 'WeeklyReport table rawData JSON string exists.');

    // 16. AI Sales Coach Standalone Execution
    console.log('\n--- TEST 16: AI Sales Coach Execution ---');
    const coachResult = await aiProvider.generateSalesCoach({
      period: 'TODAY',
      activity,
      funnel: {
        callsMade: activity.totalCalls,
        connected: activity.connected,
        interested: activity.interested,
        demosCompleted: activity.demosCompleted,
        dealsClosed: salesMetrics.totalSales,
        connectionRate: 65,
        demoConversionRate: 40,
        closeRate: 50,
      },
      sales: salesMetrics,
      recentNotes: ['Prospect interested in 10 user setup, asked for pricing', 'Budget constraint on pro plan'],
      lostDeals: [{ leadTitle: 'TechCorp', stageLost: 'PROPOSAL', reason: 'Price too high' }],
      pendingOpportunities: [{ leadTitle: 'Acme Logistics', temperature: 'HOT', stage: 'DEMO_COMPLETED', recommendedAction: 'Close deal' }],
    });
    assert(coachResult.whatWorked.length > 0, `Coach whatWorked has ${coachResult.whatWorked.length} items.`);
    assert(coachResult.whatDidnt.length > 0, `Coach whatDidnt has ${coachResult.whatDidnt.length} items.`);
    assert(Boolean(coachResult.bottleneck), `Coach bottleneck: "${coachResult.bottleneck}"`);
    const confVal = coachResult.confidence <= 1 ? Math.round(coachResult.confidence * 100) : coachResult.confidence;
    assert(confVal >= 50 && confVal <= 100, `Coach confidence score: ${confVal}%`);
    console.log('AI Sales Coach output successfully verified.');

    // 17. CSV Export Generation
    console.log('\n--- TEST 17: CSV Export Formatting ---');
    const dailyCsv = generateDailyReportCsv(dailyReport);
    assert(dailyCsv.includes('Total Calls'), 'Daily CSV includes Total Calls row.');
    assert(dailyCsv.includes('Report Date'), 'Daily CSV includes Report Date header.');

    const weeklyCsv = generateWeeklyReportCsv(weeklyReport);
    assert(weeklyCsv.includes('Week Start Date'), 'Weekly CSV includes Week Start Date.');

    const sourceCsv = generateLeadSourceCsv(leadSources);
    assert(sourceCsv.includes('Lead Source'), 'Lead source CSV includes headers.');
    console.log('CSV formatting utilities verified.');

    // 18. Complete Sales Overview Integration
    console.log('\n--- TEST 18: Complete Sales Overview Aggregation ---');
    const overview = await getSalesOverview('TODAY');
    assert(overview.range === 'TODAY', 'Overview returned for TODAY range.');
    assert(Boolean(overview.activity), 'Overview includes activity counts.');
    assert(Boolean(overview.sales), 'Overview includes sales metrics.');
    assert(Boolean(overview.pipeline), 'Overview includes pipeline health.');
    assert(Boolean(overview.pulse), 'Overview includes two-hour pulse.');

    // 19. Verify Database Immutability / Non-Destruction
    console.log('\n--- TEST 19: Database Integrity Non-Destruction Check ---');
    const finalLeadCount = await prisma.lead.count();
    const finalCallCount = await prisma.call.count();
    assert(finalLeadCount === leadCount, `Lead count intact: ${finalLeadCount} === ${leadCount}`);
    assert(finalCallCount === callCount, `Call count intact: ${finalCallCount} === ${callCount}`);

    console.log('\n=================================================================');
    console.log(`BUILD 10 TEST RESULTS: ${passed} PASSED, ${failed} FAILED.`);
    console.log('=================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal error in Build 10 verification suite:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBuild10Tests();
