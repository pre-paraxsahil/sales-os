import { NextRequest, NextResponse } from 'next/server';
import { getDateRangeBounds, getCallingIntelligence } from '@/lib/analytics/analyticsService';
import { AnalyticsDateRange } from '@/lib/analytics/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range');
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;

    const bounds = range
      ? getDateRangeBounds(range.toUpperCase() as AnalyticsDateRange, start, end)
      : undefined;

    const data = await getCallingIntelligence(bounds);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error in GET /api/insights/calling-intelligence:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch calling intelligence.' },
      { status: 500 }
    );
  }
}
