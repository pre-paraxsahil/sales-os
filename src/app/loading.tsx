import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-3 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-200">Loading Workspace...</h3>
        <p className="text-xs text-slate-400">Fetching latest data for BroStartup Sales OS.</p>
      </div>
    </div>
  );
}
