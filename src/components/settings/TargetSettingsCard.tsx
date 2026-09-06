'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  TrendingUp,
  Sparkles,
  Check,
  Save,
  DollarSign,
  PhoneCall,
  Video,
  Flame,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TargetInput, SmartTargetSuggestion } from '@/lib/targets/targetPlannerService';

export const TargetSettingsCard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'MONTHLY' | 'WEEKLY' | 'DAILY'>('MONTHLY');
  const [targetsData, setTargetsData] = useState<any>(null);
  const [suggestion, setSuggestion] = useState<SmartTargetSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  // Form states for each period
  const [monthlyForm, setMonthlyForm] = useState<TargetInput>({
    targetAmount: 0,
    targetSales: 0,
    targetDemos: 0,
    targetInterested: 0,
    targetFollowUps: 0,
    targetColdCalls: 0,
    targetInboundCalls: 0,
    notes: '',
  });

  const [weeklyForm, setWeeklyForm] = useState<TargetInput>({
    targetAmount: 0,
    targetSales: 0,
    targetDemos: 0,
    targetInterested: 0,
    targetFollowUps: 0,
    targetColdCalls: 0,
    targetInboundCalls: 0,
    notes: '',
  });

  const [dailyForm, setDailyForm] = useState<TargetInput>({
    targetAmount: 0,
    targetSales: 0,
    targetDemos: 0,
    targetInterested: 0,
    targetFollowUps: 0,
    targetColdCalls: 0,
    targetInboundCalls: 0,
    notes: '',
  });

  const fetchTargets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/targets');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const t = json.data.targets;
          setTargetsData(t);
          setSuggestion(json.data.suggestion);

          if (t.monthly?.target) {
            setMonthlyForm({
              targetAmount: t.monthly.target.amount || 0,
              targetSales: t.monthly.target.sales || 0,
              targetDemos: t.monthly.target.demos || 0,
              targetInterested: t.monthly.target.interested || 0,
              targetFollowUps: t.monthly.target.followUps || 0,
              targetColdCalls: t.monthly.target.coldCalls || 0,
              targetInboundCalls: t.monthly.target.inboundCalls || 0,
              notes: '',
            });
          }

          if (t.weekly?.target) {
            setWeeklyForm({
              targetAmount: t.weekly.target.amount || 0,
              targetSales: t.weekly.target.sales || 0,
              targetDemos: t.weekly.target.demos || 0,
              targetInterested: t.weekly.target.interested || 0,
              targetFollowUps: t.weekly.target.followUps || 0,
              targetColdCalls: t.weekly.target.coldCalls || 0,
              targetInboundCalls: t.weekly.target.inboundCalls || 0,
              notes: '',
            });
          }

          if (t.daily?.target) {
            setDailyForm({
              targetAmount: t.daily.target.amount || 0,
              targetSales: t.daily.target.sales || 0,
              targetDemos: t.daily.target.demos || 0,
              targetInterested: t.daily.target.interested || 0,
              targetFollowUps: t.daily.target.followUps || 0,
              targetColdCalls: t.daily.target.coldCalls || 0,
              targetInboundCalls: t.daily.target.inboundCalls || 0,
              notes: '',
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load targets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const handleMonthlyAmountChange = async (val: number) => {
    setMonthlyForm((prev) => ({ ...prev, targetAmount: val }));
    if (val > 0) {
      try {
        const res = await fetch(`/api/targets?suggestAmount=${val}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data.suggestion) {
            setSuggestion(json.data.suggestion);
          }
        }
      } catch {}
    }
  };

  const handleApplySuggestion = () => {
    if (!suggestion) return;
    const m = suggestion.metrics;
    setMonthlyForm({
      targetAmount: suggestion.targetAmount,
      targetSales: m.monthlySalesNeeded,
      targetDemos: m.monthlyDemosNeeded,
      targetInterested: m.monthlyInterestedNeeded,
      targetFollowUps: m.monthlyFollowUpsNeeded,
      targetColdCalls: Math.round(m.monthlyCallsNeeded * 0.7),
      targetInboundCalls: Math.round(m.monthlyCallsNeeded * 0.3),
      notes: 'Applied from smart conversion suggestion',
    });

    setDailyForm({
      targetAmount: Math.round(suggestion.targetAmount / 24),
      targetSales: Math.max(1, Math.round(m.monthlySalesNeeded / 24)),
      targetDemos: m.dailyDemosNeeded,
      targetInterested: Math.max(1, Math.round(m.monthlyInterestedNeeded / 24)),
      targetFollowUps: m.dailyFollowUpsNeeded,
      targetColdCalls: Math.round(m.dailyCallsNeeded * 0.7),
      targetInboundCalls: Math.round(m.dailyCallsNeeded * 0.3),
      notes: 'Applied from smart daily run-rate',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMessage(false);

    try {
      const dataToSave =
        activeTab === 'MONTHLY'
          ? monthlyForm
          : activeTab === 'WEEKLY'
          ? weeklyForm
          : dailyForm;

      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: activeTab,
          data: dataToSave,
        }),
      });

      if (res.ok) {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
        fetchTargets();
      }
    } catch (err) {
      console.error('Failed to save target:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !targetsData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-xs text-slate-500 shadow-xs animate-pulse">
        Loading target planner...
      </div>
    );
  }

  const currentPeriodStatus =
    activeTab === 'MONTHLY'
      ? targetsData?.monthly
      : activeTab === 'WEEKLY'
      ? targetsData?.weekly
      : targetsData?.daily;

  const currentForm =
    activeTab === 'MONTHLY'
      ? monthlyForm
      : activeTab === 'WEEKLY'
      ? weeklyForm
      : dailyForm;

  const setCurrentForm =
    activeTab === 'MONTHLY'
      ? setMonthlyForm
      : activeTab === 'WEEKLY'
      ? setWeeklyForm
      : setDailyForm;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Sales Target & Quota Planner
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure realistic Daily, Weekly, and Monthly targets. Tracks actual sales progress.
          </p>
        </div>

        {savedMessage && (
          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs">
            <Check className="w-3.5 h-3.5" /> Targets Saved & Updated
          </span>
        )}
      </div>

      {/* Period Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        {(['MONTHLY', 'WEEKLY', 'DAILY'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5',
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            {tab.charAt(0) + tab.slice(1).toLowerCase()} Target
          </button>
        ))}
      </div>

      {/* Current Progress Snapshot Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {activeTab} Performance Snapshot
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-bold border',
              currentPeriodStatus?.isConfigured
                ? currentPeriodStatus.status === 'ACHIEVED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : currentPeriodStatus.status === 'AHEAD'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : currentPeriodStatus.status === 'BEHIND'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            )}
          >
            {currentPeriodStatus?.statusLabel || 'Target not set'}
          </span>
        </div>

        {currentPeriodStatus?.isConfigured ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-sans block">Revenue Closed</span>
              <strong className="text-slate-900 text-xs">
                ₹{(currentPeriodStatus.achieved?.amount || 0).toLocaleString('en-IN')}
              </strong>{' '}
              <span className="text-[10px] text-slate-500">
                / ₹{(currentPeriodStatus.target?.amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-sans block">Deals Closed</span>
              <strong className="text-slate-900 text-xs">
                {currentPeriodStatus.achieved?.sales || 0}
              </strong>{' '}
              <span className="text-[10px] text-slate-500">
                / {currentPeriodStatus.target?.sales || 0}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-sans block">Demos Completed</span>
              <strong className="text-slate-900 text-xs">
                {currentPeriodStatus.achieved?.demos || 0}
              </strong>{' '}
              <span className="text-[10px] text-slate-500">
                / {currentPeriodStatus.target?.demos || 0}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-sans block">Total Calls</span>
              <strong className="text-slate-900 text-xs">
                {currentPeriodStatus.achieved?.totalCalls || 0}
              </strong>{' '}
              <span className="text-[10px] text-slate-500">
                / {currentPeriodStatus.target?.totalCalls || 0}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 py-1">
            No {activeTab.toLowerCase()} target has been saved yet. Enter your targets below to start tracking.
          </div>
        )}
      </div>

      {/* Smart Target Suggestion Box (for Monthly Target) */}
      {activeTab === 'MONTHLY' && suggestion && (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 to-sky-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span className="text-xs font-bold text-indigo-950">
                Smart Calculated Activity Breakdown
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              AI/Calculated Suggestion
            </span>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {suggestion.narrative}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-mono">
            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
              <span className="text-[10px] text-slate-500 font-sans block">Monthly Calls</span>
              <strong className="text-indigo-950">{suggestion.metrics.monthlyCallsNeeded}</strong>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
              <span className="text-[10px] text-slate-500 font-sans block">Connected</span>
              <strong className="text-indigo-950">{suggestion.metrics.monthlyConnectedNeeded}</strong>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
              <span className="text-[10px] text-slate-500 font-sans block">Interested</span>
              <strong className="text-indigo-950">{suggestion.metrics.monthlyInterestedNeeded}</strong>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
              <span className="text-[10px] text-slate-500 font-sans block">Demos</span>
              <strong className="text-indigo-950">{suggestion.metrics.monthlyDemosNeeded}</strong>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
              <span className="text-[10px] text-slate-500 font-sans block">Follow-ups</span>
              <strong className="text-indigo-950">{suggestion.metrics.monthlyFollowUpsNeeded}</strong>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
              <span className="text-[10px] text-slate-500 font-sans block">Closures</span>
              <strong className="text-emerald-700">{suggestion.metrics.monthlySalesNeeded} deals</strong>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500">
              Calculated from your historical conversion funnel. Not permanently locked.
            </span>
            <button
              type="button"
              onClick={handleApplySuggestion}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition shadow-2xs"
            >
              Apply Suggestion to Form
            </button>
          </div>
        </div>
      )}

      {/* Target Configuration Form */}
      <form onSubmit={handleSave} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {/* Revenue Target */}
          <div>
            <label className="block text-slate-700 mb-1 font-semibold flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Revenue / Sales Target (₹)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={currentForm.targetAmount || ''}
              onChange={(e) =>
                activeTab === 'MONTHLY'
                  ? handleMonthlyAmountChange(parseFloat(e.target.value) || 0)
                  : setCurrentForm({ ...currentForm, targetAmount: parseFloat(e.target.value) || 0 })
              }
              placeholder="e.g. 250000"
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-900 font-mono text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Closings Target */}
          <div>
            <label className="block text-slate-700 mb-1 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Deals / Closings Target
            </label>
            <input
              type="number"
              min="0"
              value={currentForm.targetSales || ''}
              onChange={(e) => setCurrentForm({ ...currentForm, targetSales: parseInt(e.target.value) || 0 })}
              placeholder="e.g. 8"
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-900 font-mono text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Demos Target */}
          <div>
            <label className="block text-slate-700 mb-1 font-semibold flex items-center gap-1">
              <Video className="w-3.5 h-3.5 text-sky-600" /> Demo Target
            </label>
            <input
              type="number"
              min="0"
              value={currentForm.targetDemos || ''}
              onChange={(e) => setCurrentForm({ ...currentForm, targetDemos: parseInt(e.target.value) || 0 })}
              placeholder="e.g. 20"
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-900 font-mono text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Interested Leads Target */}
          <div>
            <label className="block text-slate-700 mb-1 font-semibold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> Interested Leads Target
            </label>
            <input
              type="number"
              min="0"
              value={currentForm.targetInterested || ''}
              onChange={(e) => setCurrentForm({ ...currentForm, targetInterested: parseInt(e.target.value) || 0 })}
              placeholder="e.g. 35"
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-900 font-mono text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Follow-ups Target */}
          <div>
            <label className="block text-slate-700 mb-1 font-semibold flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-teal-600" /> Follow-ups Target
            </label>
            <input
              type="number"
              min="0"
              value={currentForm.targetFollowUps || ''}
              onChange={(e) => setCurrentForm({ ...currentForm, targetFollowUps: parseInt(e.target.value) || 0 })}
              placeholder="e.g. 50"
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-900 font-mono text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Cold Call Target */}
          <div>
            <label className="block text-slate-700 mb-1 font-semibold flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-slate-600" /> Cold / Outbound Calls Target
            </label>
            <input
              type="number"
              min="0"
              value={currentForm.targetColdCalls || ''}
              onChange={(e) => setCurrentForm({ ...currentForm, targetColdCalls: parseInt(e.target.value) || 0 })}
              placeholder="e.g. 150"
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-900 font-mono text-xs focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : `Save ${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Target`}
        </button>
      </form>
    </div>
  );
};
