import { prisma } from '@/lib/prisma';
import {
  getLocalTimeParts,
  getStartAndEndOfDay,
  getDateRangeBounds,
  DEFAULT_TIMEZONE,
} from '@/lib/time/salesTimeEngine';
import { getWorkHoursConfig } from '@/lib/schedule/scheduleConfig';
import { WorkHoursConfig } from '@/lib/schedule/types';

export interface TargetInput {
  targetAmount?: number;
  targetSales?: number;
  targetDemos?: number;
  targetCalls?: number;
  targetInterested?: number;
  targetFollowUps?: number;
  targetColdCalls?: number;
  targetInboundCalls?: number;
  notes?: string;
}

export type TargetStatusCode = 'BEHIND' | 'ON_TRACK' | 'AHEAD' | 'ACHIEVED' | 'NOT_SET';

export interface SinglePeriodTargetStatus {
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  isConfigured: boolean;
  startDate: Date;
  endDate: Date;
  target: {
    amount: number;
    sales: number;
    demos: number;
    interested: number;
    followUps: number;
    coldCalls: number;
    inboundCalls: number;
    totalCalls: number;
  } | null;
  achieved: {
    amount: number;
    sales: number;
    demos: number;
    interested: number;
    followUps: number;
    coldCalls: number;
    inboundCalls: number;
    totalCalls: number;
  };
  progressPercent: number;
  status: TargetStatusCode;
  statusLabel: string;
  remainingAmount: number;
  remainingSales: number;
  remainingDemos: number;
  remainingCalls: number;
}

export interface SmartTargetSuggestion {
  targetAmount: number;
  label: string; // 'AI/Calculated Suggestion'
  metrics: {
    monthlySalesNeeded: number;
    monthlyDemosNeeded: number;
    monthlyInterestedNeeded: number;
    monthlyConnectedNeeded: number;
    monthlyCallsNeeded: number;
    monthlyFollowUpsNeeded: number;
    dailyCallsNeeded: number;
    dailyDemosNeeded: number;
    dailyFollowUpsNeeded: number;
  };
  assumptions: {
    avgDealSize: number;
    callToConnectRate: number;
    connectToInterestRate: number;
    interestToDemoRate: number;
    demoToSaleRate: number;
    workingDaysInMonth: number;
  };
  narrative: string;
}

export interface PlanItem {
  id: string;
  timeRange: string; // e.g. '10:00 AM – 10:30 AM'
  startTime: string; // ISO string
  endTime: string; // ISO string
  title: string;
  activityType: 'CALL' | 'DEMO' | 'FOLLOW_UP' | 'LUNCH' | 'PLANNING' | 'CLOSING' | 'ADMIN';
  isProtected: boolean;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  customerName?: string | null;
  businessName?: string | null;
  phone?: string | null;
  leadId?: string | null;
  objective: string;
  source: 'REAL_DEMO' | 'REAL_FOLLOWUP' | 'HOT_LEAD' | 'PLANNED_BLOCK';
}

export interface NextDayPlanResult {
  dateString: string; // 'YYYY-MM-DD'
  displayDate: string; // 'Monday, 7 Sep 2026'
  isWeeklyOff: boolean;
  totalCommitments: number;
  demosCount: number;
  followUpsCount: number;
  timeline: PlanItem[];
  focusSummary: string;
}

/**
 * Returns the active Target record for the specified period and date.
 */
export async function getTargetForPeriod(
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  date: Date = new Date(),
  userId?: string | null
) {
  const config = await getWorkHoursConfig(userId);
  const tz = config.timezone || DEFAULT_TIMEZONE;
  const rangeType = period === 'DAILY' ? 'TODAY' : period === 'WEEKLY' ? 'THIS_WEEK' : 'THIS_MONTH';
  const { start, end } = getDateRangeBounds(rangeType as any, undefined, undefined, tz);

  return prisma.target.findFirst({
    where: {
      period,
      startDate: { lte: end },
      endDate: { gte: start },
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Saves or updates Target for the specified period.
 */
export async function saveTargetForPeriod(
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  data: TargetInput,
  date: Date = new Date(),
  userId?: string | null
) {
  const config = await getWorkHoursConfig(userId);
  const tz = config.timezone || DEFAULT_TIMEZONE;
  const rangeType = period === 'DAILY' ? 'TODAY' : period === 'WEEKLY' ? 'THIS_WEEK' : 'THIS_MONTH';
  const { start, end } = getDateRangeBounds(rangeType as any, undefined, undefined, tz);

  const existing = await prisma.target.findFirst({
    where: {
      period,
      startDate: { lte: end },
      endDate: { gte: start },
      ...(userId ? { userId } : {}),
    },
  });

  const totalCallsTarget = (data.targetCalls ?? 0) || ((data.targetColdCalls ?? 0) + (data.targetInboundCalls ?? 0));

  if (existing) {
    return prisma.target.update({
      where: { id: existing.id },
      data: {
        targetAmount: data.targetAmount !== undefined ? data.targetAmount : existing.targetAmount,
        targetSales: data.targetSales !== undefined ? data.targetSales : existing.targetSales,
        targetDemos: data.targetDemos !== undefined ? data.targetDemos : existing.targetDemos,
        targetCalls: totalCallsTarget || existing.targetCalls,
        targetInterested: data.targetInterested !== undefined ? data.targetInterested : existing.targetInterested,
        targetFollowUps: data.targetFollowUps !== undefined ? data.targetFollowUps : existing.targetFollowUps,
        targetColdCalls: data.targetColdCalls !== undefined ? data.targetColdCalls : existing.targetColdCalls,
        targetInboundCalls: data.targetInboundCalls !== undefined ? data.targetInboundCalls : existing.targetInboundCalls,
        notes: data.notes !== undefined ? data.notes : existing.notes,
      },
    });
  }

  return prisma.target.create({
    data: {
      userId: userId || null,
      period,
      startDate: start,
      endDate: end,
      targetAmount: data.targetAmount || 0,
      targetSales: data.targetSales || 0,
      targetDemos: data.targetDemos || 0,
      targetCalls: totalCallsTarget,
      targetInterested: data.targetInterested || 0,
      targetFollowUps: data.targetFollowUps || 0,
      targetColdCalls: data.targetColdCalls || 0,
      targetInboundCalls: data.targetInboundCalls || 0,
      notes: data.notes || null,
    },
  });
}

/**
 * Calculates full target progress for Daily, Weekly, and Monthly periods.
 */
export async function getAllTargetsStatus(
  date: Date = new Date(),
  userId?: string | null
): Promise<{
  daily: SinglePeriodTargetStatus;
  weekly: SinglePeriodTargetStatus;
  monthly: SinglePeriodTargetStatus;
}> {
  const config = await getWorkHoursConfig(userId);
  const tz = config.timezone || DEFAULT_TIMEZONE;

  const periods: Array<{ key: 'daily' | 'weekly' | 'monthly'; period: 'DAILY' | 'WEEKLY' | 'MONTHLY'; rangeType: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' }> = [
    { key: 'daily', period: 'DAILY', rangeType: 'TODAY' },
    { key: 'weekly', period: 'WEEKLY', rangeType: 'THIS_WEEK' },
    { key: 'monthly', period: 'MONTHLY', rangeType: 'THIS_MONTH' },
  ];

  const results: any = {};

  for (const p of periods) {
    const { start, end } = getDateRangeBounds(p.rangeType, undefined, undefined, tz);

    const [targetRecord, sales, calls, demos, followUps] = await Promise.all([
      prisma.target.findFirst({
        where: {
          period: p.period,
          startDate: { lte: end },
          endDate: { gte: start },
          ...(userId ? { userId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sale.findMany({
        where: {
          status: 'COMPLETED',
          closedAt: { gte: start, lte: end },
          ...(userId ? { userId } : {}),
        },
        select: { amount: true },
      }),
      prisma.call.findMany({
        where: {
          occurredAt: { gte: start, lte: end },
          ...(userId ? { userId } : {}),
        },
        select: { callType: true, outcome: true },
      }),
      prisma.demo.count({
        where: {
          scheduledAt: { gte: start, lte: end },
          ...(userId ? { userId } : {}),
        },
      }),
      prisma.followUp.count({
        where: {
          status: 'COMPLETED',
          updatedAt: { gte: start, lte: end },
          ...(userId ? { userId } : {}),
        },
      }),
    ]);

    const achievedAmount = sales.reduce((sum, s) => sum + Number(s.amount), 0);
    const achievedSales = sales.length;
    let achievedCold = 0;
    let achievedInbound = 0;
    let achievedInterested = 0;

    for (const c of calls) {
      if (c.callType === 'COLD_CALL' || c.callType === 'OUTBOUND') achievedCold++;
      if (c.callType === 'INBOUND' || c.callType === 'NEW_ENQUIRY') achievedInbound++;
      if (['INTERESTED', 'DEMO_BOOKED', 'SCHEDULED_DEMO'].includes(c.outcome)) achievedInterested++;
    }

    const isConfigured = Boolean(targetRecord && Number(targetRecord.targetAmount) > 0);

    if (!isConfigured) {
      results[p.key] = {
        period: p.period,
        isConfigured: false,
        startDate: start,
        endDate: end,
        target: null,
        achieved: {
          amount: achievedAmount,
          sales: achievedSales,
          demos,
          interested: achievedInterested,
          followUps,
          coldCalls: achievedCold,
          inboundCalls: achievedInbound,
          totalCalls: calls.length,
        },
        progressPercent: 0,
        status: 'NOT_SET' as TargetStatusCode,
        statusLabel: 'Target not set',
        remainingAmount: 0,
        remainingSales: 0,
        remainingDemos: 0,
        remainingCalls: 0,
      };
      continue;
    }

    const tAmount = Number(targetRecord!.targetAmount);
    const tSales = targetRecord!.targetSales || 0;
    const tDemos = targetRecord!.targetDemos || 0;
    const tCalls = targetRecord!.targetCalls || (targetRecord!.targetColdCalls + targetRecord!.targetInboundCalls) || 0;
    const tInterested = targetRecord!.targetInterested || 0;
    const tFollowUps = targetRecord!.targetFollowUps || 0;

    const progressPercent = tAmount > 0 ? Math.min(100, Math.round((achievedAmount / tAmount) * 100)) : 0;

    let status: TargetStatusCode = 'ON_TRACK';
    let statusLabel = 'On Track';

    if (achievedAmount >= tAmount && tAmount > 0) {
      status = 'ACHIEVED';
      statusLabel = 'Target Achieved 🎉';
    } else if (progressPercent >= 75) {
      status = 'AHEAD';
      statusLabel = 'Ahead of Plan';
    } else if (progressPercent < 40) {
      status = 'BEHIND';
      statusLabel = 'Behind Target';
    }

    results[p.key] = {
      period: p.period,
      isConfigured: true,
      startDate: start,
      endDate: end,
      target: {
        amount: tAmount,
        sales: tSales,
        demos: tDemos,
        interested: tInterested,
        followUps: tFollowUps,
        coldCalls: targetRecord!.targetColdCalls,
        inboundCalls: targetRecord!.targetInboundCalls,
        totalCalls: tCalls,
      },
      achieved: {
        amount: achievedAmount,
        sales: achievedSales,
        demos,
        interested: achievedInterested,
        followUps,
        coldCalls: achievedCold,
        inboundCalls: achievedInbound,
        totalCalls: calls.length,
      },
      progressPercent,
      status,
      statusLabel,
      remainingAmount: Math.max(0, tAmount - achievedAmount),
      remainingSales: Math.max(0, tSales - achievedSales),
      remainingDemos: Math.max(0, tDemos - demos),
      remainingCalls: Math.max(0, tCalls - calls.length),
    };
  }

  return results;
}

/**
 * Calculates Smart Target Suggestion based on real historical conversion rates in PostgreSQL.
 */
export async function calculateSmartTargetSuggestion(
  monthlyRevenueTarget: number,
  userId?: string | null
): Promise<SmartTargetSuggestion> {
  const [sales, calls, completedDemos] = await Promise.all([
    prisma.sale.findMany({
      where: { status: 'COMPLETED', ...(userId ? { userId } : {}) },
      select: { amount: true },
    }),
    prisma.call.findMany({
      where: { ...(userId ? { userId } : {}) },
      select: { outcome: true },
    }),
    prisma.demo.count({
      where: { status: 'COMPLETED', ...(userId ? { userId } : {}) },
    }),
  ]);

  // Calculate actual deal size
  const totalSalesRevenue = sales.reduce((sum, s) => sum + Number(s.amount), 0);
  const avgDealSize = sales.length > 0 ? Math.round(totalSalesRevenue / sales.length) : 35000;

  // Calculate actual conversion rates
  let connected = 0;
  let interested = 0;
  for (const c of calls) {
    if (['CONNECTED', 'INTERESTED', 'DEMO_BOOKED', 'SCHEDULED_DEMO', 'FOLLOW_UP_REQUIRED', 'NOT_INTERESTED'].includes(c.outcome)) {
      connected++;
    }
    if (['INTERESTED', 'DEMO_BOOKED', 'SCHEDULED_DEMO'].includes(c.outcome)) {
      interested++;
    }
  }

  const callToConnectRate = calls.length > 0 ? Math.max(0.25, Math.min(0.8, connected / calls.length)) : 0.4;
  const connectToInterestRate = connected > 0 ? Math.max(0.15, Math.min(0.6, interested / connected)) : 0.3;
  const interestToDemoRate = interested > 0 ? Math.max(0.3, Math.min(0.8, completedDemos / (interested || 1))) : 0.5;
  const demoToSaleRate = completedDemos > 0 ? Math.max(0.2, Math.min(0.6, sales.length / (completedDemos || 1))) : 0.35;

  const targetAmount = monthlyRevenueTarget > 0 ? monthlyRevenueTarget : 200000;
  const workingDaysInMonth = 24;

  const monthlySalesNeeded = Math.max(1, Math.ceil(targetAmount / avgDealSize));
  const monthlyDemosNeeded = Math.max(1, Math.ceil(monthlySalesNeeded / demoToSaleRate));
  const monthlyInterestedNeeded = Math.max(1, Math.ceil(monthlyDemosNeeded / interestToDemoRate));
  const monthlyConnectedNeeded = Math.max(1, Math.ceil(monthlyInterestedNeeded / connectToInterestRate));
  const monthlyCallsNeeded = Math.max(1, Math.ceil(monthlyConnectedNeeded / callToConnectRate));
  const monthlyFollowUpsNeeded = Math.max(1, Math.ceil(monthlyInterestedNeeded * 1.5));

  const dailyCallsNeeded = Math.ceil(monthlyCallsNeeded / workingDaysInMonth);
  const dailyDemosNeeded = Math.max(1, Math.ceil(monthlyDemosNeeded / workingDaysInMonth));
  const dailyFollowUpsNeeded = Math.ceil(monthlyFollowUpsNeeded / workingDaysInMonth);

  return {
    targetAmount,
    label: 'AI/Calculated Suggestion',
    metrics: {
      monthlySalesNeeded,
      monthlyDemosNeeded,
      monthlyInterestedNeeded,
      monthlyConnectedNeeded,
      monthlyCallsNeeded,
      monthlyFollowUpsNeeded,
      dailyCallsNeeded,
      dailyDemosNeeded,
      dailyFollowUpsNeeded,
    },
    assumptions: {
      avgDealSize,
      callToConnectRate: Math.round(callToConnectRate * 100),
      connectToInterestRate: Math.round(connectToInterestRate * 100),
      interestToDemoRate: Math.round(interestToDemoRate * 100),
      demoToSaleRate: Math.round(demoToSaleRate * 100),
      workingDaysInMonth,
    },
    narrative: `To achieve ₹${targetAmount.toLocaleString('en-IN')} with an average deal value of ₹${avgDealSize.toLocaleString('en-IN')}, you need approximately ${monthlySalesNeeded} closed deals. Based on your conversion funnels, plan for ~${dailyCallsNeeded} calls/day and ~${monthlyDemosNeeded} completed demos this month.`,
  };
}

/**
 * Generates Tomorrow's Next-Day Plan from REAL database commitments.
 */
export async function generateNextDayPlan(
  referenceDate: Date = new Date(),
  userId?: string | null
): Promise<NextDayPlanResult> {
  const config = await getWorkHoursConfig(userId);
  const tz = config.timezone || DEFAULT_TIMEZONE;

  // Tomorrow date
  const tomorrow = new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000);
  const parts = getLocalTimeParts(tomorrow, tz);
  const { start: tomorrowStart, end: tomorrowEnd } = getStartAndEndOfDay(tomorrow, tz);

  const weeklyOffDays = config.weeklyOffDays || [0];
  const isWeeklyOff = weeklyOffDays.includes(parts.dayOfWeek);

  if (isWeeklyOff) {
    return {
      dateString: parts.formattedDate,
      displayDate: parts.displayDate,
      isWeeklyOff: true,
      totalCommitments: 0,
      demosCount: 0,
      followUpsCount: 0,
      timeline: [],
      focusSummary: `Tomorrow is ${parts.dayName} (Weekly Off). Normal outbound calling tasks are paused.`,
    };
  }

  // Fetch real scheduled Demos for tomorrow
  const scheduledDemos = await prisma.demo.findMany({
    where: {
      scheduledAt: { gte: tomorrowStart, lte: tomorrowEnd },
      status: 'SCHEDULED',
      ...(userId ? { userId } : {}),
    },
    include: {
      lead: { include: { contact: true, business: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  // Fetch real scheduled Follow-ups for tomorrow
  const scheduledFollowUps = await prisma.followUp.findMany({
    where: {
      scheduledAt: { gte: tomorrowStart, lte: tomorrowEnd },
      status: 'PENDING',
      ...(userId ? { userId } : {}),
    },
    include: {
      lead: { include: { contact: true, business: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  // Fetch hot leads requiring proactive follow-up
  const hotLeads = await prisma.lead.findMany({
    where: {
      temperature: 'HOT',
      status: { notIn: ['WON', 'LOST'] },
      ...(userId ? { userId } : {}),
    },
    take: 3,
    include: { contact: true, business: true },
    orderBy: [{ nextActionDate: 'asc' }, { updatedAt: 'desc' }],
  });

  const timeline: PlanItem[] = [];

  const formatHourMinute = (h: number, m: number = 0) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const createIsoTime = (hour: number, minute: number) => {
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000+05:30`;
  };

  // 1. Morning Planning (Start of office)
  const startH = config.startHour;
  timeline.push({
    id: 'block-plan',
    timeRange: `${formatHourMinute(startH, 0)} – ${formatHourMinute(startH, 30)}`,
    startTime: createIsoTime(startH, 0),
    endTime: createIsoTime(startH, 30),
    title: "Previous Leads Check & Today's Target Plan",
    activityType: 'PLANNING',
    isProtected: false,
    priority: 'HIGH',
    objective: 'Review yesterday notes, check pipeline numbers, and verify scheduled demos.',
    source: 'PLANNED_BLOCK',
  });

  // 2. Scheduled Demos (Fixed times)
  for (const demo of scheduledDemos) {
    const demoTime = getLocalTimeParts(demo.scheduledAt, tz);
    const duration = demo.durationMinutes || 30;
    const endMinutes = demoTime.minute + duration;
    const endH = demoTime.hour + Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;

    timeline.push({
      id: demo.id,
      timeRange: `${demoTime.formattedTime} – ${formatHourMinute(endH, endM)}`,
      startTime: demo.scheduledAt.toISOString(),
      endTime: new Date(demo.scheduledAt.getTime() + duration * 60000).toISOString(),
      title: `Live Demo: ${demo.lead?.business?.name || demo.lead?.title || 'Prospect'}`,
      activityType: 'DEMO',
      isProtected: true,
      priority: 'CRITICAL',
      customerName: demo.lead?.contact?.name,
      businessName: demo.lead?.business?.name,
      phone: demo.lead?.contact?.phone,
      leadId: demo.leadId,
      objective: 'Run live product walkthrough, identify key pain points, and present quotation.',
      source: 'REAL_DEMO',
    });
  }

  // 3. Scheduled Follow-ups
  for (const fu of scheduledFollowUps) {
    const fuTime = getLocalTimeParts(fu.scheduledAt, tz);
    timeline.push({
      id: fu.id,
      timeRange: `${fuTime.formattedTime} – ${formatHourMinute(fuTime.hour, Math.min(59, fuTime.minute + 15))}`,
      startTime: fu.scheduledAt.toISOString(),
      endTime: new Date(fu.scheduledAt.getTime() + 15 * 60000).toISOString(),
      title: `Follow-up: ${fu.lead?.contact?.name || fu.lead?.title || 'Lead'} (${fu.notes || 'Callback'})`,
      activityType: fu.type === 'WHATSAPP' ? 'FOLLOW_UP' : 'CALL',
      isProtected: false,
      priority: 'HIGH',
      customerName: fu.lead?.contact?.name,
      businessName: fu.lead?.business?.name,
      phone: fu.lead?.contact?.phone,
      leadId: fu.leadId,
      objective: fu.notes || 'Call prospect to advance deal and address objections.',
      source: 'REAL_FOLLOWUP',
    });
  }

  // 4. Protected Lunch
  const lunchStartH = config.lunch?.startHour ?? 14;
  const lunchEndH = config.lunch?.endHour ?? 15;
  timeline.push({
    id: 'block-lunch',
    timeRange: `${formatHourMinute(lunchStartH, 0)} – ${formatHourMinute(lunchEndH, 0)}`,
    startTime: createIsoTime(lunchStartH, 0),
    endTime: createIsoTime(lunchEndH, 0),
    title: '🍴 Lunch & Re-charge (Protected)',
    activityType: 'LUNCH',
    isProtected: true,
    priority: 'MEDIUM',
    objective: 'Protected recharge block. Outbound calls paused.',
    source: 'PLANNED_BLOCK',
  });

  // 5. Hot callback session if slots available
  if (hotLeads.length > 0) {
    const hotTimeH = Math.max(lunchEndH, 16);
    timeline.push({
      id: 'block-hot-closing',
      timeRange: `${formatHourMinute(hotTimeH, 0)} – ${formatHourMinute(hotTimeH + 1, 0)}`,
      startTime: createIsoTime(hotTimeH, 0),
      endTime: createIsoTime(hotTimeH + 1, 0),
      title: `🔥 Hot Follow-ups & Closing Window (${hotLeads.length} leads)`,
      activityType: 'CLOSING',
      isProtected: false,
      priority: 'HIGH',
      customerName: hotLeads[0].contact?.name,
      businessName: hotLeads[0].business?.name,
      phone: hotLeads[0].contact?.phone,
      leadId: hotLeads[0].id,
      objective: `Focus on closing high-temperature leads: ${hotLeads.map((l) => l.business?.name || l.title).join(', ')}.`,
      source: 'HOT_LEAD',
    });
  }

  // Sort timeline chronologically
  timeline.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const focusSummary = `Tomorrow: ${scheduledDemos.length} demo(s), ${scheduledFollowUps.length} follow-up(s), and ${hotLeads.length} hot closing priority leads.`;

  return {
    dateString: parts.formattedDate,
    displayDate: parts.displayDate,
    isWeeklyOff: false,
    totalCommitments: scheduledDemos.length + scheduledFollowUps.length + hotLeads.length,
    demosCount: scheduledDemos.length,
    followUpsCount: scheduledFollowUps.length,
    timeline,
    focusSummary,
  };
}

/**
 * Generates Next-Week Plan across next 7 days from real commitments.
 */
export async function generateNextWeekPlan(userId?: string | null) {
  const config = await getWorkHoursConfig(userId);
  const tz = config.timezone || DEFAULT_TIMEZONE;
  const now = new Date();

  const daysPlan: NextDayPlanResult[] = [];
  for (let i = 1; i <= 7; i++) {
    const refDate = new Date(now.getTime() + (i - 1) * 24 * 60 * 60 * 1000);
    const plan = await generateNextDayPlan(refDate, userId);
    daysPlan.push(plan);
  }

  return {
    weekRange: 'Next 7 Days',
    days: daysPlan,
    totalDemos: daysPlan.reduce((sum, d) => sum + d.demosCount, 0),
    totalFollowUps: daysPlan.reduce((sum, d) => sum + d.followUpsCount, 0),
  };
}
