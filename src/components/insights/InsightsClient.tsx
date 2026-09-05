'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  BarChart2,
  Calendar,
  Clock,
  Zap,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  RefreshCw,
  Target,
  Flame,
  Award,
  ChevronRight,
  HelpCircle,
  TrendingDown,
  Layers,
  FileText,
  DollarSign,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AnalyticsDateRange,
  TwoHourPulseResult,
  FunnelAnalyticsResult,
  CallingIntelligenceResult,
  DailyReportData,
  WeeklyReportData,
  LeadSourceStat,
  LostOpportunityItem,
  PendingHotOpportunityItem,
  ForecastResult,
} from '@/lib/analytics/types';

type TabType = 'overview' | 'pulse' | 'funnel' | 'daily_report' | 'weekly_report' | 'calling_intel' | 'coach';

export const InsightsClient: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('TODAY');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Overview data
  const [overviewData, setOverviewData] = useState<any>(null);
  // Pulse data
  const [pulseData, setPulseData] = useState<TwoHourPulseResult | null>(null);
  // Funnel data
  const [funnelData, setFunnelData] = useState<FunnelAnalyticsResult | null>(null);
  // Calling intelligence
  const [callingIntel, setCallingIntel] = useState<CallingIntelligenceResult | null>(null);
  // Reports
  const [dailyReport, setDailyReport] = useState<DailyReportData | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportData | null>(null);
  // Coach
  const [coachData, setCoachData] = useState<any>(null);
  const [coachLoading, setCoachLoading] = useState<boolean>(false);

  // Fetch all insights for current date range
  const loadInsights = useCallback(async (range: AnalyticsDateRange, cStart?: string, cEnd?: string) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({ range });
      if (cStart) queryParams.set('start', cStart);
      if (cEnd) queryParams.set('end', cEnd);

      const [overRes, pulseRes, funnelRes, callRes, dailyRes, weeklyRes] = await Promise.all([
        fetch(`/api/insights?${queryParams.toString()}`),
        fetch('/api/insights/pulse'),
        fetch(`/api/insights/funnel?${queryParams.toString()}`),
        fetch(`/api/insights/calling-intelligence?${queryParams.toString()}`),
        fetch('/api/insights/reports/daily'),
        fetch('/api/insights/reports/weekly'),
      ]);

      if (overRes.ok) {
        const json = await overRes.json();
        if (json.success) setOverviewData(json.data);
      }
      if (pulseRes.ok) {
        const json = await pulseRes.json();
        if (json.success) setPulseData(json.data);
      }
      if (funnelRes.ok) {
        const json = await funnelRes.json();
        if (json.success) setFunnelData(json.data);
      }
      if (callRes.ok) {
        const json = await callRes.json();
        if (json.success) setCallingIntel(json.data);
      }
      if (dailyRes.ok) {
        const json = await dailyRes.json();
        if (json.success) setDailyReport(json.data);
      }
      if (weeklyRes.ok) {
        const json = await weeklyRes.json();
        if (json.success) setWeeklyReport(json.data);
      }
    } catch (err) {
      console.error('Failed to load insights data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInsights(dateRange, customStart, customEnd);
  }, [dateRange, customStart, customEnd, loadInsights]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInsights(dateRange, customStart, customEnd);
  };

  const handleFetchCoach = async () => {
    try {
      setCoachLoading(true);
      const res = await fetch(`/api/insights/coach?period=${dateRange}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setCoachData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch coach:', err);
    } finally {
      setCoachLoading(false);
    }
  };

  const handleForceDailyReport = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/insights/reports/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setDailyReport(json.data);
      }
    } catch (e) {
      console.error('Failed to force daily report', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleForceWeeklyReport = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/insights/reports/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setWeeklyReport(json.data);
      }
    } catch (e) {
      console.error('Failed to force weekly report', e);
    } finally {
      setRefreshing(false);
    }
  };

  const activity = overviewData?.activity;
  const sales = overviewData?.sales;
  const pipeline = overviewData?.pipeline;
  const forecast: ForecastResult | undefined = overviewData?.forecast;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-violet-950 text-violet-300 border border-violet-800">
              BUILD 10 • SALES INTELLIGENCE
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
              Raw Data Ground Truth
            </span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mt-2 flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-violet-400" />
            Sales Insights & Reports
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Real-time conversion funnels, 2-hour sales pulse, factual daily reports, and AI coaching.
          </p>
        </div>

        {/* Date Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs font-medium text-zinc-400">
            {(['TODAY', 'YESTERDAY', 'THIS_WEEK', 'LAST_WEEK', 'THIS_MONTH'] as AnalyticsDateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={cn(
                  'px-2.5 py-1 rounded transition-colors',
                  dateRange === r
                    ? 'bg-violet-600 text-white font-semibold shadow-sm'
                    : 'hover:text-zinc-200'
                )}
              >
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin text-violet-400')} />
          </button>

          <a
            href={`/api/insights/export?type=daily&format=csv`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-zinc-800 overflow-x-auto pb-1 text-xs font-medium">
        {[
          { id: 'overview', label: 'Sales Overview', icon: TrendingUp },
          { id: 'pulse', label: '2-Hour Sales Pulse', icon: Clock, badge: pulseData?.currentBlock.activity.totalCalls ? `${pulseData.currentBlock.activity.totalCalls} calls` : undefined },
          { id: 'funnel', label: 'Conversion Funnel', icon: Layers },
          { id: 'daily_report', label: '6 PM Daily Report', icon: FileText },
          { id: 'weekly_report', label: 'Weekly Performance', icon: Calendar },
          { id: 'calling_intel', label: 'Calling Time Intelligence', icon: PhoneCall },
          { id: 'coach', label: 'AI Sales Coach', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                if (tab.id === 'coach' && !coachData) {
                  handleFetchCoach();
                }
              }}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap',
                isActive
                  ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-violet-400' : 'text-zinc-500')} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-violet-950 text-violet-300 border border-violet-800 font-normal">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Calls */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-medium">Calls Logged</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-zinc-100">{activity?.totalCalls ?? 0}</span>
                <PhoneCall className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-[11px] text-zinc-500 mt-1">
                {activity?.connected ?? 0} connected ({activity?.totalCalls ? Math.round(((activity.connected) / activity.totalCalls) * 100) : 0}%)
              </span>
            </div>

            {/* Demos Completed */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-medium">Demos Completed</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-zinc-100">{activity?.demosCompleted ?? 0}</span>
                <UserCheck className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-[11px] text-zinc-500 mt-1">
                {activity?.demosScheduled ?? 0} scheduled
              </span>
            </div>

            {/* Deals Closed */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-medium">Deals Won</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-emerald-400">{sales?.totalSales ?? 0}</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[11px] text-zinc-500 mt-1">
                Avg ₹{sales?.averageSaleValue ? sales.averageSaleValue.toLocaleString() : '0'}
              </span>
            </div>

            {/* Total Revenue */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-medium">Total Revenue</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-zinc-100">
                  ₹{sales?.totalRevenue ? sales.totalRevenue.toLocaleString() : '0'}
                </span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[11px] text-zinc-500 mt-1">
                {overviewData?.bounds?.label || 'Selected Period'}
              </span>
            </div>

            {/* Hot Pipeline */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-medium">Hot Pipeline Leads</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-rose-400">{pipeline?.hotLeads ?? 0}</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <span className="text-[11px] text-zinc-500 mt-1">
                {pipeline?.warmLeads ?? 0} warm leads
              </span>
            </div>

            {/* Follow-ups Due */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
              <span className="text-xs text-zinc-400 font-medium">Pending Follow-ups</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-amber-400">{pipeline?.followUpsDue ?? 0}</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-[11px] text-zinc-500 mt-1">
                {pipeline?.overdueFollowUps ?? 0} overdue
              </span>
            </div>
          </div>

          {/* Quick Pulse Snapshot & Forecast Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Sales Pulse Card */}
            <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-zinc-200">Current Sales Pulse</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {pulseData?.currentBlock.blockTitle || 'Current Slot'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-lg font-bold text-zinc-100">{pulseData?.currentBlock.activity.totalCalls ?? 0}</div>
                    <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Calls Made</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-lg font-bold text-blue-400">{pulseData?.currentBlock.connectionRate ?? 0}%</div>
                    <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Connect Rate</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-lg font-bold text-emerald-400">{pulseData?.currentBlock.interestRate ?? 0}%</div>
                    <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Interest Rate</div>
                  </div>
                </div>

                <div className="mt-3.5 text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80 flex items-start gap-2">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-zinc-200">Next Action: </span>
                    {pulseData?.nextBlockFocus || 'Maintain consistent outreach velocity.'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('pulse')}
                className="mt-4 w-full py-1.5 px-3 rounded-lg text-xs font-medium text-violet-300 hover:text-white bg-violet-950/50 hover:bg-violet-900/60 border border-violet-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                Open Full Pulse Deep Dive <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fact-Based Forecast Card */}
            <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-zinc-200">Sales Pace & Projection</h3>
                  </div>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-medium border',
                    forecast?.forecastAvailable
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  )}>
                    {forecast?.forecastAvailable ? `${forecast.confidenceScore}% Confidence` : 'Pending Data'}
                  </span>
                </div>

                {forecast?.forecastAvailable ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-baseline justify-between border-b border-zinc-800/80 pb-2">
                      <span className="text-xs text-zinc-400">Projected Total Revenue</span>
                      <span className="text-xl font-bold text-emerald-400">
                        ₹{forecast.projectedSalesAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">Achieved To Date</span>
                        <span className="font-semibold text-zinc-200">₹{forecast.basis.achievedAmount.toLocaleString()}</span>
                      </div>
                      <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">Pipeline Weighted</span>
                        <span className="font-semibold text-zinc-200">₹{forecast.basis.pipelineWeightedValue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p>{forecast?.reasonIfNotAvailable || 'Minimum 2 closed deals or qualified pipeline required for statistical projection.'}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-500">
                Formula: Realized Revenue + Max(Run-rate projection, 60% Hot + 25% Warm Pipeline).
              </div>
            </div>

            {/* Quick Funnel Summary */}
            <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-zinc-200">Funnel Health</h3>
                  </div>
                  {funnelData?.bottleneck && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-950 text-rose-300 border border-rose-800">
                      Bottleneck Detected
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {funnelData?.stages.slice(0, 4).map((stage) => (
                    <div key={stage.id} className="text-xs">
                      <div className="flex justify-between text-zinc-400 mb-1">
                        <span>{stage.name}</span>
                        <span className="font-semibold text-zinc-200">{stage.count} ({stage.conversionFromPrev}%)</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${Math.max(5, stage.percentageOfTop)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setActiveTab('funnel')}
                className="mt-4 w-full py-1.5 px-3 rounded-lg text-xs font-medium text-purple-300 hover:text-white bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                Inspect Conversion Drop-offs <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Lead Sources Performance Table */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Lead Source Attribution</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Which lead sources convert to demos and closed revenue</p>
              </div>
              <span className="text-xs text-zinc-500">
                {overviewData?.leadSources?.length || 0} active sources
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Lead Source</th>
                    <th className="py-3 px-4">Leads</th>
                    <th className="py-3 px-4">Connected</th>
                    <th className="py-3 px-4">Interested</th>
                    <th className="py-3 px-4">Demos</th>
                    <th className="py-3 px-4">Won</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                    <th className="py-3 px-4 text-right">Close Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {overviewData?.leadSources && overviewData.leadSources.length > 0 ? (
                    overviewData.leadSources.map((s: LeadSourceStat) => (
                      <tr key={s.source} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-zinc-200">{s.source}</td>
                        <td className="py-3 px-4 text-zinc-300">{s.leadsCount}</td>
                        <td className="py-3 px-4 text-zinc-300">{s.connectedCalls}</td>
                        <td className="py-3 px-4 text-zinc-300">{s.interestedCount}</td>
                        <td className="py-3 px-4 text-purple-400 font-medium">{s.demosBooked}</td>
                        <td className="py-3 px-4 text-emerald-400 font-semibold">{s.salesCount}</td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-zinc-200">
                          ₹{s.revenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            'px-2 py-0.5 rounded font-mono text-[11px]',
                            s.closeRate > 15 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-zinc-400'
                          )}>
                            {s.closeRate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-zinc-500">
                        No lead source activity logged in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TWO-HOUR SALES PULSE */}
      {activeTab === 'pulse' && (
        <div className="space-y-6">
          {/* Header block */}
          <div className="p-6 rounded-xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Real-Time Sales Velocity
                </span>
                <h2 className="text-xl font-bold text-zinc-100 mt-1 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Two-Hour Sales Pulse
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Tracks call execution quality in 2-hour increments to catch fatigue early and adjust tempo.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-zinc-400">Current Window</div>
                  <div className="text-sm font-bold text-zinc-200">{pulseData?.currentBlock.blockTitle}</div>
                </div>
                {pulseData?.comparison && (
                  <div className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5',
                    pulseData.comparison.trend === 'UP'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : pulseData.comparison.trend === 'DOWN'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  )}>
                    {pulseData.comparison.trend === 'UP' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{pulseData.comparison.trend} ({pulseData.comparison.connectionRateDelta > 0 ? `+${pulseData.comparison.connectionRateDelta}` : pulseData.comparison.connectionRateDelta}% connect rate)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Current vs Previous Block Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Current Block */}
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-sm font-bold text-zinc-100">
                  Current Block: {pulseData?.currentBlock.blockTitle}
                </span>
                <span className="text-xs text-amber-400 font-medium">LIVE</span>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-zinc-100">{pulseData?.currentBlock.activity.totalCalls ?? 0}</div>
                  <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Calls</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-blue-400">{pulseData?.currentBlock.connectionRate ?? 0}%</div>
                  <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Connected</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-emerald-400">{pulseData?.currentBlock.interestRate ?? 0}%</div>
                  <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Interested</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-purple-400">{pulseData?.currentBlock.activity.demosScheduled ?? 0}</div>
                  <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Demos</div>
                </div>
              </div>

              {/* Call Outcomes Breakdown */}
              <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Connected / Answered</span>
                  <span className="text-zinc-200 font-medium">{pulseData?.currentBlock.activity.connected ?? 0}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>No Answer / Switched Off</span>
                  <span className="text-rose-400 font-medium">
                    {(pulseData?.currentBlock.activity.noAnswer ?? 0) + (pulseData?.currentBlock.activity.switchedOff ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Not Interested / Wrong Number</span>
                  <span className="text-zinc-400 font-medium">
                    {(pulseData?.currentBlock.activity.notInterested ?? 0) + (pulseData?.currentBlock.activity.wrongNumber ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Previous Block */}
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-sm font-bold text-zinc-100">
                  Previous Block: {pulseData?.previousBlock?.blockTitle || 'Earlier Window'}
                </span>
                <span className="text-xs text-zinc-500">Completed</span>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-zinc-100">{pulseData?.previousBlock?.activity.totalCalls ?? 0}</div>
                  <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Calls</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-blue-400">{pulseData?.previousBlock?.connectionRate ?? 0}%</div>
                  <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Connected</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-emerald-400">{pulseData?.previousBlock?.interestRate ?? 0}%</div>
                  <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Interested</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-purple-400">{pulseData?.previousBlock?.activity.demosScheduled ?? 0}</div>
                  <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Demos</div>
                </div>
              </div>

              {/* Call Outcomes Breakdown */}
              <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Connected / Answered</span>
                  <span className="text-zinc-200 font-medium">{pulseData?.previousBlock?.activity.connected ?? 0}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>No Answer / Switched Off</span>
                  <span className="text-rose-400 font-medium">
                    {(pulseData?.previousBlock?.activity.noAnswer ?? 0) + (pulseData?.previousBlock?.activity.switchedOff ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Not Interested / Wrong Number</span>
                  <span className="text-zinc-400 font-medium">
                    {(pulseData?.previousBlock?.activity.notInterested ?? 0) + (pulseData?.previousBlock?.activity.wrongNumber ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pulse Analysis: Going Well vs Weak Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                What's Going Well In This Window
              </h3>
              <ul className="space-y-2 text-xs text-zinc-300">
                {pulseData?.whatsGoingWell && pulseData.whatsGoingWell.length > 0 ? (
                  pulseData.whatsGoingWell.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{w}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-zinc-500">Log calls to populate real-time positive signals.</li>
                )}
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-900/40">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Drop-offs & Weak Areas
              </h3>
              <ul className="space-y-2 text-xs text-zinc-300">
                {pulseData?.whatsWeak && pulseData.whatsWeak.length > 0 ? (
                  pulseData.whatsWeak.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 mt-0.5">•</span>
                      <span>{w}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-zinc-500">No major drop-offs detected in current block.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Top 3 Leads For Urgent Attention */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              Hot Leads Requiring Attention Now
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 mb-4">
              Prioritized leads based on high temperature and scheduled action dates.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {pulseData?.topLeadsForAttention && pulseData.topLeadsForAttention.length > 0 ? (
                pulseData.topLeadsForAttention.map((l) => (
                  <div key={l.id} className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200 truncate">{l.title}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          HOT
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">{l.contactName || 'Primary Contact'}</div>
                      <div className="text-[11px] text-zinc-500 mt-2 font-mono">{l.phone || 'No phone'}</div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-zinc-800/80 text-[11px] text-amber-400">
                      {l.priorityReason}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-4 text-xs text-zinc-500">
                  No pending hot leads requiring immediate action.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONVERSION FUNNEL */}
      {activeTab === 'funnel' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-900 border border-purple-900/50">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Full Pipeline Stage Drop-Off
            </span>
            <h2 className="text-xl font-bold text-zinc-100 mt-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              5-Stage Sales Conversion Funnel
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Quantifies exact conversions and drop-offs: Calls Made → Connected → Interested → Demo Completed → Deals Won.
            </p>
          </div>

          {/* Bottleneck Alert Card */}
          {funnelData?.bottleneck ? (
            <div className="p-5 rounded-xl bg-rose-950/30 border border-rose-800/60">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-rose-200">
                      Primary Funnel Bottleneck: {funnelData.bottleneck.stageName}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-900/80 text-rose-200 border border-rose-700">
                      {funnelData.bottleneck.dropOffRate}% Drop-Off
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300">{funnelData.bottleneck.explanation}</p>
                  <div className="pt-2 text-xs text-amber-300 font-medium">
                    Recommended Fix: {funnelData.bottleneck.recommendation}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Funnel metrics are healthy. No stage exceeds 30% drop-off threshold.</span>
            </div>
          )}

          {/* Visual Funnel Display */}
          <div className="space-y-3">
            {funnelData?.stages.map((stage, idx) => (
              <div
                key={stage.id}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 w-full sm:w-1/3">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200">{stage.name}</h4>
                    <span className="text-xs text-zinc-500">
                      {stage.count} events recorded
                    </span>
                  </div>
                </div>

                {/* Bar */}
                <div className="w-full sm:w-1/2">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>{stage.percentageOfTop}% of total outreach</span>
                    {idx > 0 && (
                      <span className={cn(
                        'font-medium',
                        stage.dropOffRate > 40 ? 'text-rose-400' : 'text-zinc-300'
                      )}>
                        {stage.conversionFromPrev}% conversion ({stage.dropOffRate}% drop)
                      </span>
                    )}
                  </div>
                  <div className="w-full h-3 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-cyan-500' : idx === 2 ? 'bg-amber-500' : idx === 3 ? 'bg-purple-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${Math.max(4, stage.percentageOfTop)}%` }}
                    />
                  </div>
                </div>

                {/* Drop count */}
                <div className="text-right sm:w-1/6">
                  {idx > 0 ? (
                    <div>
                      <span className="text-xs font-bold text-rose-400">-{stage.dropOffCount}</span>
                      <span className="text-[10px] text-zinc-500 block">lost at stage</span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500">Top of Funnel</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: 6 PM DAILY REPORT */}
      {activeTab === 'daily_report' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-gradient-to-r from-blue-950/40 via-zinc-900 to-zinc-900 border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                End-of-Day Sales Synthesis
              </span>
              <h2 className="text-xl font-bold text-zinc-100 mt-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                6 PM Daily Sales Report
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Comprehensive snapshot of today's calling volume, stage conversions, closed revenue, and AI evaluation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleForceDailyReport}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-generate Report
              </button>
              <a
                href="/api/insights/export?type=daily&format=csv"
                download
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 border border-zinc-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </a>
            </div>
          </div>

          {dailyReport ? (
            <div className="space-y-6">
              {/* Daily Report Card */}
              <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-100">
                      Daily Summary • {dailyReport.dayOfWeek}, {dailyReport.reportDate}
                    </h3>
                    <span className="text-xs text-zinc-500">
                      Generated at {new Date(dailyReport.generatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-2 sm:mt-0 flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">
                      {dailyReport.activity.totalCalls} Calls Logged
                    </span>
                    <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                      ₹{dailyReport.sales.totalRevenue.toLocaleString()} Won
                    </span>
                  </div>
                </div>

                {/* Conversion Funnel Rates */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-xs text-zinc-400">Call Connect Rate</div>
                    <div className="text-xl font-bold text-blue-400 mt-1">{dailyReport.funnel.callsToConnected}%</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {dailyReport.activity.connected} / {dailyReport.activity.totalCalls} calls
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-xs text-zinc-400">Connected to Interested</div>
                    <div className="text-xl font-bold text-cyan-400 mt-1">{dailyReport.funnel.connectedToInterested}%</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {dailyReport.activity.interested} interested leads
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-xs text-zinc-400">Interested to Demo</div>
                    <div className="text-xl font-bold text-purple-400 mt-1">{dailyReport.funnel.interestedToDemo}%</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {dailyReport.activity.demosScheduled} demos booked
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-xs text-zinc-400">Demo to Won Sale</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">{dailyReport.funnel.demoToSale}%</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {dailyReport.sales.totalSales} deals closed
                    </div>
                  </div>
                </div>

                {/* AI Review Section */}
                <div className="pt-4 border-t border-zinc-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <h4 className="text-sm font-bold text-zinc-200">AI Sales Coach Daily Assessment</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40 space-y-2">
                      <span className="text-xs font-bold text-emerald-300">What Worked Today</span>
                      <ul className="space-y-1.5 text-xs text-zinc-300">
                        {dailyReport.aiReview.whatWorked.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-2">
                      <span className="text-xs font-bold text-rose-300">What Didn't Work / Drop-offs</span>
                      <ul className="space-y-1.5 text-xs text-zinc-300">
                        {dailyReport.aiReview.whatDidnt.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-rose-400">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3">
                    <div className="text-xs">
                      <span className="text-zinc-400 font-medium">Core Bottleneck: </span>
                      <span className="text-rose-300 font-semibold">{dailyReport.aiReview.bottleneck}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-zinc-400 font-medium">Best Opportunity in Pipeline: </span>
                      <span className="text-emerald-300 font-semibold">{dailyReport.aiReview.bestOpportunity}</span>
                    </div>
                    <div className="text-xs border-t border-zinc-800 pt-2.5">
                      <span className="text-violet-300 font-semibold block mb-1.5">Tomorrow's Priorities:</span>
                      <ul className="space-y-1 text-zinc-300 pl-2">
                        {dailyReport.aiReview.tomorrowPriorities.map((tp, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" />
                            <span>{tp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center rounded-xl bg-zinc-900 border border-zinc-800">
              <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">No report generated for today yet.</p>
              <button
                onClick={handleForceDailyReport}
                className="mt-3 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
              >
                Generate 6 PM Report Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: WEEKLY REPORT */}
      {activeTab === 'weekly_report' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Weekly Strategic Review
              </span>
              <h2 className="text-xl font-bold text-zinc-100 mt-1 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Weekly Sales Performance
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Tracks week-over-week conversion trends, revenue achievements, best/weakest days, and optimal slots.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleForceWeeklyReport}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Weekly Report
              </button>
              <a
                href="/api/insights/export?type=weekly&format=csv"
                download
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 border border-zinc-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </a>
            </div>
          </div>

          {weeklyReport ? (
            <div className="space-y-6">
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-xs text-zinc-400">Best Performing Day</span>
                  <div className="mt-1 text-base font-bold text-emerald-400">
                    {weeklyReport.bestDay ? `${weeklyReport.bestDay.dayName}` : 'N/A'}
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {weeklyReport.bestDay ? `₹${weeklyReport.bestDay.revenue.toLocaleString()} revenue • ${weeklyReport.bestDay.calls} calls` : 'Not enough data yet'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-xs text-zinc-400">Weakest Calling Day</span>
                  <div className="mt-1 text-base font-bold text-rose-400">
                    {weeklyReport.weakestDay ? `${weeklyReport.weakestDay.dayName}` : 'N/A'}
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {weeklyReport.weakestDay ? `${weeklyReport.weakestDay.calls} calls logged` : 'Not enough data yet'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-xs text-zinc-400">Optimal Calling Slot</span>
                  <div className="mt-1 text-base font-bold text-blue-400">
                    {weeklyReport.bestCallingTime || '10:00 - 12:00'}
                  </div>
                  <span className="text-[11px] text-zinc-500">Peak contact window</span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-xs text-zinc-400">Top Lead Source</span>
                  <div className="mt-1 text-base font-bold text-purple-400 truncate">
                    {weeklyReport.bestLeadSource || 'Direct Outreach'}
                  </div>
                  <span className="text-[11px] text-zinc-500">Highest revenue channel</span>
                </div>
              </div>

              {/* Weekly Conversions & AI Directives */}
              <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">
                    Weekly Conversion Rates ({weeklyReport.weekStartDate} to {weeklyReport.weekEndDate})
                  </h3>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Connection Rate</span>
                      <div className="text-xl font-bold text-blue-400 mt-1">{weeklyReport.conversions.connectionRate}%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Interest Rate</span>
                      <div className="text-xl font-bold text-cyan-400 mt-1">{weeklyReport.conversions.interestRate}%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Demo Rate</span>
                      <div className="text-xl font-bold text-purple-400 mt-1">{weeklyReport.conversions.demoRate}%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Close Rate</span>
                      <div className="text-xl font-bold text-emerald-400 mt-1">{weeklyReport.conversions.closeRate}%</div>
                    </div>
                  </div>
                </div>

                {/* Directives */}
                {weeklyReport.aiReview && (
                  <div className="pt-4 border-t border-zinc-800 space-y-4">
                    <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Weekly AI Strategic Directives
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="text-xs font-bold text-zinc-300">Core Strategic Wins</span>
                        <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                          {weeklyReport.aiReview.strategicWins.map((w, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-400">•</span> {w}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="text-xs font-bold text-amber-300">Next Week Priority Focus</span>
                        <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                          {weeklyReport.aiReview.nextWeekDirectives.map((d, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" /> {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-10 text-center rounded-xl bg-zinc-900 border border-zinc-800">
              <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Weekly report not compiled yet.</p>
              <button
                onClick={handleForceWeeklyReport}
                className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
              >
                Compile Weekly Report
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CALLING TIME INTELLIGENCE */}
      {activeTab === 'calling_intel' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-zinc-900 border border-cyan-900/50">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Statistically Grounded Reachability
            </span>
            <h2 className="text-xl font-bold text-zinc-100 mt-1 flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-cyan-400" />
              Best Calling Time Intelligence
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Empirical answer to "What is my best calling time?" based on actual call connect and conversion rates.
            </p>
          </div>

          {/* Best Slot Summary */}
          <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-zinc-200">
                  {callingIntel?.hasEnoughData && callingIntel.bestWindow
                    ? `Optimal Calling Window: ${callingIntel.bestWindow.timeWindow} (${callingIntel.bestWindow.rate}% Connect Rate)`
                    : 'Optimal Window Analysis'}
                </h3>
                <p className="text-xs text-zinc-300 mt-1">{callingIntel?.summary}</p>
                {!callingIntel?.hasEnoughData && (
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded text-[11px] bg-amber-950 text-amber-300 border border-amber-800 font-medium">
                    Rule: Minimum 5 calls per time window required before slot is marked statistically significant.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Time Windows Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {callingIntel?.windows.map((w) => (
              <div
                key={w.timeWindow}
                className={cn(
                  'p-4 rounded-xl border flex flex-col justify-between transition-colors',
                  w.timeWindow === callingIntel.bestWindow?.timeWindow
                    ? 'bg-cyan-950/30 border-cyan-700/80 shadow-sm'
                    : 'bg-zinc-900 border-zinc-800'
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-100">{w.timeWindow}</span>
                    {w.timeWindow === callingIntel.bestWindow?.timeWindow ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                        BEST WINDOW
                      </span>
                    ) : (
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-medium border',
                        w.sampleSizeAdequate
                          ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                      )}>
                        {w.sampleSizeAdequate ? 'Sufficient Data' : `${w.totalCalls}/5 Calls`}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 uppercase">Connect Rate</span>
                      <div className="text-lg font-bold text-blue-400 mt-0.5">{w.connectionRate}%</div>
                      <span className="text-[10px] text-zinc-500">{w.connected}/{w.totalCalls} calls</span>
                    </div>
                    <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 uppercase">Interest Rate</span>
                      <div className="text-lg font-bold text-emerald-400 mt-0.5">{w.conversionRate}%</div>
                      <span className="text-[10px] text-zinc-500">{w.interested} leads</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex justify-between">
                  <span>Demos booked: {w.demos}</span>
                  <span>Hours: {w.startHour}:00 - {w.endHour}:00</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: AI SALES COACH */}
      {activeTab === 'coach' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-gradient-to-r from-violet-950/40 via-zinc-900 to-zinc-900 border border-violet-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                Factual • Actionable • Evidence-Backed
              </span>
              <h2 className="text-xl font-bold text-zinc-100 mt-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                AI Sales Coach
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Analyzes current pipeline, call notes, and conversion funnels to deliver hyper-specific strategic coaching.
              </p>
            </div>

            <button
              onClick={handleFetchCoach}
              disabled={coachLoading}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', coachLoading && 'animate-spin')} />
              {coachLoading ? 'Consulting Coach...' : 'Re-run Evaluation'}
            </button>
          </div>

          {coachData ? (
            <div className="space-y-6">
              {/* Confidence Score Bar */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-zinc-300 font-medium">Evaluation Confidence</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400">{coachData.confidence}%</span>
                  <div className="w-24 h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${coachData.confidence}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* What Worked vs What Didn't */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-3">
                  <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    What Worked
                  </h3>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    {coachData.whatWorked.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-3">
                  <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    What Didn't Work
                  </h3>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    {coachData.whatDidnt.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bottleneck & Top Opportunity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Identified Bottleneck</span>
                  <p className="text-sm text-rose-300 font-semibold">{coachData.bottleneck}</p>
                </div>

                <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Top Priority Deal</span>
                  <p className="text-sm text-emerald-300 font-semibold">{coachData.topOpportunity}</p>
                </div>
              </div>

              {/* Recommendations & Tomorrow Priorities */}
              <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Tactical Coaching Recommendations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs text-zinc-400 font-semibold block">Execution Rules:</span>
                    <ul className="space-y-2 text-xs text-zinc-300">
                      {coachData.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                          <span className="text-amber-400 font-bold">{idx + 1}.</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs text-zinc-400 font-semibold block">Immediate Priorities:</span>
                    <ul className="space-y-2 text-xs text-zinc-300">
                      {coachData.tomorrowPriorities.map((prio: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                          <ArrowRight className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                          <span>{prio}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-xl bg-zinc-900 border border-zinc-800">
              <Sparkles className="w-8 h-8 text-violet-400 mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-zinc-300 font-medium">Ready to analyze sales performance.</p>
              <p className="text-xs text-zinc-500 mt-1">
                The coach will inspect real call logs, objections, and conversions.
              </p>
              <button
                onClick={handleFetchCoach}
                disabled={coachLoading}
                className="mt-4 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white"
              >
                {coachLoading ? 'Consulting Coach...' : 'Run AI Sales Coach Analysis'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
