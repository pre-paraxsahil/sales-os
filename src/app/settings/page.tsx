import React from 'react';
import { Settings, Shield, Sliders, Database, Key, Bell } from 'lucide-react';
import { ScheduleSettingsCard } from '@/components/settings/ScheduleSettingsCard';

export const metadata = {
  title: 'Settings | BroStartup Sales OS',
  description: 'Single-user preferences, environment config, DB connections, and API integration keys.',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-indigo-400" />
          Settings & Environment Config
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Single-user system preferences, database configuration, and integration service keys.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Schedule & Working Hours Settings */}
        <ScheduleSettingsCard />

        {/* PostgreSQL Database Status */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-200">
            <Database className="h-4 w-4 text-indigo-400" />
            <span>Database & ORM Configuration</span>
          </div>
          <p className="text-xs text-slate-400">
            PostgreSQL instance configured via Prisma client (<code className="text-slate-300">src/lib/prisma.ts</code>).
          </p>
          <div className="rounded-md bg-slate-950 p-2.5 text-xs text-slate-300 font-mono flex items-center justify-between border border-slate-800">
            <span>Provider: PostgreSQL</span>
            <span className="text-emerald-400 text-[11px] font-semibold">Configured</span>
          </div>
        </div>

        {/* AI & Integration Service Layer */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-200">
            <Key className="h-4 w-4 text-emerald-400" />
            <span>Replaceable Service Layers</span>
          </div>
          <p className="text-xs text-slate-400">
            Environment variable structure configured in <code className="text-slate-300">.env.example</code> & <code className="text-slate-300">.env.local</code>.
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>S3 Object Storage</span>
              <span className="text-slate-500 font-mono text-[10px]">S3_ENDPOINT</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>AI Engine (OpenAI/Gemini)</span>
              <span className="text-slate-500 font-mono text-[10px]">OPENAI_API_KEY</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>WhatsApp Cloud API</span>
              <span className="text-slate-500 font-mono text-[10px]">WHATSAPP_API_TOKEN</span>
            </div>
          </div>
        </div>

        {/* Single-User Operating Mode */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-200">
            <Shield className="h-4 w-4 text-violet-400" />
            <span>Single-User Architecture</span>
          </div>
          <p className="text-xs text-slate-400">
            Tailored for solo founder / individual sales representative productivity without team management overhead or enterprise CRM complexity.
          </p>
        </div>

        {/* Notification & System Preferences */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-200">
            <Bell className="h-4 w-4 text-amber-400" />
            <span>System Notifications</span>
          </div>
          <p className="text-xs text-slate-400">
            Configurable alert thresholds for urgent follow-ups, scheduled demos, and daily activity reminders.
          </p>
        </div>
      </div>
    </div>
  );
}
