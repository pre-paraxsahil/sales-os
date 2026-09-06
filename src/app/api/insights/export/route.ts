import { NextRequest, NextResponse } from 'next/server';
import { generateDailyReport, generateWeeklyReport } from '@/lib/analytics/reportService';
import { getDateRangeBounds, getLeadSourceIntelligence, getSalesOverview } from '@/lib/analytics/analyticsService';
import { generateDailyReportCsv, generateWeeklyReportCsv, generateLeadSourceCsv } from '@/lib/analytics/exportService';
import { AnalyticsDateRange } from '@/lib/analytics/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily';
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const dateParam = searchParams.get('date');
    const range = (searchParams.get('range') || 'TODAY').toUpperCase() as AnalyticsDateRange;

    const refDate = dateParam ? new Date(dateParam) : new Date();

    if (type === 'daily') {
      const report = await generateDailyReport(refDate, false);
      if (format === 'json') {
        return new NextResponse(JSON.stringify(report, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="daily_sales_report_${report.reportDate}.json"`,
          },
        });
      }

      const csv = generateDailyReportCsv(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="daily_sales_report_${report.reportDate}.csv"`,
        },
      });
    }

    if (type === 'weekly') {
      const day = refDate.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const monday = new Date(refDate);
      monday.setDate(refDate.getDate() + diff);

      const report = await generateWeeklyReport(monday, false);
      if (format === 'json') {
        return new NextResponse(JSON.stringify(report, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="weekly_sales_report_${report.weekStartDate}.json"`,
          },
        });
      }

      const csv = generateWeeklyReportCsv(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="weekly_sales_report_${report.weekStartDate}.csv"`,
        },
      });
    }

    if (type === 'sources') {
      const bounds = getDateRangeBounds(range);
      const sources = await getLeadSourceIntelligence(bounds);

      if (format === 'json') {
        return new NextResponse(JSON.stringify(sources, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="lead_sources_${range.toLowerCase()}.json"`,
          },
        });
      }

      const csv = generateLeadSourceCsv(sources);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="lead_sources_${range.toLowerCase()}.csv"`,
        },
      });
    }

    // Default overview export
    const overview = await getSalesOverview(range);
    return new NextResponse(JSON.stringify(overview, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="sales_overview_${range.toLowerCase()}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/insights/export:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to export sales data.' },
      { status: 500 }
    );
  }
}
