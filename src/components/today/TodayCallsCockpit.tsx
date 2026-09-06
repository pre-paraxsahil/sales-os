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
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-3 shadow-xs">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500">Loading Today&apos;s Call Cockpit...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-5 text-center text-xs">
        <AlertTriangle className="mx-auto h-6 w-6 text-rose-600 mb-1" />
        <p className="text-rose-900 font-semibold">{error || 'Unable to load call cockpit.'}</p>
        <button
          onClick={fetchTodayCalls}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-700 font-medium hover:bg-slate-50 shadow-xs"
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
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Overdue Calls</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <span className="text-2xl font-black text-rose-950 mt-1 block">{counts.overdue}</span>
          <p className="text-[11px] text-rose-600/80 mt-0.5 font-medium">Need immediate resolution</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Today&apos;s Callbacks</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-950 mt-1 block">{counts.today}</span>
          <p className="text-[11px] text-amber-700/80 mt-0.5 font-medium">Scheduled for today</p>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Hot Prospects</span>
            <Flame className="h-4 w-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-indigo-950 mt-1 block">{counts.hotLeads}</span>
          <p className="text-[11px] text-indigo-600/80 mt-0.5 font-medium">High buying intent</p>
        </div>

        <Link
          href="/schedule"
          className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 block hover:border-emerald-300 hover:bg-emerald-50/80 transition group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider group-hover:underline">
              Scheduled Demos
            </span>
            <Calendar className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-2xl font-black text-emerald-950 mt-1 block">{counts.demos}</span>
          <p className="text-[11px] text-emerald-700/80 mt-0.5 font-medium">Product demos today →</p>
        </Link>
      </div>

      {/* 1. OVERDUE CALLS SECTION */}
      {overdue.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-rose-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
              <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                Overdue Call Follow-ups ({overdue.length})
              </h3>
            </div>
            <span className="text-[11px] text-rose-700 font-semibold font-mono">Priority Action Required</span>
          </div>

          <div className="space-y-2.5">
            {overdue.map((item: any) => {
              const lead = item.lead;
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-xs shadow-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="rounded-md p-2 bg-rose-50 border border-rose-200 text-rose-600 shrink-0">
                      <PhoneCall className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{lead?.title}</span>
                        <span className="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                          Due: {new Date(item.scheduledAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        {item.notes || 'Overdue callback'} • Contact:{' '}
                        <strong className="text-slate-800">{lead?.contact?.name}</strong> (
                        {lead?.contact?.phone})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleCallNow(lead)}
                      className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 active:scale-[0.98] transition shadow-xs"
                    >
                      <Phone className="h-3 w-3" />
                      <span>CALL NOW</span>
                    </button>
                    <button
                      onClick={() => handleLogResult(lead)}
                      className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                    >
                      Log Result
                    </button>
                    <Link
                      href={`/leads/${lead?.id}`}
                      className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
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
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Today&apos;s Scheduled Callbacks ({today.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Scheduled for today</span>
        </div>

        {today.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50/50 rounded-lg border border-slate-100">
            <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600 mb-1" />
            <p className="text-slate-800 font-semibold">No pending callbacks scheduled for today.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Use Quick Add or Lead Profile to schedule call windows.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {today.map((item: any) => {
              const lead = item.lead;
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="rounded-md p-2 bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{lead?.title}</span>
                        <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                          {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        {item.notes || 'Scheduled callback'} • Contact:{' '}
                        <strong className="text-slate-800">{lead?.contact?.name}</strong> (
                        {lead?.contact?.phone})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleCallNow(lead)}
                      className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 active:scale-[0.98] transition shadow-xs"
                    >
                      <Phone className="h-3 w-3" />
                      <span>CALL NOW</span>
                    </button>
                    <button
                      onClick={() => handleLogResult(lead)}
                      className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                    >
                      Log Result
                    </button>
                    <Link
                      href={`/leads/${lead?.id}`}
                      className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Hot Leads to Engage ({hotLeads.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">Highest buying priority</span>
          </div>

          <div className="space-y-2.5">
            {hotLeads.map((lead: any) => (
              <div
                key={lead.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="rounded-md p-2 bg-rose-50 border border-rose-200 text-rose-600 shrink-0">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{lead.title}</span>
                      <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Contact: <strong className="text-slate-800">{lead.contact?.name}</strong> (
                      {lead.contact?.phone}) • Source: {lead.source}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => handleCallNow(lead)}
                    className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 active:scale-[0.98] transition shadow-xs"
                  >
                    <Phone className="h-3 w-3" />
                    <span>CALL NOW</span>
                  </button>
                  <button
                    onClick={() => handleLogResult(lead)}
                    className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                  >
                    Log Result
                  </button>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
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
