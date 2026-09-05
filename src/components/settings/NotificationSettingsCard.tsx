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
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-200">
          <Bell className="h-4 w-4 text-amber-400" />
          <span>Web Push Notifications & Reminders</span>
        </div>

        {permissionState === 'granted' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Active
          </span>
        )}
        {permissionState === 'denied' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="h-3.5 w-3.5" />
            Denied
          </span>
        )}
        {permissionState === 'unsupported' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Unsupported
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Receive real-time push alerts on your desktop or mobile home screen for upcoming sales follow-ups, hot lead callbacks, and scheduled demos.
      </p>

      {permissionState === 'granted' ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-950 p-3 text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Browser subscription registered with Sales OS backend.</span>
            </div>
            <button
              onClick={handleDisablePush}
              disabled={loading}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-medium underline"
            >
              Disable
            </button>
          </div>

          <button
            onClick={handleSendTestPush}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>Run Push Scheduler Test</span>
          </button>
        </div>
      ) : permissionState === 'denied' ? (
        <div className="rounded-lg bg-amber-950/20 border border-amber-800/40 p-3 space-y-1 text-xs text-amber-200">
          <div className="font-semibold flex items-center gap-1.5 text-amber-300">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Browser Permission Blocked</span>
          </div>
          <p className="text-[11px] text-amber-300/80">
            Notifications are currently blocked by your browser settings. To enable, click the lock icon near your browser address bar and select "Allow Notifications".
          </p>
        </div>
      ) : permissionState === 'unsupported' ? (
        <div className="rounded-lg bg-slate-950 p-3 text-xs text-slate-400 border border-slate-800 flex items-center gap-2">
          <BellOff className="h-4 w-4 text-slate-500" />
          <span>Web Push is not supported by your current browser environment.</span>
        </div>
      ) : (
        <button
          onClick={handleEnablePush}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          <span>Enable Sales OS Push Notifications</span>
        </button>
      )}

      {statusMessage && (
        <div
          className={`p-2.5 rounded-md text-xs font-medium border ${
            statusMessage.isError
              ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
              : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
          }`}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}
