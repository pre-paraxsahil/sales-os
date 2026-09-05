import { prisma } from '@/lib/prisma';
import {
  AnalyticsDateRange,
  DateRangeBounds,
  ActivityCounts,
  SalesMetrics,
  PipelineHealth,
  FunnelAnalyticsResult,
  FunnelStage,
  TwoHourPulseResult,
  SalesPulseBlock,
  CallingIntelligenceResult,
  CallingTimeWindow,
  LeadSourceStat,
  LostOpportunityItem,
  PendingHotOpportunityItem,
  ForecastResult,
} from './types';

/**
 * Returns Start & End boundaries for a given date range filter
 */
export function getDateRangeBounds(
  range: AnalyticsDateRange,
  customStart?: string,
  customEnd?: string
): DateRangeBounds {
  const now = new Date();

  switch (range) {
    case 'TODAY': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end, label: 'Today' };
    }
    case 'YESTERDAY': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      return { start, end, label: 'Yesterday' };
    }
    case 'THIS_WEEK': {
      // Start of week (Monday)
      const day = now.getDay();
      const diff = (day === 0 ? -6 : 1) - day; // adjust when day is sunday
      const monday = new Date(now);
      monday.setDate(now.getDate() + diff);
      const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end, label: 'This Week' };
    }
    case 'LAST_WEEK': {
      const day = now.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() + diff - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      const start = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate(), 0, 0, 0, 0);
      const end = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate(), 23, 59, 59, 999);
      return { start, end, label: 'Last Week' };
    }
    case 'THIS_MONTH': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end, label: 'This Month' };
    }
    case 'CUSTOM': {
      const start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = customEnd ? new Date(customEnd) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end, label: 'Custom Range' };
    }
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end, label: 'Today' };
    }
  }
}

/**
 * Fetch raw activity counts from Call and Demo tables
 */
export async function getActivityCounts(
  bounds: DateRangeBounds,
  userId?: string
): Promise<ActivityCounts> {
  const userFilter = userId ? { userId } : {};

  // Calls logged within bounds
  const calls = await prisma.call.findMany({
    where: {
      ...userFilter,
      occurredAt: {
        gte: bounds.start,
        lte: bounds.end,
      },
    },
    select: {
      callType: true,
      outcome: true,
    },
  });

  // Demos scheduled/completed within bounds
  const demosScheduled = await prisma.demo.count({
    where: {
      ...userFilter,
      createdAt: {
        gte: bounds.start,
        lte: bounds.end,
      },
    },
  });

  const demosCompleted = await prisma.demo.count({
    where: {
      ...userFilter,
      status: 'COMPLETED',
      updatedAt: {
        gte: bounds.start,
        lte: bounds.end,
      },
    },
  });

  let connected = 0;
  let interested = 0;
  let noAnswer = 0;
  let busy = 0;
  let switchedOff = 0;
  let notInterested = 0;
  let wrongNumber = 0;
  let other = 0;
  let newCalls = 0;
  let followUpCalls = 0;

  for (const call of calls) {
    if (call.callType === 'FOLLOW_UP' || call.callType === 'CALLBACK') {
      followUpCalls++;
    } else {
      newCalls++;
    }

    switch (call.outcome) {
      case 'CONNECTED':
        connected++;
        break;
      case 'INTERESTED':
        connected++;
        interested++;
        break;
      case 'DEMO_BOOKED':
      case 'SCHEDULED_DEMO':
        connected++;
        interested++;
        break;
      case 'NO_ANSWER':
      case 'VOICEMAIL':
        noAnswer++;
        break;
      case 'BUSY':
        busy++;
        break;
      case 'SWITCHED_OFF':
        switchedOff++;
        break;
      case 'NOT_INTERESTED':
        connected++;
        notInterested++;
        break;
      case 'WRONG_NUMBER':
        wrongNumber++;
        break;
      case 'FOLLOW_UP_REQUIRED':
        connected++;
        break;
      default:
        other++;
        break;
    }
  }

  return {
    totalCalls: calls.length,
    newCalls,
    followUpCalls,
    connected,
    interested,
    demosScheduled,
    demosCompleted,
    noAnswer,
    busy,
    switchedOff,
    notInterested,
    wrongNumber,
    other,
  };
}

/**
 * Fetch raw sales metrics from Sale table
 */
export async function getSalesMetrics(
  bounds: DateRangeBounds,
  userId?: string
): Promise<SalesMetrics> {
  const userFilter = userId ? { userId } : {};

  const sales = await prisma.sale.findMany({
    where: {
      ...userFilter,
      status: 'COMPLETED',
      closedAt: {
        gte: bounds.start,
        lte: bounds.end,
      },
    },
    include: {
      lead: {
        select: {
          source: true,
          title: true,
        },
      },
      opportunity: {
        select: {
          title: true,
        },
      },
    },
  });

  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.amount), 0);
  const averageSaleValue = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;

  // Aggregate by package / description
  const packageMap = new Map<string, { count: number; revenue: number }>();
  // Aggregate by lead source
  const sourceMap = new Map<string, { count: number; revenue: number }>();

  for (const s of sales) {
    const pkg = s.opportunity?.title || 'Standard Plan';
    const existingPkg = packageMap.get(pkg) || { count: 0, revenue: 0 };
    existingPkg.count += 1;
    existingPkg.revenue += Number(s.amount);
    packageMap.set(pkg, existingPkg);

    const src = s.lead?.source || 'Direct / Organic';
    const existingSrc = sourceMap.get(src) || { count: 0, revenue: 0 };
    existingSrc.count += 1;
    existingSrc.revenue += Number(s.amount);
    sourceMap.set(src, existingSrc);
  }

  const packages = Array.from(packageMap.entries()).map(([packageCode, val]) => ({
    packageCode,
    count: val.count,
    revenue: val.revenue,
  }));

  const sources = Array.from(sourceMap.entries()).map(([source, val]) => ({
    source,
    count: val.count,
    revenue: val.revenue,
  }));

  return {
    totalSales,
    totalRevenue,
    averageSaleValue,
    packages,
    sources,
  };
}

/**
 * Fetch snapshot of active pipeline health
 */
export async function getPipelineHealth(userId?: string): Promise<PipelineHealth> {
  const userFilter = userId ? { userId } : {};
  const now = new Date();

  const [
    hotLeads,
    warmLeads,
    coldLeads,
    freshLeads,
    demosPending,
    followUpsDue,
    overdueFollowUps,
    leadsWithValue,
  ] = await Promise.all([
    prisma.lead.count({ where: { ...userFilter, temperature: 'HOT', status: { notIn: ['WON', 'LOST'] } } }),
    prisma.lead.count({ where: { ...userFilter, temperature: 'WARM', status: { notIn: ['WON', 'LOST'] } } }),
    prisma.lead.count({ where: { ...userFilter, temperature: 'COLD', status: { notIn: ['WON', 'LOST'] } } }),
    prisma.lead.count({ where: { ...userFilter, status: 'NEW' } }),
    prisma.demo.count({ where: { ...userFilter, status: 'SCHEDULED', scheduledAt: { gte: now } } }),
    prisma.followUp.count({ where: { ...userFilter, status: 'PENDING' } }),
    prisma.followUp.count({ where: { ...userFilter, status: 'PENDING', scheduledAt: { lt: now } } }),
    prisma.lead.findMany({
      where: { ...userFilter, status: { notIn: ['WON', 'LOST'] }, estimatedValue: { not: null } },
      select: { estimatedValue: true },
    }),
  ]);

  const pipelineValue = leadsWithValue.reduce((sum, l) => sum + Number(l.estimatedValue || 0), 0);

  return {
    hotLeads,
    warmLeads,
    coldLeads,
    freshLeads,
    demosPending,
    followUpsDue,
    overdueFollowUps,
    pipelineValue,
  };
}

/**
 * Compute Real Conversion Funnel with bottleneck detection
 */
export async function getFunnelAnalytics(
  bounds: DateRangeBounds,
  userId?: string
): Promise<FunnelAnalyticsResult> {
  const userFilter = userId ? { userId } : {};

  // Stage 1: Calls Made
  const totalCalls = await prisma.call.count({
    where: {
      ...userFilter,
      occurredAt: { gte: bounds.start, lte: bounds.end },
    },
  });

  // Stage 2: Connected Calls
  const connectedCalls = await prisma.call.count({
    where: {
      ...userFilter,
      occurredAt: { gte: bounds.start, lte: bounds.end },
      outcome: {
        in: ['CONNECTED', 'INTERESTED', 'DEMO_BOOKED', 'SCHEDULED_DEMO', 'FOLLOW_UP_REQUIRED', 'NOT_INTERESTED'],
      },
    },
  });

  // Stage 3: Interested Leads
  const interestedCalls = await prisma.call.count({
    where: {
      ...userFilter,
      occurredAt: { gte: bounds.start, lte: bounds.end },
      outcome: {
        in: ['INTERESTED', 'DEMO_BOOKED', 'SCHEDULED_DEMO'],
      },
    },
  });

  // Stage 4: Demos Completed
  const demosCompleted = await prisma.demo.count({
    where: {
      ...userFilter,
      status: 'COMPLETED',
      updatedAt: { gte: bounds.start, lte: bounds.end },
    },
  });

  // Stage 5: Won Deals
  const dealsClosed = await prisma.sale.count({
    where: {
      ...userFilter,
      status: 'COMPLETED',
      closedAt: { gte: bounds.start, lte: bounds.end },
    },
  });

  const rawCounts = [
    { id: 'calls_made', name: 'Calls Made', count: totalCalls },
    { id: 'connected', name: 'Connected Calls', count: connectedCalls },
    { id: 'interested', name: 'Interested Leads', count: interestedCalls },
    { id: 'demo_completed', name: 'Demos Completed', count: demosCompleted },
    { id: 'deal_won', name: 'Deals Won', count: dealsClosed },
  ];

  const topCount = totalCalls > 0 ? totalCalls : 1;
  const stages: FunnelStage[] = [];

  for (let i = 0; i < rawCounts.length; i++) {
    const item = rawCounts[i];
    const prevCount = i > 0 ? rawCounts[i - 1].count : item.count;

    const percentageOfTop = totalCalls > 0 ? Math.round((item.count / topCount) * 100) : 0;
    const conversionFromPrev = prevCount > 0 ? Math.round((item.count / prevCount) * 100) : 0;
    const dropOffCount = i > 0 ? Math.max(0, prevCount - item.count) : 0;
    const dropOffRate = prevCount > 0 ? Math.round((dropOffCount / prevCount) * 100) : 0;

    stages.push({
      id: item.id,
      name: item.name,
      count: item.count,
      percentageOfTop,
      conversionFromPrev: i === 0 ? 100 : conversionFromPrev,
      dropOffRate,
      dropOffCount,
    });
  }

  // Detect bottleneck stage with highest drop-off rate
  let bottleneck: FunnelAnalyticsResult['bottleneck'] = null;
  if (totalCalls > 0) {
    let maxDropOff = -1;
    let worstStageIndex = -1;

    for (let i = 1; i < stages.length; i++) {
      if (rawCounts[i - 1].count >= 2 && stages[i].dropOffRate > maxDropOff) {
        maxDropOff = stages[i].dropOffRate;
        worstStageIndex = i;
      }
    }

    if (worstStageIndex !== -1 && maxDropOff > 30) {
      const worst = stages[worstStageIndex];
      const prev = stages[worstStageIndex - 1];

      let explanation = `A significant drop of ${worst.dropOffRate}% occurs between ${prev.name} and ${worst.name}.`;
      let recommendation = 'Review lead qualification criteria and opening pitch delivery.';

      if (worst.id === 'connected') {
        explanation = `Only ${worst.conversionFromPrev}% of calls connect (${worst.dropOffRate}% drop-off). High no-answer/busy rate.`;
        recommendation = 'Test calling during optimal time windows (e.g. 11 AM - 1 PM or 4 PM - 6 PM) and send WhatsApp pre-call touchpoints.';
      } else if (worst.id === 'interested') {
        explanation = `Connected leads are dropping off before showing interest (${worst.dropOffRate}% drop-off).`;
        recommendation = 'Sharpen the 15-second hook focusing on immediate business pain rather than feature listing.';
      } else if (worst.id === 'demo_completed') {
        explanation = `Interested leads are not completing demos (${worst.dropOffRate}% drop-off).`;
        recommendation = 'Lock demo appointments within 24-48 hours and send automated WhatsApp calendar reminders with one-click links.';
      } else if (worst.id === 'deal_won') {
        explanation = `Completed demos are stalling before closing (${worst.dropOffRate}% drop-off).`;
        recommendation = 'Establish clear commercial decision criteria during the demo and present instant tailored proposals before ending the session.';
      }

      bottleneck = {
        stageId: worst.id,
        stageName: worst.name,
        dropOffRate: worst.dropOffRate,
        explanation,
        recommendation,
      };
    }
  }

  return { stages, bottleneck };
}

/**
 * Two-Hour Sales Pulse
 * Analyzes performance in current 2-hour window vs previous 2-hour window
 */
export async function getTwoHourPulse(
  referenceDate: Date = new Date(),
  userId?: string
): Promise<TwoHourPulseResult> {
  const userFilter = userId ? { userId } : {};

  // Current hour
  const currentHour = referenceDate.getHours();
  // Group into 2-hour blocks: 8-10, 10-12, 12-14, 14-16, 16-18, 18-20, etc.
  const blockStartHour = Math.floor(currentHour / 2) * 2;
  const blockEndHour = blockStartHour + 2;

  const currentStart = new Date(referenceDate);
  currentStart.setHours(blockStartHour, 0, 0, 0);

  const currentEnd = new Date(referenceDate);
  currentEnd.setHours(blockEndHour - 1, 59, 59, 999);

  const prevStart = new Date(currentStart);
  prevStart.setHours(currentStart.getHours() - 2);

  const prevEnd = new Date(currentStart);
  prevEnd.setMilliseconds(-1);

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:00 ${ampm}`;
  };

  const currentBlockTitle = `${formatHour(blockStartHour)} – ${formatHour(blockEndHour)}`;
  const prevBlockTitle = `${formatHour(blockStartHour - 2)} – ${formatHour(blockStartHour)}`;

  // Query activities for current block
  const currentActivity = await getActivityCounts(
    { start: currentStart, end: currentEnd, label: currentBlockTitle },
    userId
  );

  // Query activities for previous block
  const prevActivity = await getActivityCounts(
    { start: prevStart, end: prevEnd, label: prevBlockTitle },
    userId
  );

  const calcRate = (numerator: number, denominator: number) =>
    denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

  const currentBlock: SalesPulseBlock = {
    blockTitle: currentBlockTitle,
    timeRange: `${currentStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${currentEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    activity: currentActivity,
    connectionRate: calcRate(currentActivity.connected, currentActivity.totalCalls),
    interestRate: calcRate(currentActivity.interested, currentActivity.connected),
    demoConversionRate: calcRate(currentActivity.demosScheduled, currentActivity.interested),
  };

  const prevBlock: SalesPulseBlock = {
    blockTitle: prevBlockTitle,
    timeRange: `${prevStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${prevEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    activity: prevActivity,
    connectionRate: calcRate(prevActivity.connected, prevActivity.totalCalls),
    interestRate: calcRate(prevActivity.interested, prevActivity.connected),
    demoConversionRate: calcRate(prevActivity.demosScheduled, prevActivity.interested),
  };

  // Delta calculation
  const connectionRateDelta = currentBlock.connectionRate - prevBlock.connectionRate;
  const callVolumeDelta = currentBlock.activity.totalCalls - prevBlock.activity.totalCalls;

  let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
  if (connectionRateDelta > 5 || callVolumeDelta > 2) {
    trend = 'UP';
  } else if (connectionRateDelta < -5 || callVolumeDelta < -2) {
    trend = 'DOWN';
  }

  const comparison = {
    connectionRateDelta,
    callVolumeDelta,
    trend,
  };

  // Pulse narrative analysis
  const whatsGoingWell: string[] = [];
  const whatsWeak: string[] = [];

  if (currentActivity.totalCalls === 0) {
    whatsWeak.push('No calls logged yet in this 2-hour window.');
  } else {
    if (currentBlock.connectionRate >= 50) {
      whatsGoingWell.push(`Strong connection rate of ${currentBlock.connectionRate}% (${currentActivity.connected}/${currentActivity.totalCalls} calls).`);
    } else {
      whatsWeak.push(`Low connection rate of ${currentBlock.connectionRate}% (${currentActivity.noAnswer} no-answers/busy).`);
    }

    if (currentActivity.interested > 0) {
      whatsGoingWell.push(`${currentActivity.interested} prospect(s) showed strong interest.`);
    }

    if (currentActivity.demosScheduled > 0) {
      whatsGoingWell.push(`Booked ${currentActivity.demosScheduled} new demo appointment(s).`);
    }

    if (currentActivity.connected > 2 && currentActivity.interested === 0) {
      whatsWeak.push('Calls connected but failed to generate interest. Pitch adjustment needed.');
    }
  }

  // Next block recommendation
  let nextBlockFocus = 'Maintain consistent outreach tempo. Target warm follow-ups and pending demos.';
  if (currentBlock.connectionRate < 40 && currentActivity.totalCalls > 3) {
    nextBlockFocus = 'Switch to WhatsApp touchpoints before calling to warm up cold prospects.';
  } else if (currentActivity.interested > 0 && currentActivity.demosScheduled === 0) {
    nextBlockFocus = 'Focus next hour on closing demo dates for today\'s interested leads.';
  }

  // Fetch top 3 hot leads that need urgent attention
  const urgentLeads = await prisma.lead.findMany({
    where: {
      ...userFilter,
      temperature: 'HOT',
      status: { notIn: ['WON', 'LOST'] },
    },
    take: 3,
    orderBy: [{ nextActionDate: 'asc' }, { updatedAt: 'desc' }],
    include: {
      contact: { select: { name: true, phone: true } },
    },
  });

  const topLeadsForAttention = urgentLeads.map((l) => ({
    id: l.id,
    title: l.title,
    contactName: l.contact?.name,
    phone: l.contact?.phone,
    temperature: l.temperature,
    priorityReason: l.nextActionDate ? `Next action scheduled for ${new Date(l.nextActionDate).toLocaleDateString()}` : 'High temperature lead with pending follow-up',
  }));

  return {
    currentBlock,
    previousBlock: prevBlock,
    comparison,
    whatsGoingWell,
    whatsWeak,
    nextBlockFocus,
    topLeadsForAttention,
  };
}

/**
 * Calling Time Intelligence
 * Analyzes call connect rates across 2-hour hour brackets
 */
export async function getCallingIntelligence(
  bounds?: DateRangeBounds,
  userId?: string
): Promise<CallingIntelligenceResult> {
  const userFilter = userId ? { userId } : {};
  const dateFilter = bounds
    ? { occurredAt: { gte: bounds.start, lte: bounds.end } }
    : {};

  const calls = await prisma.call.findMany({
    where: {
      ...userFilter,
      ...dateFilter,
    },
    select: {
      occurredAt: true,
      outcome: true,
    },
  });

  const windowsConfig = [
    { start: 8, end: 10, label: '08:00 - 10:00' },
    { start: 10, end: 12, label: '10:00 - 12:00' },
    { start: 12, end: 14, label: '12:00 - 14:00' },
    { start: 14, end: 16, label: '14:00 - 16:00' },
    { start: 16, end: 18, label: '16:00 - 18:00' },
    { start: 18, end: 20, label: '18:00 - 20:00' },
  ];

  const windowStats = windowsConfig.map((w) => ({
    timeWindow: w.label,
    startHour: w.start,
    endHour: w.end,
    totalCalls: 0,
    connected: 0,
    interested: 0,
    demos: 0,
    sales: 0,
    connectionRate: 0,
    conversionRate: 0,
    sampleSizeAdequate: false,
  }));

  for (const call of calls) {
    const callTime = new Date(call.occurredAt || Date.now());
    const hour = callTime.getHours();

    const targetWindow = windowStats.find(
      (w) => hour >= w.startHour && hour < w.endHour
    );

    if (targetWindow) {
      targetWindow.totalCalls++;
      const isConnected = [
        'CONNECTED',
        'INTERESTED',
        'DEMO_BOOKED',
        'SCHEDULED_DEMO',
        'FOLLOW_UP_REQUIRED',
        'NOT_INTERESTED',
      ].includes(call.outcome);

      if (isConnected) {
        targetWindow.connected++;
      }

      if (['INTERESTED', 'DEMO_BOOKED', 'SCHEDULED_DEMO'].includes(call.outcome)) {
        targetWindow.interested++;
      }

      if (['DEMO_BOOKED', 'SCHEDULED_DEMO'].includes(call.outcome)) {
        targetWindow.demos++;
      }
    }
  }

  // Calculate percentages and sample size threshold (adequate >= 5 calls)
  for (const w of windowStats) {
    w.connectionRate = w.totalCalls > 0 ? Math.round((w.connected / w.totalCalls) * 100) : 0;
    w.conversionRate = w.connected > 0 ? Math.round((w.interested / w.connected) * 100) : 0;
    w.sampleSizeAdequate = w.totalCalls >= 5;
  }

  // Determine best window based on adequate sample size
  const adequateWindows = windowStats.filter((w) => w.sampleSizeAdequate);
  let bestWindow: CallingIntelligenceResult['bestWindow'] = null;
  const hasEnoughData = adequateWindows.length > 0;

  if (hasEnoughData) {
    adequateWindows.sort((a, b) => b.connectionRate - a.connectionRate || b.conversionRate - a.conversionRate);
    const top = adequateWindows[0];
    bestWindow = {
      timeWindow: top.timeWindow,
      rate: top.connectionRate,
      reason: `Highest connection rate (${top.connectionRate}%) with ${top.connected} connected calls out of ${top.totalCalls} attempts.`,
      sampleSize: top.totalCalls,
    };
  }

  const summary = hasEnoughData && bestWindow
    ? `Peak calling window is ${bestWindow.timeWindow} with ${bestWindow.rate}% connect rate. Schedule key prospect outreach during this slot.`
    : 'Not enough data yet (minimum 5 calls per time slot required) to identify statistically significant calling patterns.';

  return {
    windows: windowStats,
    bestWindow,
    hasEnoughData,
    summary,
  };
}

/**
 * Lead Source Intelligence
 */
export async function getLeadSourceIntelligence(
  bounds: DateRangeBounds,
  userId?: string
): Promise<LeadSourceStat[]> {
  const userFilter = userId ? { userId } : {};

  // Fetch leads with calls, demos, and sales
  const leads = await prisma.lead.findMany({
    where: {
      ...userFilter,
      createdAt: { gte: bounds.start, lte: bounds.end },
    },
    select: {
      id: true,
      source: true,
      calls: {
        select: { outcome: true },
      },
      demos: {
        select: { status: true },
      },
      sales: {
        where: { status: 'COMPLETED' },
        select: { amount: true },
      },
    },
  });

  const sourceMap = new Map<string, {
    leadsCount: number;
    connectedCalls: number;
    interestedCount: number;
    demosBooked: number;
    salesCount: number;
    revenue: number;
  }>();

  for (const lead of leads) {
    const src = lead.source?.trim() || 'Unspecified';
    const existing = sourceMap.get(src) || {
      leadsCount: 0,
      connectedCalls: 0,
      interestedCount: 0,
      demosBooked: 0,
      salesCount: 0,
      revenue: 0,
    };

    existing.leadsCount++;

    for (const call of lead.calls) {
      if (['CONNECTED', 'INTERESTED', 'DEMO_BOOKED', 'SCHEDULED_DEMO', 'FOLLOW_UP_REQUIRED'].includes(call.outcome)) {
        existing.connectedCalls++;
      }
      if (['INTERESTED', 'DEMO_BOOKED', 'SCHEDULED_DEMO'].includes(call.outcome)) {
        existing.interestedCount++;
      }
      if (['DEMO_BOOKED', 'SCHEDULED_DEMO'].includes(call.outcome)) {
        existing.demosBooked++;
      }
    }

    if (lead.sales.length > 0) {
      existing.salesCount += lead.sales.length;
      for (const s of lead.sales) {
        existing.revenue += Number(s.amount);
      }
    }

    sourceMap.set(src, existing);
  }

  const result: LeadSourceStat[] = [];
  for (const [source, stat] of sourceMap.entries()) {
    const connectionRate = stat.leadsCount > 0 ? Math.round((stat.connectedCalls / stat.leadsCount) * 100) : 0;
    const closeRate = stat.leadsCount > 0 ? Math.round((stat.salesCount / stat.leadsCount) * 100) : 0;

    result.push({
      source,
      leadsCount: stat.leadsCount,
      connectedCalls: stat.connectedCalls,
      interestedCount: stat.interestedCount,
      demosBooked: stat.demosBooked,
      salesCount: stat.salesCount,
      revenue: stat.revenue,
      connectionRate,
      closeRate,
      sampleSizeAdequate: stat.leadsCount >= 5,
    });
  }

  // Sort by revenue descending, then leadsCount descending
  result.sort((a, b) => b.revenue - a.revenue || b.leadsCount - a.leadsCount);
  return result;
}

/**
 * Lost Opportunity Analysis
 */
export async function getLostOpportunities(
  bounds: DateRangeBounds,
  userId?: string
): Promise<LostOpportunityItem[]> {
  const userFilter = userId ? { lead: { userId } } : {};

  const lostOpportunities = await prisma.opportunity.findMany({
    where: {
      ...userFilter,
      stage: 'CLOSED_LOST',
      updatedAt: { gte: bounds.start, lte: bounds.end },
    },
    include: {
      lead: {
        include: {
          business: { select: { industry: true } },
          contact: { select: { name: true } },
          memories: {
            where: { category: 'OBJECTION' },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          calls: {
            take: 1,
            orderBy: { occurredAt: 'desc' },
            select: { notes: true, occurredAt: true },
          },
        },
      },
    },
    take: 20,
    orderBy: { updatedAt: 'desc' },
  });

  return lostOpportunities.map((opp) => {
    const lead = opp.lead;
    const lastObjection = lead.memories[0]?.value || null;
    const lastCall = lead.calls[0];

    return {
      id: opp.id,
      leadId: lead.id,
      leadTitle: lead.title,
      contactName: lead.contact?.name,
      industry: lead.business?.industry,
      stageLost: opp.stage,
      reason: lastCall?.notes || 'Deal lost to competitor or timing objection',
      lastInteraction: lastCall?.occurredAt ? new Date(lastCall.occurredAt).toLocaleDateString() : null,
      lastObjection,
      estimatedValue: opp.amount ? Number(opp.amount) : null,
    };
  });
}

/**
 * Pending Hot Opportunities That Need Urgent Attention
 */
export async function getPendingHotOpportunities(
  userId?: string
): Promise<PendingHotOpportunityItem[]> {
  const userFilter = userId ? { userId } : {};
  const now = new Date();

  const hotLeads = await prisma.lead.findMany({
    where: {
      ...userFilter,
      temperature: 'HOT',
      status: { notIn: ['WON', 'LOST'] },
    },
    include: {
      contact: { select: { name: true, phone: true } },
      memories: {
        where: { category: 'BUYING_SIGNAL' },
        select: { value: true },
        take: 3,
      },
      calls: {
        take: 1,
        orderBy: { occurredAt: 'desc' },
        select: { occurredAt: true },
      },
      followUps: {
        where: { status: 'PENDING' },
        take: 1,
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true },
      },
    },
    orderBy: [{ nextActionDate: 'asc' }, { updatedAt: 'desc' }],
    take: 10,
  });

  return hotLeads.map((lead) => {
    const lastCallDate = lead.calls[0]?.occurredAt || lead.createdAt;
    const diffMs = now.getTime() - new Date(lastCallDate).getTime();
    const daysSinceLast = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const buyingSignals = lead.memories.map((m) => m.value);
    const pendingFollowUpDate = lead.followUps[0]?.scheduledAt || lead.nextActionDate || null;

    let recommendedAction = 'Call immediately to secure next stage agreement.';
    if (lead.status === 'QUALIFIED') {
      recommendedAction = 'Lock demo slot on calendar.';
    } else if (lead.status === 'PROPOSAL_SENT' || lead.status === 'NEGOTIATION') {
      recommendedAction = 'Send personalized closing WhatsApp pitch and follow-up call.';
    }

    return {
      id: lead.id,
      leadTitle: lead.title,
      contactName: lead.contact?.name,
      phone: lead.contact?.phone,
      temperature: lead.temperature,
      stage: lead.status,
      lastInteractionDate: lastCallDate,
      daysSinceLastInteraction: daysSinceLast,
      buyingSignals,
      pendingFollowUpDate,
      recommendedAction,
    };
  });
}

/**
 * Sales Forecast (Fact-Based, Explicit Confidence)
 */
export async function getSalesForecast(
  bounds: DateRangeBounds,
  userId?: string
): Promise<ForecastResult> {
  const userFilter = userId ? { userId } : {};
  const now = new Date();

  // Completed sales in current bounds
  const sales = await prisma.sale.findMany({
    where: {
      ...userFilter,
      status: 'COMPLETED',
      closedAt: { gte: bounds.start, lte: bounds.end },
    },
    select: { amount: true },
  });

  const achievedAmount = sales.reduce((sum, s) => sum + Number(s.amount), 0);
  const totalDays = Math.max(
    1,
    Math.ceil((bounds.end.getTime() - bounds.start.getTime()) / (1000 * 60 * 60 * 24))
  );

  const effectiveNow = now > bounds.end ? bounds.end : now < bounds.start ? bounds.start : now;
  const daysElapsed = Math.max(
    1,
    Math.ceil((effectiveNow.getTime() - bounds.start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  // Active pipeline
  const hotLeads = await prisma.lead.findMany({
    where: {
      ...userFilter,
      temperature: 'HOT',
      status: { notIn: ['WON', 'LOST'] },
      estimatedValue: { not: null },
    },
    select: { estimatedValue: true },
  });

  const warmLeads = await prisma.lead.findMany({
    where: {
      ...userFilter,
      temperature: 'WARM',
      status: { notIn: ['WON', 'LOST'] },
      estimatedValue: { not: null },
    },
    select: { estimatedValue: true },
  });

  const hotValue = hotLeads.reduce((sum, l) => sum + Number(l.estimatedValue || 0), 0);
  const warmValue = warmLeads.reduce((sum, l) => sum + Number(l.estimatedValue || 0), 0);

  // Weighted pipeline: 60% probability on HOT, 25% on WARM
  const pipelineWeightedValue = Math.round(hotValue * 0.6 + warmValue * 0.25);

  const dailyRunRate = Math.round(achievedAmount / daysElapsed);
  const projectedFromRunRate = Math.round(dailyRunRate * daysRemaining);

  // Sample size check
  if (sales.length < 2 && hotLeads.length === 0) {
    return {
      forecastAvailable: false,
      reasonIfNotAvailable: 'Not enough data yet (requires at least 2 closed deals or active qualified pipeline) to construct statistical forecast.',
      projectedSalesAmount: achievedAmount,
      projectedSalesCount: sales.length,
      confidenceScore: 15,
      basis: {
        achievedAmount,
        daysElapsed,
        daysRemaining,
        dailyRunRate,
        pipelineWeightedValue,
      },
    };
  }

  const projectedSalesAmount = achievedAmount + Math.max(projectedFromRunRate, pipelineWeightedValue);
  const avgTicket = sales.length > 0 ? achievedAmount / sales.length : 15000;
  const projectedSalesCount = Math.round(projectedSalesAmount / avgTicket);

  // Confidence calculation: based on days elapsed and sample size
  const confidenceScore = Math.min(
    90,
    Math.round(30 + (daysElapsed / totalDays) * 40 + Math.min(sales.length * 5, 20))
  );

  return {
    forecastAvailable: true,
    projectedSalesAmount,
    projectedSalesCount,
    confidenceScore,
    basis: {
      achievedAmount,
      daysElapsed,
      daysRemaining,
      dailyRunRate,
      pipelineWeightedValue,
    },
  };
}

/**
 * Complete Sales Overview aggregation
 */
export async function getSalesOverview(
  range: AnalyticsDateRange = 'TODAY',
  customStart?: string,
  customEnd?: string,
  userId?: string
) {
  const bounds = getDateRangeBounds(range, customStart, customEnd);

  const [
    activity,
    sales,
    pipeline,
    funnel,
    pulse,
    callingIntelligence,
    leadSources,
    lostOpportunities,
    pendingHotOpportunities,
    forecast,
  ] = await Promise.all([
    getActivityCounts(bounds, userId),
    getSalesMetrics(bounds, userId),
    getPipelineHealth(userId),
    getFunnelAnalytics(bounds, userId),
    getTwoHourPulse(new Date(), userId),
    getCallingIntelligence(bounds, userId),
    getLeadSourceIntelligence(bounds, userId),
    getLostOpportunities(bounds, userId),
    getPendingHotOpportunities(userId),
    getSalesForecast(bounds, userId),
  ]);

  return {
    range,
    bounds,
    activity,
    sales,
    pipeline,
    funnel,
    pulse,
    callingIntelligence,
    leadSources,
    lostOpportunities,
    pendingHotOpportunities,
    forecast,
  };
}
