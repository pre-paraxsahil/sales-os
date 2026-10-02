'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  PhoneCall,
  Video,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { CalendarEvent, DayCapacityStats } from '@/lib/calendar/salesCalendarEngine';
import { VerticalTimeline } from './VerticalTimeline';
import { BookTimeModal } from './BookTimeModal';
import { SlotFinderWidget } from './SlotFinderWidget';
import { EventDetailsDrawer } from './EventDetailsDrawer';
import { ManageScheduleModal } from './ManageScheduleModal';
import { QuickCallLoggerModal } from '@/components/calls/QuickCallLoggerModal';
import { QuickWhatsAppModal } from '@/components/whatsapp/QuickWhatsAppModal';
import { cn } from '@/lib/utils';
import { getTodayDateString, formatISTDateDDMMYYYY, formatRelativeTimeUntil, formatISTDate } from '@/lib/time/salesTimeEngine';

export const SalesCalendarView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'TODAY' | 'WEEK'>('TODAY');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [capacity, setCapacity] = useState<DayCapacityStats>({
    bookedMinutes: 0,
    bookedFormatted: '0m',
    freeMinutes: 420,
    freeFormatted: '7h 0m',
    callsCount: 0,
    demosCount: 0,
    followUpsCount: 0,
    totalEventsCount: 0,
    completedEventsCount: 0,
    missedEventsCount: 0,
  });
  const [missedEvents, setMissedEvents] = useState<CalendarEvent[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'MISSED'>('ALL');

  // Modals & Drawers
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [isSlotFinderOpen, setIsSlotFinderOpen] = useState<boolean>(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  // Pre-filled initial parameters for Book Time Modal
  const [bookModalInitialTime, setBookModalInitialTime] = useState<string | null>(null);
  const [bookModalInitialDate, setBookModalInitialDate] = useState<string | null>(null);

  // External Modals (Call & WhatsApp)
  const [callLoggerTarget, setCallLoggerTarget] = useState<{ leadId?: string | null } | null>(null);
  const [whatsAppTarget, setWhatsAppTarget] = useState<{ leadId?: string | null } | null>(null);

  const dateString = getTodayDateString(selectedDate);

  const fetchCalendarData = useCallback(async () => {
    try {
      const res = await fetch(`/api/calendar?view=${viewMode}&date=${dateString}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setEvents(json.data.events || []);
          if (json.data.capacity) setCapacity(json.data.capacity);
          if (json.data.missedEvents) setMissedEvents(json.data.missedEvents);
        }
      }
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, dateString]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Fast Date Shift
  const handleDateShift = (days: number) => {
    const next = new Date(selectedDate.getTime() + days * 24 * 60 * 60 * 1000);
    setSelectedDate(next);
  };

  // Optimistic Mark Done Action
  const handleMarkDone = async (event: CalendarEvent) => {
    const previousEvents = [...events];
    setProcessingId(event.id);

    // Optimistically update UI state
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, status: 'COMPLETED' } : e))
    );

    try {
      const res = await fetch(`/api/calendar/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MARK_DONE',
          sourceEntity: event.sourceEntity,
        }),
      });
      if (res.ok) {
        fetchCalendarData();
      } else {
        // Rollback on server failure
        setEvents(previousEvents);
      }
    } catch (err) {
      console.error('Failed to mark event done:', err);
      setEvents(previousEvents);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSelectSlotFromFinder = (startTimeIso: string, dateStr: string, timeStr: string) => {
    setBookModalInitialDate(dateStr);
    setBookModalInitialTime(timeStr);
    setIsBookModalOpen(true);
  };

  // Filter events for timeline view
  const filteredEvents = events.filter((ev) => {
    if (filterStatus === 'ACTIVE') return ['SCHEDULED', 'IN_PROGRESS'].includes(ev.status);
    if (filterStatus === 'COMPLETED') return ev.status === 'COMPLETED';
    if (filterStatus === 'MISSED') return ev.status === 'MISSED';
    return true;
  });

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-indigo-600" /> Sales Calendar
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Sales appointment & activity booking timeline.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('TODAY')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg transition font-bold',
                viewMode === 'TODAY'
                  ? 'bg-white text-indigo-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              TODAY
            </button>
            <button
              onClick={() => setViewMode('WEEK')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg transition font-bold',
                viewMode === 'WEEK'
                  ? 'bg-white text-indigo-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              WEEK
            </button>
          </div>

          <button
            onClick={() => setIsSlotFinderOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
          >
            <Search className="h-3.5 w-3.5 text-indigo-600" /> Find Free Time
          </button>

          <button
            onClick={() => setIsManageModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition"
          >
            <CalendarCheck className="h-3.5 w-3.5 text-indigo-600" /> Manage
          </button>

          <button
            onClick={() => {
              setBookModalInitialDate(null);
              setBookModalInitialTime(null);
              setIsBookModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition"
          >
            <Plus className="h-4 w-4" /> BOOK TIME
          </button>
        </div>
      </div>

      {/* Real Sales Counters Row */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Calls */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs font-bold shrink-0">
            <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
            <span>CALLS</span>
            <span className="font-mono text-sm font-extrabold text-blue-700">{capacity.callsCount}</span>
          </div>

          {/* Demos */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50/80 border border-purple-200 text-purple-900 text-xs font-bold shrink-0">
            <Video className="h-3.5 w-3.5 text-purple-600" />
            <span>DEMOS</span>
            <span className="font-mono text-sm font-extrabold text-purple-700">{capacity.demosCount}</span>
          </div>

          {/* Follow-ups */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-bold shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
            <span>FOLLOW-UPS</span>
            <span className="font-mono text-sm font-extrabold text-amber-700">{capacity.followUpsCount}</span>
          </div>

          {/* Booked */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs font-bold shrink-0">
            <CalendarIcon className="h-3.5 w-3.5 text-indigo-600" />
            <span>BOOKED</span>
            <span className="font-mono text-sm font-extrabold text-indigo-700">{capacity.totalEventsCount}</span>
          </div>
        </div>

        {/* Time stats */}
        <div className="flex items-center gap-3 text-xs text-slate-600 font-medium shrink-0">
          <div>
            Booked: <strong className="text-slate-900 font-bold">{capacity.bookedFormatted}</strong>
          </div>
          <span className="text-slate-300">•</span>
          <div>
            Free: <strong className="text-slate-900 font-bold">{capacity.freeFormatted}</strong>
          </div>

          {missedEvents.length > 0 && (
            <span className="flex items-center gap-1 text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg text-[11px] ml-1">
              <AlertTriangle className="h-3 w-3" /> {missedEvents.length} Overdue
            </span>
          )}
        </div>
      </div>

      {/* Date Shift & Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDateShift(-1)}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Previous Day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 font-mono">
              {formatISTDateDDMMYYYY(selectedDate)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              ({formatISTDate(selectedDate).split(',')[0]})
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {formatRelativeTimeUntil(selectedDate)}
            </span>
          </div>
          <button
            onClick={() => handleDateShift(1)}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Next Day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition"
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDate(new Date(Date.now() + 24 * 60 * 60 * 1000))}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition"
          >
            Tomorrow
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 text-xs">
          <Filter className="h-3.5 w-3.5 text-slate-400 mr-1" />
          {(['ALL', 'ACTIVE', 'COMPLETED', 'MISSED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={cn(
                'px-2.5 py-1 rounded-lg font-bold text-[11px] transition',
                filterStatus === st
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Timeline */}
      <VerticalTimeline
        events={filteredEvents}
        viewMode={viewMode}
        onOpenDetails={(ev: CalendarEvent) => setActiveEvent(ev)}
        onMarkDone={handleMarkDone}
        onTriggerCall={(_phone?: string | null, leadId?: string | null) => setCallLoggerTarget({ leadId })}
        onTriggerWhatsApp={(_phone?: string | null, leadId?: string | null) => setWhatsAppTarget({ leadId })}
      />

      {/* Drawers & Modals */}
      {activeEvent && (
        <EventDetailsDrawer
          event={activeEvent}
          onClose={() => setActiveEvent(null)}
          onMarkDone={handleMarkDone}
          onRescheduleSuccess={fetchCalendarData}
          onTriggerCall={(_phone?: string | null, leadId?: string | null) => setCallLoggerTarget({ leadId })}
          onTriggerWhatsApp={(_phone?: string | null, leadId?: string | null) => setWhatsAppTarget({ leadId })}
        />
      )}

      <BookTimeModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSuccess={fetchCalendarData}
        initialTime={bookModalInitialTime}
        initialDate={bookModalInitialDate}
        onOpenSlotFinder={() => {
          setIsBookModalOpen(false);
          setIsSlotFinderOpen(true);
        }}
      />

      <SlotFinderWidget
        isOpen={isSlotFinderOpen}
        onClose={() => setIsSlotFinderOpen(false)}
        onSelectSlot={handleSelectSlotFromFinder}
      />

      <ManageScheduleModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        events={events}
        onRefresh={fetchCalendarData}
        onOpenEventDetails={(ev: CalendarEvent) => setActiveEvent(ev)}
        onOpenCallLogger={(leadId?: string | null) => setCallLoggerTarget({ leadId })}
        onOpenWhatsApp={(leadId?: string | null) => setWhatsAppTarget({ leadId })}
      />

      {callLoggerTarget && (
        <QuickCallLoggerModal
          isOpen={!!callLoggerTarget}
          onClose={() => setCallLoggerTarget(null)}
          leadId={callLoggerTarget.leadId || undefined}
          onSuccess={fetchCalendarData}
        />
      )}

      {whatsAppTarget && whatsAppTarget.leadId && (
        <QuickWhatsAppModal
          isOpen={!!whatsAppTarget}
          onClose={() => setWhatsAppTarget(null)}
          leadId={whatsAppTarget.leadId}
        />
      )}
    </div>
  );
};
