import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyReport, getWeeklyReport, listWeeklyReports } from '@/lib/analytics/reportService';
import { getDateRangeBounds } from '@/lib/time/salesTimeEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listMode = searchParams.get('list') === 'true';

    if (listMode) {
      const limit = parseInt(searchParams.get('limit') || '8', 10);
      const reports = await listWeeklyReports(limit);
      return NextResponse.json({ success: true, data: reports });
    }

    const filter = (searchParams.get('filter') || '').toUpperCase();
    const dateParam = searchParams.get('date');
    const force = searchParams.get('force') === 'true';

    let targetDate = new Date();
    if (filter === 'LAST_WEEK') {
      const bounds = getDateRangeBounds('LAST_WEEK');
      targetDate = bounds.start;
    } else if (dateParam) {
      targetDate = new Date(dateParam);
    }

    // Calculate Monday of that week
    const day = targetDate.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() + diff);

    let report = null;
    if (!force) {
      report = await getWeeklyReport(monday);
    }

    if (!report) {
      report = await generateWeeklyReport(monday, force);
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error in GET /api/insights/reports/weekly:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch weekly sales report.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dateParam = body.date;
    const force = body.force !== false;
    let targetDate = dateParam ? new Date(dateParam) : new Date();

    const day = targetDate.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() + diff);

    const report = await generateWeeklyReport(monday, force);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error in POST /api/insights/reports/weekly:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate weekly sales report.' },
      { status: 500 }
    );
  }
}
