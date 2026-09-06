'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Flame,
  ArrowRight,
  Target,
  BrainCircuit,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  Video,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPT_ACTIONS = [
  { id: 'now', label: 'What should I do now?', icon: Target },
  { id: 'lead', label: 'Tell me about top lead', icon: Flame },
  { id: 'objection', label: 'How to handle price objection?', icon: HelpCircle },
  { id: 'whatsapp', label: 'Write a follow-up WhatsApp', icon: MessageSquare },
  { id: 'demo', label: 'Prepare my demo', icon: Video },
  { id: 'target', label: 'Why am I behind target?', icon: AlertTriangle },
];

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({ isOpen, onClose }) => {
  const [coachData, setCoachData] = useState<any | null>(null);
  const [nextAction, setNextAction] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPromptAnswer, setSelectedPromptAnswer] = useState<string | null>(null);

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

  const handlePromptClick = (promptId: string) => {
    if (promptId === 'now') {
      setSelectedPromptAnswer(
        nextAction?.title
          ? `Top Priority: Call ${nextAction.title} now. ${nextAction.reason}. Goal: ${nextAction.nextStep}`
          : 'Focus on your pending follow-ups and morning discovery calls.'
      );
    } else if (promptId === 'objection') {
      setSelectedPromptAnswer(
        'For price objections: Reframe from cost to monthly ROI. Most Indian retail businesses recover the standard subscription fee within week 1 by eliminating order leakage. Offer a 1-page ROI breakdown.'
      );
    } else if (promptId === 'whatsapp') {
      setSelectedPromptAnswer(
        'Suggested WhatsApp: "Hi {{customer_name}}, James here. Dropping a quick note regarding the automated order sync we discussed for {{business_name}}. When is a good 5 mins to chat today?"'
      );
    } else if (promptId === 'demo') {
      setSelectedPromptAnswer(
        'Demo Checklist: 1. Confirm customer problem (manual order sync) 2. Show 2-minute live catalog walkthrough 3. Demonstrate WhatsApp order alert 4. Ask for closing slot.'
      );
    } else if (promptId === 'target') {
      setSelectedPromptAnswer(
        'Target Diagnosis: Average deal cycle is 3.5 days. To stay on track, increase connect rate by conducting discovery calls in the 10am-1pm morning block.'
      );
    } else {
      setSelectedPromptAnswer(
        nextAction?.title
          ? `${nextAction.title}: Hot lead. Last reaction showed strong interest. Immediate action required.`
          : 'Select a lead from your pipeline to view the full dossier.'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border-l border-slate-200 h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-indigo-50/60">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-600 p-2 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">AI Sales Assistant</h2>
              <p className="text-[11px] text-slate-500">Instant sales coaching & deal recommendations</p>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Quick Prompt Action Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Quick Sales Questions
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_PROMPT_ACTIONS.map((q) => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.id}
                    onClick={() => handlePromptClick(q.id)}
                    className="flex items-center gap-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-900 text-slate-700 text-left font-semibold text-[11px] transition-all"
                  >
                    <Icon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{q.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Answer Banner if clicked */}
          {selectedPromptAnswer && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Assistant Response
                </span>
                <button
                  onClick={() => setSelectedPromptAnswer(null)}
                  className="text-[10px] text-indigo-600 font-bold hover:underline"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-xs leading-relaxed font-medium">{selectedPromptAnswer}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              <div className="h-28 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
              <div className="h-36 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
            </div>
          ) : (
            <>
              {/* What Should I Do Now Card */}
              {nextAction && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-indigo-600 text-white px-2 py-0.5 text-[10px] font-bold tracking-wide flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      NEXT BEST ACTION
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900">{nextAction.title}</h3>
                    <p className="text-xs text-indigo-950 font-semibold mt-0.5">{nextAction.objective}</p>
                  </div>

                  <p className="text-[11px] text-slate-700 italic bg-white p-2.5 rounded-lg border border-indigo-100">
                    &ldquo;{nextAction.reason}&rdquo;
                  </p>
                </div>
              )}

              {/* Pipeline Diagnostic */}
              {coachData && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold">
                    <BrainCircuit className="h-4 w-4 text-amber-600" />
                    <span>Pipeline Bottleneck Diagnosis</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {coachData.bottleneck || 'No bottlenecks detected in current sales cycle.'}
                  </p>
                </div>
              )}

              {/* What Worked & Winning Behaviors */}
              {coachData?.whatWorked && coachData.whatWorked.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Winning Sales Tactics
                  </h4>
                  <div className="space-y-1.5">
                    {coachData.whatWorked.map((item: string, idx: number) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-start gap-2"
                      >
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{item}</span>
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
          <span>AI Sales Assistant</span>
          <button
            onClick={fetchAIData}
            className="flex items-center gap-1 text-indigo-600 hover:underline font-bold"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};
