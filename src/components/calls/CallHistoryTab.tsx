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
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Total Calls</span>
          <span className="text-lg font-black text-slate-900">{metrics.totalCalls}</span>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">Connected</span>
          <span className="text-lg font-black text-emerald-800">{metrics.connected}</span>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block">Interested</span>
          <span className="text-lg font-black text-amber-800">{metrics.interested}</span>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-violet-700 block">Demos Booked</span>
          <span className="text-lg font-black text-violet-800">{metrics.demosBooked}</span>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-sky-700 block">Follow-ups</span>
          <span className="text-lg font-black text-sky-800">{metrics.followUps}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 block">No Answer</span>
          <span className="text-lg font-black text-slate-800">{metrics.noAnswers}</span>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 block">Not Interested</span>
          <span className="text-lg font-black text-rose-800">{metrics.notInterested}</span>
        </div>
      </div>

      {/* Action Header & Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <PhoneCall className="h-4 w-4 text-emerald-600" /> Call History & Activity
            </h3>
            <p className="text-[11px] text-slate-500">Real calls recorded for this lead in chronological order.</p>
          </div>
          <button
            onClick={onOpenLogCall}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-sm self-start sm:self-auto"
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
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
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
            <div key={i} className="h-16 w-full animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center text-xs">
          <AlertCircle className="mx-auto h-6 w-6 text-rose-600 mb-1" />
          <p className="text-rose-800 font-semibold">{error}</p>
          <button
            onClick={fetchCalls}
            className="mt-2 inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      ) : calls.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <PhoneCall className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-800">No calls recorded</h4>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
            {filter !== 'ALL'
              ? 'No calls match the selected outcome filter.'
              : 'No phone interactions have been logged yet for this lead.'}
          </p>
          <button
            onClick={onOpenLogCall}
            className="mt-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-slate-100"
          >
            Log First Call
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((c) => {
            const isExpanded = expandedCallId === c.id;
            const outcomeBadge = {
              CONNECTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              INTERESTED: 'bg-amber-50 text-amber-700 border-amber-200',
              DEMO_BOOKED: 'bg-violet-50 text-violet-700 border-violet-200',
              SCHEDULED_DEMO: 'bg-violet-50 text-violet-700 border-violet-200',
              FOLLOW_UP_REQUIRED: 'bg-sky-50 text-sky-700 border-sky-200',
              NO_ANSWER: 'bg-slate-100 text-slate-600 border-slate-200',
              BUSY: 'bg-amber-50 text-amber-700 border-amber-200',
              SWITCHED_OFF: 'bg-slate-100 text-slate-600 border-slate-200',
              NOT_INTERESTED: 'bg-rose-50 text-rose-700 border-rose-200',
              WRONG_NUMBER: 'bg-rose-50 text-rose-700 border-rose-200',
            }[c.outcome as string] || 'bg-slate-100 text-slate-700';

            const formattedDate = new Date(c.occurredAt || c.createdAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });
            const formattedTime = new Date(c.occurredAt || c.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-200 shadow-2xs space-y-2"
              >
                <div
                  onClick={() => setExpandedCallId(isExpanded ? null : c.id)}
                  className="flex items-start justify-between cursor-pointer gap-2"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="rounded-xl p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0 mt-0.5">
                      <PhoneCall className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Date & Time + Outcome Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {formattedDate} · {formattedTime}
                        </span>
                        <span className="font-black text-xs text-slate-900">
                          Call — {c.outcome.replace(/_/g, ' ')}
                        </span>
                        <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold', outcomeBadge)}>
                          {c.callType.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Response / Notes summary */}
                      {c.notes && (
                        <p className="text-xs text-slate-700 mt-1 font-medium leading-relaxed">
                          &quot;{c.notes}&quot;
                        </p>
                      )}

                      {/* Next Action Pill */}
                      {c.nextAction && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                          <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-amber-600" />
                            Next: <strong>{c.nextAction}</strong>
                            {c.nextActionAt && (
                              <span className="font-normal text-amber-700">
                                — {new Date(c.nextActionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(c.nextActionAt).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 shrink-0">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded Details Card */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    {c.notes && (
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Notes</span>
                        {c.notes}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                      {c.nextAction && (
                        <div>
                          <span className="text-slate-500 block">Next Action:</span>
                          <span className="text-amber-800 font-bold">{c.nextAction}</span>
                        </div>
                      )}
                      {c.nextActionAt && (
                        <div>
                          <span className="text-slate-500 block">Next Action Date:</span>
                          <span className="text-slate-800 font-mono font-medium">
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
