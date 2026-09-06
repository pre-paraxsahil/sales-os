'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  MessageSquare,
  Sparkles,
  Building,
  User,
  MapPin,
  Search,
  Check,
} from 'lucide-react';
import { CallType, CallOutcome, LeadTemperature } from '@prisma/client';
import { cn } from '@/lib/utils';
import { DEFAULT_TEMPLATES, interpolateTemplate } from '@/lib/whatsapp/templateService';

interface QuickCallLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string;
  leadTitle?: string;
  contactName?: string;
  contactPhone?: string;
  initialTemperature?: LeadTemperature;
  onSuccess?: () => void;
  onOpenWhatsApp?: (category: string) => void;
}

const OUTCOME_BUTTONS = [
  { id: 'CONNECTED' as CallOutcome, label: 'Connected', icon: CheckCircle2, color: 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 selected:bg-emerald-600 selected:text-white', activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm' },
  { id: 'NO_ANSWER' as CallOutcome, label: 'No Answer', icon: PhoneMissed, color: 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100', activeClass: 'bg-slate-700 text-white border-slate-700 shadow-sm' },
  { id: 'BUSY' as CallOutcome, label: 'Busy', icon: PhoneCall, color: 'border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100', activeClass: 'bg-amber-600 text-white border-amber-600 shadow-sm' },
  { id: 'SWITCHED_OFF' as CallOutcome, label: 'Switched Off', icon: PhoneOff, color: 'border-slate-300 text-slate-600 bg-slate-100 hover:bg-slate-200', activeClass: 'bg-slate-600 text-white border-slate-600 shadow-sm' },
  { id: 'NOT_INTERESTED' as CallOutcome, label: 'Not Interested', icon: XCircle, color: 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100', activeClass: 'bg-rose-600 text-white border-rose-600 shadow-sm' },
  { id: 'WRONG_NUMBER' as CallOutcome, label: 'Wrong Number', icon: AlertTriangle, color: 'border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100', activeClass: 'bg-rose-700 text-white border-rose-700 shadow-sm' },
  { id: 'INTERESTED' as CallOutcome, label: 'Interested', icon: Flame, color: 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100', activeClass: 'bg-amber-600 text-white border-amber-600 shadow-sm' },
  { id: 'CALLBACK_REQUESTED' as CallOutcome, label: 'Callback', icon: PhoneCall, color: 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100', activeClass: 'bg-blue-600 text-white border-blue-600 shadow-sm' },
];

const RESPONSE_OPTIONS = [
  'Interested',
  'Asked for demo',
  'Asked for price',
  'Asked for callback',
  'Needs partner/team approval',
  'Not interested',
  'Send details',
  'Send sample',
  'Other',
];

const NEXT_ACTION_OPTIONS = [
  'Call back',
  'WhatsApp',
  'Demo',
  'Send sample',
  'Send quotation',
  'Follow-up',
  'No further action',
];

export const QuickCallLoggerModal: React.FC<QuickCallLoggerModalProps> = ({
  isOpen,
  onClose,
  leadId: initialLeadId,
  leadTitle: initialLeadTitle,
  contactName: initialContactName,
  contactPhone: initialContactPhone,
  initialTemperature = 'COLD',
  onSuccess,
  onOpenWhatsApp,
}) => {
  // Lead / Phone Input State
  const [phone, setPhone] = useState(initialContactPhone || '');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isSearchingLead, setIsSearchingLead] = useState(false);
  const [isManualLeadMode, setIsManualLeadMode] = useState(false);

  // New Lead fields when number not found
  const [newName, setNewName] = useState(initialContactName || '');
  const [newBusiness, setNewBusiness] = useState(initialLeadTitle || '');
  const [newCity, setNewCity] = useState('');

  // Call Attributes
  const [callType, setCallType] = useState<CallType>('OUTBOUND');
  const [outcome, setOutcome] = useState<CallOutcome>('CONNECTED');
  const [selectedResponseTag, setSelectedResponseTag] = useState<string>('Interested');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('Call back');
  const [nextActionAt, setNextActionAt] = useState('');
  const [temperature, setTemperature] = useState<LeadTemperature>(initialTemperature);

  // WhatsApp template preview state
  const [showWhatsAppSuggestion, setShowWhatsAppSuggestion] = useState(false);
  const [suggestedWhatsAppMsg, setSuggestedWhatsAppMsg] = useState('');

  // Status & Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Sync initial props
  useEffect(() => {
    if (initialContactPhone) {
      setPhone(initialContactPhone);
    }
    if (initialLeadId) {
      setSelectedLead({
        id: initialLeadId,
        title: initialLeadTitle || 'Selected Lead',
        contactName: initialContactName || '',
        contactPhone: initialContactPhone || '',
        businessName: initialLeadTitle || '',
        temperature: initialTemperature,
      });
    }
    if (initialTemperature) {
      setTemperature(initialTemperature);
    }
  }, [initialLeadId, initialLeadTitle, initialContactName, initialContactPhone, initialTemperature]);

  // Fast Phone Auto-Lookup
  useEffect(() => {
    if (selectedLead?.id && initialLeadId) return;
    if (!phone || phone.trim().length < 3) {
      setSelectedLead(null);
      setIsSearchingLead(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLead(true);
      try {
        const res = await fetch(`/api/leads/lookup?phone=${encodeURIComponent(phone.trim())}`);
        const json = await res.json();
        if (json.success && json.data) {
          setSelectedLead(json.data);
          if (json.data.temperature) {
            setTemperature(json.data.temperature);
          }
        } else {
          setSelectedLead(null);
        }
      } catch (err) {
        console.error('Error looking up phone:', err);
      } finally {
        setIsSearchingLead(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [phone, selectedLead?.id, initialLeadId]);

  // Update WhatsApp suggestion
  useEffect(() => {
    const isWhatsApp = nextAction.toLowerCase().includes('whatsapp');
    const category = outcome === 'INTERESTED' ? 'DEMO_CONFIRMATION' : outcome === 'BUSY' ? 'BUSY' : 'DAY_1_FOLLOWUP';
    const def = DEFAULT_TEMPLATES.find((t) => t.category === category) || DEFAULT_TEMPLATES[0];

    const targetName = selectedLead?.contactName || newName || selectedLead?.title || 'Customer';
    const businessName = selectedLead?.businessName || newBusiness || selectedLead?.title || 'your business';

    const msg = interpolateTemplate(def.content, {
      customer_name: targetName,
      business_name: businessName,
      demo_date: nextActionAt ? new Date(nextActionAt).toLocaleDateString() : 'tomorrow',
    });

    setSuggestedWhatsAppMsg(msg);
    if (isWhatsApp || outcome === 'INTERESTED' || outcome === 'NO_ANSWER') {
      setShowWhatsAppSuggestion(true);
    }
  }, [outcome, nextAction, selectedLead, newName, newBusiness, nextActionAt]);

  if (!isOpen) return null;

  const handleQuickPreset = (hoursOffset: number, specificHour?: number) => {
    const d = new Date();
    if (specificHour !== undefined) {
      d.setDate(d.getDate() + (hoursOffset > 0 ? Math.floor(hoursOffset / 24) : 1));
      d.setHours(specificHour, 0, 0, 0);
    } else {
      d.setHours(d.getHours() + hoursOffset);
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    const str = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setNextActionAt(str);
  };

  const handleOutcomeSelect = (id: CallOutcome) => {
    setOutcome(id);
    if (id === 'INTERESTED') {
      setSelectedResponseTag('Interested');
      setNextAction('Demo');
      setTemperature('WARM');
    } else if (id === 'CALLBACK_REQUESTED' || id === 'BUSY' || id === 'NO_ANSWER') {
      setSelectedResponseTag('Asked for callback');
      setNextAction('Call back');
      if (!nextActionAt) handleQuickPreset(2);
    } else if (id === 'NOT_INTERESTED' || id === 'WRONG_NUMBER') {
      setSelectedResponseTag('Not interested');
      setNextAction('No further action');
      setTemperature('COLD');
    }
  };

  const resetForm = () => {
    if (!initialLeadId) {
      setPhone('');
      setSelectedLead(null);
      setNewName('');
      setNewBusiness('');
      setNewCity('');
    }
    setNotes('');
    setNextActionAt('');
    setFeedback(null);
    setIsSaving(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    // Validate
    const hasExistingLead = !!selectedLead?.id;
    const hasPhone = phone.trim().length > 0;
    const hasNewName = newName.trim().length > 0;

    if (!hasExistingLead && !hasPhone) {
      setFeedback({ type: 'error', message: 'Please enter a phone number.' });
      return;
    }

    if (!hasExistingLead && !hasNewName) {
      setFeedback({ type: 'error', message: 'Please enter prospect name.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      // Build combined notes with discussion response tag
      const combinedNotes = [
        selectedResponseTag ? `[${selectedResponseTag}]` : '',
        notes.trim(),
      ]
        .filter(Boolean)
        .join(' ');

      const payload: any = {
        callType,
        outcome,
        notes: combinedNotes || null,
        nextAction: nextAction !== 'No further action' ? nextAction : null,
        nextActionAt: nextAction !== 'No further action' && nextActionAt ? new Date(nextActionAt).toISOString() : null,
        temperature,
      };

      let res;
      if (selectedLead?.id) {
        // Save to existing lead
        res = await fetch(`/api/leads/${selectedLead.id}/calls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Fast save with new number
        res = await fetch('/api/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            phone: phone.trim(),
            contactName: newName.trim(),
            businessName: newBusiness.trim() || null,
            city: newCity.trim() || null,
          }),
        });
      }

      const json = await res.json();

      if (!res.ok || !json.success) {
        setFeedback({ type: 'error', message: json.error || 'Could not save call' });
        setIsSaving(false);
        return;
      }

      // Success! Show green Call saved ✓
      setFeedback({ type: 'success', message: 'Call saved ✓' });

      if (onSuccess) onSuccess();

      const wasWhatsAppAction = nextAction.toLowerCase().includes('whatsapp');
      const leadForWa = selectedLead?.id || json.data?.lead?.id;

      // Close quickly or reset for next call
      setTimeout(() => {
        resetForm();
        onClose();
        if (wasWhatsAppAction && onOpenWhatsApp) {
          onOpenWhatsApp('DAY_1_FOLLOWUP');
        }
      }, 500);
    } catch (err: any) {
      console.error('Error saving call:', err);
      setFeedback({ type: 'error', message: 'Could not save call' });
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Log Call Result</h2>
              <p className="text-[11px] text-slate-500">Record response, outcome & auto-set reminder</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={cn(
              'mt-3 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between shrink-0 transition-all',
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            )}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button type="button" onClick={() => setFeedback(null)} className="underline text-[10px]">
              Dismiss
            </button>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="mt-3.5 space-y-3.5 overflow-y-auto pr-1 flex-1 text-xs">
          {/* 1. Phone Number & Lead Auto-Match */}
          <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              {isSearchingLead && (
                <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-semibold">
                  <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                </span>
              )}
            </div>

            <div className="relative">
              <input
                ref={phoneInputRef}
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (selectedLead && !initialLeadId) setSelectedLead(null);
                }}
                placeholder="e.g. 9876543210"
                autoFocus={!initialLeadId}
                disabled={!!initialLeadId}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 font-mono text-xs font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Matched Lead Card */}
            {selectedLead ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 truncate">
                    <Building className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span className="truncate">{selectedLead.businessName || selectedLead.title}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    🔥 {selectedLead.temperature || 'COLD'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
                  {selectedLead.contactName && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" />
                      {selectedLead.contactName}
                    </span>
                  )}
                  {selectedLead.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {selectedLead.city}
                    </span>
                  )}
                </div>

                {selectedLead.lastInteraction && (
                  <div className="text-[10px] text-slate-500 pt-0.5">
                    Last call: <strong>{selectedLead.lastInteraction.outcome}</strong> (
                    {new Date(selectedLead.lastInteraction.date).toLocaleDateString()})
                  </div>
                )}
                {selectedLead.nextAction && (
                  <div className="text-[10px] text-amber-800 font-semibold">
                    Next: {selectedLead.nextAction.action}
                  </div>
                )}
              </div>
            ) : phone.trim().length >= 4 && !isSearchingLead ? (
              /* New Lead Minimal Input */
              <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                  <span>New Prospect Details</span>
                  <span className="text-[10px] font-normal text-indigo-600">Auto-saves as new lead</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Business Name</label>
                    <input
                      type="text"
                      value={newBusiness}
                      onChange={(e) => setNewBusiness(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">City (optional)</label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 2. Call Outcome (Large One-Tap Buttons) */}
          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1.5">
              Call Outcome <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {OUTCOME_BUTTONS.map((btn) => {
                const Icon = btn.icon;
                const isSelected = outcome === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => handleOutcomeSelect(btn.id)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-bold transition-all',
                      isSelected ? btn.activeClass : btn.color
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Response: "What happened?" */}
          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
              What happened?
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {RESPONSE_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedResponseTag(tag)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all',
                    selectedResponseTag === tag
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add custom remarks or discussion details..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* 4. Next Action: "What should happen next?" */}
          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
              What should happen next?
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {NEXT_ACTION_OPTIONS.map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setNextAction(act)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all',
                    nextAction === act
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {act}
                </button>
              ))}
            </div>

            {/* Date & Time with Automatic Reminder */}
            {nextAction !== 'No further action' && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    Scheduled Date & Time (Auto-Sets Reminder)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(1)}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-700 hover:bg-slate-100 font-bold"
                    >
                      +1 hr
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(24, 10)}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-700 hover:bg-slate-100 font-bold"
                    >
                      Tomorrow 10 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(48, 11)}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-700 hover:bg-slate-100 font-bold"
                    >
                      +2 Days
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={nextActionAt}
                  onChange={(e) => setNextActionAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-900 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* 5. Fast Save Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-500 active:scale-95 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>Save Call</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
