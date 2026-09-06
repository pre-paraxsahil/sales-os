import React from 'react';
import Link from 'next/link';
import { HelpCircle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center p-6 animate-in fade-in duration-200">
      <div className="rounded-2xl bg-indigo-50 p-4 border border-indigo-200 text-indigo-600 shadow-xs">
        <HelpCircle className="h-8 w-8" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-xl font-bold text-slate-900">404 - Page Not Found</h2>
        <p className="text-xs text-slate-600">
          The requested path does not exist in BroStartup Sales OS.
        </p>
      </div>
      <Link
        href="/today"
        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-xs"
      >
        <Home className="h-3.5 w-3.5" />
        Return to Today Cockpit
      </Link>
    </div>
  );
}
