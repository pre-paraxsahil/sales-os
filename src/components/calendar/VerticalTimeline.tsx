'use client';

import React from 'react';
import { CalendarEvent } from '@/lib/calendar/salesCalendarEngine';
import { BookingItemCard } from './BookingItemCard';
import { Clock, CheckCircle2, Calendar as CalendarIcon, Sparkles } from 'lucide-react';

interface VerticalTimelineProps {
  events: CalendarEvent[];
  viewMode: 'TODAY' | 'TOMORROW' | 'WEEK';
  onOpenDetails: (event: CalendarEvent) => void;
  onMarkDone: (event: CalendarEvent) => void;
  onTriggerCall?: (phone?: string | null, leadId?: string | null) => void;
  onTriggerWhatsApp?: (phone?: string | null, leadId?: string | null) => void;
}

export const VerticalTimeline: React.FC<VerticalTimelineProps> = ({
  events,
  viewMode,
  onOpenDetails,
  onMarkDone,
  onTriggerCall,
  onTriggerWhatsApp,
}) => {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <CalendarIcon className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">No Bookings Scheduled</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Your timeline is clear for this view. Use <strong>+ BOOK TIME</strong> or <strong>Find Free Time</strong> to schedule sales calls, demos, or callbacks.
        </p>
      </div>
    );
  }

  // If WEEK view, group events by date
  if (viewMode === 'WEEK') {
    const groupedByDate: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const dateKey = new Date(ev.startTime).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
      groupedByDate[dateKey].push(ev);
    }

    return (
      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([dateKey, dayEvents]) => (
          <div key={dateKey} className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{dateKey}</h4>
              <span className="text-[10px] font-semibold text-slate-400">({dayEvents.length} items)</span>
            </div>
            <div className="space-y-2.5">
              {dayEvents.map((ev) => (
                <BookingItemCard
                  key={ev.id}
                  event={ev}
                  onOpenDetails={onOpenDetails}
                  onMarkDone={onMarkDone}
                  onTriggerCall={onTriggerCall}
                  onTriggerWhatsApp={onTriggerWhatsApp}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Standard vertical timeline for TODAY or TOMORROW
  return (
    <div className="space-y-3 relative">
      {events.map((ev) => (
        <BookingItemCard
          key={ev.id}
          event={ev}
          onOpenDetails={onOpenDetails}
          onMarkDone={onMarkDone}
          onTriggerCall={onTriggerCall}
          onTriggerWhatsApp={onTriggerWhatsApp}
        />
      ))}
    </div>
  );
};
