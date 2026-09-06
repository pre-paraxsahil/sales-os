import { prisma } from '@/lib/prisma';
import {
  getActivityCounts,
  getSalesMetrics,
  getCallingIntelligence,
  getLeadSourceIntelligence,
  getLostOpportunities,
  getPendingHotOpportunities,
  getDetailedCallingBreakdown,
  getDetailedCallOutcomes,
  getDetailedSalesProgress,
  getDetailedActivitySummary,
  getSourcePerformanceBreakdown,
  getDayByDayBreakdown,
} from './analyticsService';
import { getLocalTimeParts, getStartAndEndOfDay, DEFAULT_TIMEZONE } from '@/lib/time/salesTimeEngine';
import { aiProvider } from '@/lib/ai/aiProvider';
import {
  DailyReportData,
  WeeklyReportData,
  MonthlyReportData,
  ActivityCounts,
  SalesMetrics,
} from './types';

async function getDefaultUserId(userId?: string): Promise<string | undefined> {
  if (userId) return userId;
  const user = (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());
  return user?.id;
}

/**
 * Generate Real Daily Sales Report
 * Aggregates all activity from DB: Calling breakdown, Call Outcomes, Sales Progress, Activity Summary, AI review
 */
export async function generateDailyReport(
  targetDate: Date = new Date(),
  force: boolean = false,
  userId?: string
): Promise<DailyReportData> {
  const resolvedUserId = await getDefaultUserId(userId);
  const { start: startOfDay, end: endOfDay, dateString } = getStartAndEndOfDay(targetDate);

  // Check if report already exists and force is false
  if (!force && resolvedUserId) {
    const existing = await prisma.dailyReport.findFirst({
      where: {
        userId: resolvedUserId,
        reportDate: startOfDay,
      },
    });

    if (existing && existing.rawData) {
      try {
        return JSON.parse(existing.rawData) as DailyReportData;
      } catch (e) {
        // Fallback to regenerate if rawData parse fails
      }
    }
  }

  const bounds = { start: startOfDay, end: endOfDay, label: 'Today' };

  // Calculate day metrics in parallel
  const [
    activity,
    calling,
    outcomes,
    salesProgress,
    activitySummary,
    sources,
    sales,
    lostOpps,
    pendingOpps,
  ] = await Promise.all([
    getActivityCounts(bounds, resolvedUserId),
    getDetailedCallingBreakdown(bounds, resolvedUserId),
    getDetailedCallOutcomes(bounds, resolvedUserId),
    getDetailedSalesProgress(bounds, resolvedUserId),
    getDetailedActivitySummary(bounds, resolvedUserId),
    getSourcePerformanceBreakdown(bounds, resolvedUserId),
    getSalesMetrics(bounds, resolvedUserId),
    getLostOpportunities(bounds, resolvedUserId),
    getPendingHotOpportunities(resolvedUserId),
  ]);

  // Fetch recent call notes from the day
  const dayCalls = await prisma.call.findMany({
    where: {
      userId: resolvedUserId,
      occurredAt: { gte: startOfDay, lte: endOfDay },
    },
    select: { notes: true, outcome: true },
    take: 15,
  });

  const recentNotes = dayCalls
    .map((c) => (c.notes ? `[${c.outcome}] ${c.notes}` : `[${c.outcome}]`))
    .filter(Boolean);

  const calcRate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  const funnel = {
    callsToConnected: calcRate(outcomes.connected, calling.totalCalls),
    connectedToInterested: calcRate(salesProgress.interestedLeads, outcomes.connected),
    interestedToDemo: calcRate(salesProgress.demosBooked, salesProgress.interestedLeads),
    demoToSale: calcRate(salesProgress.closings, salesProgress.demosCompleted),
  };

  // Run AI Sales Coach for daily evaluation
  let aiReview: DailyReportData['aiReview'];
  try {
    const coachResult = await aiProvider.generateSalesCoach({
      period: 'TODAY',
      activity,
      funnel: {
        callsMade: calling.totalCalls,
        connected: outcomes.connected,
        interested: salesProgress.interestedLeads,
        demosCompleted: salesProgress.demosCompleted,
        dealsClosed: salesProgress.closings,
        connectionRate: funnel.callsToConnected,
        demoConversionRate: funnel.interestedToDemo,
        closeRate: funnel.demoToSale,
      },
      sales,
      recentNotes,
      lostDeals: lostOpps.map((l) => ({
        leadTitle: l.leadTitle,
        stageLost: l.stageLost,
        reason: l.reason || undefined,
        objection: l.lastObjection || undefined,
      })),
      pendingOpportunities: pendingOpps.map((p) => ({
        leadTitle: p.leadTitle,
        temperature: p.temperature,
        stage: p.stage,
        recommendedAction: p.recommendedAction,
      })),
    });

    aiReview = {
      whatWorked: coachResult.whatWorked,
      whatDidnt: coachResult.whatDidnt,
      bottleneck: coachResult.bottleneck,
      bestOpportunity: Array.isArray(coachResult.topOpportunity)
        ? (coachResult.topOpportunity[0] || 'Pipeline leads in closing stage')
        : String(coachResult.topOpportunity || 'Pipeline leads in closing stage'),
      missedOpportunities: coachResult.missedOpportunities,
      tomorrowPriorities: coachResult.tomorrowPriorities,
      recommendedStrategy: coachResult.recommendations.join(' '),
    };
  } catch (error) {
    aiReview = {
      whatWorked: [
        outcomes.connected > 0 ? `Secured ${outcomes.connected} connected conversations.` : 'Pushed outbound dials.',
        salesProgress.closings > 0 ? `Closed ${salesProgress.closings} deal(s) worth ₹${salesProgress.revenue.toLocaleString()}.` : 'Maintained steady outreach cadence.',
      ],
      whatDidnt: [
        outcomes.noAnswer > 2 ? `Encountered ${outcomes.noAnswer} unreachable leads.` : 'Need higher interest-to-demo conversion.',
      ],
      bottleneck: calling.totalCalls === 0 ? 'Zero call volume logged today.' : 'Lead connection and qualification.',
      bestOpportunity: pendingOpps[0]?.leadTitle || 'Warm leads awaiting decision confirmation.',
      missedOpportunities: ['Follow-ups delayed beyond prime calling window.'],
      tomorrowPriorities: [
        'Prioritize hot lead re-connects between 10 AM - 12 PM.',
        'Follow up with pending proposal leads.',
      ],
      recommendedStrategy: 'Double down on warm follow-ups and send instant WhatsApp follow-up recaps.',
    };
  }

  const parts = getLocalTimeParts(targetDate);
  const dayOfWeek = parts.dayName;

  const reportData: DailyReportData = {
    reportDate: dateString,
    dayOfWeek,
    activity,
    calling,
    outcomes,
    salesProgress,
    activitySummary,
    sources,
    funnel,
    sales,
    aiReview,
    generatedAt: new Date().toISOString(),
  };

  // Persist report in database
  if (resolvedUserId) {
    const saved = await prisma.dailyReport.upsert({
      where: {
        userId_reportDate: {
          userId: resolvedUserId,
          reportDate: startOfDay,
        },
      },
      update: {
        totalCalls: calling.totalCalls,
        totalDemos: salesProgress.demosCompleted,
        totalFollowUps: calling.followUpCalls,
        totalSalesAmount: salesProgress.revenue,
        rawData: JSON.stringify(reportData),
      },
      create: {
        userId: resolvedUserId,
        reportDate: startOfDay,
        totalCalls: calling.totalCalls,
        totalDemos: salesProgress.demosCompleted,
        totalFollowUps: calling.followUpCalls,
        totalSalesAmount: salesProgress.revenue,
        rawData: JSON.stringify(reportData),
      },
    });
    reportData.id = saved.id;
  }

  return reportData;
}

/**
 * Fetch saved daily report
 */
export async function getDailyReport(
  date: Date = new Date(),
  userId?: string
): Promise<DailyReportData | null> {
  const resolvedUserId = await getDefaultUserId(userId);
  const { start: startOfDay } = getStartAndEndOfDay(date);

  const report = await prisma.dailyReport.findFirst({
    where: {
      userId: resolvedUserId,
      reportDate: startOfDay,
    },
  });

  if (!report || !report.rawData) return null;
  try {
    const data = JSON.parse(report.rawData) as DailyReportData;
    data.id = report.id;
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Generate Complete Weekly Sales Report with Day-by-Day Breakdown
 */
export async function generateWeeklyReport(
  weekStartDate: Date,
  force: boolean = false,
  userId?: string
): Promise<WeeklyReportData> {
  const resolvedUserId = await getDefaultUserId(userId);

  // Normalize week start (Monday) and week end (Sunday)
  const parts = getLocalTimeParts(weekStartDate);
  const diffToMonday = (parts.dayOfWeek === 0 ? -6 : 1) - parts.dayOfWeek;
  const mondayDate = new Date(weekStartDate.getTime() + diffToMonday * 24 * 60 * 60 * 1000);
  const { start: monday } = getStartAndEndOfDay(mondayDate);

  const sundayDate = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  const { end: sunday } = getStartAndEndOfDay(sundayDate);

  if (!force && resolvedUserId) {
    const existing = await prisma.weeklyReport.findFirst({
      where: {
        userId: resolvedUserId,
        weekStartDate: monday,
      },
    });

    if (existing && existing.rawData) {
      try {
        return JSON.parse(existing.rawData) as WeeklyReportData;
      } catch (e) {}
    }
  }

  const bounds = { start: monday, end: sunday, label: 'Weekly Period' };

  const [
    activity,
    calling,
    outcomes,
    salesProgress,
    activitySummary,
    sources,
    sales,
    dayByDay,
    callingIntel,
    leadSources,
    lostOpps,
    pendingOpps,
  ] = await Promise.all([
    getActivityCounts(bounds, resolvedUserId),
    getDetailedCallingBreakdown(bounds, resolvedUserId),
    getDetailedCallOutcomes(bounds, resolvedUserId),
    getDetailedSalesProgress(bounds, resolvedUserId),
    getDetailedActivitySummary(bounds, resolvedUserId),
    getSourcePerformanceBreakdown(bounds, resolvedUserId),
    getSalesMetrics(bounds, resolvedUserId),
    getDayByDayBreakdown(bounds, resolvedUserId),
    getCallingIntelligence(bounds, resolvedUserId),
    getLeadSourceIntelligence(bounds, resolvedUserId),
    getLostOpportunities(bounds, resolvedUserId),
    getPendingHotOpportunities(resolvedUserId),
  ]);

  const calcRate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  const conversions = {
    connectionRate: calcRate(outcomes.connected, calling.totalCalls),
    interestRate: calcRate(salesProgress.interestedLeads, outcomes.connected),
    demoRate: calcRate(salesProgress.demosBooked, salesProgress.interestedLeads),
    closeRate: calcRate(salesProgress.closings, salesProgress.demosCompleted),
  };

  // Best day: highest revenue, or highest calls
  const activeDays = dayByDay.filter((d) => d.calls > 0 || d.closings > 0 || d.revenue > 0);
  let bestDay: WeeklyReportData['bestDay'] = null;
  let weakestDay: WeeklyReportData['weakestDay'] = null;

  if (activeDays.length > 0) {
    const sortedBest = [...activeDays].sort((a, b) => b.revenue - a.revenue || b.closings - a.closings || b.calls - a.calls);
    const sortedWeakest = [...activeDays].sort((a, b) => a.calls - b.calls || a.revenue - b.revenue);
    bestDay = { dayName: sortedBest[0].dayName, date: sortedBest[0].date, calls: sortedBest[0].calls, sales: sortedBest[0].closings, revenue: sortedBest[0].revenue };
    weakestDay = { dayName: sortedWeakest[0].dayName, date: sortedWeakest[0].date, calls: sortedWeakest[0].calls };
  }

  const bestCallingTime = callingIntel.bestWindow?.timeWindow || null;
  const bestLeadSource = leadSources.length > 0 ? leadSources[0].source : null;

  let weakestFunnelStage = 'Lead Connection';
  if (conversions.connectionRate < 40) weakestFunnelStage = 'Lead Connection (High unanswered rate)';
  else if (conversions.interestRate < 40) weakestFunnelStage = 'Interest Generation (Pitch hook drop)';
  else if (conversions.demoRate < 35) weakestFunnelStage = 'Demo Scheduling (Closing appointment drop)';
  else if (conversions.closeRate < 25) weakestFunnelStage = 'Demo to Won Deal (Negotiation stall)';

  const hasEnoughData = calling.totalCalls >= 10 || salesProgress.closings >= 2;

  const reportData: WeeklyReportData = {
    weekStartDate: monday.toISOString().split('T')[0],
    weekEndDate: sunday.toISOString().split('T')[0],
    activity,
    calling,
    outcomes,
    salesProgress,
    activitySummary,
    dayByDay,
    conversions,
    sales,
    sources,
    bestDay,
    weakestDay,
    bestCallingTime,
    bestLeadSource,
    weakestFunnelStage,
    lostOpportunitiesCount: lostOpps.length,
    pendingHotCount: pendingOpps.length,
    hasEnoughData,
    aiReview: {
      strategicWins: [
        salesProgress.closings > 0
          ? `Achieved ₹${salesProgress.revenue.toLocaleString()} across ${salesProgress.closings} closed deal(s).`
          : `Delivered ${calling.totalCalls} outreach conversations.`,
        bestCallingTime ? `High conversion pattern observed around ${bestCallingTime}.` : 'Identified active prospect cohorts.',
      ],
      coreBottlenecks: [
        `Primary drop-off area: ${weakestFunnelStage}.`,
        conversions.connectionRate < 50 ? 'Outbound reachability requires pre-call warming.' : 'Follow-up cycle needs tighter turnarounds.',
      ],
      nextWeekDirectives: [
        'Block 2 prime hours daily exclusively for warm callback closure.',
        'Target urgent follow-ups on hot leads before they turn stale.',
      ],
    },
    generatedAt: new Date().toISOString(),
  };

  if (resolvedUserId) {
    const saved = await prisma.weeklyReport.upsert({
      where: {
        userId_weekStartDate: {
          userId: resolvedUserId,
          weekStartDate: monday,
        },
      },
      update: {
        weekEndDate: sunday,
        totalCalls: calling.totalCalls,
        totalDemos: salesProgress.demosCompleted,
        totalSalesAmount: salesProgress.revenue,
        rawData: JSON.stringify(reportData),
      },
      create: {
        userId: resolvedUserId,
        weekStartDate: monday,
        weekEndDate: sunday,
        totalCalls: calling.totalCalls,
        totalDemos: salesProgress.demosCompleted,
        totalSalesAmount: salesProgress.revenue,
        rawData: JSON.stringify(reportData),
      },
    });
    reportData.id = saved.id;
  }

  return reportData;
}

/**
 * Fetch saved weekly report
 */
export async function getWeeklyReport(
  weekStartDate: Date,
  userId?: string
): Promise<WeeklyReportData | null> {
  const resolvedUserId = await getDefaultUserId(userId);
  const parts = getLocalTimeParts(weekStartDate);
  const diffToMonday = (parts.dayOfWeek === 0 ? -6 : 1) - parts.dayOfWeek;
  const mondayDate = new Date(weekStartDate.getTime() + diffToMonday * 24 * 60 * 60 * 1000);
  const { start: monday } = getStartAndEndOfDay(mondayDate);

  const report = await prisma.weeklyReport.findFirst({
    where: {
      userId: resolvedUserId,
      weekStartDate: monday,
    },
  });

  if (!report || !report.rawData) return null;
  try {
    const data = JSON.parse(report.rawData) as WeeklyReportData;
    data.id = report.id;
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Generate Complete Monthly Sales Report
 * Shows total activity, conversion funnel, source performance, target achievement, best/weakest day, rates
 */
export async function generateMonthlyReport(
  targetDate: Date = new Date(),
  force: boolean = false,
  userId?: string
): Promise<MonthlyReportData> {
  const resolvedUserId = await getDefaultUserId(userId);
  const parts = getLocalTimeParts(targetDate);

  const startIso = `${parts.year}-${String(parts.month).padStart(2, '0')}-01T00:00:00.000+05:30`;
  const monthStart = new Date(startIso);
  const lastDay = new Date(parts.year, parts.month, 0).getDate();
  const endIso = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`;
  const monthEnd = new Date(endIso);

  if (!force && resolvedUserId) {
    const existing = await prisma.monthlyReport.findFirst({
      where: {
        userId: resolvedUserId,
        monthStartDate: monthStart,
      },
    });

    if (existing && existing.rawData) {
      try {
        return JSON.parse(existing.rawData) as MonthlyReportData;
      } catch (e) {}
    }
  }

  const bounds = { start: monthStart, end: monthEnd, label: `${parts.year}-${String(parts.month).padStart(2, '0')}` };

  const [
    activity,
    calling,
    outcomes,
    salesProgress,
    activitySummary,
    sourcePerformance,
    sales,
    dayByDay,
    monthlyTarget,
  ] = await Promise.all([
    getActivityCounts(bounds, resolvedUserId),
    getDetailedCallingBreakdown(bounds, resolvedUserId),
    getDetailedCallOutcomes(bounds, resolvedUserId),
    getDetailedSalesProgress(bounds, resolvedUserId),
    getDetailedActivitySummary(bounds, resolvedUserId),
    getSourcePerformanceBreakdown(bounds, resolvedUserId),
    getSalesMetrics(bounds, resolvedUserId),
    getDayByDayBreakdown(bounds, resolvedUserId),
    prisma.target.findFirst({
      where: {
        userId: resolvedUserId,
        period: 'MONTHLY',
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
    }),
  ]);

  const calcRate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  const connectionRate = calcRate(outcomes.connected, calling.totalCalls);
  const interestRate = calcRate(salesProgress.interestedLeads, outcomes.connected);
  const demoRate = calcRate(salesProgress.demosBooked, salesProgress.interestedLeads);
  const demoConversionRate = calcRate(salesProgress.demosCompleted, salesProgress.demosBooked);
  const closingRate = calcRate(salesProgress.closings, salesProgress.demosCompleted > 0 ? salesProgress.demosCompleted : calling.totalCalls);
  const followUpConversionRate = calcRate(salesProgress.closings, calling.followUpCalls);

  const conversionFunnel = {
    calls: calling.totalCalls,
    connected: outcomes.connected,
    interested: salesProgress.interestedLeads,
    demos: salesProgress.demosCompleted,
    closings: salesProgress.closings,
    connectionRate,
    interestRate,
    demoRate,
    closeRate: closingRate,
    followUpConversionRate,
  };

  // Best and Weakest Days
  const activeDays = dayByDay.filter((d) => d.calls > 0 || d.closings > 0 || d.revenue > 0);
  let bestDay: MonthlyReportData['bestDay'] = null;
  let weakestDay: MonthlyReportData['weakestDay'] = null;

  if (activeDays.length > 0) {
    const sortedBest = [...activeDays].sort((a, b) => b.revenue - a.revenue || b.closings - a.closings || b.calls - a.calls);
    const sortedWeakest = [...activeDays].sort((a, b) => a.calls - b.calls || a.revenue - b.revenue);
    bestDay = { dayName: sortedBest[0].dayName, date: sortedBest[0].date, calls: sortedBest[0].calls, sales: sortedBest[0].closings, revenue: sortedBest[0].revenue };
    weakestDay = { dayName: sortedWeakest[0].dayName, date: sortedWeakest[0].date, calls: sortedWeakest[0].calls, sales: sortedWeakest[0].closings, revenue: sortedWeakest[0].revenue };
  }

  // Target Achievement
  const targetRevenue = monthlyTarget ? Number(monthlyTarget.targetAmount) : 0;
  const targetCalls = monthlyTarget ? monthlyTarget.targetCalls : 0;
  const targetDemos = monthlyTarget ? monthlyTarget.targetDemos : 0;
  const targetSales = monthlyTarget ? monthlyTarget.targetSales : 0;

  const targetAchievement = {
    targetRevenue,
    achievedRevenue: salesProgress.revenue,
    revenuePercent: targetRevenue > 0 ? Math.round((salesProgress.revenue / targetRevenue) * 100) : 100,
    targetCalls,
    achievedCalls: calling.totalCalls,
    callsPercent: targetCalls > 0 ? Math.round((calling.totalCalls / targetCalls) * 100) : 100,
    targetDemos,
    achievedDemos: salesProgress.demosCompleted,
    demosPercent: targetDemos > 0 ? Math.round((salesProgress.demosCompleted / targetDemos) * 100) : 100,
    targetSales,
    achievedSales: salesProgress.closings,
    salesPercent: targetSales > 0 ? Math.round((salesProgress.closings / targetSales) * 100) : 100,
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[parts.month - 1];

  const totalActivity = calling.totalCalls + salesProgress.demosCompleted + activitySummary.whatsAppSent + activitySummary.tasksCompleted + activitySummary.otherActivities;

  const reportData: MonthlyReportData = {
    monthStartDate: monthStart.toISOString().split('T')[0],
    monthEndDate: monthEnd.toISOString().split('T')[0],
    monthName,
    year: parts.year,
    totalActivity,
    activity,
    calling,
    outcomes,
    salesProgress,
    activitySummary,
    dayByDay,
    conversionFunnel,
    sourcePerformance,
    sales,
    revenue: salesProgress.revenue,
    targetAchievement,
    bestDay,
    weakestDay,
    closingRate,
    demoConversionRate,
    followUpConversionRate,
    aiReview: {
      strategicWins: [
        salesProgress.closings > 0
          ? `Generated ₹${salesProgress.revenue.toLocaleString()} with ${salesProgress.closings} closed sales.`
          : `Delivered ${calling.totalCalls} outreach calls across ${monthName}.`,
        sourcePerformance.length > 0 && sourcePerformance[0].revenue > 0
          ? `Top generating channel: ${sourcePerformance[0].source} with ₹${sourcePerformance[0].revenue.toLocaleString()}.`
          : 'Built prospect pipeline momentum across all active sources.',
      ],
      coreBottlenecks: [
        connectionRate < 50 ? 'Low initial reachability on cold cohorts.' : 'Demo booking conversion requires tighter qualification.',
        closingRate < 20 ? 'Follow-up closing cycle needs stronger incentive or urgency.' : 'Maintain current high-yield closing cadence.',
      ],
      directives: [
        'Scale the highest converting acquisition channels.',
        'Focus next month calling on peak-conversion daily windows.',
      ],
    },
    generatedAt: new Date().toISOString(),
  };

  if (resolvedUserId) {
    const saved = await prisma.monthlyReport.upsert({
      where: {
        userId_monthStartDate: {
          userId: resolvedUserId,
          monthStartDate: monthStart,
        },
      },
      update: {
        monthEndDate: monthEnd,
        totalCalls: calling.totalCalls,
        totalDemos: salesProgress.demosCompleted,
        totalSalesAmount: salesProgress.revenue,
        rawData: JSON.stringify(reportData),
      },
      create: {
        userId: resolvedUserId,
        monthStartDate: monthStart,
        monthEndDate: monthEnd,
        totalCalls: calling.totalCalls,
        totalDemos: salesProgress.demosCompleted,
        totalSalesAmount: salesProgress.revenue,
        rawData: JSON.stringify(reportData),
      },
    });
    reportData.id = saved.id;
  }

  return reportData;
}

/**
 * Fetch saved monthly report
 */
export async function getMonthlyReport(
  monthStartDate: Date,
  userId?: string
): Promise<MonthlyReportData | null> {
  const resolvedUserId = await getDefaultUserId(userId);
  const parts = getLocalTimeParts(monthStartDate);
  const startIso = `${parts.year}-${String(parts.month).padStart(2, '0')}-01T00:00:00.000+05:30`;
  const monthStart = new Date(startIso);

  const report = await prisma.monthlyReport.findFirst({
    where: {
      userId: resolvedUserId,
      monthStartDate: monthStart,
    },
  });

  if (!report || !report.rawData) return null;
  try {
    const data = JSON.parse(report.rawData) as MonthlyReportData;
    data.id = report.id;
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * List recent daily reports
 */
export async function listDailyReports(limit: number = 10, userId?: string): Promise<DailyReportData[]> {
  const resolvedUserId = await getDefaultUserId(userId);
  const reports = await prisma.dailyReport.findMany({
    where: { userId: resolvedUserId },
    orderBy: { reportDate: 'desc' },
    take: limit,
  });

  return reports
    .map((r) => {
      try {
        if (!r.rawData) return null;
        const d = JSON.parse(r.rawData) as DailyReportData;
        d.id = r.id;
        return d;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean) as DailyReportData[];
}

/**
 * List recent weekly reports
 */
export async function listWeeklyReports(limit: number = 8, userId?: string): Promise<WeeklyReportData[]> {
  const resolvedUserId = await getDefaultUserId(userId);
  const reports = await prisma.weeklyReport.findMany({
    where: { userId: resolvedUserId },
    orderBy: { weekStartDate: 'desc' },
    take: limit,
  });

  return reports
    .map((r) => {
      try {
        if (!r.rawData) return null;
        const d = JSON.parse(r.rawData) as WeeklyReportData;
        d.id = r.id;
        return d;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean) as WeeklyReportData[];
}

/**
 * List recent monthly reports
 */
export async function listMonthlyReports(limit: number = 12, userId?: string): Promise<MonthlyReportData[]> {
  const resolvedUserId = await getDefaultUserId(userId);
  const reports = await prisma.monthlyReport.findMany({
    where: { userId: resolvedUserId },
    orderBy: { monthStartDate: 'desc' },
    take: limit,
  });

  return reports
    .map((r) => {
      try {
        if (!r.rawData) return null;
        const d = JSON.parse(r.rawData) as MonthlyReportData;
        d.id = r.id;
        return d;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean) as MonthlyReportData[];
}
