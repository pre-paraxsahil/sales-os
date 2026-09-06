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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            Lead Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal sales pipeline, prospect contacts, and daily actions.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-600/20 shrink-0"
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads by name, business, phone, email..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none transition-colors shadow-2xs"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Sort:</span>
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 font-medium focus:border-indigo-600 focus:outline-none transition-colors shadow-2xs"
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
          <span className="text-xs text-slate-400 font-bold mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filters:
          </span>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'rounded-xl px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap',
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
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
              className="h-20 w-full animate-pulse rounded-2xl border border-slate-200 bg-white shadow-2xs"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-2xs">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-600 mb-2" />
          <h3 className="text-sm font-bold text-slate-900">{error}</h3>
          <p className="text-xs text-slate-600 mt-1">Please verify database connectivity or retry.</p>
          <button
            onClick={fetchLeads}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
          <User className="mx-auto h-10 w-10 text-slate-400 mb-3" />
          <h3 className="text-sm font-bold text-slate-900">No leads found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
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
              className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
            >
              Clear Search & Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {leads.map((lead) => {
            const tempBadge = {
              HOT: 'bg-rose-50 text-rose-700 border-rose-200',
              WARM: 'bg-amber-50 text-amber-700 border-amber-200',
              COLD: 'bg-slate-100 text-slate-600 border-slate-200',
            }[lead.temperature as 'HOT' | 'WARM' | 'COLD'] || 'bg-slate-100 text-slate-600';

            const statusBadge = {
              NEW: 'bg-indigo-50 text-indigo-700 border-indigo-200',
              CONTACTED: 'bg-sky-50 text-sky-700 border-sky-200',
              QUALIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              PROPOSAL_SENT: 'bg-violet-50 text-violet-700 border-violet-200',
              NEGOTIATION: 'bg-amber-50 text-amber-700 border-amber-200',
              WON: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold',
              LOST: 'bg-rose-100 text-rose-800 border-rose-200',
            }[lead.status as string] || 'bg-slate-100 text-slate-700';

            return (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="group flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-md shadow-2xs"
              >
                {/* Left Info */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {lead.title}
                      </h3>
                      <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-bold', tempBadge)}>
                        <Flame className="inline h-3 w-3 mr-0.5" />
                        {lead.temperature}
                      </span>
                      <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold', statusBadge)}>
                        {lead.status}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      {lead.contact?.name && (
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {lead.contact.name}
                        </span>
                      )}
                      {lead.contact?.phone && (
                        <span className="flex items-center gap-1 font-mono font-medium text-slate-700">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {lead.contact.phone}
                        </span>
                      )}
                      {lead.business?.industry && (
                        <span className="text-slate-400 font-medium">• {lead.business.industry}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Meta & Indicator */}
                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0 shrink-0">
                  <div className="text-right text-xs">
                    {lead.nextActionDate ? (
                      <div className="flex items-center gap-1 text-amber-700 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                        <Clock className="h-3 w-3" />
                        <span>Action: {new Date(lead.nextActionDate).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-medium">
                        Updated {new Date(lead.updatedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
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
