'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  Flame,
  AlertTriangle,
  Calendar,
  PhoneCall,
  MessageSquare,
  Sparkles,
  Zap,
  BatteryCharging,
  Smile,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Play,
  User,
  Building,
  ChevronRight,
  ChevronDown,
  Target,
  ShieldCheck,
  Coffee,
  Bell,
  Check,
  LogIn,
  LogOut,
  Timer,
  Settings,
  ShieldAlert,
  PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BeforeCallBriefModal } from '@/components/calls/BeforeCallBriefModal';
import { QuickCallLoggerModal } from '@/components/calls/QuickCallLoggerModal';
import { QuickWhatsAppModal } from '@/components/whatsapp/QuickWhatsAppModal';
import { BeforeDemoBriefModal } from '@/components/demos/BeforeDemoBriefModal';
import { LiveDemoModal } from '@/components/demos/LiveDemoModal';
import { AddOtherActivityModal } from '@/components/activities/AddOtherActivityModal';
import { EnergyLevel, NextBestActionOutput } from '@/lib/schedule/types';

export const TodayCockpit: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [nextAction, setNextAction] = useState<NextBestActionOutput | null>(null);
  const [callsData, setCallsData] = useState<any>(null);
  const [energy, setEnergy] = useState<EnergyLevel>('NORMAL');
  const [overrideLunch, setOverrideLunch] = useState<boolean>(false);
  const [pulse, setPulse] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showAiWhyDetails, setShowAiWhyDetails] = useState<boolean>(false);

  // Modals state
  const [activeLead, setActiveLead] = useState<any>(null);
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [whatsAppTarget, setWhatsAppTarget] = useState<{ leadId: string; category?: string } | null>(null);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const [isDemoBriefOpen, setIsDemoBriefOpen] = useState(false);
  const [isLiveDemoOpen, setIsLiveDemoOpen] = useState(false);

  // Live clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchCockpitData = useCallback(async () => {
    try {
      setLoading(true);
      const [todayRes, callsRes, pulseRes] = await Promise.all([
        fetch('/api/today'),
        fetch('/api/today/calls'),
        fetch('/api/insights/pulse'),
      ]);

      if (todayRes.ok) {
        const json = await todayRes.json();
        if (json.success) setOverview(json.data);
      }
      if (callsRes.ok) {
        const json = await callsRes.json();
        if (json.success) setCallsData(json.data);
      }
      if (pulseRes.ok) {
        const json = await pulseRes.json();
        if (json.success) setPulse(json.data);
      }
    } catch (err) {
      console.error('Error fetching today cockpit:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNextAction = useCallback(async () => {
    try {
      setActionLoading(true);
      const res = await fetch(
        `/api/today/next-action?energy=${energy}&overrideLunch=${overrideLunch}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) setNextAction(json.data);
      }
    } catch (err) {
      console.error('Error calculating next action:', err);
    } finally {
      setActionLoading(false);
    }
  }, [energy, overrideLunch]);

  useEffect(() => {
    fetchCockpitData();
  }, [fetchCockpitData]);

  useEffect(() => {
    fetchNextAction();
  }, [fetchNextAction]);

  // Handle Reminder Actions
  const handleReminderAction = async (reminderId: string, action: 'COMPLETE' | 'SNOOZE' | 'DISMISS') => {
    try {
      const res = await fetch(`/api/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, minutes: 15 }),
      });
      if (res.ok) {
        fetchCockpitData();
      }
    } catch (err) {
      console.error('Failed to update reminder:', err);
    }
  };

  // Resolve FollowUp
  const handleCompleteFollowUp = async (followUpId: string) => {
    try {
      const res = await fetch(`/api/leads/follow-up/${followUpId}/complete`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchCockpitData();
        fetchNextAction();
      }
    } catch (err) {
      console.error('Failed to complete follow up:', err);
    }
  };

  // Handle Attendance Clock In / Clock Out
  const handleClockAction = async (action: 'CLOCK_IN' | 'CLOCK_OUT') => {
    try {
      setAttendanceLoading(true);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await Promise.all([fetchCockpitData(), fetchNextAction()]);
      }
    } catch (err) {
      console.error('Failed to update attendance:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-20 w-full rounded-2xl bg-white border border-slate-200" />
        <div className="h-56 w-full rounded-2xl bg-white border border-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 rounded-2xl bg-white border border-slate-200" />
          <div className="h-44 rounded-2xl bg-white border border-slate-200" />
        </div>
      </div>
    );
  }

  const targetPace = overview?.targetPace;
  const currentBlock = overview?.currentBlock;
  const nextActivity = overview?.nextActivity;
  const reminders = overview?.activeReminders || [];
  const overdueItems = callsData?.overdue || [];
  const hotLeads = callsData?.hotLeads || [];
  const counts = overview?.counts || {};
  const officeStatus = overview?.officeStatus;
  const isClockedIn = officeStatus?.isClockedIn;

  // Target Calculations
  const isTargetConfigured = targetPace?.isConfigured ?? false;
  const targetAmount = Number(targetPace?.targetAmount || 0);
  const achievedAmount = Number(targetPace?.achievedAmount || 0);
  const leftAmount = Math.max(0, targetAmount - achievedAmount);
  const progressPercent = isTargetConfigured && targetAmount > 0
    ? Math.min(100, Math.round((achievedAmount / targetAmount) * 100))
    : 0;

  return (
    <div className="space-y-5">
      {/* 1. TOP HEADER WITH REAL-TIME CLOCK, TARGET STATUS, AND ENERGY SELECTOR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
              Today&apos;s Sales Assistant
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {currentTime.toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-xs font-mono font-bold text-emerald-600">
              {currentTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sales Action Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your personalized guide: who to call, what to pitch, and how to reach monthly targets.
          </p>
        </div>

        {/* Target Status & Energy Level Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Target Progress Card */}
          <div className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  Monthly Target
                </span>
                {isTargetConfigured ? (
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded text-[10px] font-bold',
                      progressPercent >= 75
                        ? 'bg-emerald-100 text-emerald-800'
                        : progressPercent >= 40
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    )}
                  >
                    {progressPercent >= 75 ? '🟢 On Track' : progressPercent >= 40 ? '🟡 Catch Up' : '🔴 Behind'}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                    Target not set
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                {isTargetConfigured ? (
                  <span className="font-mono">
                    <strong className="text-slate-900">₹{achievedAmount.toLocaleString('en-IN')}</strong> / ₹
                    {targetAmount.toLocaleString('en-IN')} ({progressPercent}%) • ₹{leftAmount.toLocaleString('en-IN')} left
                  </span>
                ) : (
                  <span>
                    <strong className="text-slate-900 font-mono">₹{achievedAmount.toLocaleString('en-IN')}</strong> achieved •{' '}
                    <Link href="/settings" className="text-indigo-600 hover:text-indigo-800 font-semibold underline">
                      Set target
                    </Link>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Energy Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setEnergy('HIGH')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold text-[11px]',
                energy === 'HIGH'
                  ? 'bg-white text-amber-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              title="High Energy: Focus on fresh calling, closing & demos"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              High
            </button>
            <button
              onClick={() => setEnergy('NORMAL')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold text-[11px]',
                energy === 'NORMAL'
                  ? 'bg-white text-indigo-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              title="Normal Energy: Balanced follow-ups and calls"
            >
              <Smile className="w-3.5 h-3.5 text-indigo-600" />
              Normal
            </button>
            <button
              onClick={() => setEnergy('LOW')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold text-[11px]',
                energy === 'LOW'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              title="Low Energy: Low friction admin, WhatsApp and notes"
            >
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
              Low
            </button>
          </div>

          {/* Quick Add Other Activity Button */}
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            + Add Activity
          </button>
        </div>
      </div>

      {/* 1.5 LIVE OFFICE STATUS & ATTENDANCE BAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          {/* Status Icon Badge */}
          <div
            className={cn(
              'h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs font-bold text-sm',
              officeStatus?.code === 'WORKING'
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : officeStatus?.code === 'LUNCH'
                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                : officeStatus?.code === 'CLOSED'
                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            )}
          >
            {officeStatus?.code === 'WORKING' ? (
              <Timer className="w-5 h-5 animate-spin" />
            ) : officeStatus?.code === 'LUNCH' ? (
              <Coffee className="w-5 h-5" />
            ) : officeStatus?.code === 'CLOSED' ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide border shadow-2xs',
                  officeStatus?.code === 'WORKING'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : officeStatus?.code === 'LUNCH'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : officeStatus?.code === 'CLOSED'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                )}
              >
                {officeStatus?.badgeLabel || '⚪ Not Clocked In'}
              </span>

              {isClockedIn && officeStatus?.clockInTimeFormatted && (
                <span className="text-[11px] font-mono text-slate-500 font-semibold">
                  (Started {officeStatus.clockInTimeFormatted})
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 font-medium">
              {officeStatus?.subText || 'Calculated from configured sales working profile.'}
            </p>
          </div>
        </div>

        {/* Clock Controls & Settings Link */}
        <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
          {isClockedIn ? (
            <button
              onClick={() => handleClockAction('CLOCK_OUT')}
              disabled={attendanceLoading}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              {attendanceLoading ? 'Clocking Out...' : 'Clock Out'}
            </button>
          ) : (
            <button
              onClick={() => handleClockAction('CLOCK_IN')}
              disabled={attendanceLoading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              {attendanceLoading ? 'Clocking In...' : 'Clock In Now'}
            </button>
          )}

          <Link
            href="/settings"
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
            title="Configure Working Profile & Office Hours"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 2. SMART SALES REMINDERS (EXPANDABLE WITH 5-WAY ACTIONS) */}
      {reminders.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Smart Sales Reminders ({reminders.length})
              </h3>
            </div>
            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              Prioritized by Urgency
            </span>
          </div>

          <div className="space-y-2.5">
            {reminders.slice(0, 4).map((r: any) => {
              const isUrgent = r.level === 'CRITICAL' || new Date(r.remindAt) <= currentTime;
              return (
                <div
                  key={r.id}
                  className={cn(
                    'p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition shadow-2xs',
                    isUrgent
                      ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                      : 'bg-slate-50/80 border-slate-200 text-slate-900'
                  )}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AlertTriangle
                      className={cn(
                        'w-4 h-4 mt-0.5 shrink-0',
                        isUrgent ? 'text-rose-600 animate-pulse' : 'text-amber-600'
                      )}
                    />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{r.title}</span>
                        {r.lead?.business?.name && (
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100">
                            {r.lead.business.name}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">
                          ⏰ {new Date(r.remindAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {r.message && (
                        <p className="text-[11px] text-slate-600 line-clamp-1">{r.message}</p>
                      )}
                    </div>
                  </div>

                  {/* 5-WAY ACTIONS */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0 flex-wrap">
                    {r.leadId && (
                      <>
                        <button
                          onClick={() => {
                            setActiveLead(r.lead || { id: r.leadId, title: r.title });
                            setIsBriefOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-xs"
                          title="Call Lead"
                        >
                          <PhoneCall className="w-3 h-3" /> Call
                        </button>
                        <button
                          onClick={() => setWhatsAppTarget({ leadId: r.leadId, category: 'DAY_1_FOLLOWUP' })}
                          className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[11px] transition flex items-center gap-1"
                          title="Send WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp
                        </button>
                        <Link
                          href={`/leads/${r.leadId}`}
                          className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition"
                        >
                          Open
                        </Link>
                      </>
                    )}
                    <button
                      onClick={() => handleReminderAction(r.id, 'SNOOZE')}
                      className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-medium transition"
                      title="Snooze 15 minutes"
                    >
                      Snooze
                    </button>
                    <button
                      onClick={() => handleReminderAction(r.id, 'COMPLETE')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                      title="Mark as Done"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. NOW & NEXT DUAL HERO SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* WHAT SHOULD I DO NOW? (MASTER ACTION CARD - 7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border-2 border-indigo-200 bg-white p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  What Should I Do Now? / Abhi Kya Karna Hai?
                </span>
              </div>

              <div className="flex items-center gap-2">
                {nextAction?.badge && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-800">
                    {nextAction.badge}
                  </span>
                )}
                <button
                  onClick={fetchNextAction}
                  disabled={actionLoading}
                  className="p-1 text-slate-400 hover:text-slate-700 transition"
                  title="Recalculate Next Action"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', actionLoading && 'animate-spin')} />
                </button>
              </div>
            </div>

            {nextAction ? (
              <div className="space-y-3">
                {/* WHO */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">
                        🔥 {nextAction.title}
                      </span>
                    </div>
                    {nextAction.phone && (
                      <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {nextAction.phone}
                      </span>
                    )}
                  </div>

                  {/* WHY */}
                  <div className="text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider block mb-0.5">
                      Why this lead right now?
                    </span>
                    <p className="text-xs text-slate-700 font-medium">{nextAction.reason}</p>
                  </div>

                  {/* DO THIS NOW & GOAL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Do this now:</span>
                      <span className="font-semibold text-slate-900">{nextAction.objective}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Goal:</span>
                      <span className="font-semibold text-indigo-700">{nextAction.nextStep}</span>
                    </div>
                  </div>
                </div>

                {/* Collapsible detail */}
                <button
                  type="button"
                  onClick={() => setShowAiWhyDetails(!showAiWhyDetails)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                >
                  <span>Why this is recommended</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAiWhyDetails && 'rotate-180')} />
                </button>

                {showAiWhyDetails && (
                  <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 text-[11px] text-indigo-900 space-y-1">
                    <p>
                      <strong>Timing & Relevance:</strong> Calculated using recent customer reactions, target pace,
                      and scheduled follow-up commitments.
                    </p>
                    <p className="text-indigo-700">
                      Estimated time to complete: ~{nextAction.estimatedMinutes} mins.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                Evaluating schedule & pipeline priorities...
              </div>
            )}
          </div>

          {/* Action Execution CTAs */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            {nextAction?.actionType === 'CALL' || nextAction?.actionType === 'CLOSING' ? (
              <>
                <button
                  onClick={() => {
                    setActiveLead({
                      id: nextAction.leadId,
                      title: nextAction.businessName || nextAction.title,
                      contact: { name: nextAction.leadName, phone: nextAction.phone },
                      business: { name: nextAction.businessName },
                    });
                    setIsBriefOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-2 active:scale-95"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Call Now
                </button>

                {nextAction.leadId && (
                  <button
                    onClick={() => {
                      setWhatsAppTarget({ leadId: nextAction.leadId!, category: 'DAY_1_FOLLOWUP' });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Send WhatsApp
                  </button>
                )}
              </>
            ) : nextAction?.actionType === 'DEMO' ? (
              <>
                <button
                  onClick={() => {
                    setActiveDemoId(nextAction.leadId || '');
                    setIsDemoBriefOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" /> Open Demo Plan
                </button>
                <button
                  onClick={() => {
                    setActiveDemoId(nextAction.leadId || '');
                    setIsLiveDemoOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Launch Live Demo
                </button>
              </>
            ) : nextAction?.actionType === 'LUNCH' ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-600" /> Protected lunch time. Step away & rest.
                </span>
                <button
                  onClick={() => setOverrideLunch(true)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline transition"
                >
                  Override & work anyway
                </button>
              </div>
            ) : null}

            {nextAction?.leadId && (
              <Link
                href={`/leads/${nextAction.leadId}`}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition ml-auto flex items-center gap-1"
              >
                Open Lead <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* RIGHT NOW & NEXT ACTIVITY (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* RIGHT NOW Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-600" /> Right Now
              </span>
              <span className="text-[11px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {currentBlock?.timeRangeFormatted || 'Active Sales Window'}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              {currentBlock?.title === 'CALLING'
                ? '📞 FRESH CALLING & DISCOVERY'
                : currentBlock?.title === 'FOLLOW_UP'
                ? '📞 FOLLOW-UP CALLS'
                : currentBlock?.title === 'DEMO'
                ? '🎯 DEMO PREPARATION & PRESENTATION'
                : currentBlock?.title || 'Active Work Block'}
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              {currentBlock?.goal || 'Connect with scheduled prospects and advance qualified deals.'}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span>Time Remaining:</span>
                <strong className="text-emerald-700 font-mono">
                  {currentBlock?.remainingFormatted || '30m'}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (hotLeads.length > 0) {
                    setActiveLead(hotLeads[0]);
                    setIsBriefOpen(true);
                  } else if (nextAction?.leadId) {
                    setActiveLead({ id: nextAction.leadId, title: nextAction.title });
                    setIsBriefOpen(true);
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 text-[11px] border border-indigo-200 transition"
              >
                Start Calls →
              </button>
            </div>
          </div>

          {/* NEXT COMMITMENT CARD */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Next Up
              </span>
              {nextActivity && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  in {nextActivity.countdownText}
                </span>
              )}
            </div>

            {nextActivity ? (
              <div className="space-y-2.5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{nextActivity.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ⏰ {nextActivity.time} • {nextActivity.contactName || 'Prospect'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {nextActivity.type === 'DEMO' ? (
                    <button
                      onClick={() => {
                        setActiveDemoId(nextActivity.id);
                        setIsDemoBriefOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 text-white font-bold text-xs hover:bg-violet-500 transition"
                    >
                      View Demo Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveLead({ id: nextActivity.leadId, title: nextActivity.title });
                        setIsBriefOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition"
                    >
                      Call Lead
                    </button>
                  )}

                  {nextActivity.leadId && (
                    <Link
                      href={`/leads/${nextActivity.leadId}`}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                    >
                      Open Lead
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-2">
                No upcoming commitments scheduled for today.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. CURRENT 2-HOUR SALES PULSE & PREVIOUS BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CURRENT 2-HOUR SALES PULSE (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-indigo-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  CURRENT 2-HOUR SALES PULSE
                </h3>
                <span className="text-[11px] font-mono text-indigo-700 font-bold">
                  {pulse?.currentBlock?.blockTitle || 'Active Sales Window'}
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Pulse
            </span>
          </div>

          {/* Counts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Calls Made</span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">
                {pulse?.currentBlock?.activity?.totalCalls ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
              <span className="text-[10px] font-bold text-indigo-700 uppercase block">Answered</span>
              <span className="text-xl font-black text-indigo-900 mt-0.5 block">
                {pulse?.currentBlock?.activity?.connected ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Interested</span>
              <span className="text-xl font-black text-emerald-900 mt-0.5 block">
                {pulse?.currentBlock?.activity?.interested ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-violet-50/60 border border-violet-100">
              <span className="text-[10px] font-bold text-violet-700 uppercase block">Demos</span>
              <span className="text-xl font-black text-violet-900 mt-0.5 block">
                {pulse?.currentBlock?.activity?.demosScheduled ?? 0}
              </span>
            </div>
          </div>

          {/* Rates */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 pt-1">
            <span>
              Connection Rate:{' '}
              <strong className="text-indigo-700 font-mono">
                {pulse?.currentBlock?.connectionRate ?? 0}%
              </strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Interest Rate:{' '}
              <strong className="text-emerald-700 font-mono">
                {pulse?.currentBlock?.interestRate ?? 0}%
              </strong>
            </span>
          </div>

          {/* WHAT SHOULD I DO NOW / WHY / NEXT ACTION */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div>
              <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider block text-indigo-800">
                WHAT SHOULD I DO NOW?
              </span>
              <p className="text-slate-800 font-medium mt-0.5">
                {pulse?.nextBlockFocus || 'Call your HOT and WARM leads first.'}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/80">
              <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                WHY:
              </span>
              <p className="text-slate-600 mt-0.5">
                These leads already have buying signals and are closest to the next step.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/80">
              <span className="font-bold text-indigo-700 uppercase text-[10px] tracking-wider block">
                NEXT ACTION:
              </span>
              <p className="text-slate-700 font-semibold mt-0.5">
                Call {hotLeads.length > 0 ? `${hotLeads.length} HOT lead(s)` : 'HOT leads'} → follow up with interested leads → prepare today&apos;s demos.
              </p>
            </div>
          </div>
        </div>

        {/* PREVIOUS BLOCK & WHAT'S GOING WELL (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* PREVIOUS BLOCK CARD */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  PREVIOUS BLOCK
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-semibold">
                {pulse?.previousBlock?.blockTitle || 'Earlier Today'}
              </span>
            </div>

            {pulse?.previousBlock && pulse.previousBlock.activity.totalCalls > 0 ? (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Calls</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {pulse.previousBlock.activity.totalCalls}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-indigo-50/50 border border-indigo-100">
                    <span className="text-[9px] text-indigo-700 block uppercase font-bold">Connected</span>
                    <span className="font-bold text-indigo-900 font-mono text-sm">
                      {pulse.previousBlock.activity.connected}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <span className="text-[9px] text-emerald-700 block uppercase font-bold">Interest</span>
                    <span className="font-bold text-emerald-900 font-mono text-sm">
                      {pulse.previousBlock.activity.interested}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-violet-50/50 border border-violet-100">
                    <span className="text-[9px] text-violet-700 block uppercase font-bold">Demos</span>
                    <span className="font-bold text-violet-900 font-mono text-sm">
                      {pulse.previousBlock.activity.demosScheduled}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                  <span>Connected: {pulse.previousBlock.activity.connected}</span>
                  <span>No Answer: {pulse.previousBlock.activity.noAnswer}</span>
                  <span>Not Interested: {pulse.previousBlock.activity.notInterested}</span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-500">
                No previous sales block completed yet today.
              </div>
            )}
          </div>

          {/* WHAT'S GOING WELL / DROP-OFFS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5 text-xs">
            {pulse?.whatsGoingWell && pulse.whatsGoingWell.length > 0 ? (
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-1">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                  ✓ What&apos;s Going Well
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {pulse.whatsGoingWell.map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  ✓ What&apos;s Going Well
                </span>
                Not enough activity yet to identify a strong positive signal.
              </div>
            )}

            {pulse?.whatsWeak && pulse.whatsWeak.length > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 space-y-1">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">
                  ⚠ Drop-offs & Weak Areas
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {pulse.whatsWeak.map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. TODAY'S SALES METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Today&apos;s Calls</span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">{counts.todayCalls || 0}</span>
          <span className="text-[10px] text-slate-500">Calls logged</span>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Connected</span>
          <span className="text-xl font-black text-indigo-900 mt-0.5 block">{counts.connectedCalls || 0}</span>
          <span className="text-[10px] text-indigo-600">Spoke with client</span>
        </div>

        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">Demos</span>
          <span className="text-xl font-black text-violet-900 mt-0.5 block">{counts.todayDemos || 0}</span>
          <span className="text-[10px] text-violet-600">Scheduled/Done</span>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Follow-ups</span>
          <span className="text-xl font-black text-amber-900 mt-0.5 block">{counts.pendingFollowUps || 0}</span>
          <span className="text-[10px] text-amber-600">Pending today</span>
        </div>

        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Overdue</span>
          <span className="text-xl font-black text-rose-900 mt-0.5 block">{counts.overdueFollowUps || 0}</span>
          <span className="text-[10px] text-rose-600">Action needed</span>
        </div>

        <Link
          href="/schedule"
          className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-3.5 transition group flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Schedule</span>
            <Calendar className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-xs font-bold text-indigo-700 group-hover:underline mt-1">
            Today&apos;s Plan →
          </span>
          <span className="text-[10px] text-slate-500">Timeline view</span>
        </Link>
      </div>

      {/* 5. DUAL COCKPIT LISTS: OVERDUE ACTIONS & PRIORITY LEADS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* OVERDUE ACTIONS SECTION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Follow-ups Due ({overdueItems.length})
              </h3>
            </div>
            <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">Action Required</span>
          </div>

          {overdueItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1 opacity-80" />
              All follow-ups completed on time!
            </div>
          ) : (
            <div className="space-y-2">
              {overdueItems.slice(0, 4).map((fu: any) => (
                <div
                  key={fu.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">
                      {fu.lead?.business?.name || fu.lead?.title || 'Lead'}
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-0.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{fu.lead?.contact?.name || 'Contact'}</span>
                      <span className="text-rose-600 font-medium">
                        (Due {new Date(fu.scheduledAt).toLocaleDateString()})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setActiveLead(fu.lead);
                        setIsBriefOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition flex items-center gap-1"
                    >
                      <PhoneCall className="w-3 h-3" /> Call
                    </button>
                    <button
                      onClick={() => handleCompleteFollowUp(fu.id)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 transition"
                      title="Mark Follow-up Complete"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TOP PRIORITY HOT LEADS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Hot Leads to Close ({hotLeads.length})
              </h3>
            </div>
            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded">Highest Priority</span>
          </div>

          {hotLeads.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No hot leads currently pending. Run calls to qualify new leads!
            </div>
          ) : (
            <div className="space-y-2">
              {hotLeads.slice(0, 4).map((hl: any) => (
                <div
                  key={hl.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                      <span>{hl.business?.name || hl.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        🔥 HOT
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                      <span>{hl.contact?.name || 'Contact'}</span>
                      {hl.contact?.phone && <span className="font-mono text-indigo-700">{hl.contact.phone}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setActiveLead(hl);
                        setIsBriefOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition flex items-center gap-1"
                    >
                      <PhoneCall className="w-3 h-3" /> Dial
                    </button>
                    <button
                      onClick={() => setWhatsAppTarget({ leadId: hl.id, category: 'DAY_1_FOLLOWUP' })}
                      className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition"
                      title="Quick WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/leads/${hl.id}`}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition"
                      title="Open Profile"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Before Call Brief Modal */}
      {activeLead && isBriefOpen && (
        <BeforeCallBriefModal
          lead={activeLead}
          isOpen={isBriefOpen}
          onClose={() => setIsBriefOpen(false)}
          onStartCallLogging={() => {
            setIsBriefOpen(false);
            setIsLoggerOpen(true);
          }}
        />
      )}

      {/* 2. Quick Call Logger Modal */}
      {activeLead && isLoggerOpen && (
        <QuickCallLoggerModal
          leadId={activeLead.id}
          leadTitle={activeLead.title || activeLead.business?.name || 'Lead'}
          contactName={activeLead.contact?.name}
          contactPhone={activeLead.contact?.phone}
          isOpen={isLoggerOpen}
          onClose={() => {
            setIsLoggerOpen(false);
            fetchCockpitData();
            fetchNextAction();
          }}
          onSuccess={() => {
            setIsLoggerOpen(false);
            fetchCockpitData();
            fetchNextAction();
          }}
          onOpenWhatsApp={(category) => {
            setIsLoggerOpen(false);
            setWhatsAppTarget({ leadId: activeLead.id, category });
          }}
        />
      )}

      {/* 3. Quick WhatsApp Modal */}
      {whatsAppTarget && (
        <QuickWhatsAppModal
          leadId={whatsAppTarget.leadId}
          isOpen={!!whatsAppTarget}
          onClose={() => {
            setWhatsAppTarget(null);
            fetchCockpitData();
          }}
          initialCategory={whatsAppTarget.category}
        />
      )}

      {/* 4. Demo Brief Modal */}
      {activeDemoId && isDemoBriefOpen && (
        <BeforeDemoBriefModal
          demoId={activeDemoId}
          leadId={nextAction?.leadId || ''}
          isOpen={isDemoBriefOpen}
          onClose={() => setIsDemoBriefOpen(false)}
          onLaunchLiveDemo={() => {
            setIsDemoBriefOpen(false);
            setIsLiveDemoOpen(true);
          }}
        />
      )}

      {/* 5. Live Demo Modal */}
      {activeDemoId && isLiveDemoOpen && (
        <LiveDemoModal
          demoId={activeDemoId}
          leadId={nextAction?.leadId || ''}
          isOpen={isLiveDemoOpen}
          onClose={() => setIsLiveDemoOpen(false)}
          onFinishDemo={() => setIsLiveDemoOpen(false)}
        />
      )}

      {/* 6. Add Other Activity Modal */}
      <AddOtherActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSuccess={() => {
          fetchCockpitData();
        }}
      />
    </div>
  );
};
