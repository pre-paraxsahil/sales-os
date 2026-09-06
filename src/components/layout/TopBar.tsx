'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Sparkles,
  Plus,
  Settings,
  X,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchResultItem } from '@/app/api/search/route';
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer';
import { AICopilotDrawer } from '@/components/ai/AICopilotDrawer';

interface TopBarProps {
  onOpenQuickAdd: () => void;
}

const MATCH_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  LEAD: { label: 'Lead', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  BUSINESS: { label: 'Business', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  CONTACT: { label: 'Contact', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  MEMORY: { label: 'Memory Fact', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  NOTE: { label: 'Sales Note', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  CALL: { label: 'Call Log', color: 'text-amber-700 bg-amber-50 border-amber-200' },
};

export const TopBar: React.FC<TopBarProps> = ({ onOpenQuickAdd }) => {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global shortcut listener: ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationOpen(false);
        setIsAICopilotOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isSearchOpen]);

  // Debounced search query
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setResults(json.data || []);
        }
      } catch (err) {
        console.error('Error during global search:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelectResult = (leadId: string) => {
    setIsSearchOpen(false);
    router.push(`/leads/${leadId}`);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-6 backdrop-blur-md shadow-xs">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3">
          <Link href="/today" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform duration-200">
              <span className="font-extrabold text-lg tracking-tight">BS</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base group-hover:text-indigo-600 transition-colors">
                  BroStartup
                </span>
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/80">
                  Sales OS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Personal Sales Operating System</p>
            </div>
          </Link>
        </div>

        {/* Center: Interactive Global Search Input */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads, memory facts, notes, phones, businesses..."
              readOnly
              className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-1.5 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none cursor-pointer hover:border-slate-300 transition-colors"
              onClick={() => setIsSearchOpen(true)}
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500 shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Quick Add, Notifications, AI Assistant, Settings */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile Search Icon */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:text-slate-900"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Quick Add Button */}
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Add</span>
          </button>

          {/* AI Assistant Button (Opens Real AI Copilot Drawer) */}
          <button
            onClick={() => setIsAICopilotOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/80 hover:border-indigo-300 transition-colors"
            title="AI Copilot & Sales Coach"
          >
            <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
            <span className="hidden lg:inline">AI Copilot</span>
          </button>

          {/* Notifications Button (Opens Real Push Reminders Drawer) */}
          <button
            onClick={() => setIsNotificationOpen(true)}
            className="relative rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
            title="Notifications & Reminders"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </button>

          {/* Settings / Profile Access */}
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 md:px-2.5 text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-colors"
            title="Settings & Profile"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span className="hidden xl:inline text-xs font-medium text-slate-700">Settings</span>
          </Link>
        </div>
      </header>

      {/* REAL GLOBAL SEARCH MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-slate-200 p-4 bg-slate-50">
              <Search className="h-5 w-5 text-indigo-600" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type customer name, business, requirement, phone, or note..."
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              {isSearching && (
                <span className="text-[11px] text-indigo-600 animate-pulse font-semibold">Searching...</span>
              )}
              <button
                onClick={() => setIsSearchOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {query.trim().length < 2 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <p className="font-semibold text-slate-600">Type at least 2 characters to search across all Sales OS records.</p>
                  <p className="text-[11px] text-slate-500">
                    Supports: Lead titles, contacts, phone numbers, customer memory requirements, notes, and call logs.
                  </p>
                </div>
              ) : results.length === 0 && !isSearching ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  No matching customer or memory records found for &ldquo;{query}&rdquo;.
                </div>
              ) : (
                results.map((item) => {
                  const badge = MATCH_TYPE_BADGES[item.matchType] || {
                    label: item.matchType,
                    color: 'text-slate-600 bg-slate-100 border-slate-200',
                  };

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectResult(item.leadId)}
                      className="rounded-xl border border-slate-200 bg-white p-3 hover:bg-indigo-50/50 hover:border-indigo-200 cursor-pointer transition-all flex items-start justify-between gap-3 group shadow-2xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('rounded border px-1.5 py-0.2 text-[9px] font-bold', badge.color)}>
                            {badge.label}
                          </span>
                          <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                            {item.title}
                          </span>
                          {item.status && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({item.status})
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600">{item.subtitle}</p>

                        <p className="text-xs text-indigo-700 font-mono text-[11px] pt-0.5">
                          {item.matchDetail}
                        </p>
                      </div>

                      <div className="flex items-center text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all pt-1">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Database Global Search</span>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs">
                ESC to close
              </kbd>
            </div>
          </div>
        </div>
      )}

      {/* REAL NOTIFICATIONS & PUSH REMINDERS DRAWER */}
      <NotificationDrawer isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />

      {/* REAL AI COPILOT & SALES COACH DRAWER */}
      <AICopilotDrawer isOpen={isAICopilotOpen} onClose={() => setIsAICopilotOpen(false)} />
    </>
  );
};
