'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  Play,
  Layers,
  HelpCircle,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Target,
  Clock,
  CheckCircle2,
  ChevronRight,
  Info,
  BookOpen,
  Eye,
  MessageSquare,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemoPlanResult, DemoFeatureStep } from '@/lib/ai/types';

interface DemoPlanDrawerProps {
  demoId: string;
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
  onLaunchLiveDemo?: () => void;
  onPlanUpdated?: () => void;
}

export const DemoPlanDrawer: React.FC<DemoPlanDrawerProps> = ({
  demoId,
  leadId,
  isOpen,
  onClose,
  onLaunchLiveDemo,
  onPlanUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DemoPlanResult | null>(null);
  const [version, setVersion] = useState<number>(1);
  const [model, setModel] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/demos/${demoId}/plan`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setPlan(json.data.plan);
        setVersion(json.data.version || 1);
        setModel(json.data.model);
        setVersionHistory(json.data.versionHistory || []);
      } else {
        setPlan(null);
      }
    } catch (err: any) {
      console.error('Error loading demo plan:', err);
      setError('Failed to load demo plan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlan();
    }
  }, [demoId, isOpen]);

  const handleGeneratePlan = async (forceRegenerate = false) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/demos/${demoId}/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setPlan(json.data.plan);
        setVersion(json.data.version);
        setModel(json.data.model);
        if (json.data.versionHistory) {
          setVersionHistory(json.data.versionHistory);
        }
        onPlanUpdated?.();
      } else {
        setError(json.error || 'Failed to generate demo plan.');
      }
    } catch (err: any) {
      console.error('Error generating demo plan:', err);
      setError('Network error while generating AI Demo Plan.');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  Personalized AI Demo Plan
                </span>
                {version > 1 && (
                  <span className="rounded bg-violet-500/20 border border-violet-500/30 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">
                    Version {version}
                  </span>
                )}
                {model && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                    {model}
                  </span>
                )}
              </div>
              <h2 className="text-sm font-bold text-slate-100 mt-0.5">
                Targeted Demonstration Strategy & SAY/SHOW/ASK/WHY Guide
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLaunchLiveDemo}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/20"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Live Demo Mode</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs flex-1">
          {loading ? (
            <div className="space-y-4 py-12 animate-pulse text-center">
              <Sparkles className="mx-auto h-8 w-8 text-indigo-500 animate-spin mb-2" />
              <p className="text-slate-400">Loading AI Demo Plan...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-5 text-center text-rose-300 space-y-2">
              <AlertTriangle className="mx-auto h-6 w-6 text-rose-400" />
              <p className="font-semibold">{error}</p>
              <button
                onClick={() => handleGeneratePlan(false)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
              >
                <RefreshCw className="h-3 w-3" /> Retry Generation
              </button>
            </div>
          ) : !plan ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-12 text-center space-y-4 my-auto">
              <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm font-bold text-slate-200">No Demo Plan Generated Yet</h3>
                <p className="text-[11px] text-slate-400">
                  Generate a tailored OneComPro walkthrough combining confirmed customer pain points,
                  inventory requirements, and real PostgreSQL product knowledge.
                </p>
              </div>
              <button
                onClick={() => handleGeneratePlan(false)}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                <Sparkles className={cn('h-4 w-4', generating && 'animate-spin')} />
                <span>{generating ? 'Synthesizing Intelligence...' : 'Generate AI Demo Plan'}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Objective & Opening Statement */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" /> Demo Objective
                  </span>
                  <button
                    onClick={() => handleGeneratePlan(true)}
                    disabled={generating}
                    className="text-[11px] font-semibold text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn('h-3 w-3', generating && 'animate-spin')} />
                    <span>{generating ? 'Regenerating...' : 'Regenerate Plan'}</span>
                  </button>
                </div>
                <p className="text-slate-100 text-sm font-semibold">{plan.demoObjective}</p>
                <div className="border-t border-indigo-900/40 pt-2 mt-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                    Suggested Opening Statement
                  </span>
                  <p className="text-slate-300 italic font-mono text-[11px]">"{plan.opening}"</p>
                </div>
              </div>

              {/* Demo Story Card */}
              {plan.story && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-violet-400" /> Customer-Specific Demo Narrative
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px]">
                    <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-rose-400 block">1. Current Problem</span>
                      <p className="text-slate-300">{plan.story.currentProblem}</p>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-amber-400 block">2. How Customers Buy</span>
                      <p className="text-slate-300">{plan.story.customerBuyingProcess}</p>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-indigo-400 block">3. OneComPro Fix</span>
                      <p className="text-slate-300">{plan.story.storeImprovement}</p>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-emerald-400 block">4. Business Benefit</span>
                      <p className="text-slate-300">{plan.story.businessBenefit}</p>
                    </div>
                    <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-sky-400 block">5. Why Right Now</span>
                      <p className="text-slate-300">{plan.story.whyNow}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Sequence (SAY / SHOW / ASK / WHY) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-emerald-400" /> SAY / SHOW / ASK / WHY Demo Sequence ({plan.featureSequence.length} Steps)
                  </h3>
                  <span className="text-[11px] text-slate-500">Tailored to confirmed requirements</span>
                </div>

                <div className="space-y-3">
                  {plan.featureSequence.map((step: DemoFeatureStep, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3 transition-all hover:border-slate-700"
                    >
                      {/* Step Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-300 font-bold text-[10px] border border-indigo-500/30">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-100 text-xs">{step.feature}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {step.planRequirement && (
                            <span className="rounded bg-violet-950/40 border border-violet-500/30 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                              Requires {step.planRequirement}
                            </span>
                          )}
                          <span
                            className={cn(
                              'rounded border px-2 py-0.5 text-[10px] font-bold uppercase',
                              step.productStatus === 'AVAILABLE' &&
                                'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                              step.productStatus === 'PLAN_RESTRICTED' &&
                                'bg-amber-500/10 text-amber-400 border-amber-500/30',
                              step.productStatus === 'COMING_SOON' &&
                                'bg-sky-500/10 text-sky-400 border-sky-500/30',
                              step.productStatus === 'UNKNOWN' &&
                                'bg-slate-800 text-slate-400 border-slate-700'
                            )}
                          >
                            {step.productStatus.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* SAY / SHOW / ASK / WHY Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {/* SHOW */}
                        <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-800/80 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
                            <Eye className="h-3 w-3" /> SHOW (Screen Demonstration)
                          </span>
                          <p className="text-slate-200 leading-relaxed font-medium">{step.whatToShow}</p>
                        </div>

                        {/* SAY */}
                        <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-800/80 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> SAY (Concise Talking Point)
                          </span>
                          <p className="text-slate-200 leading-relaxed italic font-serif">"{step.whatToSay}"</p>
                        </div>

                        {/* ASK */}
                        <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-800/80 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                            <HelpCircle className="h-3 w-3" /> ASK (Customer Engagement Question)
                          </span>
                          <p className="text-slate-200 leading-relaxed font-medium">{step.askQuestion}</p>
                        </div>

                        {/* WHY */}
                        <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-800/80 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1">
                            <Target className="h-3 w-3" /> WHY (Customer Operational Value)
                          </span>
                          <p className="text-slate-300 leading-relaxed">{step.whyItMatters}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discovery Questions & Buying Signals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Discovery Questions */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5" /> Discovery Questions (Uncover Unknowns)
                  </span>
                  <ul className="space-y-1.5">
                    {plan.discoveryQuestions.map((q, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-slate-900 p-2.5 border border-slate-800 text-slate-200"
                      >
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Buying Signals to Watch */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Buying Signals to Watch
                  </span>
                  <ul className="space-y-1.5">
                    {plan.buyingSignalsToWatch.map((s, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-slate-900 p-2.5 border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{s.signal}</span>
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[9px] font-black uppercase border',
                              s.level === 'STRONG' &&
                                'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                              s.level === 'MEDIUM' &&
                                'bg-amber-500/10 text-amber-400 border-amber-500/30',
                              s.level === 'WEAK' &&
                                'bg-slate-800 text-slate-400 border-slate-700'
                            )}
                          >
                            {s.level} Signal
                          </span>
                        </div>
                        {s.recommendedAction && (
                          <p className="text-[10px] text-slate-400">
                            <strong>Action:</strong> {s.recommendedAction}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Objection Handling Playbooks */}
              {plan.objectionHandling.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" /> Objection Handling Playbooks
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {plan.objectionHandling.map((obj, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-slate-900 p-3 border border-slate-800 space-y-1.5"
                      >
                        <span className="text-[10px] font-bold text-rose-300 block">
                          If Customer Says: "{obj.objection}"
                        </span>
                        <div className="rounded bg-slate-950 p-2 border border-slate-800/80">
                          <span className="text-[9px] uppercase font-bold text-emerald-400 block mb-0.5">
                            James Responds:
                          </span>
                          <p className="text-slate-200 italic font-serif">"{obj.response}"</p>
                        </div>
                        {obj.whyItWorks && (
                          <p className="text-[10px] text-slate-500">
                            <strong>Why it works:</strong> {obj.whyItWorks}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AVOID List & Closing Transition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* AVOID Checklist */}
                <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-4 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> AVOID (Critical Anti-Patterns)
                  </span>
                  <ul className="space-y-1 text-slate-300">
                    {plan.avoid.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold shrink-0">✕</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Closing Transition & Next Step */}
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" /> Closing Transition (No-Pressure Move)
                  </span>
                  <p className="text-slate-200 italic font-serif leading-relaxed">
                    "{plan.closingTransition}"
                  </p>
                  <div className="border-t border-indigo-900/40 pt-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Recommended Next Step
                    </span>
                    <p className="text-emerald-400 font-semibold mt-0.5">{plan.nextStep}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-950/90 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Close Plan
          </button>

          <button
            onClick={onLaunchLiveDemo}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/20"
          >
            <Play className="h-4 w-4" />
            <span>Launch Live Demo Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
};
