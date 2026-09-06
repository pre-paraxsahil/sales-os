'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Flame, ArrowRight, Target, BrainCircuit, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({ isOpen, onClose }) => {
  const [coachData, setCoachData] = useState<any | null>(null);
  const [nextAction, setNextAction] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAIData = async () => {
    setLoading(true);
    try {
      const [coachRes, nextRes] = await Promise.all([
        fetch('/api/insights/coach'),
        fetch('/api/today/next-action'),
      ]);

      const coachJson = await coachRes.json();
      const nextJson = await nextRes.json();

      if (coachJson.success) setCoachData(coachJson.data);
      if (nextJson.success) setNextAction(nextJson.data);
    } catch (err) {
      console.error('Error fetching AI Copilot data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAIData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border-l border-slate-200 h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-indigo-50/60">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-600 p-2 text-white shadow-xs">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">AI Sales Copilot & Coach</h2>
              <p className="text-[11px] text-slate-500">Pipeline intelligence & deal recommendations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="space-y-4">
              <div className="h-28 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
              <div className="h-36 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
            </div>
          ) : (
            <>
              {/* Next Best Action Card */}
              {nextAction?.actionItem && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-indigo-600 text-white px-2 py-0.5 text-[10px] font-bold tracking-wide flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      TOP PRIORITY ACTION
                    </span>
                    <span className="text-[11px] text-indigo-700 font-bold font-mono">
                      Score: {Math.round((nextAction.actionItem.priorityScore || 0) * 100)}%
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{nextAction.actionItem.leadTitle}</h3>
                    <p className="text-xs text-indigo-950 font-medium mt-0.5">{nextAction.actionItem.action}</p>
                  </div>

                  <p className="text-[11px] text-slate-600 italic bg-white/80 p-2 rounded-lg border border-indigo-100">
                    &ldquo;{nextAction.actionItem.reason}&rdquo;
                  </p>
                </div>
              )}

              {/* Sales Bottleneck Analysis */}
              {coachData && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
                    <BrainCircuit className="h-4 w-4 text-amber-600" />
                    <span>Pipeline Bottleneck Diagnosis</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {coachData.bottleneck || 'No bottlenecks detected in current sales cycle.'}
                  </p>
                </div>
              )}

              {/* What Worked & Effective Hooks */}
              {coachData?.whatWorked && coachData.whatWorked.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Key Winning Playbook Behaviors
                  </h4>
                  <div className="space-y-1.5">
                    {coachData.whatWorked.map((item: string, idx: number) => (
                      <div key={idx} className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Recommendations */}
              {coachData?.topRecommendations && coachData.topRecommendations.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-rose-500" />
                    Recommended Coaching Actions
                  </h4>
                  <div className="space-y-2">
                    {coachData.topRecommendations.map((rec: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span>{rec.title}</span>
                          <span className="text-[10px] text-indigo-600 font-mono">{rec.impact} Impact</span>
                        </div>
                        <p className="text-[11px] text-slate-600">{rec.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>AI Engine Powered by BroStartup</span>
          <button
            onClick={fetchAIData}
            className="flex items-center gap-1 text-indigo-600 hover:underline font-semibold"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
