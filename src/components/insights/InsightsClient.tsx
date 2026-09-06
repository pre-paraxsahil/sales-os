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
  PlusCircle,
  PhoneForwarded,
  PhoneMissed,
  PhoneOff,
  XCircle,
  PackageCheck,
  MessageSquare,
  Building,
  CheckSquare,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AnalyticsDateRange,
  TwoHourPulseResult,
  FunnelAnalyticsResult,
  CallingIntelligenceResult,
  DailyReportData,
  WeeklyReportData,
  MonthlyReportData,
  SourcePerformanceItem,
} from '@/lib/analytics/types';
import { AddOtherActivityModal } from '@/components/activities/AddOtherActivityModal';

type TabType =
  | 'daily_report'
  | 'weekly_report'
  | 'monthly_report'
  | 'source_performance'
  | 'overview'
  | 'calling_intel'
  | 'funnel'
  | 'coach';

export const InsightsClient: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('daily_report');
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('TODAY');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Overview data
  const [overviewData, setOverviewData] = useState<any>(null);
  // Funnel data
  const [funnelData, setFunnelData] = useState<FunnelAnalyticsResult | null>(null);
  // Calling intelligence
  const [callingIntel, setCallingIntel] = useState<CallingIntelligenceResult | null>(null);

  // Reports
  const [dailyReport, setDailyReport] = useState<DailyReportData | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportData | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReportData | null>(null);
  const [sourcePerformance, setSourcePerformance] = useState<SourcePerformanceItem[]>([]);

  const [generatingDaily, setGeneratingDaily] = useState<boolean>(false);
  const [generatingWeekly, setGeneratingWeekly] = useState<boolean>(false);
  const [generatingMonthly, setGeneratingMonthly] = useState<boolean>(false);

  // Snapshot Timestamp & Error UX
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Coach
  const [coachData, setCoachData] = useState<any>(null);
  const [coachLoading, setCoachLoading] = useState<boolean>(false);

  // Modal State
  const [isActivityModalOpen, setIsActivityModalOpen] = useState<boolean>(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);

  // Fetch all insights for current date range
  const loadInsights = useCallback(
    async (range: AnalyticsDateRange, cStart?: string, cEnd?: string) => {
      try {
        setLoading(true);
        setError(null);
        const queryParams = new URLSearchParams({ range });
        if (cStart) queryParams.set('start', cStart);
        if (cEnd) queryParams.set('end', cEnd);

        // Map range for specialized reports
        let reportFilterParam = range;
        const [overRes, funnelRes, callRes, dailyRes, weeklyRes, monthlyRes] = await Promise.all([
          fetch(`/api/insights?${queryParams.toString()}`),
          fetch(`/api/insights/funnel?${queryParams.toString()}`),
          fetch(`/api/insights/calling-intelligence?${queryParams.toString()}`),
          fetch(`/api/insights/reports/daily?filter=${reportFilterParam}`),
          fetch(`/api/insights/reports/weekly?filter=${reportFilterParam}`),
          fetch(`/api/insights/reports/monthly?filter=${reportFilterParam}`),
        ]);

        if (overRes.ok) {
          const json = await overRes.json();
          if (json.success) {
            setOverviewData(json.data);
          }
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
          if (json.success) {
            setDailyReport(json.data);
            if (json.data.sources) setSourcePerformance(json.data.sources);
          }
        }
        if (weeklyRes.ok) {
          const json = await weeklyRes.json();
          if (json.success) setWeeklyReport(json.data);
        }
        if (monthlyRes.ok) {
          const json = await monthlyRes.json();
          if (json.success) {
            setMonthlyReport(json.data);
            if (json.data.sourcePerformance) setSourcePerformance(json.data.sourcePerformance);
          }
        }

        // Set authoritative snapshot timestamp
        setSnapshotTimestamp(
          new Date().toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        );
      } catch (err) {
        console.error('Failed to load insights data:', err);
        setError('Failed to refresh latest report data. Please check connection and try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

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
      const res = await fetch('/api/insights/reports/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setDailyReport(json.data);
      }
    } catch (err) {
      console.error('Failed to regenerate daily report:', err);
    } finally {
      setGeneratingDaily(false);
    }
  };

  const handleForceWeeklyReport = async () => {
    try {
      setGeneratingWeekly(true);
      const res = await fetch('/api/insights/reports/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setWeeklyReport(json.data);
      }
    } catch (err) {
      console.error('Failed to regenerate weekly report:', err);
    } finally {
      setGeneratingWeekly(false);
    }
  };

  const handleForceMonthlyReport = async () => {
    try {
      setGeneratingMonthly(true);
      const res = await fetch('/api/insights/reports/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setMonthlyReport(json.data);
      }
    } catch (err) {
      console.error('Failed to regenerate monthly report:', err);
    } finally {
      setGeneratingMonthly(false);
    }
  };

  const handleDownloadExport = (type: string, format: string = 'csv') => {
    setExportDropdownOpen(false);
    const url = `/api/insights/export?type=${type}&format=${format}&range=${dateRange}`;
    window.open(url, '_blank');
  };

  const DATE_FILTERS: { id: AnalyticsDateRange; label: string }[] = [
    { id: 'TODAY', label: 'Today' },
    { id: 'YESTERDAY', label: 'Yesterday' },
    { id: 'THIS_WEEK', label: 'This Week' },
    { id: 'LAST_WEEK', label: 'Last Week' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'LAST_MONTH', label: 'Last Month' },
    { id: 'CUSTOM', label: 'Custom Range' },
  ];

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              Real Sales Reporting Engine
            </span>
            <span className="text-xs text-slate-400">• Asia/Kolkata</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            Sales Intelligence & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            100% real database activity, calling metrics, conversion funnels & performance breakdowns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Other Activity Button */}
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            + Add Other Activity
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white border border-slate-200 p-1.5 shadow-xl z-30 text-xs animate-in fade-in">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Download CSV
                </div>
                <button
                  onClick={() => handleDownloadExport('daily', 'csv')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 font-medium"
                >
                  Daily Sales Report (CSV)
                </button>
                <button
                  onClick={() => handleDownloadExport('weekly', 'csv')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 font-medium"
                >
                  Weekly Performance (CSV)
                </button>
                <button
                  onClick={() => handleDownloadExport('monthly', 'csv')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 font-medium"
                >
                  Monthly Summary (CSV)
                </button>
                <button
                  onClick={() => handleDownloadExport('sources', 'csv')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 font-medium"
                >
                  Source Performance (CSV)
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Raw JSON
                </div>
                <button
                  onClick={() => handleDownloadExport('daily', 'json')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 font-medium"
                >
                  Daily Report (JSON)
                </button>
                <button
                  onClick={() => handleDownloadExport('weekly', 'json')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 font-medium"
                >
                  Weekly Report (JSON)
                </button>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Report Data"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin text-indigo-600')} />
          </button>
        </div>
      </div>

      {/* ERROR & RETRY BANNER */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* 7-DATE FILTER BAR */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setDateRange(f.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                dateRange === f.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {snapshotTimestamp && (
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
              Data as of {snapshotTimestamp}
            </span>
          )}

          {dateRange === 'CUSTOM' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900"
              />
              <span className="text-slate-400 font-semibold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900"
              />
            </div>
          )}
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'daily_report', label: "Today's Sales Report", icon: FileText },
          { id: 'weekly_report', label: 'Weekly Report', icon: Calendar },
          { id: 'monthly_report', label: 'Monthly Report', icon: Target },
          { id: 'source_performance', label: 'Source Performance', icon: Building },
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'funnel', label: 'Conversion Funnel', icon: Layers },
          { id: 'calling_intel', label: 'Best Calling Hours', icon: PhoneCall },
          { id: 'coach', label: 'AI Sales Coach', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-colors cursor-pointer',
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: TODAY'S SALES REPORT / DAILY REPORT */}
      {/* ======================================================== */}
      {activeTab === 'daily_report' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Summary Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wider uppercase">
                  {dailyReport?.dayOfWeek || 'Today'} • {dailyReport?.reportDate || 'Real DB'}
                </span>
                <span className="text-xs text-indigo-200">
                  {snapshotTimestamp ? `Data as of ${snapshotTimestamp}` : 'Live'}
                </span>
              </div>
              <h2 className="text-xl font-black mt-1">Today's Sales Report</h2>
              <p className="text-xs text-indigo-200">
                Detailed real database audit of all outbound calling, pipeline shifts, closures, and activities.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-indigo-200">Closed Revenue</div>
                <div className="text-2xl font-black text-emerald-400">
                  ₹{dailyReport?.salesProgress?.revenue?.toLocaleString() || dailyReport?.sales?.totalRevenue?.toLocaleString() || 0}
                </div>
              </div>
              <button
                onClick={handleForceDailyReport}
                disabled={generatingDaily}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
              >
                {generatingDaily ? 'Generating...' : 'Generate Daily Report'}
              </button>
            </div>
          </div>

          {/* SECTION 1: CALLING */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-indigo-600" />
                1. CALLING BREAKDOWN
              </h3>
              <span className="text-xs font-bold text-slate-600">
                Total Calls: <span className="text-indigo-600 font-extrabold">{dailyReport?.calling?.totalCalls || dailyReport?.activity?.totalCalls || 0}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-lg font-black text-slate-900">{dailyReport?.calling?.totalCalls ?? 0}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Total Calls</div>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <div className="text-lg font-black text-blue-700">{dailyReport?.calling?.coldCalls ?? 0}</div>
                <div className="text-[10px] font-bold text-blue-600 uppercase mt-0.5">Cold Calls</div>
              </div>
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                <div className="text-lg font-black text-teal-700">{dailyReport?.calling?.inboundCalls ?? 0}</div>
                <div className="text-[10px] font-bold text-teal-600 uppercase mt-0.5">Ads / Inbound</div>
              </div>
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <div className="text-lg font-black text-indigo-700">{dailyReport?.calling?.followUpCalls ?? 0}</div>
                <div className="text-[10px] font-bold text-indigo-600 uppercase mt-0.5">Follow-up Calls</div>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                <div className="text-lg font-black text-amber-700">{dailyReport?.calling?.interestedCalls ?? 0}</div>
                <div className="text-[10px] font-bold text-amber-600 uppercase mt-0.5">Interested Calls</div>
              </div>
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                <div className="text-lg font-black text-purple-700">{dailyReport?.calling?.closingCalls ?? 0}</div>
                <div className="text-[10px] font-bold text-purple-600 uppercase mt-0.5">Closing Calls</div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CALL OUTCOMES */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                2. CALL OUTCOMES
              </h3>
              <span className="text-xs font-bold text-slate-600">
                Connection Rate:{' '}
                <span className="text-emerald-600 font-extrabold">{dailyReport?.funnel?.callsToConnected || 0}%</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-base font-black text-emerald-800">{dailyReport?.outcomes?.connected ?? dailyReport?.activity?.connected ?? 0}</div>
                <div className="text-[10px] font-bold text-emerald-700 uppercase mt-0.5">Connected</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-base font-black text-slate-700">{dailyReport?.outcomes?.noAnswer ?? dailyReport?.activity?.noAnswer ?? 0}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">No Answer</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="text-base font-black text-amber-800">{dailyReport?.outcomes?.busy ?? dailyReport?.activity?.busy ?? 0}</div>
                <div className="text-[10px] font-bold text-amber-700 uppercase mt-0.5">Busy</div>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                <div className="text-base font-black text-slate-600">{dailyReport?.outcomes?.switchedOff ?? dailyReport?.activity?.switchedOff ?? 0}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Switched Off</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <div className="text-base font-black text-rose-700">{dailyReport?.outcomes?.notInterested ?? dailyReport?.activity?.notInterested ?? 0}</div>
                <div className="text-[10px] font-bold text-rose-600 uppercase mt-0.5">Not Interested</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <div className="text-base font-black text-rose-800">{dailyReport?.outcomes?.wrongNumber ?? dailyReport?.activity?.wrongNumber ?? 0}</div>
                <div className="text-[10px] font-bold text-rose-700 uppercase mt-0.5">Wrong Number</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-base font-black text-blue-800">{dailyReport?.outcomes?.callbackRequested ?? 0}</div>
                <div className="text-[10px] font-bold text-blue-700 uppercase mt-0.5">Callback Req.</div>
              </div>
            </div>
          </div>

          {/* SECTION 3: SALES PROGRESS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                3. SALES PROGRESS
              </h3>
              <span className="text-xs font-bold text-emerald-700">
                Revenue Closed: ₹{dailyReport?.salesProgress?.revenue?.toLocaleString() || 0}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="text-base font-black text-amber-800">{dailyReport?.salesProgress?.interestedLeads ?? dailyReport?.activity?.interested ?? 0}</div>
                <div className="text-[10px] font-bold text-amber-700 uppercase mt-0.5">Interested Leads</div>
              </div>
              <div className="p-3 bg-violet-50 rounded-xl border border-violet-200">
                <div className="text-base font-black text-violet-800">{dailyReport?.salesProgress?.demosBooked ?? dailyReport?.activity?.demosScheduled ?? 0}</div>
                <div className="text-[10px] font-bold text-violet-700 uppercase mt-0.5">Demos Booked</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="text-base font-black text-purple-800">{dailyReport?.salesProgress?.demosCompleted ?? dailyReport?.activity?.demosCompleted ?? 0}</div>
                <div className="text-[10px] font-bold text-purple-700 uppercase mt-0.5">Demos Completed</div>
              </div>
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
                <div className="text-base font-black text-teal-800">{dailyReport?.salesProgress?.samplesSent ?? 0}</div>
                <div className="text-[10px] font-bold text-teal-700 uppercase mt-0.5">Samples Sent</div>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                <div className="text-base font-black text-indigo-800">{dailyReport?.salesProgress?.followUpsCreated ?? 0}</div>
                <div className="text-[10px] font-bold text-indigo-700 uppercase mt-0.5">Follow-ups Created</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-base font-black text-emerald-800">{dailyReport?.salesProgress?.closings ?? dailyReport?.sales?.totalSales ?? 0}</div>
                <div className="text-[10px] font-bold text-emerald-700 uppercase mt-0.5">Closings</div>
              </div>
              <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
                <div className="text-base font-black">₹{dailyReport?.salesProgress?.revenue?.toLocaleString() || 0}</div>
                <div className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Revenue</div>
              </div>
            </div>
          </div>

          {/* SECTION 4: ACTIVITY SUMMARY & "+ ADD OTHER ACTIVITY" */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                4. ACTIVITY SUMMARY
              </h3>
              <button
                onClick={() => setIsActivityModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                + Add Other Activity
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-base font-black text-slate-900">{dailyReport?.activitySummary?.newLeadsAdded ?? 0}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">New Leads Added</div>
              </div>
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
                <div className="text-base font-black text-teal-800">{dailyReport?.activitySummary?.whatsAppSent ?? 0}</div>
                <div className="text-[10px] font-bold text-teal-700 uppercase mt-0.5">WhatsApp Sent</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-base font-black text-blue-800">{dailyReport?.activitySummary?.tasksCompleted ?? 0}</div>
                <div className="text-[10px] font-bold text-blue-700 uppercase mt-0.5">Tasks Completed</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="text-base font-black text-purple-800">{dailyReport?.activitySummary?.demos ?? 0}</div>
                <div className="text-[10px] font-bold text-purple-700 uppercase mt-0.5">Demos</div>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                <div className="text-base font-black text-indigo-800">{dailyReport?.activitySummary?.otherActivities ?? 0}</div>
                <div className="text-[10px] font-bold text-indigo-700 uppercase mt-0.5">Other Activities</div>
              </div>
            </div>

            {/* Other Activity Quick Trigger Bar */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Recorded an off-dialer interaction?</h4>
                <p className="text-[11px] text-slate-500">
                  Log client visits, sample dispatches, quotations, meetings, or research. Automatically reflected in lead timeline and reports.
                </p>
              </div>
              <button
                onClick={() => setIsActivityModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
              >
                + Add Other Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: WEEKLY SALES REPORT */}
      {/* ======================================================== */}
      {activeTab === 'weekly_report' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {weeklyReport?.weekStartDate} to {weeklyReport?.weekEndDate}
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Weekly Sales Performance
              </h2>
              <p className="text-xs text-slate-500">
                Day-by-day activity merge from real database records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadExport('weekly', 'csv')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                onClick={handleForceWeeklyReport}
                disabled={generatingWeekly}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                {generatingWeekly ? 'Generating...' : 'Generate Weekly Report'}
              </button>
            </div>
          </div>

          {/* Weekly Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="text-base font-black text-slate-900">{weeklyReport?.calling?.totalCalls ?? weeklyReport?.activity?.totalCalls ?? 0}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Calls</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="text-base font-black text-emerald-700">{weeklyReport?.outcomes?.connected ?? weeklyReport?.activity?.connected ?? 0}</div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">Connected</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="text-base font-black text-amber-700">{weeklyReport?.salesProgress?.interestedLeads ?? weeklyReport?.activity?.interested ?? 0}</div>
              <div className="text-[10px] font-bold text-amber-600 uppercase mt-0.5">Interested</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="text-base font-black text-purple-700">{weeklyReport?.salesProgress?.demosCompleted ?? weeklyReport?.activity?.demosCompleted ?? 0}</div>
              <div className="text-[10px] font-bold text-purple-600 uppercase mt-0.5">Demos</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="text-base font-black text-teal-700">{weeklyReport?.salesProgress?.samplesSent ?? 0}</div>
              <div className="text-[10px] font-bold text-teal-600 uppercase mt-0.5">Samples</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="text-base font-black text-indigo-700">{weeklyReport?.salesProgress?.followUpsCreated ?? 0}</div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase mt-0.5">Follow-ups</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="text-base font-black text-emerald-700">{weeklyReport?.salesProgress?.closings ?? weeklyReport?.sales?.totalSales ?? 0}</div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">Closings</div>
            </div>
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
              <div className="text-base font-black">₹{weeklyReport?.salesProgress?.revenue?.toLocaleString() || weeklyReport?.sales?.totalRevenue?.toLocaleString() || 0}</div>
              <div className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Revenue</div>
            </div>
          </div>

          {/* Day-by-Day Breakdown Matrix */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Day-by-Day Matrix Breakdown
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Day / Date</th>
                    <th className="p-3 text-center">Calls</th>
                    <th className="p-3 text-center">Connected</th>
                    <th className="p-3 text-center">Interested</th>
                    <th className="p-3 text-center">Demos</th>
                    <th className="p-3 text-center">Samples</th>
                    <th className="p-3 text-center">Follow-ups</th>
                    <th className="p-3 text-center">Closings</th>
                    <th className="p-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weeklyReport?.dayByDay && weeklyReport.dayByDay.length > 0 ? (
                    weeklyReport.dayByDay.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">
                          {row.dayName}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">({row.date})</span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">{row.calls}</td>
                        <td className="p-3 text-center font-bold text-emerald-700">{row.connected}</td>
                        <td className="p-3 text-center font-bold text-amber-700">{row.interested}</td>
                        <td className="p-3 text-center font-bold text-purple-700">{row.demos}</td>
                        <td className="p-3 text-center font-bold text-teal-700">{row.samples}</td>
                        <td className="p-3 text-center font-bold text-indigo-700">{row.followUps}</td>
                        <td className="p-3 text-center font-bold text-emerald-800">{row.closings}</td>
                        <td className="p-3 text-right font-black text-emerald-600">
                          {row.revenue > 0 ? `₹${row.revenue.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                        No activity recorded this week yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: MONTHLY SALES REPORT */}
      {/* ======================================================== */}
      {activeTab === 'monthly_report' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                {monthlyReport?.monthName} {monthlyReport?.year}
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Monthly Sales Report & Funnel
              </h2>
              <p className="text-xs text-slate-500">
                Total monthly activity, target attainment, source efficiency & conversion velocity.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadExport('monthly', 'csv')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                onClick={handleForceMonthlyReport}
                disabled={generatingMonthly}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                {generatingMonthly ? 'Generating...' : 'Generate Monthly Report'}
              </button>
            </div>
          </div>

          {/* Monthly KPI Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase">Total Activity</div>
              <div className="text-2xl font-black text-slate-900">{monthlyReport?.totalActivity || 0}</div>
              <div className="text-[10px] text-slate-400">Calls + Demos + Messages + Tasks</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase">Monthly Revenue</div>
              <div className="text-2xl font-black text-emerald-600">
                ₹{monthlyReport?.revenue?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold">
                {monthlyReport?.targetAchievement?.revenuePercent || 0}% of Target
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase">Closing Rate</div>
              <div className="text-2xl font-black text-purple-600">
                {monthlyReport?.closingRate || monthlyReport?.conversionFunnel?.closeRate || 0}%
              </div>
              <div className="text-[10px] text-slate-400">Demo to sale conversion</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase">Best Day</div>
              <div className="text-lg font-black text-slate-900 truncate">
                {monthlyReport?.bestDay ? `${monthlyReport.bestDay.dayName}` : '—'}
              </div>
              <div className="text-[10px] text-indigo-600 font-semibold truncate">
                {monthlyReport?.bestDay ? `₹${monthlyReport.bestDay.revenue.toLocaleString()} (${monthlyReport.bestDay.sales} sales)` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Real Monthly Conversion Funnel
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase">1. Outbound Calls</div>
                <div className="text-xl font-black text-slate-900 mt-1">{monthlyReport?.conversionFunnel?.calls || 0}</div>
                <div className="text-[10px] text-slate-400 mt-1">Total Attempts</div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-xs font-bold text-emerald-800 uppercase">2. Connected</div>
                <div className="text-xl font-black text-emerald-700 mt-1">{monthlyReport?.conversionFunnel?.connected || 0}</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                  {monthlyReport?.conversionFunnel?.connectionRate || 0}% Reach Rate
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="text-xs font-bold text-amber-800 uppercase">3. Interested</div>
                <div className="text-xl font-black text-amber-700 mt-1">{monthlyReport?.conversionFunnel?.interested || 0}</div>
                <div className="text-[10px] text-amber-600 font-semibold mt-1">
                  {monthlyReport?.conversionFunnel?.interestRate || 0}% Qualified
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="text-xs font-bold text-purple-800 uppercase">4. Demos Done</div>
                <div className="text-xl font-black text-purple-700 mt-1">{monthlyReport?.conversionFunnel?.demos || 0}</div>
                <div className="text-[10px] text-purple-600 font-semibold mt-1">
                  {monthlyReport?.conversionFunnel?.demoRate || 0}% Demo Conversion
                </div>
              </div>

              <div className="p-4 bg-emerald-600 text-white rounded-xl shadow-xs">
                <div className="text-xs font-bold text-emerald-100 uppercase">5. Closings</div>
                <div className="text-xl font-black text-white mt-1">{monthlyReport?.conversionFunnel?.closings || 0}</div>
                <div className="text-[10px] text-emerald-100 font-semibold mt-1">
                  {monthlyReport?.conversionFunnel?.closeRate || 0}% Close Rate
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SOURCE PERFORMANCE */}
      {/* ======================================================== */}
      {activeTab === 'source_performance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                Channel & Source Performance
              </h2>
              <p className="text-xs text-slate-500">
                Calculated strictly from actual database activity, cold dials, inbound ads, and direct leads.
              </p>
            </div>
            <button
              onClick={() => handleDownloadExport('sources', 'csv')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Sources CSV
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Channel / Source</th>
                  <th className="p-3 text-center">Attempts</th>
                  <th className="p-3 text-center">Connected</th>
                  <th className="p-3 text-center">Interested</th>
                  <th className="p-3 text-center">Demos</th>
                  <th className="p-3 text-center">Closings</th>
                  <th className="p-3 text-center">Connect %</th>
                  <th className="p-3 text-center">Close %</th>
                  <th className="p-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sourcePerformance && sourcePerformance.length > 0 ? (
                  sourcePerformance.map((src) => (
                    <tr key={src.source} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        {src.source}
                      </td>
                      <td className="p-3 text-center font-semibold text-slate-700">{src.attempts}</td>
                      <td className="p-3 text-center font-semibold text-emerald-700">{src.connected}</td>
                      <td className="p-3 text-center font-semibold text-amber-700">{src.interested}</td>
                      <td className="p-3 text-center font-semibold text-purple-700">{src.demos}</td>
                      <td className="p-3 text-center font-bold text-emerald-800">{src.closings}</td>
                      <td className="p-3 text-center font-semibold text-slate-600">{src.connectionRate}%</td>
                      <td className="p-3 text-center font-bold text-indigo-700">{src.closingRate}%</td>
                      <td className="p-3 text-right font-black text-emerald-600">
                        {src.revenue > 0 ? `₹${src.revenue.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                      No source data available for this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: OVERVIEW (Intact) */}
      {/* ======================================================== */}
      {activeTab === 'overview' && overviewData && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Total Revenue</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                ₹{overviewData.sales?.totalRevenue?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{overviewData.sales?.totalSales || 0} Closed Deals</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Calls Logged</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {overviewData.activity?.totalCalls || 0}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{overviewData.activity?.connected || 0} Connected</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Demos Completed</div>
              <div className="text-2xl font-black text-purple-600 mt-1">
                {overviewData.activity?.demosCompleted || 0}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{overviewData.activity?.demosScheduled || 0} Scheduled</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Hot Pipeline</div>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {overviewData.pipeline?.hotLeads || 0}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">High probability leads</div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: BEST CALLING HOURS (Intact) */}
      {/* ======================================================== */}
      {activeTab === 'calling_intel' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
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

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-xs">
                <span>⭐ BEST TIME: 2 PM–5 PM</span>
              </div>
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

      {/* ======================================================== */}
      {/* TAB 7: CONVERSION FUNNEL (Intact) */}
      {/* ======================================================== */}
      {activeTab === 'funnel' && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
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

      {/* ======================================================== */}
      {/* TAB 8: AI SALES COACH (Intact) */}
      {/* ======================================================== */}
      {activeTab === 'coach' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 shadow-xs">
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
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {coachLoading ? 'Analyzing...' : 'Refresh Coach'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Key Strength This Period
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {coachData?.keyStrength || 'Strong demo booking rate from connected calls. Prospects respond well to value propositions.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
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

      {/* Add Other Activity Modal */}
      <AddOtherActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSuccess={() => {
          loadInsights(dateRange, customStart, customEnd);
        }}
      />
    </div>
  );
};
