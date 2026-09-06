'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, AlertCircle, RefreshCw, Send } from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermissionState,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  NotificationPermissionState,
} from '@/lib/push/clientPush';

export function NotificationSettingsCard() {
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>('unsupported');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    setPermissionState(getNotificationPermissionState());
  }, []);

  const handleEnablePush = async () => {
    setLoading(true);
    setStatusMessage(null);

    const result = await subscribeToPushNotifications();
    setPermissionState(getNotificationPermissionState());
    setLoading(false);

    if (result.success) {
      setStatusMessage({ text: 'Push notifications enabled successfully!' });
    } else {
      setStatusMessage({ text: result.message || 'Failed to enable notifications.', isError: true });
    }
  };

  const handleDisablePush = async () => {
    setLoading(true);
    setStatusMessage(null);

    const result = await unsubscribeFromPushNotifications();
    setPermissionState(getNotificationPermissionState());
    setLoading(false);

    if (result.success) {
      setStatusMessage({ text: 'Notifications disabled.' });
    } else {
      setStatusMessage({ text: result.message || 'Failed to disable notifications.', isError: true });
    }
  };

  const handleSendTestPush = async () => {
    setLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/notifications/cron?secret=salesos_cron_secret_key_2026', {
        method: 'POST',
      });
      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        setStatusMessage({
          text: `Push engine processed: ${data.processedRemindersCount || 0} items checked, ${data.notificationsSentCount || 0} push alerts sent.`,
        });
      } else {
        setStatusMessage({ text: data.error || 'Failed to trigger push engine test.', isError: true });
      }
    } catch (e: any) {
      setLoading(false);
      setStatusMessage({ text: 'Error connecting to push server.', isError: true });
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
          <Bell className="h-4 w-4 text-amber-500" />
          <span>Web Push Notifications & Reminders</span>
        </div>

        {permissionState === 'granted' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Active
          </span>
        )}
        {permissionState === 'denied' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            Denied
          </span>
        )}
        {permissionState === 'unsupported' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Unsupported
          </span>
        )}
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        Receive real-time push alerts on your desktop or mobile home screen for upcoming sales follow-ups, hot lead callbacks, and scheduled demos.
      </p>

      {permissionState === 'granted' ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-800 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Browser subscription registered with Sales OS backend.</span>
            </div>
            <button
              onClick={handleDisablePush}
              disabled={loading}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold underline"
            >
              Disable
            </button>
          </div>

          <button
            onClick={handleSendTestPush}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition active:scale-[0.98]"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>Run Push Scheduler Test</span>
          </button>
        </div>
      ) : permissionState === 'denied' ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1 text-xs text-amber-900">
          <div className="font-semibold flex items-center gap-1.5 text-amber-800">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>Browser Permission Blocked</span>
          </div>
          <p className="text-[11px] text-amber-800/80">
            Notifications are currently blocked by your browser settings. To enable, click the lock icon near your browser address bar and select &quot;Allow Notifications&quot;.
          </p>
        </div>
      ) : permissionState === 'unsupported' ? (
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200 flex items-center gap-2">
          <BellOff className="h-4 w-4 text-slate-400" />
          <span>Web Push is not supported by your current browser environment.</span>
        </div>
      ) : (
        <button
          onClick={handleEnablePush}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          <span>Enable Sales OS Push Notifications</span>
        </button>
      )}

      {statusMessage && (
        <div
          className={`p-2.5 rounded-md text-xs font-medium border ${
            statusMessage.isError
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <div className="rounded-lg bg-indigo-50/50 p-3 text-xs text-indigo-950 border border-indigo-100 flex items-start gap-2">
        <Bell className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-indigo-900">Guaranteed Multi-Tier Fallback:</span>
          <p className="text-[11px] text-indigo-800/80 leading-normal">
            Even if Web Push is disabled, blocked, or unavailable on your device, all scheduled sales reminders and missed follow-ups are persistently queued in the top notification bell and Today Cockpit.
          </p>
        </div>
      </div>
    </div>
  );
}
