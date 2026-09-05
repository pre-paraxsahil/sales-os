import { NextRequest, NextResponse } from 'next/server';
import { getSalesOverview } from '@/lib/analytics/analyticsService';
import { AnalyticsDateRange } from '@/lib/analytics/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || 'TODAY').toUpperCase() as AnalyticsDateRange;
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;

    const data = await getSalesOverview(range, start, end);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error in GET /api/insights:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sales overview.' },
      { status: 500 }
    );
  }
}
