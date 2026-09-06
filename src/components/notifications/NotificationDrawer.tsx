'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Loader2,
  PhoneCall,
  MessageSquare,
  RotateCcw,
  Calendar,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const [reminders, setReminders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'OVERDUE' | 'DUE_NOW' | 'UPCOMING'>('ALL');
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');

  const now = new Date();

  const filteredReminders = reminders.filter((r) => {
    const remindDate = new Date(r.remindAt);
    const diffMinutes = (remindDate.getTime() - now.getTime()) / 60000;
    const isMissedOrOverdue =
      r.status === 'MISSED' || r.level === 'CRITICAL' || remindDate < now;

    if (activeTab === 'OVERDUE') {
      return isMissedOrOverdue;
    }
    if (activeTab === 'DUE_NOW') {
      return !isMissedOrOverdue && diffMinutes >= 0 && diffMinutes <= 60;
    }
    if (activeTab === 'UPCOMING') {
      return diffMinutes > 60;
    }
    return true;
  });

  const overdueCount = reminders.filter(
    (r) => r.status === 'MISSED' || r.level === 'CRITICAL' || new Date(r.remindAt) < now
  ).length;

  const dueNowCount = reminders.filter((r) => {
    const diff = (new Date(r.remindAt).getTime() - now.getTime()) / 60000;
    const isOverdue = r.status === 'MISSED' || r.level === 'CRITICAL' || new Date(r.remindAt) < now;
    return !isOverdue && diff >= 0 && diff <= 60;
  }).length;

  const upcomingCount = reminders.filter(
    (r) => (new Date(r.remindAt).getTime() - now.getTime()) / 60000 > 60
  ).length;

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reminders');
      const json = await res.json();
      if (json.success) {
        setReminders(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching reminders drawer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPushStatus(Notification.permission as any);
      } else {
        setPushStatus('unsupported');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = async (id: string, action: 'complete' | 'snooze' | 'open' | 'reschedule', minutes?: number, newRemindAt?: string) => {
    try {
      await fetch(`/api/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action.toUpperCase(), minutes, newRemindAt }),
      });
      fetchReminders();
      if (action === 'reschedule') {
        setReschedulingId(null);
      }
    } catch (err) {
      console.error('Error updating reminder:', err);
    }
  };

  const enablePushNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setIsSubmitting(true);
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission as any);
      if (permission === 'granted' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
        });

        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
      }
    } catch (err) {
      console.error('Error enabling push notifications:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border-l border-slate-200 h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 border border-indigo-100">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Notifications & Real Reminders</h2>
              <p className="text-[11px] text-slate-500">Live follow-up alarms & sales action queue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Web Push Status Banner */}
        <div className="p-3 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-slate-800">Push Status: </span>
              <span
                className={cn(
                  'font-mono text-[11px] font-bold uppercase',
                  pushStatus === 'granted'
                    ? 'text-emerald-700'
                    : pushStatus === 'denied'
                    ? 'text-rose-600'
                    : 'text-amber-700'
                )}
              >
                {pushStatus}
              </span>
            </div>
          </div>
          {pushStatus !== 'granted' && pushStatus !== 'unsupported' && (
            <button
              onClick={enablePushNotifications}
              disabled={isSubmitting}
              className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] transition shadow-xs flex items-center gap-1 disabled:opacity-50 shrink-0"
            >
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Enable Web Push'}
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-3 border-b border-slate-200 bg-slate-50/60 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'All', count: reminders.length },
            { id: 'OVERDUE', label: '🔴 Overdue / Missed', count: overdueCount },
            { id: 'DUE_NOW', label: '🟠 Due Now', count: dueNowCount },
            { id: 'UPCOMING', label: '🟡 Upcoming', count: upcomingCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition flex items-center gap-1',
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px]',
                  activeTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Reminders List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/60" />
              <p className="text-xs font-semibold text-slate-700">All caught up!</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                No reminders in this category right now.
              </p>
            </div>
          ) : (
            filteredReminders.map((rem) => {
              const remDate = new Date(rem.remindAt);
              const isOverdue = rem.status === 'MISSED' || rem.level === 'CRITICAL' || remDate < now;
              const phone = rem.lead?.contact?.phone;
              const cleanPhone = phone ? phone.replace(/[^0-9+]/g, '') : '';
              const isRescheduling = reschedulingId === rem.id;

              return (
                <div
                  key={rem.id}
                  className={cn(
                    'rounded-xl border p-3.5 shadow-xs transition-all space-y-2.5',
                    isOverdue
                      ? 'bg-rose-50/50 border-rose-200'
                      : rem.status === 'SNOOZED'
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            'inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold border uppercase',
                            rem.title?.toLowerCase().includes('demo')
                              ? 'bg-violet-50 text-violet-700 border-violet-100'
                              : rem.title?.toLowerCase().includes('call')
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                              : 'bg-amber-50 text-amber-800 border-amber-100'
                          )}
                        >
                          {rem.title?.toLowerCase().includes('demo')
                            ? '🎥 Demo'
                            : rem.title?.toLowerCase().includes('call')
                            ? '📞 Call'
                            : '🔔 Alert'}
                        </span>

                        {rem.status && rem.status !== 'PENDING' && (
                          <span
                            className={cn(
                              'text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border',
                              rem.status === 'MISSED'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : rem.status === 'SNOOZED'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            )}
                          >
                            {rem.status}
                          </span>
                        )}

                        {rem.lead && (
                          <a
                            href={`/leads/${rem.lead.id}`}
                            className="text-xs font-bold text-slate-900 hover:underline hover:text-indigo-600 truncate max-w-[160px]"
                          >
                            {rem.lead.title}
                          </a>
                        )}
                      </div>
                      <h3 className="text-xs font-semibold text-slate-900 leading-snug">{rem.title}</h3>
                    </div>

                    <span
                      className={cn(
                        'text-[10px] font-semibold font-mono flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-md border',
                        isOverdue
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {remDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {rem.message && (
                    <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700">Note: </span>
                      {rem.message}
                    </div>
                  )}

                  {/* Reschedule inline date picker */}
                  {isRescheduling && (
                    <div className="p-2.5 bg-indigo-50/70 rounded-lg border border-indigo-200 space-y-2 text-xs">
                      <label className="font-bold text-indigo-950 flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Choose New Follow-Up Time:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={rescheduleDate}
                          onChange={(e) => setRescheduleDate(e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-slate-300 bg-white font-mono flex-1 outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => {
                            if (rescheduleDate) {
                              handleAction(rem.id, 'reschedule', undefined, new Date(rescheduleDate).toISOString());
                            }
                          }}
                          disabled={!rescheduleDate}
                          className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-xs rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setReschedulingId(null)}
                          className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 5-Way Quick Action Bar */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {cleanPhone ? (
                        <>
                          <a
                            href={`tel:${cleanPhone}`}
                            className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold transition flex items-center gap-1"
                            title="Direct Dial"
                          >
                            <PhoneCall className="w-3 h-3 text-emerald-600" /> Call
                          </a>
                          <a
                            href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                            title="Direct WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" /> WhatsApp
                          </a>
                        </>
                      ) : rem.leadId ? (
                        <a
                          href={`/leads/${rem.leadId}`}
                          className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-0.5"
                        >
                          View Lead <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setReschedulingId(rem.id);
                          setRescheduleDate(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
                        }}
                        className="px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-medium transition flex items-center gap-1"
                        title="Reschedule Follow-up"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-500" /> Reschedule
                      </button>
                      <button
                        onClick={() => handleAction(rem.id, 'snooze', 15)}
                        className="px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-medium transition"
                        title="Snooze 15 minutes"
                      >
                        +15m
                      </button>
                      <button
                        onClick={() => handleAction(rem.id, 'complete')}
                        className="px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold transition shadow-xs flex items-center gap-1"
                        title="Mark Completed"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-center text-[11px] text-slate-500 font-medium">
          BroStartup Sales OS • Real-Time Notification & Reminder Engine
        </div>
      </div>
    </div>
  );
};
