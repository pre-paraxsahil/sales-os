import React from 'react';

export default function InsightsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Insights Header & Date Filter Skeleton */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-3.5 w-64 bg-slate-100 rounded-md animate-pulse" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 w-20 bg-slate-100 rounded-lg shrink-0 animate-pulse" />
          ))}
        </div>
      </div>

      {/* Pulse Card Skeleton */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-white/20 rounded-md animate-pulse" />
          <div className="h-6 w-20 bg-white/20 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 bg-white/20 rounded-md animate-pulse" />
              <div className="h-6 w-12 bg-white/30 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs & Content Grid Skeleton */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex gap-2 border-b border-slate-100 pb-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="h-6 w-12 bg-slate-200 rounded-md mx-auto animate-pulse" />
              <div className="h-3 w-16 bg-slate-100 rounded-md mx-auto animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
