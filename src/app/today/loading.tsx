import React from 'react';

export default function TodayLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Welcome & KPI Header Skeleton */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-3.5 w-64 bg-slate-100 rounded-md animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-28 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-9 w-32 bg-indigo-100 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Target Progress Strip Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="h-3 w-16 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-6 w-20 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>

      {/* Action Items List Skeleton */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="h-4 w-36 bg-slate-200 rounded-md animate-pulse" />
          <div className="h-4 w-20 bg-slate-100 rounded-md animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="h-4 w-44 bg-slate-200 rounded-md animate-pulse" />
                <div className="h-3 w-60 bg-slate-100 rounded-md animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-16 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-8 w-20 bg-indigo-100 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
