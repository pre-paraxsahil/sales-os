'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Sales OS Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center p-6 animate-in fade-in duration-200">
      <div className="rounded-2xl bg-rose-50 p-4 border border-rose-200 text-rose-600 shadow-xs">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
        <p className="text-xs text-slate-600">
          Your data could not be loaded right now. The error has been logged for diagnosis.
        </p>
        {error.message && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] font-mono text-rose-700 border border-slate-200 text-left overflow-x-auto max-w-full">
            {error.message}
          </div>
        )}
      </div>
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-xs"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try Again
      </button>
    </div>
  );
}
