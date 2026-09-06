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
  REQUIREMENT: { label: 'Requirement', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  PAIN_POINT: { label: 'Pain Point', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  BUYING_SIGNAL: { label: 'Buying Signal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  OBJECTION: { label: 'Objection', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  DECISION_MAKER: { label: 'Decision Maker', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  TIMELINE: { label: 'Timeline', color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
  BUDGET: { label: 'Budget', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  PACKAGE: { label: 'Package / Plan', color: 'text-sky-700 bg-sky-50 border-sky-200' },
  NEXT_ACTION: { label: 'Next Action', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  BUSINESS: { label: 'Business Profile', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  CONTACT: { label: 'Contact Details', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  CURRENT_PROCESS: { label: 'Current Process', color: 'text-slate-700 bg-slate-100 border-slate-200' },
  GOAL: { label: 'Business Goal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  TEAM: { label: 'Team', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  COMPETITOR: { label: 'Competitor', color: 'text-red-700 bg-red-50 border-red-200' },
  PROMISE: { label: 'Promise / Commitment', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  GENERAL_CONTEXT: { label: 'General Context', color: 'text-slate-700 bg-slate-100 border-slate-200' },
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
        if (onMemoryChanged) onMemoryChanged();
      } else {
        alert(json.error || 'Failed to add memory record.');
      }
    } catch (err) {
      console.error('Error adding memory:', err);
      alert('Error adding memory fact.');
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
        if (onMemoryChanged) onMemoryChanged();
      } else {
        alert(json.error || 'Failed to update memory record.');
      }
    } catch (err) {
      console.error('Error updating memory:', err);
      alert('Error updating memory fact.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reject
  const handleReject = async (memory: CustomerMemoryItem) => {
    if (!confirm(`Mark "${memory.key}" as REJECTED?`)) return;

    try {
      const res = await fetch(`/api/leads/${leadId}/memory/${memory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationState: 'REJECTED',
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        fetchMemories();
        if (onMemoryChanged) onMemoryChanged();
      } else {
        alert(json.error || 'Failed to reject memory fact.');
      }
    } catch (err) {
      console.error('Error rejecting memory:', err);
    }
  };

  const categoryKeys = Object.keys(CATEGORY_LABELS);

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Stats */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-indigo-100 p-1.5 text-indigo-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">What I Know About This Lead</h3>
          </div>
          <p className="text-xs text-slate-600">
            Persistent facts, requirements, objections, and buying signals extracted from sales touchpoints.
          </p>
        </div>

        {/* Counts & Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {counts.confirmed} Confirmed
            </span>
            <span className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-bold text-amber-700 shadow-2xs">
              <HelpCircle className="h-3.5 w-3.5" />
              {counts.inferred} Inferred
            </span>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Fact
          </button>
        </div>
      </div>

      {/* 2. Search & Category Filters Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memory by requirement, objection, pain point, key..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* State Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            {['ALL', 'CONFIRMED', 'INFERRED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors',
                  selectedState === st
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
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
              'rounded-full px-3 py-1 text-[11px] font-bold transition-colors whitespace-nowrap border',
              selectedCategory === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
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
                  'rounded-full px-3 py-1 text-[11px] font-bold transition-colors whitespace-nowrap border',
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                )}
              >
                {catInfo.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Memory Items List */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading memory facts...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 text-xs font-medium">
          {error}
        </div>
      ) : memories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 mx-auto">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">No Memory Facts Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchQuery || selectedCategory !== 'ALL' || selectedState !== 'ALL'
                ? 'No memory records match the selected filters. Try resetting filters.'
                : 'No structured facts logged yet. Record client requirements, pain points, and decision makers.'}
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
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
              color: 'text-slate-700 bg-slate-100 border-slate-200',
            };
            const isConfirmed = m.verificationState === 'CONFIRMED';
            const isInferred = m.verificationState === 'INFERRED';
            const isRejected = m.verificationState === 'REJECTED';

            return (
              <div
                key={m.id}
                className={cn(
                  'rounded-2xl border p-4.5 transition-all flex flex-col justify-between space-y-3 shadow-xs',
                  isRejected
                    ? 'border-rose-200 bg-rose-50/40 opacity-75'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('rounded-lg border px-2 py-0.5 text-[10px] font-bold', cat.color)}>
                        {cat.label}
                      </span>

                      {isConfirmed && (
                        <span className="rounded-lg border px-2 py-0.5 text-[10px] font-bold border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> CONFIRMED
                        </span>
                      )}

                      {isInferred && (
                        <span className="rounded-lg border px-2 py-0.5 text-[10px] font-bold border-amber-200 bg-amber-50 text-amber-700 flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" /> INFERRED
                        </span>
                      )}

                      {isRejected && (
                        <span className="rounded-lg border px-2 py-0.5 text-[10px] font-bold border-rose-200 bg-rose-50 text-rose-700 flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> REJECTED
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 font-mono">
                        Source: {m.sourceType}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingMemory(m)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Edit fact"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {!isRejected && (
                        <button
                          onClick={() => handleReject(m)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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
                      'text-xs font-bold mt-2.5',
                      isRejected ? 'text-slate-400 line-through' : 'text-slate-900'
                    )}
                  >
                    {m.key}
                  </h4>

                  {/* Fact Value */}
                  <p
                    className={cn(
                      'text-xs mt-1 leading-relaxed whitespace-pre-wrap font-medium',
                      isRejected ? 'text-slate-400 line-through italic' : 'text-slate-700'
                    )}
                  >
                    {m.value}
                  </p>
                </div>

                {/* Footer Timestamp */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Last updated: {new Date(m.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Add Customer Memory Fact</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-600 focus:outline-none"
                >
                  {categoryKeys.map((k) => (
                    <option key={k} value={k}>
                      {CATEGORY_LABELS[k].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">
                  Topic / Key <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Online Store Requirement, Budget Range, Tech Stack"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">
                  Fact Details / Value <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Needs around 2,000 products catalog with WhatsApp order notifications."
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Verification State</label>
                  <select
                    value={formState}
                    onChange={(e) => setFormState(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="CONFIRMED">CONFIRMED (Fact)</option>
                    <option value="INFERRED">INFERRED (Tentative)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Source</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="MANUAL">MANUAL ENTRY</option>
                    <option value="CALL">CALL</option>
                    <option value="DEMO">DEMO</option>
                    <option value="WHATSAPP">WHATSAPP</option>
                    <option value="NOTE">NOTE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Edit Customer Memory Fact</h3>
              </div>
              <button
                onClick={() => setEditingMemory(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Category</label>
                <select
                  value={editingMemory.category}
                  onChange={(e) =>
                    setEditingMemory({ ...editingMemory, category: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-600 focus:outline-none"
                >
                  {categoryKeys.map((k) => (
                    <option key={k} value={k}>
                      {CATEGORY_LABELS[k].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Topic / Key</label>
                <input
                  type="text"
                  required
                  value={editingMemory.key}
                  onChange={(e) =>
                    setEditingMemory({ ...editingMemory, key: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Fact Details / Value</label>
                <textarea
                  required
                  rows={3}
                  value={editingMemory.value}
                  onChange={(e) =>
                    setEditingMemory({ ...editingMemory, value: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Verification State</label>
                <select
                  value={editingMemory.verificationState}
                  onChange={(e) =>
                    setEditingMemory({
                      ...editingMemory,
                      verificationState: e.target.value as any,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="CONFIRMED">CONFIRMED (Fact)</option>
                  <option value="INFERRED">INFERRED (Tentative)</option>
                  <option value="REJECTED">REJECTED (Incorrect)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMemory(null)}
                  className="rounded-xl px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-xs"
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
