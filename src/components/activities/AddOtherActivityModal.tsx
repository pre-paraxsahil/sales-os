'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Briefcase,
  PackageCheck,
  FileText,
  MessageSquare,
  Mail,
  Search,
  MapPin,
  Handshake,
  HelpCircle,
  Loader2,
  Clock,
  User,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddOtherActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLeadId?: string;
  defaultLeadTitle?: string;
  onSuccess?: () => void;
}

interface ActivityTypeOption {
  id: string;
  label: string;
  icon: any;
  color: string;
  defaultTitle: string;
}

const ACTIVITY_TYPE_OPTIONS: ActivityTypeOption[] = [
  {
    id: 'MEETING',
    label: 'Meeting',
    icon: Briefcase,
    color: 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100',
    defaultTitle: 'Meeting with Client',
  },
  {
    id: 'SAMPLE_SENT',
    label: 'Sample Sent',
    icon: PackageCheck,
    color: 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
    defaultTitle: 'Product Sample Sent',
  },
  {
    id: 'PROPOSAL_SENT',
    label: 'Proposal Sent',
    icon: FileText,
    color: 'border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100',
    defaultTitle: 'Quotation / Proposal Sent',
  },
  {
    id: 'WHATSAPP_SENT',
    label: 'WhatsApp',
    icon: MessageSquare,
    color: 'border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100',
    defaultTitle: 'WhatsApp Discussion',
  },
  {
    id: 'EMAIL_SENT',
    label: 'Email',
    icon: Mail,
    color: 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100',
    defaultTitle: 'Email Sent to Client',
  },
  {
    id: 'RESEARCH',
    label: 'Research',
    icon: Search,
    color: 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100',
    defaultTitle: 'Account & Prospect Research',
  },
  {
    id: 'CLIENT_VISIT',
    label: 'Client Visit',
    icon: MapPin,
    color: 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100',
    defaultTitle: 'On-site Client Visit',
  },
  {
    id: 'NEGOTIATION',
    label: 'Negotiation',
    icon: Handshake,
    color: 'border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100',
    defaultTitle: 'Pricing & Terms Negotiation',
  },
  {
    id: 'OTHER_ACTIVITY',
    label: 'Other',
    icon: HelpCircle,
    color: 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100',
    defaultTitle: 'General Sales Activity',
  },
];

export const AddOtherActivityModal: React.FC<AddOtherActivityModalProps> = ({
  isOpen,
  onClose,
  defaultLeadId,
  defaultLeadTitle,
  onSuccess,
}) => {
  const [selectedType, setSelectedType] = useState<string>('MEETING');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>(defaultLeadId || '');
  const [leadSearchQuery, setLeadSearchQuery] = useState<string>(defaultLeadTitle || '');
  const [leadsList, setLeadsList] = useState<Array<{ id: string; title: string }>>([]);
  const [searchingLeads, setSearchingLeads] = useState<boolean>(false);
  const [showLeadDropdown, setShowLeadDropdown] = useState<boolean>(false);
  const [occurredAt, setOccurredAt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultLeadId) {
      setSelectedLeadId(defaultLeadId);
      setLeadSearchQuery(defaultLeadTitle || '');
    }
  }, [defaultLeadId, defaultLeadTitle]);

  // Search leads when typing query
  useEffect(() => {
    if (!isOpen || leadSearchQuery.trim().length < 2) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingLeads(true);
        const res = await fetch(`/api/leads?search=${encodeURIComponent(leadSearchQuery)}&limit=8`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setLeadsList(json.data.map((l: any) => ({ id: l.id, title: l.title })));
            setShowLeadDropdown(true);
          }
        }
      } catch (err) {
        console.error('Failed to search leads:', err);
      } finally {
        setSearchingLeads(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [leadSearchQuery, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const activeOption = ACTIVITY_TYPE_OPTIONS.find((o) => o.id === selectedType);
      const titleToSave = customTitle.trim() || activeOption?.defaultTitle || 'Sales Activity';

      const payload = {
        type: selectedType,
        title: titleToSave,
        description: description.trim() || null,
        leadId: selectedLeadId || null,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      };

      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to record activity.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Activity recorded successfully!');
      setTimeout(() => {
        setLoading(false);
        if (onSuccess) onSuccess();
        onClose();
        // Reset form
        setDescription('');
        setCustomTitle('');
        setOccurredAt('');
        setSuccessMsg(null);
      }, 600);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-600 p-2 text-white shadow-xs">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Other Activity</h3>
              <p className="text-xs text-slate-500">Record off-dialer interactions, meetings & pipeline tasks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-5 mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Activity Type Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Activity Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedType(opt.id);
                      if (!customTitle) setCustomTitle(opt.defaultTitle);
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center font-medium transition-all gap-1.5',
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                        : opt.color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] leading-tight font-semibold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity Title (Optional customization) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Activity Title
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. In-person product sample presentation"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Short Note / Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Short Note / Remarks <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe key discussion points, outcome, or commitments made..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Optional Lead Linking */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Link to Lead (Optional)
              </label>
              {selectedLeadId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLeadId('');
                    setLeadSearchQuery('');
                  }}
                  className="text-[10px] text-rose-600 hover:underline font-medium"
                >
                  Clear link
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={leadSearchQuery}
                onChange={(e) => {
                  setLeadSearchQuery(e.target.value);
                  setSelectedLeadId('');
                }}
                onFocus={() => {
                  if (leadsList.length > 0) setShowLeadDropdown(true);
                }}
                placeholder="Search lead title to link this activity..."
                className={cn(
                  'w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 pl-8 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors',
                  selectedLeadId && 'border-emerald-400 bg-emerald-50/50 text-emerald-900 font-semibold'
                )}
              />
              <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              {searchingLeads && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
              )}
            </div>

            {/* Dropdown search results */}
            {showLeadDropdown && leadsList.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                {leadsList.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => {
                      setSelectedLeadId(lead.id);
                      setLeadSearchQuery(lead.title);
                      setShowLeadDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-100 flex items-center justify-between text-slate-800"
                  >
                    <span className="font-medium truncate">{lead.title}</span>
                    <span className="text-[10px] text-slate-400">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp Override (Optional) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Activity Time
              </label>
              <span className="text-[10px] text-slate-500">
                {occurredAt ? 'Custom Time Selected' : 'Defaults to Now'}
              </span>
            </div>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <PlusCircle className="h-3.5 w-3.5" />
                  Record Activity
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
