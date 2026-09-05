import React from 'react';
import Link from 'next/link';
import { HelpCircle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center p-4">
      <div className="rounded-full bg-indigo-500/10 p-3 border border-indigo-500/20 text-indigo-400">
        <HelpCircle className="h-8 w-8" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-xl font-bold text-slate-100">404 - Page Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested path does not exist in BroStartup Sales OS.
        </p>
      </div>
      <Link
        href="/today"
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/20"
      >
        <Home className="h-3.5 w-3.5" />
        Return to Today Cockpit
      </Link>
    </div>
  );
}
