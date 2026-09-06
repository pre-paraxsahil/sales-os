import React from 'react';

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
      {/* Brand Icon Badge */}
      <div className="relative mb-5 flex items-center justify-center">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl tracking-tight shadow-md shadow-indigo-600/20 ring-4 ring-indigo-50">
          BS
        </div>
        <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-600" />
        </div>
      </div>

      {/* Brand & Loading Message */}
      <div className="space-y-1.5 max-w-xs">
        <h2 className="text-base font-black text-slate-900 tracking-tight">BroStartup Sales OS</h2>
        <p className="text-xs font-medium text-slate-500">Preparing your sales workspace…</p>
      </div>

      {/* Subtle Progress Bar */}
      <div className="mt-6 w-36 bg-slate-100 rounded-full h-1 overflow-hidden border border-slate-200/60">
        <div className="bg-indigo-600 h-1 rounded-full skeleton-shimmer w-full animate-pulse" />
      </div>
    </div>
  );
}
