'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Phone,
  Building,
  Calendar,
  Flame,
  Clock,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  User,
} from 'lucide-react';
import { LeadCreateModal } from './LeadCreateModal';
import { cn } from '@/lib/utils';

export const LeadListClient: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState('created_date');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        search,
        filter,
        sort,
      });

      const res = await fetch(`/api/leads?${query.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to fetch leads.');
        setLeads([]);
      } else {
        setLeads(json.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError('An unexpected network error occurred.');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [search, filter, sort]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filterTabs = [
    { id: 'ALL', label: 'All' },
    { id: 'HOT', label: 'Hot', badge: 'Red' },
    { id: 'WARM', label: 'Warm', badge: 'Amber' },
    { id: 'COLD', label: 'Cold', badge: 'Slate' },
    { id: 'FOLLOW_UP', label: 'Follow-up' },
    { id: 'DEMO', label: 'Demo' },
    { id: 'CLOSING', label: 'Closing' },
    { id: 'WON', label: 'Won', badge: 'Emerald' },
    { id: 'LOST', label: 'Lost' },
  ];

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Lead Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your personal sales pipeline, prospect contacts, and daily actions.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 active:scale-95 transition-all shadow-md shadow-indigo-600/20 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Lead</span>
        </button>
      </div>

      {/* Search, Filter Tabs & Sort Controls */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads by name, business, phone, email..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Sort:</span>
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 py-1.5 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors"
            >
              <option value="created_date">Created Date</option>
              <option value="priority">Priority & Temperature</option>
              <option value="score">Lead Score</option>
              <option value="last_contact">Last Interaction</option>
              <option value="next_action">Next Action Date</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filters:
          </span>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-all whitespace-nowrap',
                filter === tab.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 w-full animate-pulse rounded-xl border border-slate-800/80 bg-slate-900/40"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-200">{error}</h3>
          <p className="text-xs text-slate-400 mt-1">Please verify database connectivity or retry.</p>
          <button
            onClick={fetchLeads}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <User className="mx-auto h-10 w-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-200">No leads found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {search || filter !== 'ALL'
              ? 'No prospect records matched your search filters. Try clearing your search.'
              : 'Your pipeline is empty. Click "+ New Lead" to create your first prospect.'}
          </p>
          {(search || filter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setFilter('ALL');
              }}
              className="mt-4 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-indigo-400 hover:bg-slate-800"
            >
              Clear Search & Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {leads.map((lead) => {
            const tempBadge = {
              HOT: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
              WARM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
              COLD: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
            }[lead.temperature as 'HOT' | 'WARM' | 'COLD'] || 'bg-slate-500/10 text-slate-400';

            const statusBadge = {
              NEW: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
              CONTACTED: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
              QUALIFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
              PROPOSAL_SENT: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
              NEGOTIATION: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
              WON: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 font-bold',
              LOST: 'bg-rose-950/40 text-rose-400 border-rose-800',
            }[lead.status as string] || 'bg-slate-800 text-slate-300';

            return (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="group flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition-all hover:border-indigo-500/50 hover:bg-slate-900"
              >
                {/* Left Info */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 text-slate-300 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-colors">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {lead.title}
                      </h3>
                      <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold', tempBadge)}>
                        <Flame className="inline h-3 w-3 mr-0.5" />
                        {lead.temperature}
                      </span>
                      <span className={cn('rounded border px-2 py-0.5 text-[10px] font-medium', statusBadge)}>
                        {lead.status}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      {lead.contact?.name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                          {lead.contact.name}
                        </span>
                      )}
                      {lead.contact?.phone && (
                        <span className="flex items-center gap-1 font-mono text-slate-300">
                          <Phone className="h-3.5 w-3.5 text-slate-500" />
                          {lead.contact.phone}
                        </span>
                      )}
                      {lead.business?.industry && (
                        <span className="text-slate-500">• {lead.business.industry}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Meta & Indicator */}
                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-800/60 pt-2 md:pt-0 shrink-0">
                  <div className="text-right text-xs">
                    {lead.nextActionDate ? (
                      <div className="flex items-center gap-1 text-amber-400 font-medium text-[11px]">
                        <Clock className="h-3 w-3" />
                        <span>Action: {new Date(lead.nextActionDate).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500">
                        Updated {new Date(lead.updatedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick Create Lead Modal */}
      <LeadCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchLeads}
      />
    </div>
  );
};
