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
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center p-4">
      <div className="rounded-full bg-rose-500/10 p-3 border border-rose-500/20 text-rose-400">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-lg font-bold text-slate-100">Something went wrong</h2>
        <p className="text-xs text-slate-400">
          An unhandled system exception occurred. Details have been logged to system diagnostic trace.
        </p>
        {error.message && (
          <div className="mt-2 rounded-md bg-slate-950 p-2.5 text-[11px] font-mono text-rose-300 border border-slate-800 text-left overflow-x-auto max-w-full">
            {error.message}
          </div>
        )}
      </div>
      <button
        onClick={() => reset()}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/20"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try Again
      </button>
    </div>
  );
}
