import { NextRequest, NextResponse } from 'next/server';
import { generateDailyReport, getDailyReport, listDailyReports } from '@/lib/analytics/reportService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listMode = searchParams.get('list') === 'true';

    if (listMode) {
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const reports = await listDailyReports(limit);
      return NextResponse.json({ success: true, data: reports });
    }

    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    // Check existing or auto-generate
    let report = await getDailyReport(targetDate);
    if (!report) {
      report = await generateDailyReport(targetDate, false);
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error in GET /api/insights/reports/daily:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch daily sales report.' },
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

    const report = await generateDailyReport(targetDate, force);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error in POST /api/insights/reports/daily:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate daily sales report.' },
      { status: 500 }
    );
  }
}
