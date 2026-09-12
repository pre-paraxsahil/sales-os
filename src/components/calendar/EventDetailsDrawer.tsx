'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  Clock,
  PhoneCall,
  Video,
  MessageSquare,
  CheckCircle2,
  Calendar as CalendarIcon,
  ExternalLink,
  Bell,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { CalendarEvent } from '@/lib/calendar/salesCalendarEngine';
import { getActivityStyle } from './BookingItemCard';
import { cn } from '@/lib/utils';

interface EventDetailsDrawerProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onMarkDone: (event: CalendarEvent) => void;
  onRescheduleSuccess: () => void;
  onTriggerCall?: (phone?: string | null, leadId?: string | null) => void;
  onTriggerWhatsApp?: (phone?: string | null, leadId?: string | null) => void;
}

export const EventDetailsDrawer: React.FC<EventDetailsDrawerProps> = ({
  event,
  onClose,
  onMarkDone,
  onRescheduleSuccess,
  onTriggerCall,
  onTriggerWhatsApp,
}) => {
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [reschDate, setReschDate] = useState<string>('');
  const [reschTime, setReschTime] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!event) return null;

  const style = getActivityStyle(event.type);
  const Icon = style.icon;

  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const handleStartReschedule = () => {
    const d = new Date(event.startTime);
    setReschDate(d.toISOString().split('T')[0]);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    setReschTime(`${h}:${m}`);
    setIsRescheduling(true);
    setErrorMsg(null);
  };

  const handleConfirmReschedule = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const [y, mon, d] = reschDate.split('-').map((v) => parseInt(v, 10));
      const [h, m] = reschTime.split(':').map((v) => parseInt(v, 10));
      const newStart = new Date(y, mon - 1, d, h, m, 0, 0);

      const res = await fetch(`/api/calendar/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESCHEDULE',
          sourceEntity: event.sourceEntity,
          newStartTime: newStart.toISOString(),
          durationMinutes: event.durationMinutes,
          bufferMinutes: event.bufferMinutes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'Failed to reschedule.');
        return;
      }

      setIsRescheduling(false);
      onRescheduleSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Reschedule failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this calendar booking?')) return;
    try {
      const res = await fetch(`/api/calendar/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CANCEL',
          sourceEntity: event.sourceEntity,
        }),
      });
      if (res.ok) {
        onRescheduleSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Failed to cancel booking:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-lg border', style.badgeBg)}>
              {style.label}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase">
              {event.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Title & Lead Info */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{event.title}</h2>
            {event.lead && (
              <div className="mt-2 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {event.lead.contactName || event.lead.businessName || event.lead.title}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {event.lead.businessName || event.lead.phone || ''}
                  </div>
                </div>
                <Link
                  href={`/leads/${event.lead.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  View Lead <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Time & Duration Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-slate-400" /> Date
              </span>
              <span className="font-bold text-slate-900">{formatDate(event.startTime)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> Time Range
              </span>
              <span className="font-bold text-slate-900">
                {formatTime(event.startTime)} – {formatTime(event.endTime)} ({event.durationMinutes}m)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-slate-400" /> Reminder
              </span>
              <span className="font-semibold text-slate-700">
                {event.reminder ? `${formatTime(event.reminder.remindAt)} (10m before)` : 'Linked'}
              </span>
            </div>
          </div>

          {/* Notes Section */}
          {event.notes && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Notes / Purpose
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium whitespace-pre-wrap">
                {event.notes}
              </div>
            </div>
          )}

          {/* Inline Reschedule Form */}
          {isRescheduling && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="text-xs font-bold text-amber-900">Reschedule Booking</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={reschDate}
                  onChange={(e) => setReschDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-amber-300 bg-white"
                />
                <input
                  type="time"
                  value={reschTime}
                  onChange={(e) => setReschTime(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-amber-300 bg-white"
                />
              </div>

              {errorMsg && <div className="text-xs text-rose-600 font-bold">{errorMsg}</div>}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleConfirmReschedule}
                  disabled={submitting}
                  className="flex-1 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 shadow-2xs"
                >
                  {submitting ? 'Checking...' : 'Save New Time'}
                </button>
                <button
                  onClick={() => setIsRescheduling(false)}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-200/80 bg-slate-50/50 space-y-2">
          <div className="flex items-center gap-2">
            {/* Call */}
            {event.lead?.phone && (
              <button
                onClick={() => onTriggerCall?.(event.lead?.phone, event.leadId)}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center justify-center gap-1.5"
              >
                <PhoneCall className="h-3.5 w-3.5" /> Call
              </button>
            )}

            {/* WhatsApp */}
            {event.lead?.phone && (
              <button
                onClick={() => onTriggerWhatsApp?.(event.lead?.phone, event.leadId)}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
              </button>
            )}

            {/* Done */}
            {event.status !== 'COMPLETED' && (
              <button
                onClick={() => {
                  onMarkDone(event);
                  onClose();
                }}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-emerald-600 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Done
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 text-xs">
            <button
              onClick={handleStartReschedule}
              className="text-amber-700 font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reschedule
            </button>
            <button
              onClick={handleCancelBooking}
              className="text-rose-600 font-bold hover:underline flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
