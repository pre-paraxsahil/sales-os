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
  TrendingUp,
  Target,
  ShieldCheck,
  Coffee,
  X,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BeforeCallBriefModal } from '@/components/calls/BeforeCallBriefModal';
import { QuickCallLoggerModal } from '@/components/calls/QuickCallLoggerModal';
import { QuickWhatsAppModal } from '@/components/whatsapp/QuickWhatsAppModal';
import { BeforeDemoBriefModal } from '@/components/demos/BeforeDemoBriefModal';
import { LiveDemoModal } from '@/components/demos/LiveDemoModal';
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
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Modals state
  const [activeLead, setActiveLead] = useState<any>(null);
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
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

  if (loading && !overview) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 w-full rounded-2xl skeleton-shimmer border border-slate-800" />
        <div className="h-56 w-full rounded-2xl skeleton-shimmer border border-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 rounded-2xl skeleton-shimmer border border-slate-800" />
          <div className="h-48 rounded-2xl skeleton-shimmer border border-slate-800" />
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

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER WITH REAL-TIME CLOCK, TARGET STATUS, AND ENERGY SELECTOR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/70 p-5 sm:p-6 rounded-2xl border border-slate-800/80 backdrop-blur-sm shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
              Sales Command Center
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {currentTime.toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span className="text-xs font-mono font-semibold text-emerald-400">
              {currentTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            James&apos;s Daily Sales Cockpit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic time scheduling, smart priority ranking, and real-time next-best-action intelligence.
          </p>
        </div>

        {/* Target Status & Energy Level Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Target Pace Badge */}
          {targetPace && (
            <div
              className={cn(
                'px-3.5 py-2 rounded-xl border text-xs flex items-center gap-2.5 transition',
                targetPace.mode === 'RECOVERY'
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                  : targetPace.mode === 'AHEAD'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
              )}
            >
              <Target className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-bold uppercase tracking-wider text-[10px]">
                  {targetPace.statusLabel}
                </div>
                <div className="text-[11px] opacity-90 font-mono">
                  ₹{Number(targetPace.achievedAmount).toLocaleString('en-IN')} / ₹
                  {Number(targetPace.targetAmount).toLocaleString('en-IN')} ({targetPace.progressPercent}%)
                </div>
              </div>
            </div>
          )}

          {/* Energy Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setEnergy('HIGH')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold text-[11px]',
                energy === 'HIGH'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              title="High Energy: Focus on fresh calling, closing & demos"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              High
            </button>
            <button
              onClick={() => setEnergy('NORMAL')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold text-[11px]',
                energy === 'NORMAL'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              title="Normal Energy: Balanced follow-ups and calls"
            >
              <Smile className="w-3.5 h-3.5 text-indigo-400" />
              Normal
            </button>
            <button
              onClick={() => setEnergy('LOW')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold text-[11px]',
                energy === 'LOW'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              title="Low Energy: Low friction admin, WhatsApp and notes"
            >
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              Low
            </button>
          </div>
        </div>
      </div>

      {/* 2. SMART REMINDERS ALERT BANNER (IF ACTIVE) */}
      {reminders.length > 0 && (
        <div className="space-y-2">
          {reminders.slice(0, 2).map((r: any) => (
            <div
              key={r.id}
              className={cn(
                'p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md transition',
                r.level === 'CRITICAL'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  : r.level === 'IMPORTANT'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'
              )}
            >
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertTriangle
                  className={cn(
                    'w-4 h-4 mt-0.5 sm:mt-0 shrink-0',
                    r.level === 'CRITICAL' ? 'text-rose-400 animate-bounce' : 'text-amber-400'
                  )}
                />
                <div>
                  <span className="font-bold">{r.title}:</span>{' '}
                  <span className="opacity-90">{r.message}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => handleReminderAction(r.id, 'SNOOZE')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[11px] font-medium transition"
                >
                  Snooze 15m
                </button>
                <button
                  onClick={() => handleReminderAction(r.id, 'COMPLETE')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/40 text-[11px] font-semibold transition flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" /> Done
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. NOW & NEXT DUAL HERO SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* WHAT SHOULD I DO NOW? (MASTER ACTION CARD - 7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-slate-900/60 to-slate-950 p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> What Should I Do Now?
                </span>
              </div>

              <div className="flex items-center gap-2">
                {nextAction?.badge && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                    {nextAction.badge}
                  </span>
                )}
                <button
                  onClick={fetchNextAction}
                  disabled={actionLoading}
                  className="p-1 text-slate-400 hover:text-slate-200 transition"
                  title="Recalculate Next Action"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', actionLoading && 'animate-spin')} />
                </button>
              </div>
            </div>

            {nextAction ? (
              <div className="space-y-3.5">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                    {nextAction.title}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                    <span className="text-indigo-300 font-semibold">Why:</span> {nextAction.reason}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 font-medium">Objective:</span>
                    <span className="text-slate-200 font-semibold text-right">{nextAction.objective}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900">
                    <span className="text-slate-400 font-medium">Estimated Time:</span>
                    <span className="text-indigo-400 font-mono font-bold">
                      ~{nextAction.estimatedMinutes} minutes
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900">
                    <span className="text-slate-400 font-medium">Recommended Next:</span>
                    <span className="text-slate-300 text-right">{nextAction.nextStep}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Evaluating schedule & pipeline priorities...
              </div>
            )}
          </div>

          {/* Action Execution CTAs */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2.5">
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
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Call Now (Open Brief)
                </button>

                {nextAction.leadId && (
                  <button
                    onClick={() => {
                      setWhatsAppTarget({ leadId: nextAction.leadId!, category: 'VALUE_DROP' });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Send WhatsApp
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
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 transition flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" /> Open Demo Plan
                </button>
                <button
                  onClick={() => {
                    setActiveDemoId(nextAction.leadId || '');
                    setIsLiveDemoOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Launch Live Demo
                </button>
              </>
            ) : nextAction?.actionType === 'LUNCH' ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-400" /> Protected lunch time. Step away & rest.
                </span>
                <button
                  onClick={() => setOverrideLunch(true)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline transition"
                >
                  Override & work anyway
                </button>
              </div>
            ) : null}

            {nextAction?.leadId && (
              <Link
                href={`/leads/${nextAction.leadId}`}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition ml-auto flex items-center gap-1"
              >
                Profile <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* CURRENT BLOCK & NEXT ACTIVITY (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Current Block Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Current Work Block
              </span>
              {currentBlock?.isProtected ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Protected Block
                </span>
              ) : (
                <span className="text-[11px] font-mono text-indigo-400 font-semibold">
                  {currentBlock?.timeRangeFormatted || 'Active Block'}
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              {currentBlock?.title || 'Active Sales Window'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">{currentBlock?.goal || 'Pipeline progression'}</p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Time Remaining:</span>
              </div>
              <span className="font-mono font-bold text-emerald-400">
                {currentBlock?.remainingFormatted || 'Active'}
              </span>
            </div>
          </div>

          {/* Next Scheduled Activity Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Next Commitment
              </span>
              {nextActivity && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  in {nextActivity.countdownText}
                </span>
              )}
            </div>

            {nextActivity ? (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-white">{nextActivity.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Scheduled at {nextActivity.time} • {nextActivity.contactName || 'Contact'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  {nextActivity.type === 'DEMO' ? (
                    <button
                      onClick={() => {
                        setActiveDemoId(nextActivity.id);
                        setIsDemoBriefOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 font-semibold text-xs transition"
                    >
                      View Demo Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveLead({ id: nextActivity.leadId, title: nextActivity.title });
                        setIsBriefOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-semibold text-xs transition"
                    >
                      Call Lead
                    </button>
                  )}

                  {nextActivity.leadId && (
                    <Link
                      href={`/leads/${nextActivity.leadId}`}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                    >
                      Open Lead
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-3">
                No upcoming commitments scheduled for today.
              </div>
            )}
          </div>

          {/* TWO-HOUR SALES PULSE COMPACT CARD */}
          {pulse?.currentBlock && (
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-950 p-4 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                    Two-Hour Sales Pulse ({pulse.currentBlock.blockTitle})
                  </span>
                </div>
                <Link
                  href="/insights"
                  className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold"
                >
                  Deep Dive <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center my-1.5">
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-sm font-bold text-slate-200">{pulse.currentBlock.activity.totalCalls}</div>
                  <div className="text-[9px] text-slate-500 uppercase">Calls Logged</div>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-sm font-bold text-sky-400">{pulse.currentBlock.connectionRate}%</div>
                  <div className="text-[9px] text-slate-500 uppercase">Connect Rate</div>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-sm font-bold text-emerald-400">{pulse.currentBlock.interestRate}%</div>
                  <div className="text-[9px] text-slate-500 uppercase">Interest Rate</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 flex items-center gap-1.5 pt-2 border-t border-slate-800/80 mt-1">
                <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{pulse.nextBlockFocus || 'Maintain high outreach tempo'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calls Made</span>
          <span className="text-xl font-black text-slate-200 mt-1 block">{counts.todayCalls || 0}</span>
          <span className="text-[10px] text-slate-500">Today&apos;s activity</span>
        </div>

        <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/10 p-3.5">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Connected</span>
          <span className="text-xl font-black text-indigo-300 mt-1 block">{counts.connectedCalls || 0}</span>
          <span className="text-[10px] text-indigo-500">Live conversations</span>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3.5">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Demos Run</span>
          <span className="text-xl font-black text-emerald-300 mt-1 block">{counts.todayDemos || 0}</span>
          <span className="text-[10px] text-emerald-500">Scheduled/Completed</span>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3.5">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Follow-ups</span>
          <span className="text-xl font-black text-amber-300 mt-1 block">{counts.pendingFollowUps || 0}</span>
          <span className="text-[10px] text-amber-500">Pending today</span>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-3.5">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Overdue</span>
          <span className="text-xl font-black text-rose-300 mt-1 block">{counts.overdueFollowUps || 0}</span>
          <span className="text-[10px] text-rose-500">Need resolution</span>
        </div>

        <Link
          href="/schedule"
          className="rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/40 p-3.5 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Schedule</span>
            <Calendar className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-xs font-semibold text-indigo-300 group-hover:underline mt-1">
            View Timeline →
          </span>
          <span className="text-[10px] text-slate-500">Full day blocks</span>
        </Link>
      </div>

      {/* 5. DUAL COCKPIT LISTS: OVERDUE ACTIONS & PRIORITY LEADS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* OVERDUE ACTIONS SECTION */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Overdue Follow-ups & Callbacks ({overdueItems.length})
              </h3>
            </div>
            <span className="text-[10px] text-rose-400 font-mono">Action Required</span>
          </div>

          {overdueItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5 opacity-60" />
              No overdue follow-ups! Pipeline is clean and on track.
            </div>
          ) : (
            <div className="space-y-2.5">
              {overdueItems.slice(0, 4).map((fu: any) => (
                <div
                  key={fu.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate">
                      {fu.lead?.business?.name || fu.lead?.title || 'Lead'}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <User className="w-3 h-3" />
                      <span>{fu.lead?.contact?.name || 'Contact'}</span>
                      <span className="text-rose-400 font-mono">
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
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition flex items-center gap-1"
                    >
                      <PhoneCall className="w-3 h-3" /> Call
                    </button>
                    <button
                      onClick={() => handleCompleteFollowUp(fu.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 text-slate-400 hover:text-emerald-400 transition"
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

        {/* PRIORITY HIGH-LEVERAGE LEADS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Top Priority Leads ({hotLeads.length})
              </h3>
            </div>
            <span className="text-[10px] text-indigo-400 font-mono">Highest Leverage</span>
          </div>

          {hotLeads.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No hot leads currently flagged. Conduct fresh discovery calling to qualify new prospects.
            </div>
          ) : (
            <div className="space-y-2.5">
              {hotLeads.slice(0, 4).map((hl: any) => (
                <div
                  key={hl.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                      <span>{hl.business?.name || hl.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        HOT
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{hl.contact?.name || 'Contact'}</span>
                      {hl.contact?.phone && <span className="font-mono">{hl.contact.phone}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setActiveLead(hl);
                        setIsBriefOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 font-semibold text-[11px] transition flex items-center gap-1"
                    >
                      <PhoneCall className="w-3 h-3" /> Dial
                    </button>
                    <button
                      onClick={() => setWhatsAppTarget({ leadId: hl.id, category: 'VALUE_DROP' })}
                      className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 transition"
                      title="Quick WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/leads/${hl.id}`}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
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
    </div>
  );
};
