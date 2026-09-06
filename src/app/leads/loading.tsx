import React from 'react';

export default function LeadsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header & Search Bar Skeleton */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-3.5 w-48 bg-slate-100 rounded-md animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-9 w-32 bg-indigo-600/20 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="h-10 flex-1 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-10 w-28 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-10 w-28 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-8 w-20 bg-slate-200/80 rounded-lg shrink-0 animate-pulse" />
        ))}
      </div>

      {/* Lead Cards Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-40 bg-slate-200 rounded-md animate-pulse" />
                <div className="h-4 w-12 bg-amber-100 rounded-md animate-pulse" />
              </div>
              <div className="h-3 w-56 bg-slate-100 rounded-md animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-8 w-8 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-8 w-24 bg-indigo-50 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
