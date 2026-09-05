'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  PhoneCall,
  Video,
  MessageSquare,
  FileText,
  Clock,
  CheckSquare,
  Trophy,
  Tag,
  Calendar,
  Layers,
  RefreshCw,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineEventItem } from '@/app/api/leads/[id]/timeline/route';

interface CompleteTimelineTabProps {
  leadId: string;
  onOpenCallDetails?: (callId: string) => void;
}

const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: any; color: string; ringColor: string }
> = {
  CALL: {
    label: 'Call',
    icon: PhoneCall,
    color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
    ringColor: 'bg-emerald-500',
  },
  DEMO: {
    label: 'Demo',
    icon: Video,
    color: 'text-violet-400 bg-violet-950/40 border-violet-500/30',
    ringColor: 'bg-violet-500',
  },
  WHATSAPP: {
    label: 'WhatsApp',
    icon: MessageSquare,
    color: 'text-teal-400 bg-teal-950/40 border-teal-500/30',
    ringColor: 'bg-teal-500',
  },
  NOTE: {
    label: 'Note',
    icon: FileText,
    color: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/30',
    ringColor: 'bg-indigo-500',
  },
  FOLLOW_UP: {
    label: 'Follow-up',
    icon: Clock,
    color: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
    ringColor: 'bg-amber-500',
  },
  TASK: {
    label: 'Task',
    icon: CheckSquare,
    color: 'text-sky-400 bg-sky-950/40 border-sky-500/30',
    ringColor: 'bg-sky-500',
  },
  SALE: {
    label: 'Sale Won',
    icon: Trophy,
    color: 'text-yellow-400 bg-yellow-950/40 border-yellow-500/30',
    ringColor: 'bg-yellow-500',
  },
  QUOTATION: {
    label: 'Quotation',
    icon: Tag,
    color: 'text-blue-400 bg-blue-950/40 border-blue-500/30',
    ringColor: 'bg-blue-500',
  },
  LEAD_CREATED: {
    label: 'Created',
    icon: Calendar,
    color: 'text-slate-400 bg-slate-900 border-slate-700',
    ringColor: 'bg-slate-400',
  },
  ACTIVITY: {
    label: 'Activity',
    icon: Layers,
    color: 'text-slate-400 bg-slate-900 border-slate-800',
    ringColor: 'bg-indigo-400',
  },
};

export const CompleteTimelineTab: React.FC<CompleteTimelineTabProps> = ({
  leadId,
  onOpenCallDetails,
}) => {
  const [events, setEvents] = useState<TimelineEventItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = selectedFilter !== 'ALL' ? `?type=${selectedFilter}` : '';
      const res = await fetch(`/api/leads/${leadId}/timeline${query}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setEvents(json.data.events || []);
        if (json.data.counts) setCounts(json.data.counts);
      } else {
        setError(json.error || 'Failed to load timeline events.');
      }
    } catch (err: any) {
      console.error('Error fetching timeline:', err);
      setError('Network error fetching timeline.');
    } finally {
      setLoading(false);
    }
  }, [leadId, selectedFilter]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const toggleExpand = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filterButtons = [
    { id: 'ALL', label: `All Events (${counts.total || 0})` },
    { id: 'CALL', label: `Calls (${counts.calls || 0})` },
    { id: 'DEMO', label: `Demos (${counts.demos || 0})` },
    { id: 'WHATSAPP', label: `WhatsApp (${counts.whatsapp || 0})` },
    { id: 'NOTE', label: `Notes (${counts.notes || 0})` },
    { id: 'FOLLOW_UP', label: `Follow-ups (${counts.followUps || 0})` },
    { id: 'TASK', label: `Tasks (${counts.tasks || 0})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" />
            Complete Interaction Timeline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Chronological log of all calls, demos, messages, notes, and commitments (newest first).
          </p>
        </div>

        <button
          onClick={() => fetchTimeline()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filterButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => setSelectedFilter(btn.id)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all whitespace-nowrap border',
              selectedFilter === btn.id
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading chronological timeline...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-800/40 bg-rose-950/20 p-5 text-rose-300 text-xs">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <Layers className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400">No interaction events found for this filter.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800/90">
          {events.map((ev) => {
            const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.ACTIVITY;
            const Icon = cfg.icon;
            const isExpanded = !!expandedEvents[ev.id];
            const hasMultipleLines = ev.description.includes('\n') || ev.description.length > 140;

            return (
              <div key={ev.id} className="relative group">
                {/* Timeline Dot with Ring */}
                <div
                  className={cn(
                    'absolute -left-6 top-1 h-3.5 w-3.5 rounded-full ring-4 ring-slate-950 transition-transform group-hover:scale-110',
                    cfg.ringColor
                  )}
                />

                {/* Event Card */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 hover:border-slate-700 transition-all space-y-2">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold flex items-center gap-1', cfg.color)}>
                        <Icon className="h-3 w-3" />
                        {cfg.label.toUpperCase()}
                      </span>

                      {ev.statusBadge && (
                        <span className="rounded bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                          {ev.statusBadge.replace(/_/g, ' ')}
                        </span>
                      )}

                      <span className="text-xs font-bold text-slate-100">
                        {ev.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-right whitespace-nowrap">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>

                      {/* Clickable link to Call details if this is a call */}
                      {ev.eventType === 'CALL' && ev.metadata?.callId && onOpenCallDetails && (
                        <button
                          onClick={() => onOpenCallDetails(ev.metadata!.callId)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 ml-1"
                          title="View Call Details"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description Body */}
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {hasMultipleLines && !isExpanded
                      ? `${ev.description.split('\n')[0].substring(0, 140)}...`
                      : ev.description}
                  </div>

                  {/* Toggle Read More if long */}
                  {hasMultipleLines && (
                    <button
                      onClick={() => toggleExpand(ev.id)}
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-0.5 pt-1"
                    >
                      {isExpanded ? (
                        <>
                          Show Less <ChevronUp className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          View Full Details <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
