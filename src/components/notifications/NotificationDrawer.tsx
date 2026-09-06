'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, Clock, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAction = async (id: string, action: 'complete' | 'snooze') => {
    try {
      await fetch(`/api/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      fetchReminders();
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
              <h2 className="text-sm font-bold text-slate-900">Notifications & Push Reminders</h2>
              <p className="text-[11px] text-slate-500">Scheduled action alerts & system reminders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Web Push Banner */}
        <div className="p-4 bg-indigo-50/50 border-b border-indigo-100/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800">Browser Push Alerts: </span>
              <span className="text-slate-600 font-mono text-[11px] capitalize">{pushStatus}</span>
            </div>
          </div>
          {pushStatus !== 'granted' && pushStatus !== 'unsupported' && (
            <button
              onClick={enablePushNotifications}
              disabled={isSubmitting}
              className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] transition shadow-xs flex items-center gap-1 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Enable'}
            </button>
          )}
        </div>

        {/* Reminders List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : reminders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/60" />
              <p className="text-xs font-semibold text-slate-700">All caught up!</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                No pending high-priority reminders or overdue follow-up tasks due right now.
              </p>
            </div>
          ) : (
            reminders.map((rem) => (
              <div
                key={rem.id}
                className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-slate-300 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="inline-block rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold">
                      {rem.level || 'REMINDER'}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 leading-snug">{rem.title}</h3>
                  </div>
                  <span className="text-[10px] text-amber-600 font-medium font-mono flex items-center gap-1 shrink-0 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                    <Clock className="h-3 w-3" />
                    {new Date(rem.remindAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {rem.message && <p className="text-[11px] text-slate-600 leading-relaxed">{rem.message}</p>}

                {rem.lead && (
                  <div className="text-[10px] text-indigo-600 font-semibold bg-slate-50 p-1.5 rounded-md border border-slate-100 flex items-center justify-between">
                    <span>Lead: {rem.lead.title}</span>
                    {rem.lead.contact?.phone && <span className="font-mono text-slate-500">{rem.lead.contact.phone}</span>}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => handleAction(rem.id, 'snooze')}
                    className="px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-medium transition"
                  >
                    Snooze 15m
                  </button>
                  <button
                    onClick={() => handleAction(rem.id, 'complete')}
                    className="px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold transition shadow-xs flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Complete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-center text-[11px] text-slate-500">
          Sales OS Active Reminder Engine
        </div>
      </div>
    </div>
  );
};
