'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Coffee, ShieldCheck, Check, Save } from 'lucide-react';

export const ScheduleSettingsCard: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    fetch('/api/settings/schedule')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setConfig(json.data);
      })
      .catch((err) => console.error('Failed to load schedule settings:', err));
  }, []);

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
      }
    } catch (err) {
      console.error('Failed to save schedule settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-500 shadow-xs">
        Loading schedule settings...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
          <Clock className="h-4 w-4 text-sky-600" />
          <span>Working Hours & Sales Timeline Settings</span>
        </div>
        {savedMessage && (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        {/* Working Hours */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 mb-1 font-medium">Day Start Time</label>
            <input
              type="number"
              min="6"
              max="12"
              value={config.startHour}
              onChange={(e) => setConfig({ ...config, startHour: parseInt(e.target.value) || 10 })}
              className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-slate-900 font-mono focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">:00 AM (Default 10)</span>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Day End Time</label>
            <input
              type="number"
              min="14"
              max="23"
              value={config.endHour}
              onChange={(e) => setConfig({ ...config, endHour: parseInt(e.target.value) || 18 })}
              className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-slate-900 font-mono focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">:00 PM (Default 18 / 6 PM)</span>
          </div>
        </div>

        {/* Lunch Hours */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-800 font-semibold flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-amber-500" /> Lunch Window
            </span>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
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
              <span>Protect from sales calls</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-500 block mb-0.5 font-medium">Lunch Start (24h)</span>
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
                className="w-full rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-slate-900 font-mono text-xs focus:border-sky-500 outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block mb-0.5 font-medium">Lunch End (24h)</span>
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
                className="w-full rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-slate-900 font-mono text-xs focus:border-sky-500 outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white font-semibold transition flex items-center gap-1.5 shadow-xs"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Schedule Settings'}
        </button>
      </form>
    </div>
  );
};
