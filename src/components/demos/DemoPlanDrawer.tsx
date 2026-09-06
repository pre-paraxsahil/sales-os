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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg p-2 bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                  Personalized AI Demo Plan
                </span>
                {version > 1 && (
                  <span className="rounded bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                    Version {version}
                  </span>
                )}
                {model && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                    {model}
                  </span>
                )}
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                Targeted Demonstration Strategy & SAY/SHOW/ASK/WHY Guide
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLaunchLiveDemo}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-sm"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Live Demo Mode</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
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
              <p className="text-slate-500 font-medium">Loading AI Demo Plan...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center text-rose-800 space-y-2">
              <AlertTriangle className="mx-auto h-6 w-6 text-rose-600" />
              <p className="font-semibold">{error}</p>
              <button
                onClick={() => handleGeneratePlan(false)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
              >
                <RefreshCw className="h-3 w-3" /> Retry Generation
              </button>
            </div>
          ) : !plan ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center space-y-4 my-auto">
              <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm font-bold text-slate-800">No Demo Plan Generated Yet</h3>
                <p className="text-[11px] text-slate-500">
                  Generate a tailored OneComPro walkthrough combining confirmed customer pain points,
                  inventory requirements, and real PostgreSQL product knowledge.
                </p>
              </div>
              <button
                onClick={() => handleGeneratePlan(false)}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                <Sparkles className={cn('h-4 w-4', generating && 'animate-spin')} />
                <span>{generating ? 'Synthesizing Intelligence...' : 'Generate AI Demo Plan'}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Objective & Opening Statement */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" /> Demo Objective
                  </span>
                  <button
                    onClick={() => handleGeneratePlan(true)}
                    disabled={generating}
                    className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn('h-3 w-3', generating && 'animate-spin')} />
                    <span>{generating ? 'Regenerating...' : 'Regenerate Plan'}</span>
                  </button>
                </div>
                <p className="text-slate-900 text-sm font-semibold">{plan.demoObjective}</p>
                <div className="border-t border-indigo-100 pt-2 mt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    Suggested Opening Statement
                  </span>
                  <p className="text-slate-700 italic font-mono text-[11px]">"{plan.opening}"</p>
                </div>
              </div>

              {/* Demo Story Card */}
              {plan.story && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-violet-600" /> Customer-Specific Demo Narrative
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px]">
                    <div className="rounded-lg bg-white p-2.5 border border-slate-200 space-y-1 shadow-xs">
                      <span className="text-[9px] uppercase font-bold text-rose-600 block">1. Current Problem</span>
                      <p className="text-slate-700">{plan.story.currentProblem}</p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-slate-200 space-y-1 shadow-xs">
                      <span className="text-[9px] uppercase font-bold text-amber-600 block">2. How Customers Buy</span>
                      <p className="text-slate-700">{plan.story.customerBuyingProcess}</p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-slate-200 space-y-1 shadow-xs">
                      <span className="text-[9px] uppercase font-bold text-indigo-600 block">3. OneComPro Fix</span>
                      <p className="text-slate-700">{plan.story.storeImprovement}</p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-slate-200 space-y-1 shadow-xs">
                      <span className="text-[9px] uppercase font-bold text-emerald-600 block">4. Business Benefit</span>
                      <p className="text-slate-700">{plan.story.businessBenefit}</p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-slate-200 space-y-1 shadow-xs">
                      <span className="text-[9px] uppercase font-bold text-sky-600 block">5. Why Right Now</span>
                      <p className="text-slate-700">{plan.story.whyNow}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Sequence (SAY / SHOW / ASK / WHY) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-emerald-600" /> SAY / SHOW / ASK / WHY Demo Sequence ({plan.featureSequence.length} Steps)
                  </h3>
                  <span className="text-[11px] text-slate-500">Tailored to confirmed requirements</span>
                </div>

                <div className="space-y-3">
                  {plan.featureSequence.map((step: DemoFeatureStep, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs transition-all hover:border-indigo-200"
                    >
                      {/* Step Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">{step.feature}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {step.planRequirement && (
                            <span className="rounded bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                              Requires {step.planRequirement}
                            </span>
                          )}
                          <span
                            className={cn(
                              'rounded border px-2 py-0.5 text-[10px] font-bold uppercase',
                              step.productStatus === 'AVAILABLE' &&
                                'bg-emerald-50 text-emerald-700 border-emerald-200',
                              step.productStatus === 'PLAN_RESTRICTED' &&
                                'bg-amber-50 text-amber-700 border-amber-200',
                              step.productStatus === 'COMING_SOON' &&
                                'bg-sky-50 text-sky-700 border-sky-200',
                              step.productStatus === 'UNKNOWN' &&
                                'bg-slate-100 text-slate-600 border-slate-200'
                            )}
                          >
                            {step.productStatus.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* SAY / SHOW / ASK / WHY Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {/* SHOW */}
                        <div className="rounded-lg bg-sky-50/50 p-3 border border-sky-100 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-sky-700 flex items-center gap-1">
                            <Eye className="h-3 w-3" /> SHOW (Screen Demonstration)
                          </span>
                          <p className="text-slate-800 leading-relaxed font-medium">{step.whatToShow}</p>
                        </div>

                        {/* SAY */}
                        <div className="rounded-lg bg-emerald-50/50 p-3 border border-emerald-100 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> SAY (Concise Talking Point)
                          </span>
                          <p className="text-slate-800 leading-relaxed italic font-serif">"{step.whatToSay}"</p>
                        </div>

                        {/* ASK */}
                        <div className="rounded-lg bg-amber-50/50 p-3 border border-amber-100 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1">
                            <HelpCircle className="h-3 w-3" /> ASK (Customer Engagement Question)
                          </span>
                          <p className="text-slate-800 leading-relaxed font-medium">{step.askQuestion}</p>
                        </div>

                        {/* WHY */}
                        <div className="rounded-lg bg-indigo-50/50 p-3 border border-indigo-100 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-indigo-700 flex items-center gap-1">
                            <Target className="h-3 w-3" /> WHY (Customer Operational Value)
                          </span>
                          <p className="text-slate-700 leading-relaxed">{step.whyItMatters}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discovery Questions & Buying Signals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Discovery Questions */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5" /> Discovery Questions (Uncover Unknowns)
                  </span>
                  <ul className="space-y-1.5">
                    {plan.discoveryQuestions.map((q, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-slate-800"
                      >
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Buying Signals to Watch */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Buying Signals to Watch
                  </span>
                  <ul className="space-y-1.5">
                    {plan.buyingSignalsToWatch.map((s, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{s.signal}</span>
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[9px] font-black uppercase border',
                              s.level === 'STRONG' &&
                                'bg-emerald-50 text-emerald-700 border-emerald-200',
                              s.level === 'MEDIUM' &&
                                'bg-amber-50 text-amber-700 border-amber-200',
                              s.level === 'WEAK' &&
                                'bg-slate-100 text-slate-600 border-slate-200'
                            )}
                          >
                            {s.level} Signal
                          </span>
                        </div>
                        {s.recommendedAction && (
                          <p className="text-[10px] text-slate-500">
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
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-rose-700 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" /> Objection Handling Playbooks
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {plan.objectionHandling.map((obj, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-slate-50 p-3 border border-slate-100 space-y-1.5"
                      >
                        <span className="text-[10px] font-bold text-rose-700 block">
                          If Customer Says: "{obj.objection}"
                        </span>
                        <div className="rounded bg-white p-2 border border-slate-200 shadow-xs">
                          <span className="text-[9px] uppercase font-bold text-emerald-700 block mb-0.5">
                            James Responds:
                          </span>
                          <p className="text-slate-800 italic font-serif">"{obj.response}"</p>
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
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> AVOID (Critical Anti-Patterns)
                  </span>
                  <ul className="space-y-1 text-slate-700">
                    {plan.avoid.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-rose-600 font-bold shrink-0">✕</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Closing Transition & Next Step */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" /> Closing Transition (No-Pressure Move)
                  </span>
                  <p className="text-slate-800 italic font-serif leading-relaxed">
                    "{plan.closingTransition}"
                  </p>
                  <div className="border-t border-indigo-100 pt-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Recommended Next Step
                    </span>
                    <p className="text-emerald-700 font-semibold mt-0.5">{plan.nextStep}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50/90 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            Close Plan
          </button>

          <button
            onClick={onLaunchLiveDemo}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-sm"
          >
            <Play className="h-4 w-4" />
            <span>Launch Live Demo Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
};
