import { prisma } from '@/lib/prisma';
import { TargetPaceResult } from './types';
import { getDateRangeBounds, DEFAULT_TIMEZONE } from '@/lib/time/salesTimeEngine';
import { getWorkHoursConfig } from './scheduleConfig';

/**
 * Calculates current month target pace, pipeline health, and whether the system is in RECOVERY or AHEAD mode.
 */
export async function getTargetPaceStatus(userId?: string | null): Promise<TargetPaceResult> {
  const config = await getWorkHoursConfig(userId);
  const tz = config.timezone || DEFAULT_TIMEZONE;
  const now = new Date();

  const { start: startOfMonth, end: endOfMonth } = getDateRangeBounds('THIS_MONTH', undefined, undefined, tz);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay);

  // 1. Fetch active monthly target
  const target = await prisma.target.findFirst({
    where: {
      period: 'MONTHLY',
      startDate: { lte: endOfMonth },
      endDate: { gte: startOfMonth },
      ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  // 2. Fetch completed sales this month
  const sales = await prisma.sale.findMany({
    where: {
      status: 'COMPLETED',
      closedAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      ...(userId ? { userId } : {}),
    },
    select: { amount: true },
  });

  const achievedAmount = sales.reduce((acc, s) => acc + Number(s.amount), 0);
  const achievedSales = sales.length;

  // 3. Open pipeline value
  const openOpportunities = await prisma.opportunity.findMany({
    where: {
      stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
    },
    select: { amount: true },
  });

  const pipelineValue = openOpportunities.reduce((acc, o) => acc + Number(o.amount || 0), 0);

  // Check if target is configured
  const isConfigured = Boolean(target && Number(target.targetAmount) > 0);

  if (!isConfigured) {
    return {
      isConfigured: false,
      mode: 'NOT_SET',
      targetAmount: 0,
      achievedAmount,
      progressPercent: 0,
      remainingAmount: 0,
      targetSales: 0,
      achievedSales,
      remainingSales: 0,
      daysRemaining,
      daysInMonth,
      pipelineValue,
      statusLabel: 'Target not set',
      statusDescription: 'Configure monthly and daily sales targets in Settings to activate smart pacing.',
      recommendedFocus: [
        'Set your monthly revenue and deal closing quota in Settings',
        'Follow up with hot pipeline leads to generate early month momentum',
      ],
    };
  }

  const targetAmount = Number(target!.targetAmount);
  const targetSales = target!.targetSales || 0;
  const remainingAmount = Math.max(0, targetAmount - achievedAmount);
  const remainingSales = Math.max(0, targetSales - achievedSales);
  const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((achievedAmount / targetAmount) * 100)) : 0;

  // 4. Calculate expected pace
  const monthPaceFraction = currentDay / daysInMonth;
  const expectedPaceAmount = targetAmount * monthPaceFraction;

  let mode: 'RECOVERY' | 'ON_TRACK' | 'AHEAD' | 'ACHIEVED' = 'ON_TRACK';
  let statusLabel = 'On Track';
  let statusDescription = 'Current closed revenue is pacing well with monthly target goals.';
  let recommendedFocus = [
    'Maintain daily mix of discovery calls and scheduled demos',
    'Follow up on interested leads within 24 hours',
  ];

  if (achievedAmount >= targetAmount) {
    mode = 'ACHIEVED';
    statusLabel = 'Target Achieved 🎉';
    statusDescription = `Monthly quota achieved! (₹${achievedAmount.toLocaleString('en-IN')} / ₹${targetAmount.toLocaleString('en-IN')}). Focus on next-month pipeline building.`;
    recommendedFocus = [
      'Focus on expanding pipeline for next month',
      'Target high-ticket OneComPro enterprise packages',
      'Re-engage dormant accounts for long-term contracts',
    ];
  } else if (currentDay >= 3 && achievedAmount < expectedPaceAmount * 0.8) {
    mode = 'RECOVERY';
    statusLabel = 'Behind Target (Catch Up)';
    statusDescription = `Target pace is behind plan (${daysRemaining} days remaining, ₹${remainingAmount.toLocaleString('en-IN')} needed). Shift focus to high-probability closing deals.`;
    recommendedFocus = [
      'Prioritize hot leads in closing and negotiation stage',
      'Follow up on all recent product demos within 4 hours',
      'Offer immediate onboarding incentive for deals closing this week',
      'Resolve pricing objections with flexible payment terms',
    ];
  } else if (progressPercent >= 75) {
    mode = 'AHEAD';
    statusLabel = 'Ahead of Plan';
    statusDescription = `Pacing ahead of monthly schedule (${progressPercent}% achieved with ${daysRemaining} days left).`;
  }

  return {
    isConfigured: true,
    mode,
    targetAmount,
    achievedAmount,
    progressPercent,
    remainingAmount,
    targetSales,
    achievedSales,
    remainingSales,
    daysRemaining,
    daysInMonth,
    pipelineValue,
    statusLabel,
    statusDescription,
    recommendedFocus,
  };
}
