'use client';

import React from 'react';
import { Clock, PhoneCall, Video, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { DayCapacityStats } from '@/lib/calendar/salesCalendarEngine';

interface DayCapacityHeaderProps {
  capacity: DayCapacityStats;
  missedCount?: number;
}

export const DayCapacityHeader: React.FC<DayCapacityHeaderProps> = ({ capacity, missedCount = 0 }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs transition-all">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Title / Summary badge */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Day Capacity & Execution
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Real database metrics for selected date
            </p>
          </div>
        </div>

        {/* Metric Pills Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {/* Booked Time */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
            <Clock className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span>Booked: <strong className="font-bold">{capacity.bookedFormatted}</strong></span>
          </div>

          {/* Free Time */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Free: <strong className="font-bold">{capacity.freeFormatted}</strong></span>
          </div>

          {/* Calls Count */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60">
            <PhoneCall className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span>Calls: <strong className="font-bold">{capacity.callsCount}</strong></span>
          </div>

          {/* Demos Count */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60">
            <Video className="h-3.5 w-3.5 text-purple-600 shrink-0" />
            <span>Demos: <strong className="font-bold">{capacity.demosCount}</strong></span>
          </div>

          {/* Follow-ups Count */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>Follow-ups: <strong className="font-bold">{capacity.followUpsCount}</strong></span>
          </div>

          {/* Missed Warning if > 0 */}
          {missedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 animate-bounce">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
              <span>Missed: <strong className="font-bold">{missedCount}</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
