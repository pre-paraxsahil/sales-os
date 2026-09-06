'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building,
  Target,
  AlertTriangle,
  HelpCircle,
  Clock,
  Sparkles,
  Layers,
  TrendingUp,
  ShieldAlert,
  Play,
  FileText,
  DollarSign,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BeforeDemoBrief } from '@/lib/ai/types';

interface BeforeDemoBriefModalProps {
  demoId: string;
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenDemoPlan?: () => void;
  onLaunchLiveDemo?: () => void;
}

export const BeforeDemoBriefModal: React.FC<BeforeDemoBriefModalProps> = ({
  demoId,
  leadId,
  isOpen,
  onClose,
  onOpenDemoPlan,
  onLaunchLiveDemo,
}) => {
  const [brief, setBrief] = useState<BeforeDemoBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/demos/${demoId}/brief`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.data) {
          setBrief(json.data);
        } else {
          setError(json.error || 'Failed to load Before-Demo brief.');
        }
      })
      .catch((err) => {
        if (isMounted) setError('Network error fetching demo brief.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [demoId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl p-2 bg-indigo-100 text-indigo-700 border border-indigo-200">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                  Before-Demo Briefing
                </span>
                {brief && (
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border',
                      brief.customer.temperature === 'HOT' &&
                        'bg-rose-50 text-rose-700 border-rose-200',
                      brief.customer.temperature === 'WARM' &&
                        'bg-amber-50 text-amber-700 border-amber-200',
                      brief.customer.temperature === 'COLD' &&
                        'bg-sky-50 text-sky-700 border-sky-200'
                    )}
                  >
                    {brief.customer.temperature} Lead
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                {brief ? `${brief.customer.business} — Pre-Demo Intelligence` : 'Loading Brief...'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {loading ? (
            <div className="space-y-3 py-10 animate-pulse">
              <div className="h-6 w-1/3 bg-slate-100 rounded" />
              <div className="h-24 w-full bg-slate-100 rounded-xl" />
              <div className="h-32 w-full bg-slate-100 rounded-xl" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center text-rose-700 font-medium">
              <AlertTriangle className="mx-auto h-6 w-6 text-rose-600 mb-1.5" />
              <p className="font-semibold">{error}</p>
            </div>
          ) : brief ? (
            <>
              {/* Customer Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Contact</span>
                  <p className="font-bold text-slate-900 mt-0.5">{brief.customer.name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Business / Industry</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {brief.customer.business} ({brief.customer.industry})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Sales Stage</span>
                  <p className="font-bold text-slate-900 mt-0.5">{brief.customer.stage}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Last Interaction</span>
                  <p className="font-medium text-slate-700 mt-0.5">{brief.salesContext.lastInteraction}</p>
                </div>
              </div>

              {/* Demo Objective & Key Risk Callouts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-700 font-bold uppercase text-[10px] tracking-wider">
                    <Target className="h-3.5 w-3.5" /> Demo Objective
                  </div>
                  <p className="text-slate-900 font-semibold leading-relaxed">{brief.demoObjective}</p>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-700 font-bold uppercase text-[10px] tracking-wider">
                    <AlertTriangle className="h-3.5 w-3.5" /> Key Risk / Main Blocker
                  </div>
                  <p className="text-slate-900 font-semibold leading-relaxed">{brief.keyRisk}</p>
                </div>
              </div>

              {/* What We Know Grid */}
              <div className="space-y-2">
                <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> What We Know (Confirmed Facts)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Requirements</span>
                    <ul className="space-y-1 text-slate-700 font-medium">
                      {brief.whatWeKnow.requirements.map((r, i) => (
                        <li key={i} className="text-[11px] leading-tight">• {r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Pain Points</span>
                    <ul className="space-y-1 text-slate-700 font-medium">
                      {brief.whatWeKnow.painPoints.map((p, i) => (
                        <li key={i} className="text-[11px] leading-tight">• {p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Workflow & Decision</span>
                    <div className="space-y-1 text-[11px] text-slate-700 font-medium">
                      <p><strong className="text-slate-500">Current:</strong> {brief.whatWeKnow.currentSystem}</p>
                      <p><strong className="text-slate-500">Decision Maker:</strong> {brief.whatWeKnow.decisionMaker}</p>
                      <p><strong className="text-slate-500">Timeline:</strong> {brief.whatWeKnow.timeline}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Context (Objections, Signals, Package) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Past Objections
                  </span>
                  <ul className="space-y-1 text-slate-700 text-[11px] font-medium">
                    {brief.salesContext.previousObjections.map((o, i) => (
                      <li key={i}>• {o}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Buying Signals
                  </span>
                  <ul className="space-y-1 text-slate-700 text-[11px] font-medium">
                    {brief.salesContext.buyingSignals.map((b, i) => (
                      <li key={i}>• {b}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Package & Budget
                  </span>
                  <div className="space-y-1 text-[11px] text-slate-700 font-medium">
                    <p><strong className="text-slate-500">Fit:</strong> {brief.salesContext.packageDiscussed}</p>
                    <p><strong className="text-slate-500">Budget:</strong> {brief.salesContext.pricingDiscussed}</p>
                  </div>
                </div>
              </div>

              {/* Unknowns Checklist */}
              {brief.unknown.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-600 flex items-center gap-1">
                    <HelpCircle className="h-3 w-3 text-slate-500" /> Unknown / Missing Qualification (Qualify During Demo)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.unknown.map((u, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                      >
                        {u}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            Close Brief
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenDemoPlan}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>AI Demo Plan</span>
            </button>

            <button
              onClick={onLaunchLiveDemo}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-xs"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Launch Live Demo Mode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
