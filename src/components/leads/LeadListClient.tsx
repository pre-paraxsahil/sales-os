'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  ArrowUpDown,
  Phone,
  PhoneCall,
  MessageSquare,
  Building,
  Flame,
  Clock,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  User,
  MapPin,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { LeadCreateModal } from './LeadCreateModal';
import { QuickCallLoggerModal } from '@/components/calls/QuickCallLoggerModal';
import { QuickWhatsAppModal } from '@/components/whatsapp/QuickWhatsAppModal';
import { cn } from '@/lib/utils';

export const LeadListClient: React.FC = () => {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState('priority');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Quick Action Modal states
  const [callModalLead, setCallModalLead] = useState<any | null>(null);
  const [whatsAppLeadId, setWhatsAppLeadId] = useState<string | null>(null);

  // Delete Confirmation State
  const [leadToDelete, setLeadToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteLead = async () => {
    if (!leadToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/leads/${leadToDelete.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setLeadToDelete(null);
        fetchLeads();
      } else {
        alert(json.error || 'Failed to archive/delete lead.');
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
      alert('Network error deleting lead.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filterTabs = [
    { id: 'ALL', label: 'All Leads' },
    { id: 'HOT', label: '🔥 Hot Leads' },
    { id: 'WARM', label: '⚡ Warm Leads' },
    { id: 'COLD', label: '❄️ Cold Leads' },
    { id: 'FOLLOW_UP', label: '💬 Follow-up Due' },
    { id: 'DEMO', label: '🎥 Demo Stage' },
    { id: 'WON', label: '🏆 Won' },
    { id: 'LOST', label: 'Lost' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            Prospect & Customer Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Who to call, customer reactions, and scheduled next actions.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-600/20 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add New Lead</span>
        </button>
      </div>

      {/* Search, Filter Tabs & Sort Controls */}
      <div className="space-y-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads by name, business, phone number, city..."
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
              className="rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 font-semibold focus:border-indigo-600 focus:outline-none transition-colors shadow-2xs"
            >
              <option value="priority">Priority (Hot & Urgent first)</option>
              <option value="next_action">Next Action Date</option>
              <option value="last_contact">Last Interaction</option>
              <option value="created_date">Recently Added</option>
              <option value="score">Deal Value</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'rounded-xl px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap',
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 w-full animate-pulse rounded-2xl border border-slate-200 bg-white shadow-2xs"
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
              : 'Your pipeline is empty. Click "+ Add New Lead" to save your first prospect.'}
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
              HOT: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
              WARM: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
              COLD: 'bg-slate-100 text-slate-600 border-slate-200 font-medium',
            }[lead.temperature as 'HOT' | 'WARM' | 'COLD'] || 'bg-slate-100 text-slate-600';

            const statusBadge = {
              NEW: 'bg-indigo-50 text-indigo-700 border-indigo-200',
              CONTACTED: 'bg-sky-50 text-sky-700 border-sky-200',
              QUALIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              PROPOSAL_SENT: 'bg-violet-50 text-violet-700 border-violet-200',
              NEGOTIATION: 'bg-amber-50 text-amber-700 border-amber-200',
              WON: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black',
              LOST: 'bg-rose-100 text-rose-800 border-rose-200',
              ARCHIVED: 'bg-slate-200 text-slate-700 border-slate-300',
            }[lead.status as string] || 'bg-slate-100 text-slate-700';

            const lastCall = lead.calls?.[0] || null;
            const businessName = lead.business?.name || lead.title;
            const cityName = lead.business?.city || '';

            return (
              <div
                key={lead.id}
                onClick={() => router.push(`/leads/${lead.id}`)}
                className="group flex flex-col md:flex-row md:items-center justify-between gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-md shadow-2xs cursor-pointer"
              >
                {/* Left: Lead Identity & Sales Context */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Building className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* Row 1: Name, Temperature, Status, Value */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {lead.contact?.name || lead.title}
                      </span>
                      {businessName && businessName !== (lead.contact?.name || lead.title) && (
                        <span className="text-xs font-semibold text-slate-600 truncate">
                          ({businessName})
                        </span>
                      )}
                      <span className={cn('rounded-md border px-2 py-0.5 text-[10px]', tempBadge)}>
                        <Flame className="inline h-3 w-3 mr-0.5" />
                        {lead.temperature}
                      </span>
                      <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold', statusBadge)}>
                        {lead.status}
                      </span>
                      {lead.estimatedValue && (
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          ₹{Number(lead.estimatedValue).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {/* Row 2: Phone, City, Business Industry */}
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {lead.contact?.phone && (
                        <span className="flex items-center gap-1 font-mono font-bold text-indigo-700">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {lead.contact.phone}
                        </span>
                      )}
                      {cityName && (
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {cityName}
                        </span>
                      )}
                      {lead.business?.industry && (
                        <span className="text-slate-500 font-medium">• {lead.business.industry}</span>
                      )}
                    </div>

                    {/* Row 3: Last Call & Next Action info */}
                    <div className="mt-1.5 flex items-center gap-2 text-xs flex-wrap">
                      {lastCall ? (
                        <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1 font-medium">
                          <PhoneCall className="h-3 w-3 text-emerald-600" />
                          Last Call: <strong>{lastCall.outcome.replace(/_/g, ' ')}</strong> (
                          {new Date(lastCall.occurredAt).toLocaleDateString()})
                        </span>
                      ) : null}

                      {lead.nextActionDate ? (
                        <span className="text-[11px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-600" />
                          Next Action: {new Date(lead.nextActionDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : !lastCall ? (
                        <span className="text-[11px] text-slate-400">
                          Added {new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Right: Direct Action Buttons */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0 self-end md:self-center"
                >
                  <button
                    type="button"
                    onClick={() => setCallModalLead(lead)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span>Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsAppLeadId(lead.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeadToDelete(lead)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete / Archive Lead"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <Link
                    href={`/leads/${lead.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  >
                    <span>Open</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Lead Confirmation Modal */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-200 bg-white p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Archive / Delete Lead</h3>
                <p className="text-xs text-slate-500">Soft delete with historical record preservation</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Are you sure you want to archive <strong>{leadToDelete.title}</strong>?
              <br />
              <span className="text-slate-500 text-[11px] block mt-1">
                All associated calls, customer memory, and sales audit history will remain safely preserved in reports.
              </span>
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLeadToDelete(null)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteLead}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Confirm Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Lead Modal */}
      <LeadCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchLeads}
      />

      {/* Quick Call Logger Modal */}
      {callModalLead && (
        <QuickCallLoggerModal
          leadId={callModalLead.id}
          leadTitle={callModalLead.title}
          contactName={callModalLead.contact?.name}
          contactPhone={callModalLead.contact?.phone}
          initialTemperature={callModalLead.temperature}
          isOpen={!!callModalLead}
          onClose={() => setCallModalLead(null)}
          onSuccess={() => {
            setCallModalLead(null);
            fetchLeads();
          }}
          onOpenWhatsApp={() => {
            const currentId = callModalLead.id;
            setCallModalLead(null);
            setWhatsAppLeadId(currentId);
          }}
        />
      )}

      {/* Quick WhatsApp Modal */}
      {whatsAppLeadId && (
        <QuickWhatsAppModal
          leadId={whatsAppLeadId}
          isOpen={!!whatsAppLeadId}
          onClose={() => setWhatsAppLeadId(null)}
        />
      )}
    </div>
  );
};
