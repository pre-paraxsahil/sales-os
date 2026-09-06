"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Play,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Video,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { BeforeDemoBriefModal } from "./BeforeDemoBriefModal";
import { DemoPlanDrawer } from "./DemoPlanDrawer";
import { LiveDemoModal } from "./LiveDemoModal";
import { PostDemoModal } from "./PostDemoModal";
import { QuickWhatsAppModal } from "@/components/whatsapp/QuickWhatsAppModal";

interface DemoItem {
  id: string;
  leadId: string;
  title?: string | null;
  scheduledAt: string;
  durationMinutes?: number | null;
  status: string;
  outcome?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  notes?: string | null;
  demoPlan?: {
    id: string;
    version: number;
    confidence?: number | null;
    model?: string | null;
  } | null;
}

interface DemoListAndCockpitProps {
  leadId: string;
  leadName?: string;
  businessName?: string;
}

export function DemoListAndCockpit({
  leadId,
  leadName,
  businessName,
}: DemoListAndCockpitProps) {
  const [demos, setDemos] = useState<DemoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [activeBriefDemoId, setActiveBriefDemoId] = useState<string | null>(null);
  const [activePlanDemoId, setActivePlanDemoId] = useState<string | null>(null);
  const [activeLiveDemoId, setActiveLiveDemoId] = useState<string | null>(null);
  const [activePostDemoId, setActivePostDemoId] = useState<string | null>(null);
  const [postDemoWhatsAppCat, setPostDemoWhatsAppCat] = useState<string | null>(null);

  // Schedule Demo Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>(`Product Demo - ${businessName || leadName || "Client"}`);
  const [newDate, setNewDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [newDuration, setNewDuration] = useState<number>(30);
  const [newNotes, setNewNotes] = useState<string>("");
  const [isCreatingDemo, setIsCreatingDemo] = useState<boolean>(false);

  const fetchDemos = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/demos?leadId=${leadId}`);
      if (!res.ok) throw new Error("Failed to load demos.");
      const data = await res.json();
      setDemos(data.demos || []);
    } catch (err: any) {
      console.error("Error fetching demos:", err);
      setError(err.message || "Failed to load demos.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchDemos();
  }, [fetchDemos]);

  const handleCreateDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreatingDemo(true);
      const res = await fetch("/api/demos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          title: newTitle,
          scheduledAt: new Date(newDate).toISOString(),
          durationMinutes: newDuration,
          notes: newNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to schedule demo.");
      }

      setIsScheduleModalOpen(false);
      fetchDemos();
    } catch (err: any) {
      alert(err.message || "Error scheduling demo.");
    } finally {
      setIsCreatingDemo(false);
    }
  };

  const getOutcomeBadge = (outcome: string | null | undefined) => {
    if (!outcome) return null;
    const styles: Record<string, string> = {
      INTERESTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      PRICING_DISCUSSION: "bg-indigo-50 text-indigo-700 border-indigo-200",
      FOLLOW_UP: "bg-amber-50 text-amber-700 border-amber-200",
      DECISION_PENDING: "bg-sky-50 text-sky-700 border-sky-200",
      NOT_INTERESTED: "bg-slate-100 text-slate-700 border-slate-200",
      WON: "bg-purple-50 text-purple-700 border-purple-200",
      LOST: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
          styles[outcome] || "bg-slate-100 text-slate-700 border-slate-200"
        }`}
      >
        {outcome}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/70 via-white to-white p-5 rounded-2xl border border-indigo-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Demos & Presentation Plans</h2>
            <p className="text-xs text-slate-500">
              Personalized demo plans, live presenter mode, and post-demo workflow.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDemos()}
            className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition hover:bg-slate-50 shadow-xs"
            title="Refresh Demos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Demo</span>
          </button>
        </div>
      </div>

      {/* Demo List Body */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading scheduled demos...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      ) : demos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-center shadow-xs">
          <Video className="w-12 h-12 text-slate-400 mb-3" />
          <h3 className="text-sm font-bold text-slate-900">No Demos Scheduled Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
            Schedule a product demo for this lead to generate personalized AI demo plans and launch Live Demo Mode.
          </p>
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule First Demo</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {demos.map((demo) => {
            const hasPlan = Boolean(demo.demoPlan);
            const isCompleted = demo.status === "COMPLETED";

            return (
              <div
                key={demo.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition flex flex-col gap-4 shadow-xs"
              >
                {/* Demo Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}
                      >
                        {demo.status}
                      </span>
                      {getOutcomeBadge(demo.outcome)}
                      {hasPlan && (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          Plan v{demo.demoPlan?.version || 1}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">
                      {demo.title || demo.notes?.split('\n')[0] || "OneComPro Product Demo"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(demo.scheduledAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-mono font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {demo.durationMinutes || 30}m
                    </span>
                  </div>
                </div>

                {/* Notes / Next Action info */}
                {(demo.notes || demo.nextAction) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {demo.notes && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                          Notes / Reaction
                        </span>
                        <p className="line-clamp-2">{demo.notes}</p>
                      </div>
                    )}
                    {demo.nextAction && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                          Next Action
                        </span>
                        <p className="line-clamp-2">{demo.nextAction}</p>
                        {demo.nextActionAt && (
                          <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
                            Due: {new Date(demo.nextActionAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons: Brief, Plan, Live Demo, Post-Demo */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  {/* 1. Before-Demo Brief */}
                  <button
                    onClick={() => setActiveBriefDemoId(demo.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition border border-slate-200 shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Before-Demo Brief</span>
                  </button>

                  {/* 2. AI Demo Plan */}
                  <button
                    onClick={() => setActivePlanDemoId(demo.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition border border-slate-200 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>{hasPlan ? "View / Edit Plan" : "Generate AI Plan"}</span>
                  </button>

                  {/* 3. Launch Live Demo */}
                  <button
                    onClick={() => setActiveLiveDemoId(demo.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Live Demo</span>
                  </button>

                  {/* 4. Log Outcome / Post-Demo */}
                  <button
                    onClick={() => setActivePostDemoId(demo.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition border border-slate-200 ml-auto shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isCompleted ? "Update Outcome" : "Log Outcome"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Demo Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Schedule New Product Demo</h3>

            <form onSubmit={handleCreateDemo} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Demo Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Duration (Mins)</label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Initial Notes</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Key areas client requested to see..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-indigo-600 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDemo}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-xs"
                >
                  {isCreatingDemo ? "Scheduling..." : "Schedule Demo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Before-Demo Brief Modal */}
      {activeBriefDemoId && (
        <BeforeDemoBriefModal
          demoId={activeBriefDemoId}
          leadId={leadId}
          isOpen={Boolean(activeBriefDemoId)}
          onClose={() => setActiveBriefDemoId(null)}
          onOpenDemoPlan={() => {
            const currentId = activeBriefDemoId;
            setActiveBriefDemoId(null);
            setActivePlanDemoId(currentId);
          }}
          onLaunchLiveDemo={() => {
            const currentId = activeBriefDemoId;
            setActiveBriefDemoId(null);
            setActiveLiveDemoId(currentId);
          }}
        />
      )}

      {/* AI Demo Plan Drawer */}
      {activePlanDemoId && (
        <DemoPlanDrawer
          demoId={activePlanDemoId}
          leadId={leadId}
          isOpen={Boolean(activePlanDemoId)}
          onClose={() => setActivePlanDemoId(null)}
          onPlanUpdated={() => fetchDemos()}
        />
      )}

      {/* Live Demo Presenter Modal */}
      {activeLiveDemoId && (
        <LiveDemoModal
          demoId={activeLiveDemoId}
          leadId={leadId}
          isOpen={Boolean(activeLiveDemoId)}
          onClose={() => setActiveLiveDemoId(null)}
          onFinishDemo={() => {
            const currentId = activeLiveDemoId;
            setActiveLiveDemoId(null);
            setActivePostDemoId(currentId);
          }}
        />
      )}

      {/* Post-Demo Outcome Modal */}
      {activePostDemoId && (
        <PostDemoModal
          demoId={activePostDemoId}
          leadId={leadId}
          isOpen={Boolean(activePostDemoId)}
          onClose={() => setActivePostDemoId(null)}
          onSuccess={() => {
            setActivePostDemoId(null);
            fetchDemos();
          }}
          onOpenWhatsApp={(cat) => setPostDemoWhatsAppCat(cat)}
        />
      )}

      {/* Post-Demo Follow-up Quick WhatsApp Modal */}
      {postDemoWhatsAppCat && (
        <QuickWhatsAppModal
          isOpen={Boolean(postDemoWhatsAppCat)}
          onClose={() => setPostDemoWhatsAppCat(null)}
          leadId={leadId}
          leadName={leadName}
          businessName={businessName}
          initialCategory={postDemoWhatsAppCat}
        />
      )}
    </div>
  );
}
