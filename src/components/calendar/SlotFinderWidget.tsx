'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Clock, Calendar as CalendarIcon, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getTodayDateString,
  getLocalTimeParts,
  formatISTDateDDMMYYYY,
  formatRelativeTimeUntil,
  parseSalesDate,
} from '@/lib/time/salesTimeEngine';

interface AvailableTimeSlot {
  startTimeIso: string;
  endTimeIso: string;
  formattedTime: string;
  formattedRange: string;
}

interface SlotFinderWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSlot: (startTimeIso: string, dateString: string, formattedTime: string) => void;
}

export const SlotFinderWidget: React.FC<SlotFinderWidgetProps> = ({
  isOpen,
  onClose,
  onSelectSlot,
}) => {
  const [dateString, setDateString] = useState<string>(getTodayDateString());
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [bufferMinutes, setBufferMinutes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [slots, setSlots] = useState<AvailableTimeSlot[]>([]);
  const [isWorkingDay, setIsWorkingDay] = useState<boolean>(true);
  const [dateLabel, setDateLabel] = useState<string>('');
  const [emptyReason, setEmptyReason] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      setApiError(null);
      setEmptyReason(null);

      const res = await fetch(
        `/api/calendar/available-slots?dateString=${encodeURIComponent(dateString)}&durationMinutes=${durationMinutes}&bufferMinutes=${bufferMinutes}`
      );

      if (!res.ok) {
        setApiError("Couldn't check availability. Please try again.");
        setSlots([]);
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        setSlots(json.data.slots || []);
        setIsWorkingDay(json.data.isWorkingDay);
        setDateLabel(json.data.dateLabel || '');
        setEmptyReason(json.data.reason || null);
      } else {
        setApiError(json.error || "Couldn't check availability. Please try again.");
        setSlots([]);
      }
    } catch (err: any) {
      console.error('Failed to search available slots:', err);
      setApiError("Couldn't check availability. Please try again.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSlots();
    }
  }, [isOpen, dateString, durationMinutes, bufferMinutes]);

  if (!isOpen) return null;

  const currentParsedDate = parseSalesDate(dateString);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 bg-indigo-50/40">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              <Search className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Find Free Time</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Search conflict-free available sales slots
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="p-5 space-y-3.5 border-b border-slate-100 bg-slate-50/20">
          {/* Quick Date Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date Shortcuts</span>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-mono">
                {formatISTDateDDMMYYYY(currentParsedDate)} ({formatRelativeTimeUntil(currentParsedDate)})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Today', getVal: () => getTodayDateString(new Date()) },
                { label: 'Tomorrow', getVal: () => getTodayDateString(new Date(Date.now() + 24 * 60 * 60 * 1000)) },
                { label: '+4 days', getVal: () => getTodayDateString(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)) },
                { label: '+10 days', getVal: () => getTodayDateString(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)) },
                { label: 'Next week', getVal: () => getTodayDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) },
              ].map((sc) => {
                const scVal = sc.getVal();
                const isSelected = dateString === scVal;
                return (
                  <button
                    key={sc.label}
                    type="button"
                    onClick={() => setDateString(scVal)}
                    className={cn(
                      'px-2 py-1 text-xs font-bold rounded-lg border transition-all',
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    {sc.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Preferred Date</label>
              <input
                type="date"
                value={dateString}
                onChange={(e) => setDateString(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Available Slot Chips Container */}
        <div className="p-5 flex-1 overflow-y-auto max-h-[50vh] space-y-3">
          {apiError ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-center font-medium flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{apiError}</span>
            </div>
          ) : !isWorkingDay ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center font-medium">
              🔴 {dateLabel} is a weekly off day. Office is closed.
            </div>
          ) : loading ? (
            <div className="text-xs text-slate-400 text-center py-6">Searching free slots...</div>
          ) : slots.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs text-center font-medium">
              {emptyReason || `No free slots available on this date for ${durationMinutes}m duration.`}
            </div>
          ) : (
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span>Available Slots ({slots.length}):</span>
                <span className="text-[11px] font-mono text-slate-500 font-normal">
                  {formatISTDateDDMMYYYY(currentParsedDate)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {slots.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const parts = getLocalTimeParts(new Date(slot.startTimeIso));
                      const h = String(parts.hour).padStart(2, '0');
                      const m = String(parts.minute).padStart(2, '0');
                      onSelectSlot(slot.startTimeIso, parts.formattedDate, `${h}:${m}`);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white text-indigo-900 font-bold text-xs shadow-2xs transition-all text-center flex flex-col items-center justify-center gap-0.5"
                  >
                    <span>{slot.formattedTime}</span>
                    <span className="text-[10px] font-normal opacity-80">{durationMinutes}m</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
