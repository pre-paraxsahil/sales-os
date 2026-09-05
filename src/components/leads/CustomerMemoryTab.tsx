'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Edit2,
  Trash2,
  Filter,
  Tag,
  Clock,
  ShieldCheck,
  RefreshCw,
  X,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CustomerMemoryItem {
  id: string;
  leadId: string;
  category: string;
  key: string;
  value: string;
  verificationState: 'CONFIRMED' | 'INFERRED' | 'UNKNOWN' | 'REJECTED';
  sourceType: string;
  sourceActivityId?: string | null;
  confidence?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomerMemoryTabProps {
  leadId: string;
  onMemoryChanged?: () => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  REQUIREMENT: { label: 'Requirement', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  PAIN_POINT: { label: 'Pain Point', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  BUYING_SIGNAL: { label: 'Buying Signal', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  OBJECTION: { label: 'Objection', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  DECISION_MAKER: { label: 'Decision Maker', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  TIMELINE: { label: 'Timeline', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  BUDGET: { label: 'Budget', color: 'text-emerald-300 bg-emerald-950/40 border-emerald-500/30' },
  PACKAGE: { label: 'Package / Plan', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  NEXT_ACTION: { label: 'Next Action', color: 'text-amber-300 bg-amber-950/40 border-amber-500/30' },
  BUSINESS: { label: 'Business Profile', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  CONTACT: { label: 'Contact Details', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  CURRENT_PROCESS: { label: 'Current Process', color: 'text-slate-300 bg-slate-800/60 border-slate-700' },
  GOAL: { label: 'Business Goal', color: 'text-emerald-400 bg-emerald-950/30 border-emerald-500/20' },
  TEAM: { label: 'Team', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  COMPETITOR: { label: 'Competitor', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  PROMISE: { label: 'Promise / Commitment', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  GENERAL_CONTEXT: { label: 'General Context', color: 'text-slate-400 bg-slate-800/40 border-slate-700' },
};

export const CustomerMemoryTab: React.FC<CustomerMemoryTabProps> = ({
  leadId,
  onMemoryChanged,
}) => {
  const [memories, setMemories] = useState<CustomerMemoryItem[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    confirmed: 0,
    inferred: 0,
    unknown: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<CustomerMemoryItem | null>(null);

  // Add Form State
  const [formCategory, setFormCategory] = useState('REQUIREMENT');
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formState, setFormState] = useState<'CONFIRMED' | 'INFERRED'>('CONFIRMED');
  const [formSource, setFormSource] = useState('MANUAL');
  const [submitting, setSubmitting] = useState(false);

  // Fetch memory
  const fetchMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (selectedState !== 'ALL') params.set('state', selectedState);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/leads/${leadId}/memory?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setMemories(json.data.memories || []);
        if (json.data.counts) setCounts(json.data.counts);
      } else {
        setError(json.error || 'Failed to load customer memory.');
      }
    } catch (err: any) {
      console.error('Error fetching customer memory:', err);
      setError('Network error loading customer memory.');
    } finally {
      setLoading(false);
    }
  }, [leadId, selectedCategory, selectedState, searchQuery]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim() || !formValue.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formCategory,
          key: formKey.trim(),
          value: formValue.trim(),
          verificationState: formState,
          sourceType: formSource,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setIsAddModalOpen(false);
        setFormKey('');
        setFormValue('');
        fetchMemories();
        onMemoryChanged?.();
      } else {
        alert(json.error || 'Failed to record memory fact.');
      }
    } catch {
      alert('Network error saving memory fact.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory || !editingMemory.key.trim() || !editingMemory.value.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/memory/${editingMemory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editingMemory.category,
          key: editingMemory.key.trim(),
          value: editingMemory.value.trim(),
          verificationState: editingMemory.verificationState,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setEditingMemory(null);
        fetchMemories();
        onMemoryChanged?.();
      } else {
        alert(json.error || 'Failed to update memory.');
      }
    } catch {
      alert('Network error updating memory.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reject Action
  const handleReject = async (memory: CustomerMemoryItem) => {
    if (!confirm(`Mark "${memory.key}" as REJECTED? This will preserve historical records but flag this fact as incorrect.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/leads/${leadId}/memory/${memory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationState: 'REJECTED' }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        fetchMemories();
        onMemoryChanged?.();
      } else {
        alert(json.error || 'Failed to reject memory fact.');
      }
    } catch {
      alert('Network error rejecting memory fact.');
    }
  };

  // Available categories present in data or options
  const categoryKeys = Object.keys(CATEGORY_LABELS);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded border px-2 py-0.5 text-xs font-semibold border-indigo-500/30 bg-indigo-950/40 text-indigo-300 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Customer Memory
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Database Source of Truth
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Verified Facts & Discovered Intelligence
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Reliable, chronological customer facts aggregated from Calls, Demos, WhatsApp, and manual notes.
              Confirmed facts are never invented or overwritten.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMemories()}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              title="Refresh facts"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus className="h-4 w-4" />
              Add Fact
            </button>
          </div>
        </div>

        {/* Fact Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="rounded-lg bg-slate-950/50 p-2.5 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Total Recorded</span>
            <span className="text-lg font-bold text-slate-100">{counts.total}</span>
          </div>

          <div className="rounded-lg bg-emerald-950/20 p-2.5 border border-emerald-500/20">
            <span className="text-[11px] text-emerald-400 block flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Confirmed
            </span>
            <span className="text-lg font-bold text-emerald-300">{counts.confirmed}</span>
          </div>

          <div className="rounded-lg bg-amber-950/20 p-2.5 border border-amber-500/20">
            <span className="text-[11px] text-amber-400 block flex items-center gap-1">
              <HelpCircle className="h-3 w-3" /> Inferred
            </span>
            <span className="text-lg font-bold text-amber-300">{counts.inferred}</span>
          </div>

          <div className="rounded-lg bg-rose-950/20 p-2.5 border border-rose-500/20">
            <span className="text-[11px] text-rose-400 block flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Rejected
            </span>
            <span className="text-lg font-bold text-rose-300">{counts.rejected}</span>
          </div>
        </div>
      </div>

      {/* Controls: Search & Category Pills */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memory by requirement, objection, pain point, key..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* State Filter */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1">
            {['ALL', 'CONFIRMED', 'INFERRED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={cn(
                  'rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
                  selectedState === st
                    ? 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {st === 'ALL' ? 'All States' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-medium transition-colors whitespace-nowrap border',
              selectedCategory === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            )}
          >
            All Categories ({counts.total})
          </button>
          {categoryKeys.map((catKey) => {
            const catInfo = CATEGORY_LABELS[catKey];
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-medium transition-colors whitespace-nowrap border',
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                )}
              >
                {catInfo.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Memory Items List */}
      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading customer memory facts...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-800/40 bg-rose-950/20 p-5 text-rose-300 text-xs">
          {error}
        </div>
      ) : memories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 mx-auto">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">No Memory Facts Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {searchQuery || selectedCategory !== 'ALL' || selectedState !== 'ALL'
                ? 'No memory records match the selected filters. Try broadening your search or resetting filters.'
                : 'No structured facts logged yet. Record client requirements, pain points, and decision makers from calls or add one directly.'}
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add First Memory Fact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map((m) => {
            const cat = CATEGORY_LABELS[m.category] || {
              label: m.category,
              color: 'text-slate-400 bg-slate-800 border-slate-700',
            };
            const isConfirmed = m.verificationState === 'CONFIRMED';
            const isInferred = m.verificationState === 'INFERRED';
            const isRejected = m.verificationState === 'REJECTED';

            return (
              <div
                key={m.id}
                className={cn(
                  'rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3',
                  isRejected
                    ? 'border-rose-950/60 bg-rose-950/10 opacity-75'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                )}
              >
                {/* Header: Key & Status Badges */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold', cat.color)}>
                        {cat.label}
                      </span>

                      {isConfirmed && (
                        <span className="rounded border px-2 py-0.5 text-[10px] font-semibold border-emerald-500/30 bg-emerald-950/30 text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> CONFIRMED
                        </span>
                      )}

                      {isInferred && (
                        <span className="rounded border px-2 py-0.5 text-[10px] font-semibold border-amber-500/30 bg-amber-950/30 text-amber-400 flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" /> INFERRED
                        </span>
                      )}

                      {isRejected && (
                        <span className="rounded border px-2 py-0.5 text-[10px] font-semibold border-rose-500/30 bg-rose-950/30 text-rose-400 flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> REJECTED
                        </span>
                      )}

                      <span className="text-[10px] text-slate-500 font-mono">
                        Source: {m.sourceType}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingMemory(m)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                        title="Edit fact"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {!isRejected && (
                        <button
                          onClick={() => handleReject(m)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-950/50 hover:text-rose-400 transition-colors"
                          title="Reject this fact"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fact Key */}
                  <h4
                    className={cn(
                      'text-sm font-bold mt-2',
                      isRejected ? 'text-slate-400 line-through' : 'text-slate-100'
                    )}
                  >
                    {m.key}
                  </h4>

                  {/* Fact Value */}
                  <p
                    className={cn(
                      'text-xs mt-1 leading-relaxed whitespace-pre-wrap',
                      isRejected ? 'text-slate-500 line-through italic' : 'text-slate-300'
                    )}
                  >
                    {m.value}
                  </p>
                </div>

                {/* Footer Timestamp */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Last updated: {new Date(m.updatedAt).toLocaleString()}</span>
                  {m.confidence && (
                    <span>Confidence: {(m.confidence * 100).toFixed(0)}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD FACT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">Add Customer Memory Fact</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  {categoryKeys.map((k) => (
                    <option key={k} value={k}>
                      {CATEGORY_LABELS[k].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Topic / Key <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Online Store Requirement, Budget Range, Tech Stack"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Fact Details / Value <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Needs around 2,000 products catalog with WhatsApp order notifications."
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Verification State</label>
                  <select
                    value={formState}
                    onChange={(e) => setFormState(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="CONFIRMED">CONFIRMED (Explicitly Stated)</option>
                    <option value="INFERRED">INFERRED (Derived/Probable)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Source</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="MANUAL">MANUAL ENTRY</option>
                    <option value="CALL">CALL</option>
                    <option value="DEMO">DEMO</option>
                    <option value="WHATSAPP">WHATSAPP</option>
                    <option value="NOTE">NOTE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg px-3.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Fact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FACT MODAL */}
      {editingMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">Edit Customer Memory Fact</h3>
              </div>
              <button
                onClick={() => setEditingMemory(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                <select
                  value={editingMemory.category}
                  onChange={(e) =>
                    setEditingMemory({ ...editingMemory, category: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  {categoryKeys.map((k) => (
                    <option key={k} value={k}>
                      {CATEGORY_LABELS[k].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Topic / Key</label>
                <input
                  type="text"
                  required
                  value={editingMemory.key}
                  onChange={(e) =>
                    setEditingMemory({ ...editingMemory, key: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Fact Details / Value</label>
                <textarea
                  required
                  rows={3}
                  value={editingMemory.value}
                  onChange={(e) =>
                    setEditingMemory({ ...editingMemory, value: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Verification State</label>
                <select
                  value={editingMemory.verificationState}
                  onChange={(e) =>
                    setEditingMemory({
                      ...editingMemory,
                      verificationState: e.target.value as any,
                    })
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="CONFIRMED">CONFIRMED (Fact)</option>
                  <option value="INFERRED">INFERRED (Tentative)</option>
                  <option value="REJECTED">REJECTED (Incorrect)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMemory(null)}
                  className="rounded-lg px-3.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
