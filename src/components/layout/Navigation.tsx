'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, MessageSquare, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export const navItems = [
  {
    name: 'Today',
    href: '/today',
    icon: LayoutDashboard,
    description: 'Daily cockpit & priority actions',
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: Users,
    description: 'Pipeline & lead management',
  },
  {
    name: 'Schedule',
    href: '/schedule',
    icon: Calendar,
    description: 'Calls, demos & calendar',
  },
  {
    name: 'WhatsApp',
    href: '/whatsapp',
    icon: MessageSquare,
    description: 'WhatsApp communication center',
  },
  {
    name: 'Insights',
    href: '/insights',
    icon: BarChart3,
    description: 'Performance analytics & reports',
  },
];

export const DesktopNavigation: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white p-4 min-h-[calc(100vh-4rem)] shadow-2xs">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
        Primary Navigation
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-700'
                )}
              />
              <div className="flex flex-col">
                <span className="leading-tight">{item.name}</span>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-500 font-normal">
                  {item.description}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer / System Status */}
      <div className="mt-auto pt-4 border-t border-slate-200/80 px-3">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>System Status</span>
          <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
          </span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 font-mono">
          Single-User Mode • v1.0
        </div>
      </div>
    </aside>
  );
};

export const MobileNavigation: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 justify-around items-center shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center w-full py-1 text-[10px] font-medium transition-colors',
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Icon className={cn('h-5 w-5 mb-0.5', isActive ? 'text-indigo-600' : 'text-slate-400')} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};
