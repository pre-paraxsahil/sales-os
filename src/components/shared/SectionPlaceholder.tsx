import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionPlaceholderProps {
  title: string;
  badge: string;
  description: string;
  icon: LucideIcon;
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'violet' | 'sky';
  featuresList: string[];
}

export const SectionPlaceholder: React.FC<SectionPlaceholderProps> = ({
  title,
  badge,
  description,
  icon: Icon,
  accentColor = 'indigo',
  featuresList,
}) => {
  const accentStyles = {
    indigo: 'border-indigo-500/30 text-indigo-400 bg-indigo-950/20',
    emerald: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20',
    amber: 'border-amber-500/30 text-amber-400 bg-amber-950/20',
    violet: 'border-violet-500/30 text-violet-400 bg-violet-950/20',
    sky: 'border-sky-500/30 text-sky-400 bg-sky-950/20',
  }[accentColor];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('rounded border px-2 py-0.5 text-xs font-medium', accentStyles)}>
              {badge}
            </span>
            <span className="text-xs text-slate-500 font-mono">Phase 01 Shell</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Icon className="h-6 w-6 text-slate-300" />
            {title}
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">{description}</p>
        </div>
      </div>

      {/* Placeholder Content Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4 mb-5">
          <div className={cn('rounded-lg border p-2.5', accentStyles)}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-200">{title} Workspace</h2>
            <p className="text-xs text-slate-400">
              Module architecture initialized under <code className="text-slate-300">src/modules/{badge.toLowerCase()}</code>
            </p>
          </div>
        </div>

        {/* Feature Scope Blueprint */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Planned Domain Features for Phase 02+
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuresList.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-lg border border-slate-800/90 bg-slate-950/60 p-3 text-xs text-slate-300"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400">
                  {idx + 1}
                </span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-300 mb-1">Architecture Note:</p>
          This section UI shell is ready. Zero fake statistics or dummy metrics are generated in accordance with production guidelines. Database model binding will follow upon schema definition.
        </div>
      </div>
    </div>
  );
};

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-3 rounded-full bg-slate-800/80 p-3 text-slate-400">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      <p className="mt-1 text-xs text-slate-400 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          type="button"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export interface SkeletonLoaderProps {
  rows?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ rows = 3, className }) => {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 w-full rounded-lg skeleton-shimmer border border-slate-800/50"
        />
      ))}
    </div>
  );
};

