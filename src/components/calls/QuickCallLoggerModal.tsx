'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  PhoneCall,
  CheckCircle2,
  Flame,
  Calendar,
  Clock,
  PhoneOff,
  PhoneMissed,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Loader2,
  Tag,
  MessageSquare,
} from 'lucide-react';
import { CallType, CallOutcome, LeadTemperature } from '@prisma/client';
import { cn } from '@/lib/utils';

interface QuickCallLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadTitle: string;
  contactName?: string;
  initialTemperature?: LeadTemperature;
  onSuccess: () => void;
  onOpenWhatsApp?: (category: string) => void;
}

interface OutcomeOption {
  id: CallOutcome;
  label: string;
  icon: any;
  accent: string;
  suggestedAction: string;
  suggestedTemp?: LeadTemperature;
}

const OUTCOME_OPTIONS: OutcomeOption[] = [
  {
    id: 'CONNECTED',
    label: 'Connected',
    icon: CheckCircle2,
    accent: 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 selected:bg-emerald-950/60',
    suggestedAction: 'Send follow-up details',
  },
  {
    id: 'INTERESTED',
    label: 'Interested',
    icon: Flame,
    accent: 'border-amber-500/40 text-amber-300 hover:bg-amber-950/40 selected:bg-amber-950/60',
    suggestedAction: 'Schedule demo',
    suggestedTemp: 'WARM',
  },
  {
    id: 'DEMO_BOOKED',
    label: 'Demo Booked',
    icon: Calendar,
    accent: 'border-violet-500/40 text-violet-300 hover:bg-violet-950/40 selected:bg-violet-950/60',
    suggestedAction: 'Prepare demo & send calendar invite',
    suggestedTemp: 'HOT',
  },
  {
    id: 'FOLLOW_UP_REQUIRED',
    label: 'Follow-up Req.',
    icon: Clock,
    accent: 'border-sky-500/40 text-sky-300 hover:bg-sky-950/40 selected:bg-sky-950/60',
    suggestedAction: 'Follow up with customer',
  },
  {
    id: 'BUSY',
    label: 'Busy',
    icon: PhoneCall,
    accent: 'border-amber-500/30 text-amber-400 hover:bg-amber-950/30 selected:bg-amber-950/50',
    suggestedAction: 'Call again',
  },
  {
    id: 'NO_ANSWER',
    label: 'No Answer',
    icon: PhoneMissed,
    accent: 'border-slate-700 text-slate-300 hover:bg-slate-800 selected:bg-slate-800',
    suggestedAction: 'Retry call',
  },
  {
    id: 'SWITCHED_OFF',
    label: 'Switched Off',
    icon: PhoneOff,
    accent: 'border-slate-700 text-slate-400 hover:bg-slate-800 selected:bg-slate-800',
    suggestedAction: 'Retry call later',
  },
  {
    id: 'NOT_INTERESTED',
    label: 'Not Interested',
    icon: XCircle,
    accent: 'border-rose-500/40 text-rose-400 hover:bg-rose-950/30 selected:bg-rose-950/50',
    suggestedAction: '',
    suggestedTemp: 'COLD',
  },
  {
    id: 'WRONG_NUMBER',
    label: 'Wrong Number',
    icon: AlertTriangle,
    accent: 'border-rose-800 text-rose-500 hover:bg-rose-950/30 selected:bg-rose-950/50',
    suggestedAction: 'Verify correct contact info',
  },
  {
    id: 'OTHER',
    label: 'Other',
    icon: HelpCircle,
    accent: 'border-slate-700 text-slate-300 hover:bg-slate-800 selected:bg-slate-800',
    suggestedAction: '',
  },
];

export const QuickCallLoggerModal: React.FC<QuickCallLoggerModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadTitle,
  contactName,
  initialTemperature = 'COLD',
  onSuccess,
  onOpenWhatsApp,
}) => {
  const [callType, setCallType] = useState<CallType>('OUTBOUND');
  const [outcome, setOutcome] = useState<CallOutcome>('CONNECTED');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('Send follow-up details');
  const [nextActionAt, setNextActionAt] = useState('');
  const [temperature, setTemperature] = useState<LeadTemperature>(initialTemperature);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggerWhatsApp, setTriggerWhatsApp] = useState(false);

  useEffect(() => {
    setTemperature(initialTemperature);
  }, [initialTemperature]);

  if (!isOpen) return null;

  const handleOutcomeSelect = (opt: OutcomeOption) => {
    setOutcome(opt.id);
    setNextAction(opt.suggestedAction);
    if (opt.suggestedTemp) {
      setTemperature(opt.suggestedTemp);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        callType,
        outcome,
        notes: notes.trim() || null,
        nextAction: nextAction.trim() || null,
        nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
        temperature,
      };

      const res = await fetch(`/api/leads/${leadId}/calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to save call.');
        setLoading(false);
        return;
      }

      setLoading(false);
      onSuccess();
      onClose();

      if (triggerWhatsApp && onOpenWhatsApp) {
        let cat = 'DAY_1_FOLLOWUP';
        if (outcome === 'NO_ANSWER' || outcome === 'SWITCHED_OFF') {
          cat = 'NO_ANSWER';
        } else if (outcome === 'BUSY') {
          cat = 'BUSY';
        } else if (outcome === 'INTERESTED' || outcome === 'SCHEDULED_DEMO') {
          cat = 'DEMO_CONFIRMATION';
        } else if (outcome === 'FOLLOW_UP_REQUIRED') {
          cat = 'CALLBACK';
        }
        onOpenWhatsApp(cat);
      }
    } catch (err: any) {
      console.error('Error saving call:', err);
      setError('An unexpected network error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-5 md:p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Log Call Result</h2>
              <p className="text-[11px] text-slate-400">
                Lead: <strong className="text-slate-200">{leadTitle}</strong> {contactName ? `(${contactName})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Fast Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
          {/* Call Type Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Call Type
            </label>
            <select
              value={callType}
              onChange={(e) => setCallType(e.target.value as CallType)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none transition-colors"
            >
              <option value="OUTBOUND">Outbound Call</option>
              <option value="COLD_CALL">Cold Call</option>
              <option value="FOLLOW_UP">Follow-up Call</option>
              <option value="INTERESTED_LEAD">Interested Lead Call</option>
              <option value="HOT_LEAD">Hot Lead Call</option>
              <option value="CLOSING_CALL">Closing Call</option>
              <option value="CALLBACK">Callback</option>
              <option value="INBOUND">Inbound Call</option>
              <option value="DISCOVERY">Discovery Call</option>
              <option value="NEW_ENQUIRY">New Enquiry</option>
            </select>
          </div>

          {/* Quick Outcome Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Call Outcome <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OUTCOME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = outcome === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleOutcomeSelect(opt)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-semibold transition-all',
                      opt.accent,
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/70 text-indigo-200 ring-1 ring-indigo-500 shadow-md'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Short Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Call Notes (What happened?)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Discussed pricing for Standard plan. Prospect requested demo slot on Friday."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Smart Next Action & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Suggested Next Action
              </label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="e.g. Schedule demo"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Next Action Date & Time
              </label>
              <input
                type="datetime-local"
                value={nextActionAt}
                onChange={(e) => setNextActionAt(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Lead Temperature Adjustment */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Tag className="h-3 w-3 text-slate-500" />
              Lead Temperature
            </label>
            <div className="flex items-center gap-2">
              {(['COLD', 'WARM', 'HOT'] as LeadTemperature[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTemperature(t)}
                  className={cn(
                    'flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-all',
                    temperature === t
                      ? t === 'HOT'
                        ? 'border-rose-500 bg-rose-950/60 text-rose-300 ring-1 ring-rose-500'
                        : t === 'WARM'
                        ? 'border-amber-500 bg-amber-950/60 text-amber-300 ring-1 ring-amber-500'
                        : 'border-slate-500 bg-slate-800 text-slate-200 ring-1 ring-slate-500'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-800'
                  )}
                >
                  <Flame className="inline h-3 w-3 mr-1" />
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Save Button */}
          <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            {outcome !== 'NOT_INTERESTED' && outcome !== 'WRONG_NUMBER' && (
              <button
                type="button"
                onClick={(e) => {
                  setTriggerWhatsApp(true);
                  const form = (e.currentTarget as HTMLElement).closest('form');
                  if (form) form.requestSubmit();
                }}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60 transition-all shadow-sm"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                <span>Save & Send WhatsApp</span>
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 active:scale-95 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving Call...
                </>
              ) : (
                'Save Call (10s)'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
