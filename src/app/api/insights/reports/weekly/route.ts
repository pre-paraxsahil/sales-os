import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyReport, getWeeklyReport, listWeeklyReports } from '@/lib/analytics/reportService';

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

    const dateParam = searchParams.get('date');
    let targetDate = dateParam ? new Date(dateParam) : new Date();

    // Calculate Monday of that week
    const day = targetDate.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() + diff);

    let report = await getWeeklyReport(monday);
    if (!report) {
      report = await generateWeeklyReport(monday, false);
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
