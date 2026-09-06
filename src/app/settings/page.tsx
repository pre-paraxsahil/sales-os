import React from 'react';
import { Settings, Shield, Sliders, Database, Key, Bell } from 'lucide-react';
import { ScheduleSettingsCard } from '@/components/settings/ScheduleSettingsCard';
import { NotificationSettingsCard } from '@/components/settings/NotificationSettingsCard';

export const metadata = {
  title: 'Settings | BroStartup Sales OS',
  description: 'Single-user preferences, environment config, DB connections, and API integration keys.',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-indigo-600" />
          Settings & Environment Config
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Single-user system preferences, database configuration, and integration service keys.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Schedule & Working Hours Settings */}
        <ScheduleSettingsCard />

        {/* PostgreSQL Database Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
            <Database className="h-4 w-4 text-indigo-600" />
            <span>Database & ORM Configuration</span>
          </div>
          <p className="text-xs text-slate-600">
            PostgreSQL instance configured via Prisma client (<code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">src/lib/prisma.ts</code>).
          </p>
          <div className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-800 font-mono flex items-center justify-between border border-slate-200">
            <span>Provider: PostgreSQL</span>
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-semibold">Configured</span>
          </div>
        </div>

        {/* AI & Integration Service Layer */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
            <Key className="h-4 w-4 text-emerald-600" />
            <span>Replaceable Service Layers</span>
          </div>
          <p className="text-xs text-slate-600">
            Environment variable structure configured in <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">.env.example</code> & <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">.env.local</code>.
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">S3 Object Storage</span>
              <span className="text-slate-500 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">S3_ENDPOINT</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">AI Engine (OpenAI/Gemini)</span>
              <span className="text-slate-500 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">OPENAI_API_KEY</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium">WhatsApp Cloud API</span>
              <span className="text-slate-500 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">WHATSAPP_API_TOKEN</span>
            </div>
          </div>
        </div>

        {/* Single-User Operating Mode */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
            <Shield className="h-4 w-4 text-violet-600" />
            <span>Single-User Architecture</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tailored for solo founder / individual sales representative productivity without team management overhead or enterprise CRM complexity.
          </p>
        </div>

        {/* Web Push & System Notifications */}
        <NotificationSettingsCard />
      </div>
    </div>
  );
}
