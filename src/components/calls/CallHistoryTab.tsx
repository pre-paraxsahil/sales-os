'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PhoneCall,
  CheckCircle2,
  Flame,
  Calendar,
  Clock,
  PhoneOff,
  XCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CallAiAnalysisSection } from './CallAiAnalysisSection';

interface CallHistoryTabProps {
  leadId: string;
  onOpenLogCall: () => void;
  refreshTrigger?: number;
}

export const CallHistoryTab: React.FC<CallHistoryTabProps> = ({
  leadId,
  onOpenLogCall,
  refreshTrigger = 0,
}) => {
  const [calls, setCalls] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalCalls: 0,
    connected: 0,
    interested: 0,
    demosBooked: 0,
    followUps: 0,
    noAnswers: 0,
    notInterested: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        filter && filter !== 'ALL'
          ? `/api/leads/${leadId}/calls?outcome=${filter}`
          : `/api/leads/${leadId}/calls`;

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to fetch call history.');
        setCalls([]);
      } else {
        setCalls(json.data.calls || []);
        if (json.data.metrics) {
          setMetrics(json.data.metrics);
        }
      }
    } catch (err: any) {
      console.error('Error fetching call history:', err);
      setError('An unexpected network error occurred.');
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, [leadId, filter]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls, refreshTrigger]);

  const filterButtons = [
    { id: 'ALL', label: `All (${metrics.totalCalls})` },
    { id: 'CONNECTED', label: `Connected (${metrics.connected})` },
    { id: 'INTERESTED', label: `Interested (${metrics.interested})` },
    { id: 'DEMO_BOOKED', label: `Demo Booked (${metrics.demosBooked})` },
    { id: 'FOLLOW_UP_REQUIRED', label: `Follow-up (${metrics.followUps})` },
    { id: 'NO_ANSWER', label: `No Answer (${metrics.noAnswers})` },
    { id: 'NOT_INTERESTED', label: `Not Interested (${metrics.notInterested})` },
  ];

  return (
    <div className="space-y-4">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Total Calls</span>
          <span className="text-lg font-black text-slate-100">{metrics.totalCalls}</span>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">Connected</span>
          <span className="text-lg font-black text-emerald-300">{metrics.connected}</span>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">Interested</span>
          <span className="text-lg font-black text-amber-300">{metrics.interested}</span>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400 block">Demos Booked</span>
          <span className="text-lg font-black text-violet-300">{metrics.demosBooked}</span>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400 block">Follow-ups</span>
          <span className="text-lg font-black text-sky-300">{metrics.followUps}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">No Answer</span>
          <span className="text-lg font-black text-slate-300">{metrics.noAnswers}</span>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 block">Not Interested</span>
          <span className="text-lg font-black text-rose-300">{metrics.notInterested}</span>
        </div>
      </div>

      {/* Action Header & Filter Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <PhoneCall className="h-4 w-4 text-emerald-400" /> Call History & Activity
            </h3>
            <p className="text-[11px] text-slate-500">Real calls recorded for this lead in chronological order.</p>
          </div>
          <button
            onClick={onOpenLogCall}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/20 self-start sm:self-auto"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>Log New Call</span>
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-all whitespace-nowrap',
                filter === btn.id
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Call List View */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-5 text-center text-xs">
          <AlertCircle className="mx-auto h-6 w-6 text-rose-400 mb-1" />
          <p className="text-slate-200 font-semibold">{error}</p>
          <button
            onClick={fetchCalls}
            className="mt-2 inline-flex items-center gap-1 text-indigo-400 hover:underline"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      ) : calls.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <PhoneCall className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <h4 className="text-xs font-bold text-slate-300">No calls recorded</h4>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
            {filter !== 'ALL'
              ? 'No calls match the selected outcome filter.'
              : 'No phone interactions have been logged yet for this lead.'}
          </p>
          <button
            onClick={onOpenLogCall}
            className="mt-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-indigo-400 hover:bg-slate-800"
          >
            Log First Call
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((c) => {
            const isExpanded = expandedCallId === c.id;
            const outcomeBadge = {
              CONNECTED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
              INTERESTED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
              DEMO_BOOKED: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
              SCHEDULED_DEMO: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
              FOLLOW_UP_REQUIRED: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
              NO_ANSWER: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
              BUSY: 'bg-amber-950/40 text-amber-400 border-amber-800/60',
              SWITCHED_OFF: 'bg-slate-800 text-slate-400 border-slate-700',
              NOT_INTERESTED: 'bg-rose-950/40 text-rose-400 border-rose-800',
              WRONG_NUMBER: 'bg-rose-950/40 text-rose-400 border-rose-800',
            }[c.outcome as string] || 'bg-slate-800 text-slate-300';

            return (
              <div
                key={c.id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 transition-all hover:border-slate-700"
              >
                <div
                  onClick={() => setExpandedCallId(isExpanded ? null : c.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg p-2 bg-slate-950 border border-slate-800 text-slate-300">
                      <PhoneCall className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-slate-200">
                          {c.callType.replace(/_/g, ' ')}
                        </span>
                        <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold', outcomeBadge)}>
                          {c.outcome.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        {new Date(c.occurredAt || c.createdAt).toLocaleString()}
                        {c.durationSeconds ? ` • Duration: ${c.durationSeconds}s` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    {c.nextAction && (
                      <span className="text-[11px] text-amber-400 hidden sm:inline">
                        Next: {c.nextAction}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded Details Card */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                    {c.notes && (
                      <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800 text-slate-300 leading-relaxed whitespace-pre-wrap">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Notes</span>
                        {c.notes}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                      {c.nextAction && (
                        <div>
                          <span className="text-slate-500 block">Next Action:</span>
                          <span className="text-amber-300 font-medium">{c.nextAction}</span>
                        </div>
                      )}
                      {c.nextActionAt && (
                        <div>
                          <span className="text-slate-500 block">Next Action Date:</span>
                          <span className="text-slate-200 font-mono">
                            {new Date(c.nextActionAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* AI Call Intelligence Analysis */}
                    <CallAiAnalysisSection
                      callId={c.id}
                      leadId={leadId}
                      onMemoryUpdated={fetchCalls}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
