'use client';

import React from 'react';
import Link from 'next/link';
import {
  PhoneCall,
  Video,
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  Flame,
  FileText,
  Package,
  CheckSquare,
  Lock,
  Clock,
  User,
  Building,
  ExternalLink,
  Play,
  AlertTriangle,
} from 'lucide-react';
import { CalendarEvent, CalendarActivityType } from '@/lib/calendar/salesCalendarEngine';
import { cn } from '@/lib/utils';

interface BookingItemCardProps {
  event: CalendarEvent;
  onOpenDetails: (event: CalendarEvent) => void;
  onMarkDone: (event: CalendarEvent) => void;
  onTriggerCall?: (phone?: string | null, leadId?: string | null) => void;
  onTriggerWhatsApp?: (phone?: string | null, leadId?: string | null) => void;
}

export const getActivityStyle = (type: CalendarActivityType) => {
  switch (type) {
    case 'DEMO':
      return {
        badgeBg: 'bg-purple-100 text-purple-700 border-purple-200',
        cardBorder: 'border-l-4 border-l-purple-600',
        icon: Video,
        label: '🎥 Demo',
      };
    case 'CALLBACK':
      return {
        badgeBg: 'bg-orange-100 text-orange-700 border-orange-200',
        cardBorder: 'border-l-4 border-l-orange-500',
        icon: RefreshCw,
        label: '🔄 Callback',
      };
    case 'SEND_DETAILS':
      return {
        badgeBg: 'bg-teal-100 text-teal-700 border-teal-200',
        cardBorder: 'border-l-4 border-l-teal-500',
        icon: MessageSquare,
        label: '💬 Send Details',
      };
    case 'CLOSING':
      return {
        badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        cardBorder: 'border-l-4 border-l-emerald-600',
        icon: Flame,
        label: '🔥 Closing Call',
      };
    case 'FOLLOW_UP':
      return {
        badgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
        cardBorder: 'border-l-4 border-l-amber-500',
        icon: CheckCircle2,
        label: '📋 Follow-up',
      };
    case 'QUOTATION':
      return {
        badgeBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        cardBorder: 'border-l-4 border-l-indigo-500',
        icon: FileText,
        label: '📄 Quotation',
      };
    case 'SAMPLE':
      return {
        badgeBg: 'bg-sky-100 text-sky-700 border-sky-200',
        cardBorder: 'border-l-4 border-l-sky-500',
        icon: Package,
        label: '📦 Sample',
      };
    case 'WHATSAPP':
      return {
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        cardBorder: 'border-l-4 border-l-emerald-500',
        icon: MessageSquare,
        label: '💬 WhatsApp',
      };
    case 'TASK':
      return {
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        cardBorder: 'border-l-4 border-l-slate-400',
        icon: CheckSquare,
        label: '📋 Task',
      };
    case 'LUNCH':
      return {
        badgeBg: 'bg-gray-100 text-gray-700 border-gray-200',
        cardBorder: 'border-l-4 border-l-gray-400',
        icon: Lock,
        label: '🔒 Lunch',
      };
    case 'CALL':
    default:
      return {
        badgeBg: 'bg-blue-100 text-blue-700 border-blue-200',
        cardBorder: 'border-l-4 border-l-blue-500',
        icon: PhoneCall,
        label: '📞 Call',
      };
  }
};

export const BookingItemCard: React.FC<BookingItemCardProps> = ({
  event,
  onOpenDetails,
  onMarkDone,
  onTriggerCall,
  onTriggerWhatsApp,
}) => {
  const style = getActivityStyle(event.type);
  const Icon = style.icon;

  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const startTimeStr = formatTime(event.startTime);
  const endTimeStr = formatTime(event.endTime);

  const isCompleted = event.status === 'COMPLETED';
  const isMissed = event.status === 'MISSED';
  const isInProgress = event.status === 'IN_PROGRESS';

  if (event.type === 'LUNCH') {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 text-xs">
        <div className="flex items-center gap-2 font-medium">
          <Lock className="h-4 w-4 text-slate-400" />
          <span>🔒 Protected Lunch Window ({startTimeStr} – {endTimeStr})</span>
        </div>
        <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md">
          Protected
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3',
        style.cardBorder,
        isCompleted && 'opacity-65 bg-slate-50/50',
        isMissed && 'border-rose-300 bg-rose-50/20'
      )}
    >
      {/* Event Details Left */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Time Badge */}
        <div className="shrink-0 text-left min-w-[100px]">
          <div className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {startTimeStr}
          </div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <span>to {endTimeStr}</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
              {event.durationMinutes}m
            </span>
          </div>
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* Activity Pill */}
            <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-lg border', style.badgeBg)}>
              {style.label}
            </span>

            {/* Status Pill */}
            {isCompleted && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
                ✓ Completed
              </span>
            )}
            {isMissed && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Missed
              </span>
            )}
            {isInProgress && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> Live Now
              </span>
            )}
          </div>

          {/* Lead / Customer Title */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenDetails(event)}
              className="text-sm font-bold text-slate-900 hover:text-indigo-600 truncate transition-colors text-left"
            >
              {event.title}
            </button>
            {event.leadId && (
              <Link
                href={`/leads/${event.leadId}`}
                className="text-slate-400 hover:text-indigo-600 shrink-0 transition-colors"
                title="Open Lead Details"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {/* Notes or Subtext */}
          {event.notes && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{event.notes}</p>
          )}
        </div>
      </div>

      {/* Quick Action Buttons Right */}
      <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 justify-end">
        {/* Call Action */}
        {(event.type === 'CALL' || event.type === 'CALLBACK' || event.type === 'CLOSING' || event.type === 'FOLLOW_UP') &&
          !isCompleted && (
            <button
              onClick={() => onTriggerCall?.(event.lead?.phone, event.leadId)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all"
            >
              <PhoneCall className="h-3.5 w-3.5" /> Call
            </button>
          )}

        {/* WhatsApp Action */}
        {(event.type === 'SEND_DETAILS' || event.type === 'WHATSAPP' || event.lead?.phone) && !isCompleted && (
          <button
            onClick={() => onTriggerWhatsApp?.(event.lead?.phone, event.leadId)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all"
          >
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
          </button>
        )}

        {/* Demo Action */}
        {event.type === 'DEMO' && !isCompleted && (
          <button
            onClick={() => onOpenDetails(event)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all"
          >
            <Play className="h-3.5 w-3.5" /> Start
          </button>
        )}

        {/* Mark Done Button */}
        {!isCompleted && (
          <button
            onClick={() => onMarkDone(event)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white border border-slate-200 transition-all"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Done
          </button>
        )}

        {/* Open Details Button */}
        <button
          onClick={() => onOpenDetails(event)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all"
        >
          Details
        </button>
      </div>
    </div>
  );
};
