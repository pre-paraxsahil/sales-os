import React from 'react';
import { Sparkles, Compass } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="relative mb-4 flex items-center justify-center">
        <div className="h-14 w-14 rounded-2xl bg-indigo-600/10 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
          <Compass className="h-7 w-7 animate-spin-slow text-indigo-600" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
        </div>
      </div>
      <div className="space-y-1 max-w-xs">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">BroStartup Sales OS</h2>
        <p className="text-xs font-medium text-slate-500">Your sales workspace is getting ready…</p>
      </div>
      <div className="mt-5 w-36 bg-slate-200 rounded-full h-1 overflow-hidden">
        <div className="bg-indigo-600 h-1 rounded-full skeleton-shimmer w-full" />
      </div>
    </div>
  );
}
