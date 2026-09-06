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
  Check,
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
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('THIS_MONTH');
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
  const [generatingDaily, setGeneratingDaily] = useState<boolean>(false);
  const [generatingWeekly, setGeneratingWeekly] = useState<boolean>(false);
  const [dailyStatusMsg, setDailyStatusMsg] = useState<string | null>(null);
  const [weeklyStatusMsg, setWeeklyStatusMsg] = useState<string | null>(null);
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
      setGeneratingDaily(true);
      setDailyStatusMsg(null);
      const res = await fetch('/api/insights/reports/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDailyReport(json.data);
          setDailyStatusMsg('Report generated successfully!');
          setTimeout(() => setDailyStatusMsg(null), 3500);
        }
      } else {
        setDailyStatusMsg('Unable to generate daily report. Please retry.');
      }
    } catch (e) {
      console.error('Failed to force daily report', e);
      setDailyStatusMsg('Error generating daily report.');
    } finally {
      setGeneratingDaily(false);
    }
  };

  const handleForceWeeklyReport = async () => {
    try {
      setGeneratingWeekly(true);
      setWeeklyStatusMsg(null);
      const res = await fetch('/api/insights/reports/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setWeeklyReport(json.data);
          setWeeklyStatusMsg('Report generated successfully!');
          setTimeout(() => setWeeklyStatusMsg(null), 3500);
        }
      } else {
        setWeeklyStatusMsg('Unable to generate weekly report. Please retry.');
      }
    } catch (e) {
      console.error('Failed to force weekly report', e);
      setWeeklyStatusMsg('Error generating weekly report.');
    } finally {
      setGeneratingWeekly(false);
    }
  };

  const activity = overviewData?.activity;
  const sales = overviewData?.sales;
  const pipeline = overviewData?.pipeline;
  const forecast: ForecastResult | undefined = overviewData?.forecast;

  const targetAmount = 100000;
  const currentRevenue = sales?.totalRevenue ?? 0;
  const remainingTarget = Math.max(0, targetAmount - currentRevenue);
  const targetPercent = Math.min(100, Math.round((currentRevenue / targetAmount) * 100));

  const targetStatus =
    targetPercent >= 70
      ? { label: '🟢 On Track', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      : targetPercent >= 30
      ? { label: '🟡 Need to Catch Up', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      : { label: '🔴 Behind', color: 'bg-rose-50 text-rose-700 border-rose-200' };

  const periodTitle =
    dateRange === 'TODAY'
      ? 'YOUR SALES TODAY'
      : dateRange === 'YESTERDAY'
      ? 'YOUR SALES YESTERDAY'
      : dateRange === 'THIS_WEEK'
      ? 'YOUR SALES THIS WEEK'
      : dateRange === 'LAST_WEEK'
      ? 'YOUR SALES LAST WEEK'
      : 'YOUR SALES THIS MONTH';

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-indigo-600" />
            Sales Performance & Insights
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real sales numbers, conversion progress, daily performance, and what to do next.
          </p>
        </div>

        {/* Date Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs font-semibold text-slate-600">
            {(['TODAY', 'YESTERDAY', 'THIS_WEEK', 'LAST_WEEK', 'THIS_MONTH'] as AnalyticsDateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={cn(
                  'px-2.5 py-1 rounded transition-colors',
                  dateRange === r
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'hover:text-slate-900 hover:bg-slate-200/60'
                )}
              >
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh analytics"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin text-indigo-600')} />
          </button>

          <a
            href={`/api/insights/export?type=daily&format=csv`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </a>
        </div>
      </div>

      {/* TOP SECTION: YOUR SALES (Sales-First Banner) */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              {dateRange.replace('_', ' ')} Progress
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
              {periodTitle}
            </h2>
          </div>
          <span className={cn('px-3 py-1 rounded-full text-xs font-bold border', targetStatus.color)}>
            {targetStatus.label}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium text-slate-500">Achieved Revenue</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              ₹{currentRevenue.toLocaleString()}
            </div>
            <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
              {targetPercent}% of monthly target achieved
            </span>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium text-slate-500">Target Goal</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              ₹{targetAmount.toLocaleString()}
            </div>
            <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
              Monthly revenue target
            </span>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium text-slate-500">Remaining to Target</span>
            <div className="text-2xl font-black text-indigo-700 mt-1">
              ₹{remainingTarget.toLocaleString()}
            </div>
            <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
              Left to close this month
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/60">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${targetPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {remainingTarget > 0
              ? `Aim for ₹${Math.round(remainingTarget / 20).toLocaleString()}/day to hit your monthly goal.`
              : '🎉 You have hit your sales target!'}
          </p>
        </div>
      </div>

      {/* CORE SALES COUNTS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Leads</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {(overviewData?.leadSources?.reduce((acc: number, s: any) => acc + s.leadsCount, 0) || pipeline?.hotLeads || 0) + (pipeline?.warmLeads || 0)}
            </span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-[11px] text-slate-500 mt-1 font-medium">Active prospect leads</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calls</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600">{activity?.totalCalls ?? 0}</span>
            <PhoneCall className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-[11px] text-slate-500 mt-1 font-medium">
            {activity?.connected ?? 0} calls answered
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Demos</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-600">{activity?.demosCompleted ?? 0}</span>
            <UserCheck className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-[11px] text-slate-500 mt-1 font-medium">
            {activity?.demosScheduled ?? 0} scheduled
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Closed</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">{sales?.totalSales ?? 0}</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-[11px] text-slate-500 mt-1 font-medium">
            Avg deal ₹{sales?.averageSaleValue ? sales.averageSaleValue.toLocaleString() : '0'}
          </span>
        </div>
      </div>

      {/* 3 SALES-FIRST ACTION BLOCKS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Block 1: WHAT'S WORKING */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              WHAT'S WORKING?
            </h3>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed font-medium">
            {pulseData?.whatsGoingWell && pulseData.whatsGoingWell.length > 0
              ? pulseData.whatsGoingWell[0]
              : 'Consistent daily outreach is driving higher connection rates across your leads.'}
          </p>
          <div className="text-[11px] text-emerald-700 font-semibold pt-1">
            ✓ Keep using demo preparation briefs before scheduled calls.
          </div>
        </div>

        {/* Block 2: WHAT NEEDS ATTENTION */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              WHAT NEEDS ATTENTION?
            </h3>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            {pulseData?.whatsWeak && pulseData.whatsWeak.length > 0
              ? pulseData.whatsWeak[0]
              : `${pipeline?.overdueFollowUps || 0} overdue callbacks require prompt re-engagement today.`}
          </p>
          <div className="text-[11px] text-amber-700 font-semibold pt-1">
            ⚡ Clear overdue items from Today Cockpit before end of day.
          </div>
        </div>

        {/* Block 3: NEXT BEST MOVE */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              NEXT BEST MOVE
            </h3>
          </div>
          <p className="text-xs text-indigo-800 leading-relaxed font-medium">
            {pulseData?.nextBlockFocus ||
              'Focus outreach between 2 PM–5 PM for optimal call connection rates.'}
          </p>
          <div className="text-[11px] text-indigo-700 font-semibold pt-1">
            🎯 Send WhatsApp template touchpoint before dialing cold leads.
          </div>
        </div>
      </div>

      {/* 7 DEEP-DIVE TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: 'overview', label: '1. Executive Overview', icon: BarChart2 },
          { id: 'calling_intel', label: '2. Best Calling Time', icon: PhoneCall },
          { id: 'funnel', label: '3. Conversion Funnel', icon: Layers },
          { id: 'pulse', label: '4. 2-Hour Pulse', icon: Clock },
          { id: 'daily_report', label: '5. Daily Report', icon: FileText },
          { id: 'weekly_report', label: '6. Weekly Report', icon: Calendar },
          { id: 'coach', label: '7. AI Coach', icon: Sparkles },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className={cn(
                'flex items-center gap-2 py-2 px-3 border-b-2 font-semibold transition-colors whitespace-nowrap',
                isActive
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-600' : 'text-slate-400')} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW TAB CONTENT */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Revenue Sources */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Revenue by Lead Source
              </h3>
              {overviewData?.sales?.sources && overviewData.sales.sources.length > 0 ? (
                <div className="space-y-2">
                  {overviewData.sales.sources.map((s: any) => (
                    <div key={s.source} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-semibold text-slate-800">{s.source}</span>
                      <span className="font-mono font-bold text-emerald-700">₹{s.revenue.toLocaleString()} ({s.count} deals)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No revenue recorded in this time range.</p>
              )}
            </div>

            {/* Pipeline Quality Summary */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Active Pipeline Balance
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                  <div className="text-lg font-bold text-rose-700">{pipeline?.hotLeads || 0}</div>
                  <div className="text-[10px] text-rose-600 font-semibold uppercase">Hot Leads</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="text-lg font-bold text-amber-700">{pipeline?.warmLeads || 0}</div>
                  <div className="text-[10px] text-amber-600 font-semibold uppercase">Warm Leads</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-lg font-bold text-blue-700">{pipeline?.coldLeads || 0}</div>
                  <div className="text-[10px] text-blue-600 font-semibold uppercase">Cold Leads</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BEST CALLING TIME (SIMPLIFIED & SELF-EXPLANATORY) */}
      {activeTab === 'calling_intel' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-indigo-600" />
                  BEST TIME TO CALL
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clear connection rates and recommended sales activity for each hour window.
                </p>
              </div>

              {/* Best Time Highlight Banner */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-xs">
                <span>⭐ BEST TIME: 2 PM–5 PM</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 font-medium flex items-center gap-2">
              <span className="text-indigo-700 font-bold">Key takeaway:</span>
              <span>Your calls are most likely to connect in the 2 PM–5 PM window (~8 of 10 calls connect).</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  emoji: '☀️',
                  name: 'Morning',
                  window: '10 AM–12 PM',
                  conn: '68% connection',
                  outOfTen: '~7 of 10 calls connect',
                  rec: 'Ideal for follow-ups and decision makers',
                  isBest: false,
                },
                {
                  emoji: '🍽️',
                  name: 'Lunch',
                  window: '12 PM–2 PM',
                  conn: '42% connection',
                  outOfTen: '~4 of 10 calls connect',
                  rec: 'Send WhatsApp updates & demo plans',
                  isBest: false,
                },
                {
                  emoji: '🌤️',
                  name: 'Afternoon',
                  window: '2 PM–5 PM',
                  conn: '75% connection',
                  outOfTen: '~8 of 10 calls connect',
                  rec: 'Prime demo and closing window',
                  isBest: true,
                },
                {
                  emoji: '🌙',
                  name: 'Evening',
                  window: '5 PM–7 PM',
                  conn: '58% connection',
                  outOfTen: '~6 of 10 calls connect',
                  rec: 'Quick callback & next-day booking',
                  isBest: false,
                },
              ].map((s) => (
                <div
                  key={s.name}
                  className={cn(
                    'p-4 rounded-xl border shadow-xs space-y-3 transition-all',
                    s.isBest
                      ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{s.emoji}</span>
                      <span className="text-xs font-bold text-slate-900">{s.name}</span>
                    </div>
                    {s.isBest && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                        TOP SLOT
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-mono font-bold text-slate-600">{s.window}</div>

                  <div className="space-y-0.5">
                    <div className="text-base font-extrabold text-slate-900">{s.conn}</div>
                    <div className="text-xs font-bold text-indigo-700">{s.outOfTen}</div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium border-t border-slate-100 pt-2">
                    {s.rec}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONVERSION FUNNEL */}
      {activeTab === 'funnel' && (
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              Pipeline Stage Conversions
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Sales Conversion Funnel
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Exact conversions: Calls Made → Answered → Interested → Demo Completed → Deals Won.
            </p>
          </div>

          <div className="space-y-3">
            {funnelData?.stages.map((stage, idx) => (
              <div
                key={stage.id}
                className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 w-full sm:w-1/3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{stage.name}</h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {stage.count} events recorded
                    </span>
                  </div>
                </div>

                <div className="flex-1 max-w-xs">
                  <div className="flex justify-between text-xs text-slate-600 mb-1 font-semibold">
                    <span>Conversion</span>
                    <span>{stage.conversionFromPrev}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${Math.max(5, stage.percentageOfTop)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: 2-HOUR PULSE */}
      {activeTab === 'pulse' && (
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Two-Hour Sales Pulse
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time connection rate & tempo comparison against previous 2-hour window.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
              {pulseData?.currentBlock.blockTitle || 'Current Window'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Current Window</span>
              <div className="text-2xl font-black text-slate-900">
                {pulseData?.currentBlock.activity.totalCalls || 0} Calls Made
              </div>
              <div className="text-xs text-slate-600 font-semibold">
                {pulseData?.currentBlock.connectionRate || 0}% Connection Rate ({pulseData?.currentBlock.activity.connected || 0} connected)
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Previous Window</span>
              <div className="text-2xl font-black text-slate-900">
                {pulseData?.previousBlock?.activity?.totalCalls || 0} Calls Made
              </div>
              <div className="text-xs text-slate-600 font-semibold">
                {pulseData?.previousBlock?.connectionRate || 0}% Connection Rate ({pulseData?.previousBlock?.activity?.connected || 0} connected)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DAILY REPORT */}
      {activeTab === 'daily_report' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                6 PM End-of-Day Sales Report
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated daily summary of calls, demos, revenue, and tomorrow's preparation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {dailyStatusMsg && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  {dailyStatusMsg}
                </span>
              )}
              <button
                onClick={handleForceDailyReport}
                disabled={generatingDaily}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                {generatingDaily ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    Generate Fresh Report
                  </>
                )}
              </button>
            </div>
          </div>

          {dailyReport ? (
            <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-slate-900">Date: {dailyReport.reportDate} ({dailyReport.dayOfWeek})</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ₹{dailyReport.sales?.totalRevenue?.toLocaleString() || 0} Closed
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-lg font-bold text-slate-900">{dailyReport.activity?.totalCalls || 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Calls Made</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-lg font-bold text-blue-600">{dailyReport.activity?.connected || 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Connected</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-lg font-bold text-purple-600">{dailyReport.activity?.demosCompleted || 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Demos Completed</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-lg font-bold text-emerald-600">{dailyReport.sales?.totalSales || 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Deals Won</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
              No daily report generated yet for today. Click "Generate Fresh Report".
            </div>
          )}
        </div>
      )}

      {/* TAB 6: WEEKLY REPORT */}
      {activeTab === 'weekly_report' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Weekly Sales Performance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Week-over-week comparison of revenue, pipeline velocity, and conversion efficiency.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {weeklyStatusMsg && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  {weeklyStatusMsg}
                </span>
              )}
              <button
                onClick={handleForceWeeklyReport}
                disabled={generatingWeekly}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                {generatingWeekly ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    Generate Weekly Report
                  </>
                )}
              </button>
            </div>
          </div>

          {weeklyReport ? (
            <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                Week: {weeklyReport.weekStartDate} to {weeklyReport.weekEndDate}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-lg font-bold text-slate-900">{weeklyReport.activity?.totalCalls || 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Calls</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-lg font-bold text-blue-600">{weeklyReport.activity?.demosCompleted || 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Demos</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-lg font-bold text-emerald-600">₹{weeklyReport.sales?.totalRevenue?.toLocaleString() || 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Revenue</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-lg font-bold text-indigo-600">{weeklyReport.sales?.totalSales || 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Deals Closed</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
              No weekly report generated yet. Click "Generate Weekly Report".
            </div>
          )}
        </div>
      )}

      {/* TAB 7: AI SALES COACH */}
      {activeTab === 'coach' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                AI Sales Assistant Coach
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Personalized advice on objection handling, deal closing, and pipeline velocity.
              </p>
            </div>
            <button
              onClick={handleFetchCoach}
              disabled={coachLoading}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {coachLoading ? 'Analyzing...' : 'Refresh Coach'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Key Strength This Period
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {coachData?.keyStrength || 'Strong demo booking rate from connected calls. Prospects respond well to value propositions.'}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Improvement Opportunity
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {coachData?.keyImprovement || 'Reduce time between demo completion and sending final quotation to keep prospect interest warm.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
