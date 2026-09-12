'use client';

import React from 'react';
import { Clock, PhoneCall, Video, CheckCircle2, Sparkles, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import { DayCapacityStats } from '@/lib/calendar/salesCalendarEngine';

interface DayCapacityHeaderProps {
  capacity: DayCapacityStats;
  missedCount?: number;
}

export const DayCapacityHeader: React.FC<DayCapacityHeaderProps> = ({ capacity, missedCount = 0 }) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs transition-all space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Title / Summary badge */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            <Zap className="h-4 w-4 fill-indigo-600" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              Real-Time Sales Capacity
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Live capacity calculation in Asia/Kolkata timezone
            </p>
          </div>
        </div>

        {/* Primary Real-Time Capacity Counters (Part 3) */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
          {/* Time Left Today */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white shadow-2xs">
            <Clock className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <span>
              TIME LEFT: <strong className="font-extrabold text-amber-300">{capacity.totalRemainingFormatted || '0m'}</strong>
            </span>
          </div>

          {/* Free Sales Time */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              FREE: <strong className="font-extrabold text-emerald-700">{capacity.freeRemainingFormatted || capacity.freeFormatted}</strong>
            </span>
          </div>

          {/* Booked Time */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200/80 shadow-2xs">
            <Clock className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span>
              BOOKED: <strong className="font-extrabold text-indigo-700">{capacity.bookedFormatted}</strong>
            </span>
          </div>

          {/* Next Activity */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200/80 shadow-2xs">
            <ArrowRight className="h-3.5 w-3.5 text-purple-600 shrink-0" />
            <span>
              NEXT:{' '}
              <strong className="font-extrabold text-purple-900">
                {capacity.nextActivityFormatted || 'None scheduled'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <PhoneCall className="h-3.5 w-3.5 text-blue-500" />
            <strong className="text-slate-800 font-bold">{capacity.callsCount}</strong> Calls
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1">
            <Video className="h-3.5 w-3.5 text-purple-500" />
            <strong className="text-slate-800 font-bold">{capacity.demosCount}</strong> Demos
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
            <strong className="text-slate-800 font-bold">{capacity.followUpsCount}</strong> Follow-ups
          </span>
        </div>

        {missedCount > 0 && (
          <div className="flex items-center gap-1.5 text-rose-600 font-bold text-[11px]">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{missedCount} overdue / missed activity</span>
          </div>
        )}
      </div>
    </div>
  );
};

