'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { CalendarEvent, DayCapacityStats } from '@/lib/calendar/salesCalendarEngine';
import { DayCapacityHeader } from './DayCapacityHeader';
import { VerticalTimeline } from './VerticalTimeline';
import { BookTimeModal } from './BookTimeModal';
import { SlotFinderWidget } from './SlotFinderWidget';
import { EventDetailsDrawer } from './EventDetailsDrawer';
import { QuickCallLoggerModal } from '@/components/calls/QuickCallLoggerModal';
import { QuickWhatsAppModal } from '@/components/whatsapp/QuickWhatsAppModal';

export const SalesCalendarView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'TODAY' | 'TOMORROW' | 'WEEK'>('TODAY');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);

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
    totalRemainingMinsToday: 420,
    totalRemainingFormatted: '7h 0m',
    freeRemainingMinsToday: 420,
    freeRemainingFormatted: '7h 0m',
    bookedRemainingMinsToday: 0,
    bookedRemainingFormatted: '0m',
    nextActivityFormatted: null,
  });
  const [missedEvents, setMissedEvents] = useState<CalendarEvent[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'MISSED'>('ALL');

  // Modals & Drawers
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [isSlotFinderOpen, setIsSlotFinderOpen] = useState<boolean>(false);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  // Pre-filled initial parameters for Book Time Modal
  const [bookModalInitialTime, setBookModalInitialTime] = useState<string | null>(null);
  const [bookModalInitialDate, setBookModalInitialDate] = useState<string | null>(null);

  // External Modals (Call & WhatsApp)
  const [callLoggerTarget, setCallLoggerTarget] = useState<{ leadId?: string | null } | null>(null);
  const [whatsAppTarget, setWhatsAppTarget] = useState<{ leadId?: string | null } | null>(null);

  const dateString = selectedDate.toISOString().split('T')[0];

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
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

  const handleDateShift = (days: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(next);
  };

  const handleMarkDone = async (event: CalendarEvent) => {
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
      }
    } catch (err) {
      console.error('Failed to mark event done:', err);
    }
  };

  const handleSelectSlotFromFinder = (startTimeIso: string, dateStr: string, timeStr: string) => {
    setBookModalInitialDate(dateStr);
    setBookModalInitialTime(timeStr);
    setIsBookModalOpen(true);
  };

  // Filter events
  const filteredEvents = events.filter((ev) => {
    if (filterStatus === 'ACTIVE') return ['SCHEDULED', 'IN_PROGRESS'].includes(ev.status);
    if (filterStatus === 'COMPLETED') return ev.status === 'COMPLETED';
    if (filterStatus === 'MISSED') return ev.status === 'MISSED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-indigo-600" /> Dedicated Sales Calendar
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Visual sales execution timeline — zero overlap, conflict-protected day planning.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSlotFinderOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
          >
            <Search className="h-3.5 w-3.5 text-indigo-600" /> Find Free Time
          </button>

          <button
            onClick={() => {
              setBookModalInitialDate(null);
              setBookModalInitialTime(null);
              setIsBookModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-all"
          >
            <Plus className="h-4 w-4" /> BOOK TIME
          </button>
        </div>
      </div>

      {/* Day Capacity Header Bar */}
      <DayCapacityHeader capacity={capacity} missedCount={missedEvents.length} />

      {/* Real-Time Next Best Action Time-Context Banner (Part 4) */}
      {(() => {
        const topMissed = missedEvents[0];
        const upcomingEvent = events.find(
          (e) => e.type !== 'LUNCH' && e.status === 'SCHEDULED' && e.startTime.getTime() >= Date.now()
        );

        let actionTitle = 'Execute High-Priority Sales Outreach';
        let actionReason = `You have ${capacity.freeRemainingFormatted || capacity.freeFormatted} usable free time remaining today.`;
        let targetLeadId: string | undefined = undefined;

        if (topMissed) {
          actionTitle = `Follow-up with ${topMissed.lead?.contactName || topMissed.lead?.businessName || topMissed.lead?.title || topMissed.title}`;
          actionReason = `This activity is overdue and you have an open free time window right now.`;
          targetLeadId = topMissed.leadId || undefined;
        } else if (upcomingEvent) {
          const startMins = Math.max(0, Math.round((upcomingEvent.startTime.getTime() - Date.now()) / 60000));
          actionTitle = `Prepare for ${upcomingEvent.title}`;
          actionReason = `Starts in ${startMins}m (${upcomingEvent.startTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}). Utilize current free time for prep.`;
          targetLeadId = upcomingEvent.leadId || undefined;
        }

        return (
          <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-200/70 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                <Sparkles className="h-4 w-4 fill-amber-200 text-amber-900" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    BEST ACTION NOW
                  </span>
                  <span className="text-xs font-bold text-slate-900">{actionTitle}</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                  <strong>WHY:</strong> {actionReason}
                </p>
              </div>
            </div>

            {targetLeadId && (
              <button
                onClick={() => setCallLoggerTarget({ leadId: targetLeadId })}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shrink-0 self-start sm:self-center transition-all shadow-2xs"
              >
                Log Action Now
              </button>
            )}
          </div>
        );
      })()}

      {/* Controls Bar: Views, Date Nav, Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          {(['TODAY', 'TOMORROW', 'WEEK'] as const).map((v) => (
            <button
              key={v}
              onClick={() => {
                setViewMode(v);
                if (v === 'TODAY') setSelectedDate(new Date());
                if (v === 'TOMORROW') setSelectedDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === v
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDateShift(-1)}
            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold text-slate-800 min-w-[140px] text-center">
            {selectedDate.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <button
            onClick={() => handleDateShift(1)}
            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          {(['ALL', 'ACTIVE', 'COMPLETED', 'MISSED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterStatus === st
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Vertical Timeline Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-400">
          Loading sales calendar events...
        </div>
      ) : (
        <VerticalTimeline
          events={filteredEvents}
          viewMode={viewMode}
          onOpenDetails={(ev) => setActiveEvent(ev)}
          onMarkDone={handleMarkDone}
          onTriggerCall={(phone, leadId) => setCallLoggerTarget({ leadId })}
          onTriggerWhatsApp={(phone, leadId) => setWhatsAppTarget({ leadId })}
        />
      )}

      {/* Modals & Drawers */}
      <BookTimeModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSuccess={fetchCalendarData}
        initialTime={bookModalInitialTime}
        initialDate={bookModalInitialDate}
      />

      <SlotFinderWidget
        isOpen={isSlotFinderOpen}
        onClose={() => setIsSlotFinderOpen(false)}
        onSelectSlot={handleSelectSlotFromFinder}
      />

      <EventDetailsDrawer
        event={activeEvent}
        onClose={() => setActiveEvent(null)}
        onMarkDone={handleMarkDone}
        onRescheduleSuccess={fetchCalendarData}
        onTriggerCall={(phone, leadId) => setCallLoggerTarget({ leadId })}
        onTriggerWhatsApp={(phone, leadId) => setWhatsAppTarget({ leadId })}
      />

      {callLoggerTarget && (
        <QuickCallLoggerModal
          isOpen={Boolean(callLoggerTarget)}
          onClose={() => setCallLoggerTarget(null)}
          onSuccess={fetchCalendarData}
          leadId={callLoggerTarget.leadId || undefined}
        />
      )}

      {whatsAppTarget?.leadId && (
        <QuickWhatsAppModal
          isOpen={Boolean(whatsAppTarget)}
          onClose={() => setWhatsAppTarget(null)}
          leadId={whatsAppTarget.leadId}
        />
      )}
    </div>
  );
};
