'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  ChevronRight,
  MessageSquare,
  CheckSquare,
} from 'lucide-react';
import { BeforeDemoBriefModal } from '@/components/demos/BeforeDemoBriefModal';
import { DemoPlanDrawer } from '@/components/demos/DemoPlanDrawer';
import { LiveDemoModal } from '@/components/demos/LiveDemoModal';
import { PostDemoModal } from '@/components/demos/PostDemoModal';
import { QuickWhatsAppModal } from '@/components/whatsapp/QuickWhatsAppModal';
import { cn } from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState<'DAY' | 'WEEK' | 'DEMOS'>('DAY');
  const [demos, setDemos] = useState<DemoItem[]>([]);
  const [scheduleData, setScheduleData] = useState<{
    blocks: ScheduleBlockData[];
    conflicts: any[];
  }>({ blocks: [], conflicts: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'ALL' | 'SCHEDULED' | 'COMPLETED'>('ALL');
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
        fetch('/api/demos'),
        fetch('/api/schedule'),
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
      console.error('Failed to load schedule data:', err);
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
      const res = await fetch('/api/schedule/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        setRearrangedNotice(
          json.data?.movedItems?.length > 0
            ? `Schedule updated: Automatically arranged ${json.data.movedItems.length} flexible blocks around customer commitments.`
            : 'Schedule is already optimally aligned with all commitments.'
        );
        fetchScheduleAndDemos();
      }
    } catch (err) {
      console.error('Failed to rearrange schedule:', err);
    } finally {
      setIsRearranging(false);
    }
  };

  const filteredDemos = demos.filter((d) => {
    if (filter === 'ALL') return true;
    return d.status === filter;
  });

  const nextUpcomingDemo = demos.find((d) => d.status === 'SCHEDULED' && new Date(d.scheduledAt) >= new Date());

  // Helper to categorize time blocks into simple buckets
  const categorizeBlock = (block: ScheduleBlockData) => {
    const hour = new Date(block.startTime).getHours();
    if (hour < 13) return 'MORNING';
    if (hour >= 13 && hour < 14) return 'LUNCH';
    if (hour >= 14 && hour < 17) return 'AFTERNOON';
    return 'LATER';
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto p-3 sm:p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-100 uppercase tracking-wider">
              Today&apos;s Schedule & Activities
            </span>
            {scheduleData.conflicts.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" /> {scheduleData.conflicts.length} Conflict Detected
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Today&apos;s Plan & Activities</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your structured sales day: calls, demos, and follow-up slots organized by time.
          </p>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('DAY')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition font-bold',
                activeTab === 'DAY'
                  ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Day View
            </button>
            <button
              onClick={() => setActiveTab('WEEK')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition font-bold',
                activeTab === 'WEEK'
                  ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Week View
            </button>
            <button
              onClick={() => setActiveTab('DEMOS')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition font-bold',
                activeTab === 'DEMOS'
                  ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Demos ({demos.length})
            </button>
          </div>

          <button
            onClick={fetchScheduleAndDemos}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 transition"
            title="Refresh Schedule"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TODAY'S PLAN SUMMARY BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
              Today&apos;s Plan
            </span>
            <span className="text-sm font-black text-slate-900 mt-0.5 block">
              {scheduleData.blocks.length + demos.filter(d => d.status === 'SCHEDULED').length} activities scheduled for today
            </span>
          </div>
          <button
            onClick={handleAutoRearrange}
            disabled={isRearranging}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition shadow-xs"
          >
            {isRearranging ? 'Optimizing...' : 'Auto-Arrange'}
          </button>
        </div>

        {nextUpcomingDemo ? (
          <div className="p-4 rounded-xl bg-violet-50/70 border border-violet-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 block">
                Next Up
              </span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                🎥 Demo with {nextUpcomingDemo.lead?.title || 'Client'} at{' '}
                {new Date(nextUpcomingDemo.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <button
              onClick={() => setActiveBriefDemo({ id: nextUpcomingDemo.id, leadId: nextUpcomingDemo.leadId })}
              className="px-3 py-1.5 rounded-lg bg-violet-600 text-white font-bold text-xs hover:bg-violet-500 transition shadow-xs shrink-0 ml-2"
            >
              Open Plan
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Next Commitment
              </span>
              <span className="text-xs font-medium text-slate-700 mt-0.5 block">
                No immediate demo conflict. Ready for outbound calling.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Rearrangement Banner */}
      {rearrangedNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{rearrangedNotice}</span>
          </div>
          <button
            onClick={() => setRearrangedNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: DAY VIEW */}
      {activeTab === 'DAY' && (
        <div className="space-y-4">
          {loading && scheduleData.blocks.length === 0 ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 w-full rounded-xl bg-white border border-slate-200" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {scheduleData.blocks.map((block) => {
                const startStr = new Date(block.startTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const endStr = new Date(block.endTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const isLunch = block.blockType === 'LUNCH';
                const isDemo = block.blockType === 'DEMO';
                const isCalling = block.blockType === 'CALLING' || block.blockType === 'CALLBACK';
                const isFollowUp = block.blockType === 'FOLLOW_UP';

                return (
                  <div
                    key={block.id}
                    className={cn(
                      'p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition shadow-xs bg-white',
                      isLunch
                        ? 'border-amber-200 bg-amber-50/50 text-amber-900'
                        : isDemo
                        ? 'border-violet-200 bg-violet-50/40 text-slate-900'
                        : isCalling
                        ? 'border-indigo-200 bg-indigo-50/40 text-slate-900'
                        : 'border-slate-200 text-slate-900'
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="font-mono font-bold text-slate-700 shrink-0 w-28 text-[11px] bg-slate-100/80 px-2 py-1 rounded text-center border border-slate-200">
                        {startStr} – {endStr}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>
                            {isDemo
                              ? `🎥 ${block.title}`
                              : isCalling
                              ? `📞 ${block.title}`
                              : isFollowUp
                              ? `💬 ${block.title}`
                              : isLunch
                              ? `🍱 ${block.title}`
                              : `✅ ${block.title}`}
                          </span>
                          {block.isProtected && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Protected
                            </span>
                          )}
                        </div>
                        {block.notes && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{block.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600 uppercase">
                        {block.blockType}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WEEK VIEW */}
      {activeTab === 'WEEK' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-center justify-between shadow-xs">
            <span className="font-semibold text-slate-800">Standard 6-Day Sales Week (Monday to Saturday)</span>
            <span className="text-indigo-700 font-bold">Target: 6 live demos / week</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-xs">
                <div className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-1.5 flex justify-between">
                  <span>{day}</span>
                  <span className="text-slate-400 font-normal">10am–6pm</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="p-1.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-800 font-medium">
                    📞 10am: Calling
                  </div>
                  <div className="p-1.5 rounded bg-amber-50 border border-amber-100 text-amber-800">
                    🍱 1pm: Lunch
                  </div>
                  <div className="p-1.5 rounded bg-violet-50 border border-violet-100 text-violet-800 font-medium">
                    🎥 2pm: Demos
                  </div>
                  <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-700">
                    💬 5pm: Follow-ups
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DEMOS VIEW */}
      {activeTab === 'DEMOS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-800">Filter Demos:</span>
            <div className="flex gap-1">
              {(['ALL', 'SCHEDULED', 'COMPLETED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition',
                    filter === st
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredDemos.map((demo) => (
              <div
                key={demo.id}
                className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                        demo.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-violet-100 text-violet-800'
                      )}
                    >
                      {demo.status}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {demo.title || `Product Demo: ${demo.lead?.title || 'Prospect'}`}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    📅 {new Date(demo.scheduledAt).toLocaleString()} ({demo.durationMinutes || 30} mins)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveBriefDemo({ id: demo.id, leadId: demo.leadId })}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition text-[11px]"
                  >
                    Before-Demo Brief
                  </button>
                  <button
                    onClick={() => setActiveLiveDemo({ id: demo.id, leadId: demo.leadId })}
                    className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold transition text-[11px] shadow-xs"
                  >
                    Launch Live Demo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {activeBriefDemo && (
        <BeforeDemoBriefModal
          demoId={activeBriefDemo.id}
          leadId={activeBriefDemo.leadId}
          isOpen={!!activeBriefDemo}
          onClose={() => setActiveBriefDemo(null)}
          onLaunchLiveDemo={() => {
            const current = activeBriefDemo;
            setActiveBriefDemo(null);
            setActiveLiveDemo(current);
          }}
        />
      )}

      {activeLiveDemo && (
        <LiveDemoModal
          demoId={activeLiveDemo.id}
          leadId={activeLiveDemo.leadId}
          isOpen={!!activeLiveDemo}
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
          isOpen={!!activePostDemo}
          onClose={() => setActivePostDemo(null)}
          onSuccess={() => {
            setActivePostDemo(null);
            fetchScheduleAndDemos();
          }}
          onOpenWhatsApp={(cat) => {
            const current = activePostDemo;
            setActivePostDemo(null);
            setQuickWhatsAppTarget({ leadId: current.leadId, category: cat });
          }}
        />
      )}

      {quickWhatsAppTarget && (
        <QuickWhatsAppModal
          leadId={quickWhatsAppTarget.leadId}
          initialCategory={quickWhatsAppTarget.category}
          isOpen={!!quickWhatsAppTarget}
          onClose={() => setQuickWhatsAppTarget(null)}
        />
      )}
    </div>
  );
}
