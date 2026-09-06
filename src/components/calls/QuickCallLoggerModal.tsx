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
  Sparkles,
  Save,
  Check,
} from 'lucide-react';
import { CallType, CallOutcome, LeadTemperature } from '@prisma/client';
import { cn } from '@/lib/utils';
import { DEFAULT_TEMPLATES, interpolateTemplate } from '@/lib/whatsapp/templateService';

interface QuickCallLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadTitle: string;
  contactName?: string;
  contactPhone?: string;
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
  templateCategory?: string;
}

const NEXT_ACTION_OPTIONS = [
  'Call back',
  'Send WhatsApp',
  'Send quotation',
  'Schedule demo',
  'Follow up',
  'Wait for response',
  'Discuss with partner/team',
  'Close/Won',
  'Not interested',
  'Other',
];

const OUTCOME_OPTIONS: OutcomeOption[] = [
  {
    id: 'CONNECTED',
    label: 'Connected',
    icon: CheckCircle2,
    accent: 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
    suggestedAction: 'Send follow-up details',
    templateCategory: 'DAY_1_FOLLOWUP',
  },
  {
    id: 'INTERESTED',
    label: 'Interested',
    icon: Flame,
    accent: 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100',
    suggestedAction: 'Schedule demo',
    suggestedTemp: 'WARM',
    templateCategory: 'DEMO_CONFIRMATION',
  },
  {
    id: 'DEMO_BOOKED',
    label: 'Demo Booked',
    icon: Calendar,
    accent: 'border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100',
    suggestedAction: 'Prepare demo & send calendar invite',
    suggestedTemp: 'HOT',
    templateCategory: 'DEMO_CONFIRMATION',
  },
  {
    id: 'FOLLOW_UP_REQUIRED',
    label: 'Follow-up Req.',
    icon: Clock,
    accent: 'border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100',
    suggestedAction: 'Follow up with customer',
    templateCategory: 'DAY_1_FOLLOWUP',
  },
  {
    id: 'BUSY',
    label: 'Busy',
    icon: PhoneCall,
    accent: 'border-amber-200 text-amber-800 bg-amber-50/70 hover:bg-amber-100',
    suggestedAction: 'Call back',
    templateCategory: 'BUSY',
  },
  {
    id: 'NO_ANSWER',
    label: 'No Answer',
    icon: PhoneMissed,
    accent: 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100',
    suggestedAction: 'Call back',
    templateCategory: 'NO_ANSWER',
  },
  {
    id: 'SWITCHED_OFF',
    label: 'Switched Off',
    icon: PhoneOff,
    accent: 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100',
    suggestedAction: 'Call back',
    templateCategory: 'NO_ANSWER',
  },
  {
    id: 'NOT_INTERESTED',
    label: 'Not Interested',
    icon: XCircle,
    accent: 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100',
    suggestedAction: 'Not interested',
    suggestedTemp: 'COLD',
  },
  {
    id: 'WRONG_NUMBER',
    label: 'Wrong Number',
    icon: AlertTriangle,
    accent: 'border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100',
    suggestedAction: 'Other',
  },
  {
    id: 'OTHER',
    label: 'Other',
    icon: HelpCircle,
    accent: 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100',
    suggestedAction: 'Other',
  },
];

export const QuickCallLoggerModal: React.FC<QuickCallLoggerModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadTitle,
  contactName,
  contactPhone,
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

  // WhatsApp suggestion & template state
  const [showWhatsAppSuggestion, setShowWhatsAppSuggestion] = useState(false);
  const [suggestedMessage, setSuggestedMessage] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [templateSavedStatus, setTemplateSavedStatus] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTemperature(initialTemperature);
  }, [initialTemperature]);

  // Update WhatsApp suggestion when outcome or next action changes
  useEffect(() => {
    const isWhatsAppAction = nextAction.toLowerCase().includes('whatsapp');
    const matchedOption = OUTCOME_OPTIONS.find((o) => o.id === outcome);
    const category = matchedOption?.templateCategory || 'DAY_1_FOLLOWUP';

    const defaultTpl = DEFAULT_TEMPLATES.find((t) => t.category === category) || DEFAULT_TEMPLATES[0];

    const interpolated = interpolateTemplate(defaultTpl.content, {
      customer_name: contactName || leadTitle,
      business_name: leadTitle,
      demo_date: nextActionAt ? new Date(nextActionAt).toLocaleDateString() : 'tomorrow',
    });

    setSuggestedMessage(interpolated);
    setNewTemplateName(`Custom ${defaultTpl.name}`);

    if (isWhatsAppAction || outcome === 'NO_ANSWER' || outcome === 'BUSY' || outcome === 'INTERESTED') {
      setShowWhatsAppSuggestion(true);
    }
  }, [outcome, nextAction, contactName, leadTitle, nextActionAt]);

  if (!isOpen) return null;

  const handleOutcomeSelect = (opt: OutcomeOption) => {
    setOutcome(opt.id);
    setNextAction(opt.suggestedAction);
    if (opt.suggestedTemp) {
      setTemperature(opt.suggestedTemp);
    }
  };

  const handleQuickTimePreset = (hoursOffset: number, specificHour?: number) => {
    const d = new Date();
    if (specificHour !== undefined) {
      d.setDate(d.getDate() + (hoursOffset > 0 ? Math.floor(hoursOffset / 24) : 1));
      d.setHours(specificHour, 0, 0, 0);
    } else {
      d.setHours(d.getHours() + hoursOffset);
    }
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const pad = (n: number) => n.toString().padStart(2, '0');
    const str = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setNextActionAt(str);
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

      // 1. Save call to lead
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

      // 2. If user chose to save edited WhatsApp message as a reusable template
      if (saveAsTemplate && suggestedMessage && newTemplateName) {
        try {
          await fetch('/api/whatsapp/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newTemplateName.trim(),
              category: 'UTILITY',
              content: suggestedMessage.trim(),
            }),
          });
          setTemplateSavedStatus(true);
        } catch (tplErr) {
          console.error('Non-critical: error saving custom template', tplErr);
        }
      }

      setLoading(false);
      onSuccess();
      onClose();

      // If Next Action is WhatsApp and parent provided a handler, route there
      if (nextAction.toLowerCase().includes('whatsapp') && onOpenWhatsApp) {
        const matched = OUTCOME_OPTIONS.find((o) => o.id === outcome);
        onOpenWhatsApp(matched?.templateCategory || 'DAY_1_FOLLOWUP');
      }
    } catch (err: any) {
      console.error('Error saving call:', err);
      setError('An unexpected network error occurred. Please retry.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Log Call Result</h2>
              <p className="text-[11px] text-slate-500">
                Lead: <strong className="text-slate-800">{leadTitle}</strong>{' '}
                {contactName ? `(${contactName})` : ''}{' '}
                {contactPhone ? `• ${contactPhone}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 shrink-0">
            {error}
          </div>
        )}

        {/* Fast Form */}
        <form onSubmit={handleSave} className="mt-3 space-y-3.5 overflow-y-auto pr-1 text-xs flex-1">
          {/* Call Type Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Call Type
            </label>
            <select
              value={callType}
              onChange={(e) => setCallType(e.target.value as CallType)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
            >
              <option value="OUTBOUND">Outbound Call (Normal Phone Dialer)</option>
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
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Customer Response / Outcome <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {OUTCOME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = outcome === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleOutcomeSelect(opt)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border p-2 text-left text-xs font-semibold transition-all',
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600 shadow-xs'
                        : opt.accent
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remarks / Discussion Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Remarks / What was discussed
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Discussed OneComPro pricing. Client requested quick WhatsApp breakdown and callback on Monday."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Next Action Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Next Action
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {NEXT_ACTION_OPTIONS.map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setNextAction(act)}
                  className={cn(
                    'px-2 py-1 rounded text-[11px] font-medium border transition-colors',
                    nextAction === act
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {act}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Specify custom next action..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Next Action Date & Time (Mobile Friendly) */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Next Action Date & Time (Reminder)
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickTimePreset(1)}
                  className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100 font-medium"
                >
                  +1 hr
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTimePreset(24, 10)}
                  className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Tomorrow 10 AM
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTimePreset(48, 11)}
                  className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100 font-medium"
                >
                  +2 Days
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              value={nextActionAt}
              onChange={(e) => setNextActionAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors font-mono"
            />
            {nextActionAt && (
              <p className="text-[10px] text-emerald-700 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Will automatically schedule a Reminder + Calendar slot for{' '}
                {new Date(nextActionAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* WhatsApp Template Suggestion Accordion */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowWhatsAppSuggestion(!showWhatsAppSuggestion)}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:underline"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp Template Suggestion</span>
                <span className="text-[10px] font-normal text-emerald-700">
                  {showWhatsAppSuggestion ? '(Hide)' : '(Tap to view/edit)'}
                </span>
              </button>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                Post-Call Follow-up
              </span>
            </div>

            {showWhatsAppSuggestion && (
              <div className="space-y-2 pt-1">
                <textarea
                  rows={3}
                  value={suggestedMessage}
                  onChange={(e) => setSuggestedMessage(e.target.value)}
                  placeholder="Suggested WhatsApp message text..."
                  className="w-full rounded-lg border border-emerald-200 bg-white p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
                />

                {/* Save as Reusable Template Checkbox */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 p-2 rounded-lg border border-emerald-100">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={saveAsTemplate}
                      onChange={(e) => setSaveAsTemplate(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                    />
                    <span>Save this edited version as a reusable Template</span>
                  </label>

                  {saveAsTemplate && (
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Template Name"
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>ℹ️ Official WhatsApp sending uses configured credentials.</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(suggestedMessage);
                      alert('Message copied to clipboard!');
                    }}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Copy Text
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lead Temperature */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Tag className="h-3 w-3 text-slate-400" />
              Lead Temperature
            </span>
            <div className="flex items-center gap-1.5">
              {(['COLD', 'WARM', 'HOT'] as LeadTemperature[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTemperature(t)}
                  className={cn(
                    'px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all',
                    temperature === t
                      ? t === 'HOT'
                        ? 'border-rose-500 bg-rose-50 text-rose-700 ring-1 ring-rose-500'
                        : t === 'WARM'
                        ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500'
                        : 'border-slate-500 bg-slate-100 text-slate-800 ring-1 ring-slate-500'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  )}
                >
                  <Flame className="inline h-3 w-3 mr-0.5" />
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Save Button */}
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 active:scale-95 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Call & Activity...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Save Call</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
