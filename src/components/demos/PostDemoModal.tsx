"use client";

import { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  ShieldCheck,
  Flag,
  ArrowRight,
  Plus,
  Trash2,
  MessageSquare,
} from "lucide-react";

interface PostDemoModalProps {
  demoId: string;
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenWhatsApp?: (category: string) => void;
}

interface CandidateFact {
  category: "NEED" | "PAIN_POINT" | "BUDGET" | "TIMELINE" | "TECH_STACK" | "DECISION_MAKER" | "GENERAL";
  fact: string;
  confidence: number;
}

const OUTCOME_OPTIONS = [
  { value: "INTERESTED", label: "Interested (Hot)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "PRICING_DISCUSSION", label: "Pricing Discussion", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "FOLLOW_UP", label: "Follow-up Required", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "DECISION_PENDING", label: "Decision Pending", color: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "NOT_INTERESTED", label: "Not Interested", color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "WON", label: "Closed / Won 🎉", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "LOST", label: "Lost", color: "bg-rose-50 text-rose-700 border-rose-200" },
];

export function PostDemoModal({
  demoId,
  leadId,
  isOpen,
  onClose,
  onSuccess,
  onOpenWhatsApp,
}: PostDemoModalProps) {
  const [outcome, setOutcome] = useState<string>("INTERESTED");
  const [notes, setNotes] = useState<string>("");
  const [nextAction, setNextAction] = useState<string>("Send follow-up WhatsApp message & customized quote");
  const [nextActionAt, setNextActionAt] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  // Candidate Facts to sync to Customer Memory
  const [candidateFacts, setCandidateFacts] = useState<CandidateFact[]>([]);
  const [newFactText, setNewFactText] = useState<string>("");
  const [newFactCat, setNewFactCat] = useState<CandidateFact["category"]>("NEED");

  // Existing confirmed facts from memory for conflict checking
  const [confirmedMemories, setConfirmedMemories] = useState<Array<{ id: string; category: string; content: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [triggerWhatsAppAfter, setTriggerWhatsAppAfter] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && leadId) {
      // Fetch current confirmed customer memories to safeguard against silent overwriting
      fetch(`/api/leads/${leadId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.customerMemories) {
            setConfirmedMemories(
              data.customerMemories
                .filter((m: any) => m.status === "CONFIRMED")
                .map((m: any) => ({
                  id: m.id,
                  category: m.category,
                  content: m.content || m.detail || "",
                }))
            );
          }
        })
        .catch((err) => console.error("Failed to load customer memories:", err));
    }
  }, [isOpen, leadId]);

  const handleAddCandidateFact = () => {
    if (!newFactText.trim()) return;
    setCandidateFacts((prev) => [
      ...prev,
      {
        category: newFactCat,
        fact: newFactText.trim(),
        confidence: 0.9,
      },
    ]);
    setNewFactText("");
  };

  const handleRemoveCandidateFact = (index: number) => {
    setCandidateFacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/demos/${demoId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome,
          notes: notes.trim() || undefined,
          nextAction: nextAction.trim() || undefined,
          nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : undefined,
          candidateFacts: candidateFacts.length > 0 ? candidateFacts : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to log demo completion.");
      }

      onSuccess();
      onClose();

      if (triggerWhatsAppAfter && onOpenWhatsApp) {
        const cat =
          outcome === "PRICING_DISCUSSION"
            ? "PRICE_OBJECTION"
            : outcome === "DECISION_PENDING"
            ? "TEAM_DISCUSSION"
            : outcome === "NOT_INTERESTED"
            ? "LOST_LEAD"
            : "POST_DEMO";
        onOpenWhatsApp(cat);
      }
    } catch (err: any) {
      console.error("Error completing demo:", err);
      setErrorMessage(err.message || "An error occurred while logging demo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Post-Demo Wrap-Up & Workflow</h2>
              <p className="text-xs text-slate-500">
                Log final outcome, schedule next action, and record customer facts safely.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 transition rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Outcome Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Demo Outcome *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OUTCOME_OPTIONS.map((opt) => {
                const isSelected = outcome === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOutcome(opt.value)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition ${
                      isSelected
                        ? `${opt.color} ring-2 ring-indigo-500 shadow-xs`
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Demo Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Demo Notes & Customer Reactions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What resonated most? What concerns or questions came up? Any pricing commitments or timeline mentioned?"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* 3. Next Action & Next Action Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Next Action
              </label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="e.g. Send proposal, WhatsApp follow-up"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Next Action Date & Time
              </label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:bg-white focus-within:border-indigo-500 transition-colors">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="datetime-local"
                  value={nextActionAt}
                  onChange={(e) => setNextActionAt(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. Customer Memory Candidate Facts (Safeguarded) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Customer Memory Sync (Candidate Facts)
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Safe candidate queue • Confirmed facts protected
              </span>
            </div>

            {/* List of existing confirmed facts to prevent blind overwrite */}
            {confirmedMemories.length > 0 && (
              <div className="text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600 shadow-xs">
                <span className="font-bold text-slate-800 block mb-1">
                  Active Confirmed Memories ({confirmedMemories.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {confirmedMemories.slice(0, 4).map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {m.category}: {m.content}
                    </span>
                  ))}
                  {confirmedMemories.length > 4 && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      +{confirmedMemories.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Candidate Facts List */}
            {candidateFacts.length > 0 && (
              <ul className="space-y-1.5">
                {candidateFacts.map((cf, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                        {cf.category}
                      </span>
                      <span>{cf.fact}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCandidateFact(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Add Fact Inline */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={newFactCat}
                onChange={(e) => setNewFactCat(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-xs"
              >
                <option value="NEED">Need</option>
                <option value="PAIN_POINT">Pain Point</option>
                <option value="BUDGET">Budget</option>
                <option value="TIMELINE">Timeline</option>
                <option value="TECH_STACK">Tech Stack</option>
                <option value="DECISION_MAKER">Decision Maker</option>
                <option value="GENERAL">General</option>
              </select>
              <input
                type="text"
                value={newFactText}
                onChange={(e) => setNewFactText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCandidateFact();
                  }
                }}
                placeholder="e.g. Budget approved for ₹18,000/yr, rollout target by next Monday..."
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
              />
              <button
                type="button"
                onClick={handleAddCandidateFact}
                disabled={!newFactText.trim()}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-40 text-slate-700 rounded-lg text-xs transition"
                title="Add candidate memory fact"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            {outcome !== "NOT_INTERESTED" && (
              <button
                type="button"
                onClick={(e) => {
                  setTriggerWhatsAppAfter(true);
                  const form = (e.currentTarget as HTMLElement).closest('form');
                  if (form) form.requestSubmit();
                }}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-xl transition shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Save & Send WhatsApp</span>
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Logging Demo...</span>
                </>
              ) : (
                <>
                  <span>Save Demo & Update Workflow</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
