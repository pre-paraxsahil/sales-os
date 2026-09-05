import { prisma } from '@/lib/prisma';
import {
  getActivityCounts,
  getSalesMetrics,
  getCallingIntelligence,
  getLeadSourceIntelligence,
  getLostOpportunities,
  getPendingHotOpportunities,
} from './analyticsService';
import { aiProvider } from '@/lib/ai/aiProvider';
import { DailyReportData, WeeklyReportData, ActivityCounts, SalesMetrics } from './types';

async function getDefaultUserId(userId?: string): Promise<string | undefined> {
  if (userId) return userId;
  const user = await prisma.user.findFirst({ where: { role: 'OWNER' } }) || await prisma.user.findFirst();
  return user?.id;
}

/**
 * Generate 6 PM Daily Sales Report
 * Aggregates all activity and computes AI coach daily review
 */
export async function generateDailyReport(
  targetDate: Date = new Date(),
  force: boolean = false,
  userId?: string
): Promise<DailyReportData> {
  const resolvedUserId = await getDefaultUserId(userId);

  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

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

  // Calculate day metrics
  const [activity, sales, lostOpps, pendingOpps] = await Promise.all([
    getActivityCounts(bounds, resolvedUserId),
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
    callsToConnected: calcRate(activity.connected, activity.totalCalls),
    connectedToInterested: calcRate(activity.interested, activity.connected),
    interestedToDemo: calcRate(activity.demosScheduled, activity.interested),
    demoToSale: calcRate(sales.totalSales, activity.demosCompleted),
  };

  // Run AI Sales Coach for daily evaluation
  let aiReview: DailyReportData['aiReview'];
  try {
    const coachResult = await aiProvider.generateSalesCoach({
      period: 'TODAY',
      activity,
      funnel: {
        callsMade: activity.totalCalls,
        connected: activity.connected,
        interested: activity.interested,
        demosCompleted: activity.demosCompleted,
        dealsClosed: sales.totalSales,
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
        activity.connected > 0 ? `Secured ${activity.connected} connected conversations.` : 'Pushed outbound dials.',
        sales.totalSales > 0 ? `Closed ${sales.totalSales} deal(s) worth ₹${sales.totalRevenue.toLocaleString()}.` : 'Maintained steady outreach cadence.',
      ],
      whatDidnt: [
        activity.noAnswer > 2 ? `Encountered ${activity.noAnswer} unreachable leads.` : 'Need higher interest-to-demo conversion.',
      ],
      bottleneck: activity.totalCalls === 0 ? 'Zero call volume logged today.' : 'Lead connection and qualification.',
      bestOpportunity: pendingOpps[0]?.leadTitle || 'Warm leads awaiting decision confirmation.',
      missedOpportunities: ['Follow-ups delayed beyond prime calling window.'],
      tomorrowPriorities: [
        'Prioritize hot lead re-connects between 10 AM - 12 PM.',
        'Follow up with pending proposal leads.',
      ],
      recommendedStrategy: 'Double down on warm follow-ups and send instant WhatsApp follow-up recaps.',
    };
  }

  const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = dayOfWeekNames[startOfDay.getDay()];

  const reportData: DailyReportData = {
    reportDate: startOfDay.toISOString().split('T')[0],
    dayOfWeek,
    activity,
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
        totalCalls: activity.totalCalls,
        totalDemos: activity.demosCompleted,
        totalFollowUps: activity.followUpCalls,
        totalSalesAmount: sales.totalRevenue,
        rawData: JSON.stringify(reportData),
      },
      create: {
        userId: resolvedUserId,
        reportDate: startOfDay,
        totalCalls: activity.totalCalls,
        totalDemos: activity.demosCompleted,
        totalFollowUps: activity.followUpCalls,
        totalSalesAmount: sales.totalRevenue,
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
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

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
 * Generate Complete Weekly Sales Report
 */
export async function generateWeeklyReport(
  weekStartDate: Date,
  force: boolean = false,
  userId?: string
): Promise<WeeklyReportData> {
  const resolvedUserId = await getDefaultUserId(userId);

  // Normalize week start (Monday) and week end (Sunday)
  const monday = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate(), 0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

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
    sales,
    callingIntel,
    leadSources,
    lostOpps,
    pendingOpps,
  ] = await Promise.all([
    getActivityCounts(bounds, resolvedUserId),
    getSalesMetrics(bounds, resolvedUserId),
    getCallingIntelligence(bounds, resolvedUserId),
    getLeadSourceIntelligence(bounds, resolvedUserId),
    getLostOpportunities(bounds, resolvedUserId),
    getPendingHotOpportunities(resolvedUserId),
  ]);

  const calcRate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  const conversions = {
    connectionRate: calcRate(activity.connected, activity.totalCalls),
    interestRate: calcRate(activity.interested, activity.connected),
    demoRate: calcRate(activity.demosScheduled, activity.interested),
    closeRate: calcRate(sales.totalSales, activity.demosCompleted),
  };

  // Daily breakdown to compute Best and Weakest day
  const callsInWeek = await prisma.call.findMany({
    where: {
      userId: resolvedUserId,
      occurredAt: { gte: monday, lte: sunday },
    },
    select: { occurredAt: true },
  });

  const salesInWeek = await prisma.sale.findMany({
    where: {
      userId: resolvedUserId,
      status: 'COMPLETED',
      closedAt: { gte: monday, lte: sunday },
    },
    select: { amount: true, closedAt: true },
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats = dayNames.map((dayName, idx) => ({
    dayIndex: idx,
    dayName,
    calls: 0,
    sales: 0,
    revenue: 0,
  }));

  for (const c of callsInWeek) {
    const dayIdx = new Date(c.occurredAt || Date.now()).getDay();
    dayStats[dayIdx].calls++;
  }

  for (const s of salesInWeek) {
    const dayIdx = new Date(s.closedAt).getDay();
    dayStats[dayIdx].sales++;
    dayStats[dayIdx].revenue += Number(s.amount);
  }

  // Best day: highest revenue, or highest calls
  const activeDays = dayStats.filter((d) => d.calls > 0 || d.sales > 0);
  let bestDay: WeeklyReportData['bestDay'] = null;
  let weakestDay: WeeklyReportData['weakestDay'] = null;

  if (activeDays.length > 0) {
    const sortedBest = [...activeDays].sort((a, b) => b.revenue - a.revenue || b.sales - a.sales || b.calls - a.calls);
    const sortedWeakest = [...activeDays].sort((a, b) => a.calls - b.calls || a.revenue - b.revenue);
    bestDay = sortedBest[0];
    weakestDay = sortedWeakest[0];
  }

  const bestCallingTime = callingIntel.bestWindow?.timeWindow || null;
  const bestLeadSource = leadSources.length > 0 ? leadSources[0].source : null;

  let weakestFunnelStage = 'Lead Connection';
  if (conversions.connectionRate < 40) weakestFunnelStage = 'Lead Connection (High unanswered rate)';
  else if (conversions.interestRate < 40) weakestFunnelStage = 'Interest Generation (Pitch hook drop)';
  else if (conversions.demoRate < 35) weakestFunnelStage = 'Demo Scheduling (Closing appointment drop)';
  else if (conversions.closeRate < 25) weakestFunnelStage = 'Demo to Won Deal (Negotiation stall)';

  const hasEnoughData = activity.totalCalls >= 10 || sales.totalSales >= 2;

  const reportData: WeeklyReportData = {
    weekStartDate: monday.toISOString().split('T')[0],
    weekEndDate: sunday.toISOString().split('T')[0],
    activity,
    conversions,
    sales,
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
        sales.totalSales > 0 ? `Achieved ₹${sales.totalRevenue.toLocaleString()} across ${sales.totalSales} closed deal(s).` : `Delivered ${activity.totalCalls} outreach conversations.`,
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
        totalCalls: activity.totalCalls,
        totalDemos: activity.demosCompleted,
        totalSalesAmount: sales.totalRevenue,
        rawData: JSON.stringify(reportData),
      },
      create: {
        userId: resolvedUserId,
        weekStartDate: monday,
        weekEndDate: sunday,
        totalCalls: activity.totalCalls,
        totalDemos: activity.demosCompleted,
        totalSalesAmount: sales.totalRevenue,
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
  const monday = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate(), 0, 0, 0, 0);

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
