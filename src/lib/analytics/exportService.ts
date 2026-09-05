import { DailyReportData, WeeklyReportData, ActivityCounts, SalesMetrics, LeadSourceStat } from './types';

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function arrayToCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsvField).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvField).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

export function generateDailyReportCsv(report: DailyReportData): string {
  const headers = ['Category', 'Metric', 'Value'];
  const rows: (string | number)[][] = [
    ['Header', 'Report Date', report.reportDate],
    ['Header', 'Day of Week', report.dayOfWeek],
    ['Header', 'Generated At', report.generatedAt],
    ['Activity', 'Total Calls', report.activity.totalCalls],
    ['Activity', 'New Calls', report.activity.newCalls],
    ['Activity', 'Follow-up Calls', report.activity.followUpCalls],
    ['Activity', 'Connected Calls', report.activity.connected],
    ['Activity', 'Interested Leads', report.activity.interested],
    ['Activity', 'Demos Scheduled', report.activity.demosScheduled],
    ['Activity', 'Demos Completed', report.activity.demosCompleted],
    ['Activity', 'No Answer / Voicemail', report.activity.noAnswer],
    ['Activity', 'Busy', report.activity.busy],
    ['Activity', 'Switched Off', report.activity.switchedOff],
    ['Activity', 'Not Interested', report.activity.notInterested],
    ['Funnel', 'Call to Connected (%)', report.funnel.callsToConnected],
    ['Funnel', 'Connected to Interested (%)', report.funnel.connectedToInterested],
    ['Funnel', 'Interested to Demo (%)', report.funnel.interestedToDemo],
    ['Funnel', 'Demo to Sale (%)', report.funnel.demoToSale],
    ['Sales', 'Total Sales Count', report.sales.totalSales],
    ['Sales', 'Total Revenue (INR)', report.sales.totalRevenue],
    ['Sales', 'Average Sale Value (INR)', report.sales.averageSaleValue],
    ['AI Review', 'Bottleneck', report.aiReview.bottleneck],
    ['AI Review', 'Best Opportunity', report.aiReview.bestOpportunity],
    ['AI Review', 'Recommended Strategy', report.aiReview.recommendedStrategy],
  ];

  return arrayToCsv(headers, rows);
}

export function generateWeeklyReportCsv(report: WeeklyReportData): string {
  const headers = ['Category', 'Metric', 'Value'];
  const rows: (string | number)[][] = [
    ['Header', 'Week Start Date', report.weekStartDate],
    ['Header', 'Week End Date', report.weekEndDate],
    ['Activity', 'Total Calls', report.activity.totalCalls],
    ['Activity', 'Connected Calls', report.activity.connected],
    ['Activity', 'Demos Completed', report.activity.demosCompleted],
    ['Conversions', 'Connection Rate (%)', report.conversions.connectionRate],
    ['Conversions', 'Interest Rate (%)', report.conversions.interestRate],
    ['Conversions', 'Demo Rate (%)', report.conversions.demoRate],
    ['Conversions', 'Close Rate (%)', report.conversions.closeRate],
    ['Sales', 'Total Sales Deals', report.sales.totalSales],
    ['Sales', 'Total Revenue (INR)', report.sales.totalRevenue],
    ['Key Highlights', 'Best Day', report.bestDay ? `${report.bestDay.dayName} (₹${report.bestDay.revenue})` : 'N/A'],
    ['Key Highlights', 'Weakest Day', report.weakestDay ? `${report.weakestDay.dayName} (${report.weakestDay.calls} calls)` : 'N/A'],
    ['Key Highlights', 'Best Calling Time', report.bestCallingTime || 'N/A'],
    ['Key Highlights', 'Best Lead Source', report.bestLeadSource || 'N/A'],
    ['Key Highlights', 'Weakest Funnel Stage', report.weakestFunnelStage || 'N/A'],
  ];

  return arrayToCsv(headers, rows);
}

export function generateLeadSourceCsv(sources: LeadSourceStat[]): string {
  const headers = [
    'Lead Source',
    'Total Leads',
    'Connected Calls',
    'Interested',
    'Demos Booked',
    'Deals Won',
    'Revenue (INR)',
    'Connect Rate (%)',
    'Close Rate (%)',
  ];

  const rows = sources.map((s) => [
    s.source,
    s.leadsCount,
    s.connectedCalls,
    s.interestedCount,
    s.demosBooked,
    s.salesCount,
    s.revenue,
    s.connectionRate,
    s.closeRate,
  ]);

  return arrayToCsv(headers, rows);
}
