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
  Building,
  User,
  Phone,
  FileText,
  Clock,
  Layers,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchResultItem } from '@/app/api/search/route';

interface TopBarProps {
  onOpenQuickAdd: () => void;
}

const MATCH_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  LEAD: { label: 'Lead', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  BUSINESS: { label: 'Business', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  CONTACT: { label: 'Contact', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  MEMORY: { label: 'Memory Fact', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  NOTE: { label: 'Sales Note', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  CALL: { label: 'Call Log', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
};

export const TopBar: React.FC<TopBarProps> = ({ onOpenQuickAdd }) => {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
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
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 md:px-6 backdrop-blur-md">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3">
          <Link href="/today" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <span className="font-extrabold text-lg tracking-tight">BS</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 tracking-tight text-base group-hover:text-indigo-300 transition-colors">
                  BroStartup
                </span>
                <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                  Sales OS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Personal Sales Operating System</p>
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
              className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-1.5 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-500 focus:outline-none cursor-pointer hover:border-slate-700 transition-colors"
              onClick={() => setIsSearchOpen(true)}
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Quick Add, Notifications, AI Assistant, Settings */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile Search Icon */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-slate-400 hover:text-slate-200"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Quick Add Button */}
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 active:scale-95 transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Add</span>
          </button>

          {/* AI Assistant Placeholder */}
          <button
            onClick={() => alert('AI Sales Assistant. Intelligent insights arriving in later phase.')}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-900/50 hover:border-indigo-500/50 transition-colors"
            title="AI Assistant"
          >
            <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span className="hidden lg:inline">AI Copilot</span>
          </button>

          {/* Notifications Placeholder */}
          <button
            onClick={() => alert('Notifications drawer.')}
            className="relative rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
          </button>

          {/* Settings / Profile Access */}
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2 md:px-2.5 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title="Settings & Profile"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            <span className="hidden xl:inline text-xs font-medium text-slate-300">Settings</span>
          </Link>
        </div>
      </header>

      {/* REAL GLOBAL SEARCH MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-slate-800 p-4 bg-slate-950/50">
              <Search className="h-5 w-5 text-indigo-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type customer name, business, requirement, phone, or note..."
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              {isSearching && (
                <span className="text-[11px] text-indigo-400 animate-pulse">Searching...</span>
              )}
              <button
                onClick={() => setIsSearchOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {query.trim().length < 2 ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <p>Type at least 2 characters to search across all Sales OS records.</p>
                  <p className="text-[11px] text-slate-600">
                    Supports: Lead titles, contacts, phone numbers, customer memory requirements, notes, and call logs.
                  </p>
                </div>
              ) : results.length === 0 && !isSearching ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No matching customer or memory records found for &ldquo;{query}&rdquo;.
                </div>
              ) : (
                results.map((item) => {
                  const badge = MATCH_TYPE_BADGES[item.matchType] || {
                    label: item.matchType,
                    color: 'text-slate-400 bg-slate-800 border-slate-700',
                  };

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectResult(item.leadId)}
                      className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 hover:bg-slate-800/70 hover:border-slate-700 cursor-pointer transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('rounded border px-1.5 py-0.2 text-[9px] font-bold', badge.color)}>
                            {badge.label}
                          </span>
                          <span className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                            {item.title}
                          </span>
                          {item.status && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({item.status})
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400">{item.subtitle}</p>

                        <p className="text-xs text-indigo-300/90 font-mono text-[11px] pt-0.5">
                          {item.matchDetail}
                        </p>
                      </div>

                      <div className="flex items-center text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all pt-1">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 bg-slate-950/80 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Database Global Search</span>
              <kbd className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px]">
                ESC to close
              </kbd>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
