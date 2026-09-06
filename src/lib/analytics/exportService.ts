import {
  DailyReportData,
  WeeklyReportData,
  MonthlyReportData,
  SourcePerformanceItem,
  LeadSourceStat,
} from './types';

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

    // Calling breakdown
    ['Calling', 'Total Calls', report.calling?.totalCalls ?? report.activity.totalCalls],
    ['Calling', 'Cold Calls', report.calling?.coldCalls ?? 0],
    ['Calling', 'Ads / Inbound Calls', report.calling?.inboundCalls ?? 0],
    ['Calling', 'Follow-up Calls', report.calling?.followUpCalls ?? report.activity.followUpCalls],
    ['Calling', 'Interested Calls', report.calling?.interestedCalls ?? 0],
    ['Calling', 'Closing / Discovery Calls', report.calling?.closingCalls ?? 0],

    // Call Outcomes
    ['Call Outcomes', 'Connected', report.outcomes?.connected ?? report.activity.connected],
    ['Call Outcomes', 'No Answer', report.outcomes?.noAnswer ?? report.activity.noAnswer],
    ['Call Outcomes', 'Busy', report.outcomes?.busy ?? report.activity.busy],
    ['Call Outcomes', 'Switched Off', report.outcomes?.switchedOff ?? report.activity.switchedOff],
    ['Call Outcomes', 'Not Interested', report.outcomes?.notInterested ?? report.activity.notInterested],
    ['Call Outcomes', 'Wrong Number', report.outcomes?.wrongNumber ?? report.activity.wrongNumber],
    ['Call Outcomes', 'Callback Requested', report.outcomes?.callbackRequested ?? 0],

    // Sales Progress
    ['Sales Progress', 'Interested Leads', report.salesProgress?.interestedLeads ?? report.activity.interested],
    ['Sales Progress', 'Demos Booked', report.salesProgress?.demosBooked ?? report.activity.demosScheduled],
    ['Sales Progress', 'Demos Completed', report.salesProgress?.demosCompleted ?? report.activity.demosCompleted],
    ['Sales Progress', 'Samples Sent', report.salesProgress?.samplesSent ?? 0],
    ['Sales Progress', 'Follow-ups Created', report.salesProgress?.followUpsCreated ?? 0],
    ['Sales Progress', 'Closings (Deals Won)', report.salesProgress?.closings ?? report.sales.totalSales],
    ['Sales Progress', 'Revenue (INR)', report.salesProgress?.revenue ?? report.sales.totalRevenue],

    // Activity Summary
    ['Activity Summary', 'New Leads Added', report.activitySummary?.newLeadsAdded ?? 0],
    ['Activity Summary', 'WhatsApp Messages Sent', report.activitySummary?.whatsAppSent ?? 0],
    ['Activity Summary', 'Tasks Completed', report.activitySummary?.tasksCompleted ?? 0],
    ['Activity Summary', 'Demos', report.activitySummary?.demos ?? 0],
    ['Activity Summary', 'Other Activities', report.activitySummary?.otherActivities ?? 0],

    // Funnel & Performance
    ['Funnel', 'Call to Connected (%)', report.funnel.callsToConnected],
    ['Funnel', 'Connected to Interested (%)', report.funnel.connectedToInterested],
    ['Funnel', 'Interested to Demo (%)', report.funnel.interestedToDemo],
    ['Funnel', 'Demo to Sale (%)', report.funnel.demoToSale],

    // AI Review
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
    ['Header', 'Generated At', report.generatedAt],

    ['Activity', 'Total Calls', report.calling?.totalCalls ?? report.activity.totalCalls],
    ['Activity', 'Connected Calls', report.outcomes?.connected ?? report.activity.connected],
    ['Activity', 'Interested Leads', report.salesProgress?.interestedLeads ?? report.activity.interested],
    ['Activity', 'Demos Completed', report.salesProgress?.demosCompleted ?? report.activity.demosCompleted],
    ['Activity', 'Samples Sent', report.salesProgress?.samplesSent ?? 0],
    ['Activity', 'Follow-ups Created', report.salesProgress?.followUpsCreated ?? 0],
    ['Activity', 'Closings', report.salesProgress?.closings ?? report.sales.totalSales],
    ['Activity', 'Total Revenue (INR)', report.salesProgress?.revenue ?? report.sales.totalRevenue],

    ['Conversions', 'Connection Rate (%)', report.conversions.connectionRate],
    ['Conversions', 'Interest Rate (%)', report.conversions.interestRate],
    ['Conversions', 'Demo Rate (%)', report.conversions.demoRate],
    ['Conversions', 'Close Rate (%)', report.conversions.closeRate],

    ['Highlights', 'Best Day', report.bestDay ? `${report.bestDay.dayName} (₹${report.bestDay.revenue})` : 'N/A'],
    ['Highlights', 'Weakest Day', report.weakestDay ? `${report.weakestDay.dayName} (${report.weakestDay.calls} calls)` : 'N/A'],
    ['Highlights', 'Best Calling Time', report.bestCallingTime || 'N/A'],
    ['Highlights', 'Best Lead Source', report.bestLeadSource || 'N/A'],
  ];

  // Append Day-by-Day rows if available
  if (report.dayByDay && report.dayByDay.length > 0) {
    rows.push(['---', '--- DAY BY DAY BREAKDOWN ---', '---']);
    for (const d of report.dayByDay) {
      rows.push([
        `Day: ${d.date} (${d.dayName})`,
        `Calls: ${d.calls} | Conn: ${d.connected} | Int: ${d.interested} | Demos: ${d.demos} | Closings: ${d.closings}`,
        `Revenue: ₹${d.revenue}`,
      ]);
    }
  }

  return arrayToCsv(headers, rows);
}

export function generateMonthlyReportCsv(report: MonthlyReportData): string {
  const headers = ['Category', 'Metric', 'Value'];
  const rows: (string | number)[][] = [
    ['Header', 'Month', `${report.monthName} ${report.year}`],
    ['Header', 'Month Start Date', report.monthStartDate],
    ['Header', 'Month End Date', report.monthEndDate],
    ['Header', 'Total Activities', report.totalActivity],
    ['Header', 'Generated At', report.generatedAt],

    ['Performance', 'Total Calls', report.calling?.totalCalls ?? report.activity.totalCalls],
    ['Performance', 'Connected Calls', report.outcomes?.connected ?? report.activity.connected],
    ['Performance', 'Interested Leads', report.salesProgress?.interestedLeads ?? report.activity.interested],
    ['Performance', 'Demos Completed', report.salesProgress?.demosCompleted ?? report.activity.demosCompleted],
    ['Performance', 'Deals Closed', report.salesProgress?.closings ?? report.sales.totalSales],
    ['Performance', 'Total Revenue (INR)', report.revenue],

    ['Rates', 'Connection Rate (%)', report.conversionFunnel.connectionRate],
    ['Rates', 'Interest Rate (%)', report.conversionFunnel.interestRate],
    ['Rates', 'Demo Rate (%)', report.conversionFunnel.demoRate],
    ['Rates', 'Closing Rate (%)', report.conversionFunnel.closeRate],
    ['Rates', 'Follow-up Conversion Rate (%)', report.conversionFunnel.followUpConversionRate],

    ['Targets', 'Target Revenue (INR)', report.targetAchievement.targetRevenue],
    ['Targets', 'Achieved Revenue (INR)', report.targetAchievement.achievedRevenue],
    ['Targets', 'Revenue Achievement (%)', report.targetAchievement.revenuePercent],
    ['Targets', 'Calls Achievement (%)', report.targetAchievement.callsPercent],
    ['Targets', 'Demos Achievement (%)', report.targetAchievement.demosPercent],

    ['Highlights', 'Best Day', report.bestDay ? `${report.bestDay.dayName} ${report.bestDay.date} (₹${report.bestDay.revenue})` : 'N/A'],
    ['Highlights', 'Weakest Day', report.weakestDay ? `${report.weakestDay.dayName} ${report.weakestDay.date} (${report.weakestDay.calls} calls)` : 'N/A'],
  ];

  // Append Source Performance rows
  if (report.sourcePerformance && report.sourcePerformance.length > 0) {
    rows.push(['---', '--- SOURCE PERFORMANCE ---', '---']);
    for (const s of report.sourcePerformance) {
      rows.push([
        `Source: ${s.source}`,
        `Attempts: ${s.attempts} | Conn: ${s.connected} | Int: ${s.interested} | Demos: ${s.demos} | Closings: ${s.closings}`,
        `Revenue: ₹${s.revenue} | CloseRate: ${s.closingRate}%`,
      ]);
    }
  }

  return arrayToCsv(headers, rows);
}

export function generateSourcePerformanceCsv(sources: SourcePerformanceItem[]): string {
  const headers = [
    'Source',
    'Attempts',
    'Connected',
    'Interested',
    'Demos',
    'Closings',
    'Revenue (INR)',
    'Connect Rate (%)',
    'Interest Rate (%)',
    'Closing Rate (%)',
  ];

  const rows = sources.map((s) => [
    s.source,
    s.attempts,
    s.connected,
    s.interested,
    s.demos,
    s.closings,
    s.revenue,
    s.connectionRate,
    s.interestRate,
    s.closingRate,
  ]);

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
