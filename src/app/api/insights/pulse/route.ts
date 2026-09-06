import { NextRequest, NextResponse } from 'next/server';
import { getTwoHourPulse } from '@/lib/analytics/analyticsService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const refDate = dateParam ? new Date(dateParam) : new Date();

    const data = await getTwoHourPulse(refDate);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error in GET /api/insights/pulse:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sales pulse.' },
      { status: 500 }
    );
  }
}
