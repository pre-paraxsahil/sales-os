'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  PhoneCall,
  Phone,
  Clock,
  Flame,
  AlertTriangle,
  Calendar,
  User,
  Building,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BeforeCallBriefModal } from '@/components/calls/BeforeCallBriefModal';
import { QuickCallLoggerModal } from '@/components/calls/QuickCallLoggerModal';

export const TodayCallsCockpit: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Lead for modal interactions
  const [activeLead, setActiveLead] = useState<any>(null);
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);

  const fetchTodayCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/today/calls');
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to load today calls.');
      } else {
        setData(json.data);
      }
    } catch (err: any) {
      console.error('Error fetching today calls:', err);
      setError('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayCalls();
  }, [fetchTodayCalls]);

  const handleCallNow = (lead: any) => {
    setActiveLead(lead);
    setIsBriefOpen(true);
  };

  const handleLogResult = (lead: any) => {
    setActiveLead(lead);
    setIsLoggerOpen(true);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center space-y-3">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-400" />
        <p className="text-xs text-slate-400">Loading Today&apos;s Call Cockpit...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-5 text-center text-xs">
        <AlertTriangle className="mx-auto h-6 w-6 text-rose-400 mb-1" />
        <p className="text-slate-200 font-semibold">{error || 'Unable to load call cockpit.'}</p>
        <button
          onClick={fetchTodayCalls}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }

  const { overdue, today, hotLeads, counts } = data;

  return (
    <div className="space-y-6">
      {/* Cockpit Counts Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Overdue Calls</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <span className="text-2xl font-black text-rose-300 mt-1 block">{counts.overdue}</span>
          <p className="text-[11px] text-slate-500 mt-0.5">Need immediate resolution</p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Today&apos;s Callbacks</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-2xl font-black text-amber-300 mt-1 block">{counts.today}</span>
          <p className="text-[11px] text-slate-500 mt-0.5">Scheduled for today</p>
        </div>

        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Hot Prospects</span>
            <Flame className="h-4 w-4 text-indigo-400" />
          </div>
          <span className="text-2xl font-black text-indigo-300 mt-1 block">{counts.hotLeads}</span>
          <p className="text-[11px] text-slate-500 mt-0.5">High buying intent</p>
        </div>

        <Link
          href="/schedule"
          className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 block hover:border-emerald-500/50 hover:bg-emerald-950/30 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider group-hover:underline">
              Scheduled Demos
            </span>
            <Calendar className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-2xl font-black text-emerald-300 mt-1 block">{counts.demos}</span>
          <p className="text-[11px] text-slate-500 mt-0.5">Product demos today →</p>
        </Link>
      </div>

      {/* 1. OVERDUE CALLS SECTION */}
      {overdue.length > 0 && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/10 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Overdue Call Follow-ups ({overdue.length})
              </h3>
            </div>
            <span className="text-[11px] text-rose-400 font-mono">Priority Action Required</span>
          </div>

          <div className="space-y-2.5">
            {overdue.map((item: any) => {
              const lead = item.lead;
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/90 p-3 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="rounded-md p-2 bg-rose-950/40 border border-rose-500/30 text-rose-300 shrink-0">
                      <PhoneCall className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100">{lead?.title}</span>
                        <span className="text-rose-400 text-[10px] font-mono font-bold">
                          Due: {new Date(item.scheduledAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {item.notes || 'Overdue callback'} • Contact:{' '}
                        <strong className="text-slate-300">{lead?.contact?.name}</strong> (
                        {lead?.contact?.phone})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleCallNow(lead)}
                      className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-sm"
                    >
                      <Phone className="h-3 w-3" />
                      <span>CALL NOW</span>
                    </button>
                    <button
                      onClick={() => handleLogResult(lead)}
                      className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                    >
                      Log Result
                    </button>
                    <Link
                      href={`/leads/${lead?.id}`}
                      className="rounded-md border border-slate-800 p-1.5 text-slate-400 hover:text-white"
                      title="View Lead"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. TODAY'S SCHEDULED CALLS */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Today&apos;s Scheduled Callbacks ({today.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Scheduled for today</span>
        </div>

        {today.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500/60 mb-1" />
            <p className="text-slate-300 font-medium">No pending callbacks scheduled for today.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Use Quick Add or Lead Profile to schedule call windows.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {today.map((item: any) => {
              const lead = item.lead;
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="rounded-md p-2 bg-amber-950/40 border border-amber-500/30 text-amber-300 shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100">{lead?.title}</span>
                        <span className="text-amber-400 text-[10px] font-mono font-bold">
                          {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {item.notes || 'Scheduled callback'} • Contact:{' '}
                        <strong className="text-slate-300">{lead?.contact?.name}</strong> (
                        {lead?.contact?.phone})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleCallNow(lead)}
                      className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-sm"
                    >
                      <Phone className="h-3 w-3" />
                      <span>CALL NOW</span>
                    </button>
                    <button
                      onClick={() => handleLogResult(lead)}
                      className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                    >
                      Log Result
                    </button>
                    <Link
                      href={`/leads/${lead?.id}`}
                      className="rounded-md border border-slate-800 p-1.5 text-slate-400 hover:text-white"
                      title="View Lead"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. HOT PROSPECTS SECTION */}
      {hotLeads.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Hot Leads to Engage ({hotLeads.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">Highest buying priority</span>
          </div>

          <div className="space-y-2.5">
            {hotLeads.map((lead: any) => (
              <div
                key={lead.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="rounded-md p-2 bg-rose-950/30 border border-rose-500/30 text-rose-400 shrink-0">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100">{lead.title}</span>
                      <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-300">
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Contact: <strong className="text-slate-300">{lead.contact?.name}</strong> (
                      {lead.contact?.phone}) • Source: {lead.source}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => handleCallNow(lead)}
                    className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-sm"
                  >
                    <Phone className="h-3 w-3" />
                    <span>CALL NOW</span>
                  </button>
                  <button
                    onClick={() => handleLogResult(lead)}
                    className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                  >
                    Log Result
                  </button>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="rounded-md border border-slate-800 p-1.5 text-slate-400 hover:text-white"
                    title="View Lead"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BEFORE CALL BRIEF MODAL */}
      <BeforeCallBriefModal
        isOpen={isBriefOpen}
        onClose={() => setIsBriefOpen(false)}
        lead={activeLead}
        onStartCallLogging={() => {
          setIsBriefOpen(false);
          setIsLoggerOpen(true);
        }}
      />

      {/* QUICK CALL LOGGER MODAL */}
      {activeLead && (
        <QuickCallLoggerModal
          isOpen={isLoggerOpen}
          onClose={() => setIsLoggerOpen(false)}
          leadId={activeLead.id}
          leadTitle={activeLead.title}
          contactName={activeLead.contact?.name}
          initialTemperature={activeLead.temperature}
          onSuccess={() => {
            fetchTodayCalls();
          }}
        />
      )}
    </div>
  );
};
