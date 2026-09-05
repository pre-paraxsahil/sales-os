"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Eye,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Ban,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Send,
  Flag,
  Check,
} from "lucide-react";
import type { DemoPlanResult, LiveDemoStepRecord } from "@/lib/ai/types";

export interface FormattedDemoStep {
  featureId: string;
  featureName: string;
  timeMinutes: number;
  showScreen: string;
  say: string;
  ask: string;
  why: string;
  watchSignals: string;
  avoid: string;
  productStatus: string;
  planRequirement?: string;
}

interface LiveDemoModalProps {
  demoId: string;
  leadId: string;
  leadName?: string;
  businessName?: string;
  isOpen: boolean;
  onClose: () => void;
  onFinishDemo: () => void;
  initialPlan?: DemoPlanResult | null;
}

export function LiveDemoModal({
  demoId,
  leadId,
  leadName,
  businessName,
  isOpen,
  onClose,
  onFinishDemo,
  initialPlan,
}: LiveDemoModalProps) {
  const [plan, setPlan] = useState<DemoPlanResult | null>(initialPlan || null);
  const [loading, setLoading] = useState<boolean>(!initialPlan);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  // Timer state
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Step tracking state
  const [stepRecords, setStepRecords] = useState<Record<string, LiveDemoStepRecord>>({});
  const [quickNote, setQuickNote] = useState<string>("");
  const [isSavingStep, setIsSavingStep] = useState<boolean>(false);

  // Load plan and current tracking state
  const fetchPlanAndTracking = useCallback(async () => {
    if (!demoId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/demos/${demoId}/plan`);
      if (res.ok) {
        const data = await res.json();
        if (data.plan) {
          setPlan(data.plan);
          // initialize step records if existing
          if (data.stepsTracking) {
            try {
              const tracking: LiveDemoStepRecord[] = typeof data.stepsTracking === "string"
                ? JSON.parse(data.stepsTracking)
                : data.stepsTracking;
              const map: Record<string, LiveDemoStepRecord> = {};
              tracking.forEach((t) => {
                const key = t.featureId || t.feature;
                if (key) map[key] = t;
              });
              setStepRecords(map);
            } catch (e) {
              console.error("Failed to parse stepsTracking:", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load demo plan for live mode:", err);
    } finally {
      setLoading(false);
    }
  }, [demoId]);

  useEffect(() => {
    if (isOpen) {
      if (!initialPlan) {
        fetchPlanAndTracking();
      } else {
        setPlan(initialPlan);
      }
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
    }
  }, [isOpen, initialPlan, fetchPlanAndTracking]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && isOpen) {
      interval = setInterval(() => {
        setSecondsElapsed((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isOpen]);

  // Format timer
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  const rawSteps: any[] = (plan as any)?.featureSequence || (plan as any)?.featureSteps || [];
  const steps: FormattedDemoStep[] = rawSteps.map((s: any, idx: number): FormattedDemoStep => ({
    featureId: s.feature || s.featureId || `step-${idx}`,
    featureName: s.feature || s.featureName || `Step ${idx + 1}`,
    timeMinutes: s.timeMinutes || 8,
    showScreen: s.whatToShow || s.showScreen || "Target Workflow / Screen",
    say: s.whatToSay || s.say || "Present core value proposition",
    ask: s.askQuestion || s.ask || "Check customer reaction and process fit",
    why: s.whyItMatters || s.why || s.whyRelevant || "Solves operational pain point",
    watchSignals: s.expectedCustomerValue || s.watchSignals || "Buying signal or engagement",
    avoid: s.avoid || (plan?.avoid && plan.avoid[0]) || "",
    productStatus: s.productStatus || "AVAILABLE",
    planRequirement: s.planRequirement,
  }));
  const currentStep = steps[currentStepIdx] || null;
  const currentRecord = currentStep ? stepRecords[currentStep.featureId] : null;

  // Persist step update to server
  const persistStep = async (record: LiveDemoStepRecord) => {
    try {
      setIsSavingStep(true);
      await fetch(`/api/demos/${demoId}/steps`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: record }),
      });
    } catch (err) {
      console.error("Failed to persist step:", err);
    } finally {
      setIsSavingStep(false);
    }
  };

  const handleToggleDiscussed = () => {
    if (!currentStep) return;
    const isCurrentlyDiscussed = currentRecord?.status === "DISCUSSED";
    const newStatus: "PENDING" | "DISCUSSED" = isCurrentlyDiscussed ? "PENDING" : "DISCUSSED";
    const updated: LiveDemoStepRecord = {
      feature: currentStep.featureName,
      featureId: currentStep.featureId,
      status: newStatus,
      discussed: !isCurrentlyDiscussed,
      notes: currentRecord?.notes || [],
      completedAt: !isCurrentlyDiscussed ? new Date().toISOString() : undefined,
    };
    setStepRecords((prev) => ({ ...prev, [currentStep.featureId]: updated }));
    persistStep(updated);
  };

  const handleSkipStep = () => {
    if (!currentStep) return;
    const updated: LiveDemoStepRecord = {
      feature: currentStep.featureName,
      featureId: currentStep.featureId,
      status: "SKIPPED",
      discussed: false,
      skipped: true,
      notes: currentRecord?.notes || [],
      completedAt: new Date().toISOString(),
    };
    setStepRecords((prev) => ({ ...prev, [currentStep.featureId]: updated }));
    persistStep(updated);

    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    }
  };

  const handleAddNote = () => {
    if (!currentStep || !quickNote.trim()) return;
    const existingNotes = currentRecord?.notes || [];
    const updatedNotes = [...existingNotes, quickNote.trim()];
    const updated: LiveDemoStepRecord = {
      feature: currentStep.featureName,
      featureId: currentStep.featureId,
      status: currentRecord?.status || "DISCUSSED",
      discussed: currentRecord?.discussed ?? true,
      notes: updatedNotes,
      completedAt: currentRecord?.completedAt || new Date().toISOString(),
    };
    setStepRecords((prev) => ({ ...prev, [currentStep.featureId]: updated }));
    persistStep(updated);
    setQuickNote("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Cockpit Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
              LIVE DEMO MODE
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <h1 className="text-sm font-medium text-slate-300 hidden sm:block truncate max-w-xs">
            {leadName ? `${leadName} (${businessName || "Client"})` : (plan as any)?.leadName || "Live Presentation"}
          </h1>
          {(plan?.featureSequence?.[0]?.planRequirement || (plan as any)?.recommendedPlan) && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 font-medium">
              Target: {plan?.featureSequence?.[0]?.planRequirement || (plan as any)?.recommendedPlan}
            </span>
          )}
        </div>

        {/* Center: Live Timer */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-base font-bold text-slate-100 tracking-wider">
            {formatTimer(secondsElapsed)}
          </span>
          <button
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="p-1 text-slate-400 hover:text-slate-100 transition rounded hover:bg-slate-800"
            title={isTimerRunning ? "Pause Timer" : "Resume Timer"}
          >
            {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setSecondsElapsed(0)}
            className="p-1 text-slate-500 hover:text-slate-300 transition rounded hover:bg-slate-800"
            title="Reset Timer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Right: Step Counter & Finish Demo */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-400">
            Step <strong className="text-white">{steps.length ? currentStepIdx + 1 : 0}</strong> of{" "}
            <strong className="text-white">{steps.length}</strong>
          </span>
          <button
            onClick={onFinishDemo}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm hover:shadow"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Finish Demo</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition rounded-lg hover:bg-slate-800"
            title="Exit Live Mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 h-1">
        <div
          className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-1 transition-all duration-300"
          style={{
            width: steps.length ? `${((currentStepIdx + 1) / steps.length) * 100}%` : "0%",
          }}
        />
      </div>

      {/* Main Body */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400" />
          <p className="text-sm text-slate-400">Loading live demo presenter...</p>
        </div>
      ) : !steps.length ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
          <h2 className="text-lg font-semibold text-white">No Demo Steps Available</h2>
          <p className="text-sm text-slate-400 max-w-md mt-1 mb-4">
            An AI Demo Plan has not been generated for this demo yet, or no feature steps were specified.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Step Navigation Sidebar (Desktop) */}
          <aside className="hidden md:flex flex-col w-72 bg-slate-900/50 border-r border-slate-800/80 overflow-y-auto p-4 gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 px-1">
              Demo Flow ({steps.length} Steps)
            </h3>
            {steps.map((step, idx) => {
              const rec = stepRecords[step.featureId];
              const isCurrent = idx === currentStepIdx;
              const isDiscussed = rec?.status === "DISCUSSED";
              const isSkipped = rec?.status === "SKIPPED";

              return (
                <button
                  key={step.featureId || idx}
                  onClick={() => setCurrentStepIdx(idx)}
                  className={`flex items-start gap-3 p-3 rounded-xl text-left transition border ${
                    isCurrent
                      ? "bg-indigo-950/60 border-indigo-600 text-white shadow-sm"
                      : "bg-slate-900/30 border-slate-800/50 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 ${
                      isDiscussed
                        ? "bg-emerald-600 text-white"
                        : isSkipped
                        ? "bg-slate-700 text-slate-400"
                        : isCurrent
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isDiscussed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate leading-tight">{step.featureName}</p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{step.showScreen}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-400">{step.timeMinutes}m</span>
                      {isDiscussed && (
                        <span className="text-[10px] text-emerald-400 font-medium">Discussed</span>
                      )}
                      {isSkipped && (
                        <span className="text-[10px] text-slate-400 font-medium">Skipped</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Main Presenter Stage */}
          <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
            {/* Step Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-indigo-400 font-bold tracking-wider uppercase">
                    STEP {currentStepIdx + 1} OF {steps.length} • {currentStep.timeMinutes} MIN
                  </span>
                  {currentRecord?.status === "DISCUSSED" && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                      <CheckCircle2 className="w-3 h-3" /> Discussed
                    </span>
                  )}
                  {currentRecord?.status === "SKIPPED" && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      Skipped
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white mt-1">
                  {currentStep.featureName}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleDiscussed}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    currentRecord?.status === "DISCUSSED"
                      ? "bg-emerald-900/60 border-emerald-600 text-emerald-300"
                      : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {currentRecord?.status === "DISCUSSED" ? "Marked Discussed" : "Mark Discussed"}
                  </span>
                </button>
                <button
                  onClick={handleSkipStep}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition border border-slate-800"
                >
                  Skip
                </button>
              </div>
            </div>

            {/* NOW SHOW: Prominent Visual Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-indigo-950/20 border border-indigo-700/50 shadow-lg">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Eye className="w-4 h-4" />
                <span>NOW SHOW (Screen & Workflow)</span>
              </div>
              <p className="text-base sm:text-lg text-indigo-100 font-medium leading-relaxed">
                {currentStep.showScreen}
              </p>
            </div>

            {/* SAY / ASK / WHY Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* SAY */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>SAY (Talking Point)</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed italic">
                  &ldquo;{currentStep.say}&rdquo;
                </p>
              </div>

              {/* ASK */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <HelpCircle className="w-4 h-4" />
                  <span>ASK (Discovery Question)</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  {currentStep.ask}
                </p>
              </div>

              {/* WHY */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>WHY (Customer Value)</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {currentStep.why}
                </p>
              </div>
            </div>

            {/* WATCH & AVOID Guidance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WATCH */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <Eye className="w-4 h-4" />
                  <span>WATCH FOR (Customer Reactions)</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-emerald-300/90">
                    <ThumbsUp className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                    <span><strong>Signal:</strong> {currentStep.watchSignals || "Nods, asks about specific implementation or rollout timeline"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-rose-300/90">
                    <ThumbsDown className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                    <span><strong>Flag:</strong> Confused pause, concern over complexity or workflow change</span>
                  </div>
                </div>
              </div>

              {/* AVOID */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <Ban className="w-4 h-4" />
                  <span>AVOID MENTIONING</span>
                </div>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  {currentStep.avoid || "Do not dive into advanced API configurations or features locked under higher enterprise tiers unless specifically requested."}
                </p>
              </div>
            </div>

            {/* In-Demo Step Notes */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                In-Demo Step Notes
              </label>

              {/* Existing notes for this step */}
              {currentRecord?.notes && currentRecord.notes.length > 0 && (
                <ul className="space-y-1.5 mb-3">
                  {currentRecord.notes.map((n, i) => (
                    <li
                      key={i}
                      className="text-xs bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-200 flex items-center justify-between"
                    >
                      <span>{n}</span>
                      <span className="text-[10px] text-slate-400">saved</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                  placeholder="Type quick customer reaction or note and press Enter..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!quickNote.trim() || isSavingStep}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition"
                >
                  <Send className="w-3 h-3" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Bottom Floating Step Navigation Bar */}
      <footer className="flex items-center justify-between px-6 py-3 bg-slate-900 border-t border-slate-800">
        <button
          onClick={() => setCurrentStepIdx((idx) => Math.max(0, idx - 1))}
          disabled={currentStepIdx === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 text-xs font-semibold transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Step</span>
        </button>

        <div className="text-xs text-slate-400 hidden sm:block">
          Use buttons or sidebar to navigate steps seamlessly
        </div>

        {currentStepIdx < steps.length - 1 ? (
          <button
            onClick={() => setCurrentStepIdx((idx) => Math.min(steps.length - 1, idx + 1))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm"
          >
            <span>Next Step</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onFinishDemo}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
          >
            <Flag className="w-4 h-4" />
            <span>Finish & Log Demo</span>
          </button>
        )}
      </footer>
    </div>
  );
}
