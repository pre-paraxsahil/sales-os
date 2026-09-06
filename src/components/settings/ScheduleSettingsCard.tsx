'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Coffee,
  Calendar,
  Globe,
  Check,
  Save,
  LogIn,
  LogOut,
  Sparkles,
  AlertCircle,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkHoursConfig } from '@/lib/schedule/types';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
  { id: 0, label: 'Sun', full: 'Sunday' },
];

const TIMEZONES = [
  { id: 'Asia/Kolkata', label: 'Asia/Kolkata (IST • UTC+5:30)' },
  { id: 'Asia/Dubai', label: 'Asia/Dubai (GST • UTC+4:00)' },
  { id: 'Asia/Singapore', label: 'Asia/Singapore (SGT • UTC+8:00)' },
  { id: 'Europe/London', label: 'Europe/London (GMT/BST • UTC+0/+1)' },
  { id: 'America/New_York', label: 'America/New_York (EST/EDT • UTC-5/-4)' },
  { id: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT • UTC-8/-7)' },
];

export const ScheduleSettingsCard: React.FC = () => {
  const [config, setConfig] = useState<WorkHoursConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [attendance, setAttendance] = useState<any>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const fetchSettingsAndAttendance = useCallback(async () => {
    try {
      const [scheduleRes, attRes] = await Promise.all([
        fetch('/api/settings/schedule'),
        fetch('/api/attendance'),
      ]);

      if (scheduleRes.ok) {
        const json = await scheduleRes.json();
        if (json.success) {
          setConfig({
            startHour: 10,
            startMinute: 0,
            endHour: 18,
            endMinute: 0,
            workingDays: [1, 2, 3, 4, 5, 6],
            weeklyOffDays: [0],
            timezone: 'Asia/Kolkata',
            lunch: {
              startHour: 14,
              startMinute: 0,
              endHour: 15,
              endMinute: 0,
              isProtected: true,
            },
            reminderThresholds: {
              demoMinutesBefore: 20,
              overdueCheckMinutes: 30,
            },
            ...json.data,
          });
        }
      }

      if (attRes.ok) {
        const attJson = await attRes.json();
        if (attJson.success) setAttendance(attJson.data);
      }
    } catch (err) {
      console.error('Failed to load schedule settings & attendance:', err);
    }
  }, []);

  useEffect(() => {
    fetchSettingsAndAttendance();
  }, [fetchSettingsAndAttendance]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setSavedMessage(false);

    try {
      const res = await fetch('/api/settings/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
        fetchSettingsAndAttendance();
      }
    } catch (err) {
      console.error('Failed to save schedule settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClockAction = async (action: 'CLOCK_IN' | 'CLOCK_OUT') => {
    try {
      setAttendanceLoading(true);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchSettingsAndAttendance();
      }
    } catch (err) {
      console.error('Failed to perform clock action:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const toggleWorkingDay = (dayId: number) => {
    if (!config) return;
    const current = config.workingDays || [1, 2, 3, 4, 5, 6];
    const updated = current.includes(dayId)
      ? current.filter((d) => d !== dayId)
      : [...current, dayId];
    setConfig({ ...config, workingDays: updated });
  };

  const toggleWeeklyOff = (dayId: number) => {
    if (!config) return;
    const current = config.weeklyOffDays || [0];
    const updated = current.includes(dayId)
      ? current.filter((d) => d !== dayId)
      : [...current, dayId];
    setConfig({ ...config, weeklyOffDays: updated });
  };

  const formatHourMinute = (h: number, m: number = 0) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  if (!config) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-xs text-slate-500 shadow-xs animate-pulse">
        Loading sales working profile...
      </div>
    );
  }

  const officeStatus = attendance?.officeStatus;
  const isClockedIn = officeStatus?.isClockedIn;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6 shadow-xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Sales Working Profile & Time Engine
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure working hours, lunch windows, weekly off days, and timezone.
          </p>
        </div>

        {savedMessage && (
          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs">
            <Check className="w-3.5 h-3.5" /> Saved & Updated
          </span>
        )}
      </div>

      {/* Quick Attendance / Clock In-Out Widget */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-sky-50/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs',
              isClockedIn
                ? 'bg-emerald-600 text-white'
                : officeStatus?.code === 'CLOSED'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-200 text-slate-700'
            )}
          >
            {isClockedIn ? <Timer className="w-5 h-5 animate-spin" /> : <Clock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Live Status: {officeStatus?.badgeLabel || '⚪ Not Clocked In'}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                ({officeStatus?.timeString || ''})
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {officeStatus?.subText || 'Ready for sales activities.'}
            </p>
          </div>
        </div>

        <div>
          {isClockedIn ? (
            <button
              type="button"
              disabled={attendanceLoading}
              onClick={() => handleClockAction('CLOCK_OUT')}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              {attendanceLoading ? 'Updating...' : 'Clock Out'}
            </button>
          ) : (
            <button
              type="button"
              disabled={attendanceLoading}
              onClick={() => handleClockAction('CLOCK_IN')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              {attendanceLoading ? 'Updating...' : 'Clock In Now'}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5 text-xs">
        {/* Timezone Configuration */}
        <div className="space-y-1.5">
          <label className="block text-slate-700 font-semibold flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-600" /> Timezone
          </label>
          <select
            value={config.timezone || 'Asia/Kolkata'}
            onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
            className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-900 text-xs focus:bg-white focus:border-indigo-500 outline-none font-medium"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.id} value={tz.id}>
                {tz.label}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-slate-500 block">
            Current default: Indian Standard Time (Asia/Kolkata UTC+5:30)
          </span>
        </div>

        {/* Working Days Selector */}
        <div className="space-y-2">
          <label className="block text-slate-700 font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Working Days
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = (config.workingDays || [1, 2, 3, 4, 5, 6]).includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleWorkingDay(day.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-bold text-xs transition border',
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  )}
                  title={day.full}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Weekly Off Days */}
        <div className="space-y-2">
          <label className="block text-slate-700 font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Weekly Off Days (Office Closed)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS_OF_WEEK.map((day) => {
              const isOff = (config.weeklyOffDays || [0]).includes(day.id);
              return (
                <button
                  key={`off-${day.id}`}
                  type="button"
                  onClick={() => toggleWeeklyOff(day.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-bold text-xs transition border',
                    isOff
                      ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  )}
                  title={day.full}
                >
                  {day.label} {isOff && '• Off'}
                </button>
              );
            })}
          </div>
          <span className="text-[10px] text-slate-500 block">
            On weekly off days, the system automatically shows &ldquo;[Day] — Office Closed&rdquo; and pauses calling tasks.
          </span>
        </div>

        {/* Office Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
          <div>
            <label className="block text-slate-700 mb-1 font-semibold">Office Start Time</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="6"
                max="12"
                value={config.startHour}
                onChange={(e) => setConfig({ ...config, startHour: parseInt(e.target.value) || 10 })}
                className="w-20 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-slate-900 font-mono text-xs focus:border-indigo-500 outline-none"
              />
              <span className="text-xs font-bold text-indigo-700">
                = {formatHourMinute(config.startHour, config.startMinute)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Default: 10 AM</span>
          </div>

          <div>
            <label className="block text-slate-700 mb-1 font-semibold">Office End Time</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="14"
                max="23"
                value={config.endHour}
                onChange={(e) => setConfig({ ...config, endHour: parseInt(e.target.value) || 18 })}
                className="w-20 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-slate-900 font-mono text-xs focus:border-indigo-500 outline-none"
              />
              <span className="text-xs font-bold text-indigo-700">
                = {formatHourMinute(config.endHour, config.endMinute)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Default: 6 PM (18:00)</span>
          </div>
        </div>

        {/* Lunch Hours */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-800 font-semibold flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-amber-500" /> Lunch Window
            </span>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={config.lunch?.isProtected}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    lunch: { ...config.lunch, isProtected: e.target.checked },
                  })
                }
                className="rounded border-slate-300 text-indigo-600 focus:ring-0"
              />
              <span>Protect lunch from sales calls</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-slate-600 block mb-1 font-medium">
                Lunch Start (24h)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="11"
                  max="16"
                  value={config.lunch?.startHour}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      lunch: { ...config.lunch, startHour: parseInt(e.target.value) || 14 },
                    })
                  }
                  className="w-20 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-slate-900 font-mono text-xs focus:border-indigo-500 outline-none"
                />
                <span className="text-xs font-bold text-amber-700">
                  = {formatHourMinute(config.lunch?.startHour || 14, config.lunch?.startMinute || 0)}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-600 block mb-1 font-medium">
                Lunch End (24h)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="12"
                  max="17"
                  value={config.lunch?.endHour}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      lunch: { ...config.lunch, endHour: parseInt(e.target.value) || 15 },
                    })
                  }
                  className="w-20 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-slate-900 font-mono text-xs focus:border-indigo-500 outline-none"
                />
                <span className="text-xs font-bold text-amber-700">
                  = {formatHourMinute(config.lunch?.endHour || 15, config.lunch?.endMinute || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reminder Lead Time */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
          <label className="block text-slate-700 font-semibold flex items-center gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Action Reminder Lead Time
          </label>
          <p className="text-[11px] text-slate-500">
            How many minutes in advance should sales action reminders and push notifications trigger?
          </p>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15, 30].map((mins) => {
              const selected = (config.reminderLeadTimeMinutes ?? 10) === mins;
              return (
                <button
                  key={`lead-${mins}`}
                  type="button"
                  onClick={() => setConfig({ ...config, reminderLeadTimeMinutes: mins })}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-bold text-xs transition border',
                    selected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {mins} min before {mins === 10 && '• Default'}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Working Profile...' : 'Save Working Profile'}
        </button>
      </form>
    </div>
  );
};
