import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyReport, getMonthlyReport, listMonthlyReports } from '@/lib/analytics/reportService';
import { getDateRangeBounds } from '@/lib/time/salesTimeEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listMode = searchParams.get('list') === 'true';

    if (listMode) {
      const limit = parseInt(searchParams.get('limit') || '12', 10);
      const reports = await listMonthlyReports(limit);
      return NextResponse.json({ success: true, data: reports });
    }

    const filter = (searchParams.get('filter') || '').toUpperCase();
    const dateParam = searchParams.get('date');
    const force = searchParams.get('force') === 'true';

    let targetDate = new Date();
    if (filter === 'LAST_MONTH') {
      const bounds = getDateRangeBounds('LAST_MONTH');
      targetDate = bounds.start;
    } else if (dateParam) {
      targetDate = new Date(dateParam);
    }

    let report = null;
    if (!force) {
      report = await getMonthlyReport(targetDate);
    }

    if (!report) {
      report = await generateMonthlyReport(targetDate, force);
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error in GET /api/insights/reports/monthly:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch monthly sales report.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dateParam = body.date;
    const force = body.force !== false;
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const report = await generateMonthlyReport(targetDate, force);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error in POST /api/insights/reports/monthly:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate monthly sales report.' },
      { status: 500 }
    );
  }
}
