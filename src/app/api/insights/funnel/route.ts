import { NextRequest, NextResponse } from 'next/server';
import { getDateRangeBounds, getFunnelAnalytics } from '@/lib/analytics/analyticsService';
import { AnalyticsDateRange } from '@/lib/analytics/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || 'TODAY').toUpperCase() as AnalyticsDateRange;
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;

    const bounds = getDateRangeBounds(range, start, end);
    const data = await getFunnelAnalytics(bounds);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error in GET /api/insights/funnel:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch funnel analytics.' },
      { status: 500 }
    );
  }
}
