import React from 'react';

export default function ScheduleLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Schedule Header Skeleton */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-44 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-3.5 w-60 bg-slate-100 rounded-md animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-9 w-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-9 w-32 bg-indigo-600/20 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Day / Week Schedule Grid Skeleton */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="h-4 w-32 bg-slate-200 rounded-md animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-12 bg-slate-200 rounded-lg animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 bg-slate-200 rounded-md animate-pulse" />
                  <div className="h-3 w-48 bg-slate-100 rounded-md animate-pulse" />
                </div>
              </div>
              <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
