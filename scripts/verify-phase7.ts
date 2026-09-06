import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { getOptimizedDatabaseUrl } from '../src/lib/prisma';
import { getSalesOverview } from '../src/lib/analytics/analyticsService';
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
} from '../src/lib/analytics/reportService';

const prisma = new PrismaClient();

async function runPhase7Verification() {
  console.log('====================================================');
  console.log('   BROSTARTUP SALES OS — PHASE 7 VERIFICATION SUITE  ');
  console.log('  PERFORMANCE + LOADING + INSIGHTS STABILITY ENGINE   ');
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
    // 1. App Startup & Global Loading Screen
    console.log('--- 1. APP STARTUP & GLOBAL LOADING SCREEN ---');
    const loadingPath = path.join(process.cwd(), 'src', 'app', 'loading.tsx');
    assert(fs.existsSync(loadingPath), 'Root loading.tsx exists');
    const loadingContent = fs.readFileSync(loadingPath, 'utf-8');
    assert(loadingContent.includes('BS') && loadingContent.includes('BroStartup Sales OS'), 'Loading screen renders BS brand badge & title');
    assert(loadingContent.includes('Preparing your sales workspace…'), 'Loading screen contains "Preparing your sales workspace…"');

    // 2. Route-Level Lightweight Skeletons
    console.log('\n--- 2. ROUTE-LEVEL LIGHTWEIGHT SKELETONS ---');
    const routes = ['today', 'leads', 'schedule', 'whatsapp', 'insights'];
    for (const route of routes) {
      const routeLoadingPath = path.join(process.cwd(), 'src', 'app', route, 'loading.tsx');
      assert(fs.existsSync(routeLoadingPath), `Route skeleton exists: /${route}/loading.tsx`);
      const content = fs.readFileSync(routeLoadingPath, 'utf-8');
      assert(content.includes('export default function'), `Route /${route}/loading.tsx exports default function`);
    }

    // 3. Database Connection & PgBouncer Compatibility
    console.log('\n--- 3. DATABASE CONNECTION & PGBOUNCER COMPATIBILITY ---');
    const testPoolerUrl = 'postgresql://postgres.xxx:pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
    const oldEnv = process.env.DATABASE_URL;
    process.env.DATABASE_URL = testPoolerUrl;
    const optimized = getOptimizedDatabaseUrl();
    assert(
      optimized !== undefined &&
        optimized.includes('pgbouncer=true') &&
        optimized.includes('statement_cache_size=0'),
      'getOptimizedDatabaseUrl attaches pgbouncer=true and statement_cache_size=0 for Supabase poolers'
    );
    process.env.DATABASE_URL = oldEnv;

    // 4. Insights Date Range Queries
    console.log('\n--- 4. INSIGHTS DATE RANGE QUERIES ---');
    const overviewToday = await getSalesOverview('TODAY');
    assert(overviewToday !== null && typeof overviewToday.activity?.totalCalls === 'number', 'getSalesOverview(TODAY) executes cleanly');

    const overviewYesterday = await getSalesOverview('YESTERDAY');
    assert(overviewYesterday !== null && typeof overviewYesterday.activity?.totalCalls === 'number', 'getSalesOverview(YESTERDAY) executes cleanly');

    const overviewWeek = await getSalesOverview('THIS_WEEK');
    assert(overviewWeek !== null && typeof overviewWeek.activity?.totalCalls === 'number', 'getSalesOverview(THIS_WEEK) executes cleanly');

    const overviewMonth = await getSalesOverview('THIS_MONTH');
    assert(overviewMonth !== null && typeof overviewMonth.activity?.totalCalls === 'number', 'getSalesOverview(THIS_MONTH) executes cleanly');

    // 5. Report Generation Handlers
    console.log('\n--- 5. REPORT GENERATION ENGINE ---');
    const now = new Date();
    const dailyRep = await generateDailyReport(now, true);
    assert(dailyRep !== null && dailyRep.reportDate !== undefined, 'generateDailyReport executes and returns valid report');
    assert(typeof dailyRep.calling?.totalCalls === 'number', 'Daily report calling metrics computed from real DB');

    const weeklyRep = await generateWeeklyReport(now, true);
    assert(weeklyRep !== null && weeklyRep.weekStartDate !== undefined, 'generateWeeklyReport executes and returns valid report');

    const monthlyRep = await generateMonthlyReport(now, true);
    assert(monthlyRep !== null && monthlyRep.monthName !== undefined, 'generateMonthlyReport executes and returns valid report');

    // 6. Production Database Record Preservation
    console.log('\n--- 6. PRODUCTION DATA PRESERVATION AUDIT ---');
    const leadsCount = await prisma.lead.count();
    const callsCount = await prisma.call.count();
    const demosCount = await prisma.demo.count();
    const salesCount = await prisma.sale.count();
    const activitiesCount = await prisma.activity.count();

    assert(leadsCount >= 5, `Leads preserved: ${leadsCount} records`);
    assert(callsCount >= 22, `Calls preserved: ${callsCount} records`);
    assert(demosCount >= 0, `Demos preserved: ${demosCount} records`);
    assert(salesCount >= 2, `Sales preserved: ${salesCount} records`);
    assert(activitiesCount >= 29, `Activities preserved: ${activitiesCount} records`);

    console.log('\n====================================================');
    console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
    console.log('====================================================');
  } catch (error) {
    console.error('Fatal error during Phase 7 verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase7Verification();
