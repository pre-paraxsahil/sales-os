import { NextRequest, NextResponse } from 'next/server';
import { aiProvider } from '@/lib/ai/aiProvider';
import {
  getDateRangeBounds,
  getActivityCounts,
  getSalesMetrics,
  getLostOpportunities,
  getPendingHotOpportunities,
} from '@/lib/analytics/analyticsService';
import { AnalyticsDateRange } from '@/lib/analytics/types';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('period') || 'TODAY').toUpperCase() as AnalyticsDateRange;
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;

    const bounds = getDateRangeBounds(range, start, end);

    const [activity, sales, lostOpps, pendingOpps] = await Promise.all([
      getActivityCounts(bounds),
      getSalesMetrics(bounds),
      getLostOpportunities(bounds),
      getPendingHotOpportunities(),
    ]);

    const calls = await prisma.call.findMany({
      where: { occurredAt: { gte: bounds.start, lte: bounds.end } },
      select: { notes: true, outcome: true },
      take: 15,
    });

    const recentNotes = calls.map((c) => (c.notes ? `[${c.outcome}] ${c.notes}` : `[${c.outcome}]`));

    const calcRate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

    const coachResult = await aiProvider.generateSalesCoach({
      period: range,
      activity,
      funnel: {
        callsMade: activity.totalCalls,
        connected: activity.connected,
        interested: activity.interested,
        demosCompleted: activity.demosCompleted,
        dealsClosed: sales.totalSales,
        connectionRate: calcRate(activity.connected, activity.totalCalls),
        demoConversionRate: calcRate(activity.demosScheduled, activity.interested),
        closeRate: calcRate(sales.totalSales, activity.demosCompleted),
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

    return NextResponse.json({
      success: true,
      data: coachResult,
    });
  } catch (error: any) {
    console.error('Error in GET /api/insights/coach:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate AI sales coach advice.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const range = (body.period || 'TODAY').toUpperCase() as AnalyticsDateRange;
    const bounds = getDateRangeBounds(range, body.start, body.end);

    const [activity, sales, lostOpps, pendingOpps] = await Promise.all([
      getActivityCounts(bounds),
      getSalesMetrics(bounds),
      getLostOpportunities(bounds),
      getPendingHotOpportunities(),
    ]);

    const calls = await prisma.call.findMany({
      where: { occurredAt: { gte: bounds.start, lte: bounds.end } },
      select: { notes: true, outcome: true },
      take: 15,
    });

    const recentNotes = calls.map((c) => (c.notes ? `[${c.outcome}] ${c.notes}` : `[${c.outcome}]`));
    const calcRate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

    const coachResult = await aiProvider.generateSalesCoach({
      period: range,
      activity,
      funnel: {
        callsMade: activity.totalCalls,
        connected: activity.connected,
        interested: activity.interested,
        demosCompleted: activity.demosCompleted,
        dealsClosed: sales.totalSales,
        connectionRate: calcRate(activity.connected, activity.totalCalls),
        demoConversionRate: calcRate(activity.demosScheduled, activity.interested),
        closeRate: calcRate(sales.totalSales, activity.demosCompleted),
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

    return NextResponse.json({
      success: true,
      data: coachResult,
    });
  } catch (error: any) {
    console.error('Error in POST /api/insights/coach:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate AI sales coach advice.' },
      { status: 500 }
    );
  }
}
