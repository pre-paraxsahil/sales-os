"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Play,
  FileText,
  Sparkles,
  CheckCircle2,
  PhoneCall,
  User,
  Building,
  RefreshCw,
  Plus,
  ArrowRight,
  Filter,
  ShieldCheck,
  Coffee,
  AlertTriangle,
  Zap,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { BeforeDemoBriefModal } from "@/components/demos/BeforeDemoBriefModal";
import { DemoPlanDrawer } from "@/components/demos/DemoPlanDrawer";
import { LiveDemoModal } from "@/components/demos/LiveDemoModal";
import { PostDemoModal } from "@/components/demos/PostDemoModal";
import { QuickWhatsAppModal } from "@/components/whatsapp/QuickWhatsAppModal";
import { cn } from "@/lib/utils";

interface DemoItem {
  id: string;
  leadId: string;
  title?: string | null;
  scheduledAt: string;
  durationMinutes?: number | null;
  status: string;
  outcome?: string | null;
  nextAction?: string | null;
  notes?: string | null;
  lead?: {
    id: string;
    title?: string | null;
    contactName?: string | null;
    businessName?: string | null;
    contact?: { name?: string | null; phone?: string | null; email?: string | null } | null;
    business?: { name?: string | null; industry?: string | null } | null;
    status: string;
    temperature: string;
  };
  demoPlan?: {
    id: string;
    version: number;
  } | null;
}

interface ScheduleBlockData {
  id: string;
  title: string;
  blockType: string;
  startTime: string;
  endTime: string;
  isProtected: boolean;
  priority: string;
  notes?: string | null;
}

export function ScheduleClient() {
  const [activeTab, setActiveTab] = useState<"DAY" | "WEEK" | "DEMOS">("DAY");
  const [demos, setDemos] = useState<DemoItem[]>([]);
  const [scheduleData, setScheduleData] = useState<{
    blocks: ScheduleBlockData[];
    conflicts: any[];
  }>({ blocks: [], conflicts: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<"ALL" | "SCHEDULED" | "COMPLETED">("ALL");
  const [isRearranging, setIsRearranging] = useState<boolean>(false);
  const [rearrangedNotice, setRearrangedNotice] = useState<string | null>(null);

  // Demo Modals
  const [activeBriefDemo, setActiveBriefDemo] = useState<{ id: string; leadId: string } | null>(null);
  const [activePlanDemo, setActivePlanDemo] = useState<{ id: string; leadId: string } | null>(null);
  const [activeLiveDemo, setActiveLiveDemo] = useState<{ id: string; leadId: string } | null>(null);
  const [activePostDemo, setActivePostDemo] = useState<{ id: string; leadId: string } | null>(null);
  const [quickWhatsAppTarget, setQuickWhatsAppTarget] = useState<{ leadId: string; category: string } | null>(null);

  // Load Schedule & Demos
  const fetchScheduleAndDemos = useCallback(async () => {
    try {
      setLoading(true);
      const [demosRes, scheduleRes] = await Promise.all([
        fetch("/api/demos"),
        fetch("/api/schedule"),
      ]);

      if (demosRes.ok) {
        const data = await demosRes.json();
        setDemos(data.demos || []);
      }
      if (scheduleRes.ok) {
        const data = await scheduleRes.json();
        if (data.success) {
          setScheduleData({
            blocks: data.data.blocks || [],
            conflicts: data.data.conflicts || [],
          });
        }
      }
    } catch (err) {
      console.error("Failed to load schedule data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduleAndDemos();
  }, [fetchScheduleAndDemos]);

  // Trigger Dynamic Rearrangement
  const handleAutoRearrange = async () => {
    try {
      setIsRearranging(true);
      setRearrangedNotice(null);
      const res = await fetch("/api/schedule/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        setRearrangedNotice(
          json.data?.movedItems?.length > 0
            ? `SCHEDULE UPDATED: Automatically rearranged ${json.data.movedItems.length} flexible blocks around commitments.`
            : "Schedule is already optimally aligned with all commitments."
        );
        fetchScheduleAndDemos();
      }
    } catch (err) {
      console.error("Failed to rearrange schedule:", err);
    } finally {
      setIsRearranging(false);
    }
  };

  const filteredDemos = demos.filter((d) => {
    if (filter === "ALL") return true;
    return d.status === filter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
              Smart Schedule & Time Management
            </span>
            {scheduleData.conflicts.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {scheduleData.conflicts.length} Conflict Detected
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Daily Timeline & Demos</h1>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic sales time blocks, protected lunch hours, conflict detection, and live demo dispatcher.
          </p>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("DAY")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition font-medium",
                activeTab === "DAY" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Day Timeline
            </button>
            <button
              onClick={() => setActiveTab("WEEK")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition font-medium",
                activeTab === "WEEK" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Week View
            </button>
            <button
              onClick={() => setActiveTab("DEMOS")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition font-medium",
                activeTab === "DEMOS" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Demos ({demos.length})
            </button>
          </div>

          <button
            onClick={fetchScheduleAndDemos}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition"
            title="Refresh Schedule"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dynamic Rearrangement Banner */}
      {rearrangedNotice && (
        <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{rearrangedNotice}</span>
          </div>
          <button
            onClick={() => setRearrangedNotice(null)}
            className="text-slate-400 hover:text-slate-200 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Conflicts Alert Banner */}
      {scheduleData.conflicts.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Schedule Conflict Warning</span>
          </div>
          {scheduleData.conflicts.map((c: any) => (
            <div key={c.id} className="text-xs text-rose-200 flex items-center justify-between pl-6">
              <span>{c.title} — {c.reason}</span>
              <button
                onClick={handleAutoRearrange}
                className="px-2.5 py-1 rounded bg-rose-900/50 hover:bg-rose-900 border border-rose-500/30 text-[11px] font-semibold text-rose-200 transition"
              >
                Auto-Rearrange
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 1: DAY TIMELINE VIEW */}
      {activeTab === "DAY" && (
        <div className="space-y-4">
          {loading && scheduleData.blocks.length === 0 ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 w-full rounded-xl skeleton-shimmer border border-slate-800" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800 text-xs">

            <div className="flex items-center gap-3 text-slate-300">
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <Clock className="w-4 h-4 text-indigo-400" /> Default Sales Day (10:00 AM – 6:00 PM)
              </span>
              <span className="text-slate-500">|</span>
              <span className="flex items-center gap-1 text-amber-300">
                <Coffee className="w-3.5 h-3.5 text-amber-400" /> 2:00 PM – 3:00 PM Protected Lunch
              </span>
            </div>

            <button
              onClick={handleAutoRearrange}
              disabled={isRearranging}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isRearranging ? "Optimizing..." : "Auto-Arrange Around Demos"}
            </button>
          </div>

          {/* Timeline Blocks */}
          <div className="space-y-2.5">
            {scheduleData.blocks.map((block) => {
              const startStr = new Date(block.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const endStr = new Date(block.endTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              const isLunch = block.blockType === "LUNCH";
              const isClosing = block.blockType === "CLOSING";
              const isCalling = block.blockType === "CALLING";

              return (
                <div
                  key={block.id}
                  className={cn(
                    "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition shadow-sm",
                    isLunch
                      ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
                      : isClosing
                      ? "bg-purple-950/20 border-purple-500/30 text-purple-200"
                      : isCalling
                      ? "bg-indigo-950/20 border-indigo-500/30 text-indigo-200"
                      : "bg-slate-900/50 border-slate-800 text-slate-300"
                  )}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="font-mono font-bold text-slate-300 shrink-0 w-28 text-[11px]">
                      {startStr} – {endStr}
                    </div>

                    <div>
                      <div className="font-bold text-slate-100 flex items-center gap-2">
                        <span>{block.title}</span>
                        {block.isProtected && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Protected
                          </span>
                        )}
                      </div>
                      {block.notes && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{block.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 border border-slate-800 text-slate-400">
                      {block.blockType}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          </>
          )}
        </div>
      )}

      {/* TAB 2: WEEK VIEW */}
      {activeTab === "WEEK" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Standard 6-Day Sales Week (Monday to Saturday)</span>
            <span className="text-indigo-400 font-medium">Weekly demo target: 6 demos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, idx) => (
              <div
                key={day}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs">{day}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Day {idx + 1}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    10:00 AM – 6:00 PM
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1">
                  <div className="text-slate-400">
                    Demos: <span className="font-mono text-emerald-400 font-semibold">{idx === 0 ? demos.length : 0}</span>
                  </div>
                  <div className="text-slate-400">
                    Status: <span className="text-slate-300">Active</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DEMOS LIST VIEW */}
      {activeTab === "DEMOS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Filter scheduled presentations:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition",
                  filter === "ALL" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                All ({demos.length})
              </button>
              <button
                onClick={() => setFilter("SCHEDULED")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition",
                  filter === "SCHEDULED" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Scheduled
              </button>
              <button
                onClick={() => setFilter("COMPLETED")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition",
                  filter === "COMPLETED" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Completed
              </button>
            </div>
          </div>

          {filteredDemos.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 rounded-xl border border-slate-800 bg-slate-900/20">
              No demos match the current filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDemos.map((demo) => {
                const sDate = new Date(demo.scheduledAt);
                const hasPlan = Boolean(demo.demoPlan);

                return (
                  <div
                    key={demo.id}
                    className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3.5 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {demo.lead?.business?.name || demo.lead?.title || "Prospect"}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {demo.lead?.contact?.name || "Contact Person"} •{" "}
                          {demo.lead?.contact?.phone || "No phone"}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase",
                          demo.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        )}
                      >
                        {demo.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-300 font-mono pt-2 border-t border-slate-800">
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                        {sDate.toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {sDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span>({demo.durationMinutes || 30} mins)</span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => setActiveBriefDemo({ id: demo.id, leadId: demo.leadId })}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                      >
                        Brief
                      </button>
                      <button
                        onClick={() => setActivePlanDemo({ id: demo.id, leadId: demo.leadId })}
                        className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold transition flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        {hasPlan ? "Plan" : "Generate Plan"}
                      </button>
                      <button
                        onClick={() => setActiveLiveDemo({ id: demo.id, leadId: demo.leadId })}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 ml-auto"
                      >
                        <Play className="w-3 h-3 fill-current" /> Live Demo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {activeBriefDemo && (
        <BeforeDemoBriefModal
          demoId={activeBriefDemo.id}
          leadId={activeBriefDemo.leadId}
          isOpen={Boolean(activeBriefDemo)}
          onClose={() => setActiveBriefDemo(null)}
          onOpenDemoPlan={() => {
            const current = activeBriefDemo;
            setActiveBriefDemo(null);
            setActivePlanDemo(current);
          }}
          onLaunchLiveDemo={() => {
            const current = activeBriefDemo;
            setActiveBriefDemo(null);
            setActiveLiveDemo(current);
          }}
        />
      )}

      {activePlanDemo && (
        <DemoPlanDrawer
          demoId={activePlanDemo.id}
          leadId={activePlanDemo.leadId}
          isOpen={Boolean(activePlanDemo)}
          onClose={() => setActivePlanDemo(null)}
          onPlanUpdated={fetchScheduleAndDemos}
        />
      )}

      {activeLiveDemo && (
        <LiveDemoModal
          demoId={activeLiveDemo.id}
          leadId={activeLiveDemo.leadId}
          isOpen={Boolean(activeLiveDemo)}
          onClose={() => setActiveLiveDemo(null)}
          onFinishDemo={() => {
            const current = activeLiveDemo;
            setActiveLiveDemo(null);
            setActivePostDemo(current);
          }}
        />
      )}

      {activePostDemo && (
        <PostDemoModal
          demoId={activePostDemo.id}
          leadId={activePostDemo.leadId}
          isOpen={Boolean(activePostDemo)}
          onClose={() => setActivePostDemo(null)}
          onSuccess={() => {
            setActivePostDemo(null);
            fetchScheduleAndDemos();
          }}
          onOpenWhatsApp={(cat) => setQuickWhatsAppTarget({ leadId: activePostDemo.leadId, category: cat })}
        />
      )}

      {quickWhatsAppTarget && (
        <QuickWhatsAppModal
          isOpen={Boolean(quickWhatsAppTarget)}
          onClose={() => setQuickWhatsAppTarget(null)}
          leadId={quickWhatsAppTarget.leadId}
          initialCategory={quickWhatsAppTarget.category}
        />
      )}
    </div>
  );
}
