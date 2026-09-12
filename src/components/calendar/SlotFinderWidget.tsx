'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Clock, Calendar as CalendarIcon, Sparkles, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [dateString, setDateString] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [bufferMinutes, setBufferMinutes] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);
  const [slots, setSlots] = useState<AvailableTimeSlot[]>([]);
  const [isWorkingDay, setIsWorkingDay] = useState<boolean>(true);
  const [dateLabel, setDateLabel] = useState<string>('');

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/calendar/available-slots?dateString=${dateString}&durationMinutes=${durationMinutes}&bufferMinutes=${bufferMinutes}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSlots(json.data.slots || []);
          setIsWorkingDay(json.data.isWorkingDay);
          setDateLabel(json.data.dateLabel);
        }
      }
    } catch (err) {
      console.error('Failed to search available slots:', err);
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
              <h3 className="text-sm font-bold text-slate-900">Find a Free Time</h3>
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
        <div className="p-5 space-y-4 border-b border-slate-100 bg-slate-50/20">
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
          {!isWorkingDay ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center font-medium">
              🔴 {dateLabel} is a weekly off day. Office is closed.
            </div>
          ) : loading ? (
            <div className="text-xs text-slate-400 text-center py-6">Searching free slots...</div>
          ) : slots.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-6">
              No free slots available on this date for {durationMinutes}m duration.
            </div>
          ) : (
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2">
                Available Slots Today ({slots.length}):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {slots.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const d = new Date(slot.startTimeIso);
                      const h = String(d.getHours()).padStart(2, '0');
                      const m = String(d.getMinutes()).padStart(2, '0');
                      onSelectSlot(slot.startTimeIso, dateString, `${h}:${m}`);
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
