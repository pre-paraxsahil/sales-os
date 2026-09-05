import { prisma } from '@/lib/prisma';
import { TargetPaceResult } from './types';

/**
 * Calculates current month target pace, pipeline health, and whether the system is in RECOVERY or AHEAD mode.
 */
export async function getTargetPaceStatus(userId?: string | null): Promise<TargetPaceResult> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const daysInMonth = endOfMonth.getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay);

  // 1. Fetch active monthly target
  const target = await prisma.target.findFirst({
    where: {
      period: 'MONTHLY',
      startDate: { lte: now },
      endDate: { gte: now },
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  const targetAmount = target ? Number(target.targetAmount) : 300000; // Default ₹3 Lakh
  const targetSales = target ? target.targetSales || 6 : 6;

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
  const remainingAmount = Math.max(0, targetAmount - achievedAmount);
  const remainingSales = Math.max(0, targetSales - achievedSales);
  const progressPercent = Math.min(100, Math.round((achievedAmount / targetAmount) * 100));

  // 3. Open pipeline value
  const openOpportunities = await prisma.opportunity.findMany({
    where: {
      stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
    },
    select: { amount: true },
  });

  const pipelineValue = openOpportunities.reduce((acc, o) => acc + Number(o.amount || 0), 0);

  // 4. Calculate expected pace
  // Expected fraction of month passed
  const monthPaceFraction = currentDay / daysInMonth;
  const expectedPaceAmount = targetAmount * monthPaceFraction;

  let mode: 'RECOVERY' | 'ON_TRACK' | 'AHEAD' = 'ON_TRACK';
  let statusLabel = 'On Track';
  let statusDescription = 'Current closed revenue is pacing well with monthly target goals.';
  let recommendedFocus = [
    'Maintain daily mix of discovery calls and scheduled demos',
    'Follow up on interested leads within 24 hours',
  ];

  if (achievedAmount >= targetAmount) {
    mode = 'AHEAD';
    statusLabel = 'Target Achieved — Stretch Goal Mode';
    statusDescription = `Monthly quota achieved! (₹${achievedAmount.toLocaleString('en-IN')} / ₹${targetAmount.toLocaleString('en-IN')}). Focus on next-month pipeline building.`;
    recommendedFocus = [
      'Focus on expanding pipeline for next month',
      'Target high-ticket OneComPro enterprise packages',
      'Re-engage dormant accounts for long-term contracts',
      'Refine sales battle cards and customer success stories',
    ];
  } else if (currentDay >= 3 && achievedAmount < expectedPaceAmount * 0.8) {
    mode = 'RECOVERY';
    statusLabel = 'Recovery Mode Active';
    statusDescription = `Target pace is behind plan (${daysRemaining} days remaining, ₹${remainingAmount.toLocaleString('en-IN')} needed). Shift focus to high-probability closing deals.`;
    recommendedFocus = [
      'Prioritize hot leads in closing and negotiation stage',
      'Follow up on all recent product demos within 4 hours',
      'Offer immediate onboarding incentive for deals closing this week',
      'Resolve pricing objections with flexible payment terms',
    ];
  }

  return {
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
