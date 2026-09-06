'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  PhoneCall,
  Calendar,
  Video,
  Clock,
  CheckSquare,
  DollarSign,
  FileSpreadsheet,
  Mic,
  ArrowRight,
  Search,
  Loader2,
  CheckCircle2,
  UploadCloud,
  FileText,
  Flame,
  MessageSquare,
  Sparkles,
  Check,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadCreateModal } from '@/components/leads/LeadCreateModal';
import { QuickCallLoggerModal } from '@/components/calls/QuickCallLoggerModal';
import { CallOutcome, CallType, LeadTemperature } from '@prisma/client';
import { DEFAULT_TEMPLATES, interpolateTemplate } from '@/lib/whatsapp/templateService';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const quickAddActions = [
  {
    id: 'new-lead',
    title: 'New Lead',
    description: 'Add a new prospect or contact to pipeline',
    icon: UserPlus,
    accent: 'border-indigo-100 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300',
  },
  {
    id: 'log-call',
    title: 'Log External Call',
    description: 'Record notes, outcome, reminder & WhatsApp after a phone call',
    icon: PhoneCall,
    accent: 'border-emerald-100 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300',
  },
  {
    id: 'schedule-call',
    title: 'Schedule Call',
    description: 'Set a future call slot on calendar & set push reminder',
    icon: Calendar,
    accent: 'border-sky-100 text-sky-700 bg-sky-50/50 hover:bg-sky-50 hover:border-sky-300',
  },
  {
    id: 'schedule-demo',
    title: 'Schedule Demo',
    description: 'Book a product presentation or demo session',
    icon: Video,
    accent: 'border-violet-100 text-violet-700 bg-violet-50/50 hover:bg-violet-50 hover:border-violet-300',
  },
  {
    id: 'add-follow-up',
    title: 'Add Follow-up',
    description: 'Set a high-priority follow-up reminder',
    icon: Clock,
    accent: 'border-amber-100 text-amber-700 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300',
  },
  {
    id: 'add-task',
    title: 'Add Task',
    description: 'Create a quick task or action item',
    icon: CheckSquare,
    accent: 'border-slate-200 text-slate-700 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300',
  },
  {
    id: 'add-sale',
    title: 'Add Sale',
    description: 'Record a closed deal and update target pace',
    icon: DollarSign,
    accent: 'border-emerald-100 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300',
  },
  {
    id: 'import-excel-csv',
    title: 'Import Excel/CSV',
    description: 'Bulk import leads or call lists from text / CSV format',
    icon: FileSpreadsheet,
    accent: 'border-teal-100 text-teal-700 bg-teal-50/50 hover:bg-teal-50 hover:border-teal-300',
  },
  {
    id: 'upload-recording',
    title: 'Upload Recording',
    description: 'Log audio recording or transcript for AI processing',
    icon: Mic,
    accent: 'border-rose-100 text-rose-700 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-300',
  },
];

const OUTCOME_OPTIONS = [
  { id: 'CONNECTED', label: 'Connected', templateCat: 'DAY_1_FOLLOWUP' },
  { id: 'INTERESTED', label: 'Interested', templateCat: 'DEMO_CONFIRMATION', temp: 'WARM' },
  { id: 'DEMO_BOOKED', label: 'Demo Booked', templateCat: 'DEMO_CONFIRMATION', temp: 'HOT' },
  { id: 'FOLLOW_UP_REQUIRED', label: 'Follow-up Req.', templateCat: 'DAY_1_FOLLOWUP' },
  { id: 'BUSY', label: 'Busy', templateCat: 'BUSY' },
  { id: 'NO_ANSWER', label: 'No Answer', templateCat: 'NO_ANSWER' },
  { id: 'SWITCHED_OFF', label: 'Switched Off', templateCat: 'NO_ANSWER' },
  { id: 'NOT_INTERESTED', label: 'Not Interested', temp: 'COLD' },
  { id: 'WRONG_NUMBER', label: 'Wrong Number' },
  { id: 'OTHER', label: 'Other' },
];

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

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose }) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Global Lead Search & Select state
  const [leadSearch, setLeadSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<any | null>(null);
  const [isLeadCreateOpen, setIsLeadCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Fast External Call logging fields
  const [callPhone, setCallPhone] = useState('');
  const [callOutcome, setCallOutcome] = useState<string>('CONNECTED');
  const [callNotes, setCallNotes] = useState('');
  const [callNextAction, setCallNextAction] = useState('Send WhatsApp');
  const [callNextActionAt, setCallNextActionAt] = useState('');
  const [callTemperature, setCallTemperature] = useState<LeadTemperature>('COLD');
  const [showWhatsAppSuggestion, setShowWhatsAppSuggestion] = useState(false);
  const [suggestedWhatsAppMsg, setSuggestedWhatsAppMsg] = useState('');
  const [saveCustomTemplate, setSaveCustomTemplate] = useState(false);
  const [customTemplateName, setCustomTemplateName] = useState('');

  // CSV Import state
  const [csvText, setCsvText] = useState('');

  // Search for Lead when typing in leadSearch or callPhone
  useEffect(() => {
    const queryTerm = selectedAction === 'log-call' ? callPhone || leadSearch : leadSearch;
    if (!selectedAction || selectedAction === 'new-lead' || selectedAction === 'import-excel-csv') return;
    if (!queryTerm || queryTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = `?search=${encodeURIComponent(queryTerm.trim())}`;
        const res = await fetch(`/api/leads${query}`);
        const json = await res.json();
        if (json.success) {
          const results = json.data || [];
          setSearchResults(results);
          // Auto-match if exact phone matches
          if (selectedAction === 'log-call' && callPhone.trim().length >= 7) {
            const exactMatch = results.find(
              (r: any) => r.contact?.phone?.includes(callPhone.trim()) || r.title?.includes(callPhone.trim())
            );
            if (exactMatch && !selectedLead) {
              setSelectedLead(exactMatch);
            }
          }
        }
      } catch (err) {
        console.error('Error searching leads:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [leadSearch, callPhone, selectedAction, selectedLead]);

  // Update WhatsApp suggestion for Log Call
  useEffect(() => {
    if (selectedAction !== 'log-call') return;
    const isWhatsApp = callNextAction.toLowerCase().includes('whatsapp');
    const matched = OUTCOME_OPTIONS.find((o) => o.id === callOutcome);
    const cat = matched?.templateCat || 'DAY_1_FOLLOWUP';
    const def = DEFAULT_TEMPLATES.find((t) => t.category === cat) || DEFAULT_TEMPLATES[0];

    const leadName = selectedLead?.contact?.name || selectedLead?.title || 'Sir/Ma\'am';
    const msg = interpolateTemplate(def.content, {
      customer_name: leadName,
      business_name: selectedLead?.business?.name || selectedLead?.title || 'your business',
      demo_date: callNextActionAt ? new Date(callNextActionAt).toLocaleDateString() : 'tomorrow',
    });

    setSuggestedWhatsAppMsg(msg);
    setCustomTemplateName(`Follow-up ${cat.replace(/_/g, ' ')}`);
    if (isWhatsApp || callOutcome === 'NO_ANSWER' || callOutcome === 'BUSY' || callOutcome === 'INTERESTED') {
      setShowWhatsAppSuggestion(true);
    }
  }, [selectedAction, callOutcome, callNextAction, selectedLead, callNextActionAt]);

  if (!isOpen) return null;

  const currentAction = quickAddActions.find((a) => a.id === selectedAction);

  const resetStateAndClose = () => {
    setSelectedAction(null);
    setSelectedLead(null);
    setSelectedLeadForCall(null);
    setLeadSearch('');
    setCallPhone('');
    setCallNotes('');
    setCallNextAction('Send WhatsApp');
    setCallNextActionAt('');
    setCsvText('');
    setFeedbackMsg(null);
    setShowWhatsAppSuggestion(false);
    onClose();
  };

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
    setCallNextActionAt(str);
  };

  // Inline Quick Create Lead if phone number doesn't match
  const handleQuickCreateLead = async () => {
    if (!callPhone.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: `Lead (${callPhone.trim()})`,
          phone: callPhone.trim(),
          source: 'External Call',
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedLead(json.data);
        setFeedbackMsg(`Created new lead for ${callPhone.trim()}`);
      } else {
        setFeedbackMsg(json.error || 'Failed to create lead.');
      }
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Error creating lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {currentAction ? currentAction.title : 'Quick Add Action'}
              </h2>
              <p className="text-xs text-slate-500">
                {currentAction
                  ? currentAction.description
                  : 'Select an action trigger to create or record entries in BroStartup Sales OS.'}
              </p>
            </div>
            <button
              onClick={resetStateAndClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Feedback banner */}
          {feedbackMsg && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{feedbackMsg}</span>
              </div>
              <button onClick={() => setFeedbackMsg(null)} className="underline text-[10px]">
                Dismiss
              </button>
            </div>
          )}

          {/* Action Selection Grid */}
          {!selectedAction ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1">
              {quickAddActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      if (action.id === 'new-lead') {
                        setIsLeadCreateOpen(true);
                      } else {
                        setSelectedAction(action.id);
                      }
                    }}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all hover:scale-[1.01] group shadow-xs',
                      action.accent
                    )}
                  >
                    <div className="rounded-lg p-2 bg-white border border-slate-200/80 shadow-xs shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {action.title}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-500" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : selectedAction === 'log-call' ? (
            /* FAST SINGLE-SCREEN EXTERNAL CALL LOGGING FLOW */
            <div className="mt-3 space-y-3.5 overflow-y-auto pr-1 text-xs flex-1">
              <div className="flex items-center justify-between bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <PhoneCall className="h-4 w-4 text-emerald-600" />
                  <span>Log External Call (Outside Phone Dialer)</span>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Change Action
                </button>
              </div>

              {/* Step 1: Phone Number & Lead Auto-match */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Phone Number Dialed <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={callPhone}
                    onChange={(e) => setCallPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    autoFocus
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Target Lead / Customer <span className="text-rose-500">*</span>
                  </label>
                  {selectedLead ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-100/60 border border-emerald-300 text-emerald-900">
                      <div>
                        <span className="font-bold block truncate">{selectedLead.title}</span>
                        <span className="text-[10px] text-emerald-700">
                          {selectedLead.contact?.name || ''} {selectedLead.contact?.phone || ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedLead(null)}
                        className="text-[10px] bg-white text-emerald-800 font-bold px-2 py-1 rounded border border-emerald-300 hover:bg-emerald-50"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={leadSearch}
                        onChange={(e) => setLeadSearch(e.target.value)}
                        placeholder="Search lead by name or company..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 text-xs focus:border-emerald-500 focus:outline-none"
                      />
                      {callPhone.trim().length >= 4 && searchResults.length === 0 && !isSearching && (
                        <button
                          type="button"
                          onClick={handleQuickCreateLead}
                          disabled={isSubmitting}
                          className="mt-1 text-[11px] text-indigo-600 font-bold hover:underline"
                        >
                          + Quick create new lead for {callPhone}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Lead suggestions dropdown */}
                {!selectedLead && searchResults.length > 0 && (
                  <div className="sm:col-span-2 max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 shadow-sm">
                    {searchResults.slice(0, 4).map((ld) => (
                      <button
                        key={ld.id}
                        type="button"
                        onClick={() => {
                          setSelectedLead(ld);
                          setCallPhone(ld.contact?.phone || callPhone);
                        }}
                        className="w-full px-3 py-1.5 text-left text-slate-800 hover:bg-slate-50 flex justify-between items-center text-xs"
                      >
                        <span className="font-bold">{ld.title}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{ld.contact?.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Response / Outcome */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                  Customer Response / Outcome <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {OUTCOME_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setCallOutcome(opt.id);
                        if (opt.temp) setCallTemperature(opt.temp as LeadTemperature);
                      }}
                      className={cn(
                        'px-2 py-1.5 rounded-lg border text-center font-semibold text-[11px] transition-all',
                        callOutcome === opt.id
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Remarks / What was discussed */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Remarks / Discussion Notes
                </label>
                <textarea
                  rows={2}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Key discussion points, pricing mentioned, or requirements..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Step 4: Next Action Selection */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Next Action
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {NEXT_ACTION_OPTIONS.map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setCallNextAction(act)}
                      className={cn(
                        'px-2 py-0.5 rounded text-[11px] font-medium border transition-colors',
                        callNextAction === act
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      {act}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 5: Next Action Date & Time (Reminder) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Next Action Date & Time (Reminder)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(1)}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100 font-medium"
                    >
                      +1 hr
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(24, 10)}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100 font-medium"
                    >
                      Tomorrow 10 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(48, 11)}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100 font-medium"
                    >
                      +2 Days
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={callNextActionAt}
                  onChange={(e) => setCallNextActionAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-900 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Step 6: WhatsApp Template Suggestion Accordion */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppSuggestion(!showWhatsAppSuggestion)}
                    className="flex items-center gap-1.5 font-bold text-emerald-800 hover:underline"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>WhatsApp Template Suggestion</span>
                    <span className="text-[10px] font-normal text-emerald-700">
                      {showWhatsAppSuggestion ? '(Hide)' : '(Tap to review/edit)'}
                    </span>
                  </button>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                    Template Ready
                  </span>
                </div>

                {showWhatsAppSuggestion && (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={3}
                      value={suggestedWhatsAppMsg}
                      onChange={(e) => setSuggestedWhatsAppMsg(e.target.value)}
                      className="w-full rounded-lg border border-emerald-200 bg-white p-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 p-2 rounded-lg border border-emerald-100">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={saveCustomTemplate}
                          onChange={(e) => setSaveCustomTemplate(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                        />
                        <span>Save as Reusable Template</span>
                      </label>
                      {saveCustomTemplate && (
                        <input
                          type="text"
                          value={customTemplateName}
                          onChange={(e) => setCustomTemplateName(e.target.value)}
                          placeholder="Template Name"
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-emerald-500"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Save Button */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAction(null)}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || (!selectedLead && !callPhone)}
                  onClick={async () => {
                    let targetLeadId = selectedLead?.id;
                    setIsSubmitting(true);
                    try {
                      // If no lead selected but phone entered, create lead first
                      if (!targetLeadId && callPhone.trim()) {
                        const leadRes = await fetch('/api/leads', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            contactName: `Lead (${callPhone.trim()})`,
                            phone: callPhone.trim(),
                            source: 'External Call',
                          }),
                        });
                        const leadJson = await leadRes.json();
                        if (leadJson.success && leadJson.data) {
                          targetLeadId = leadJson.data.id;
                        }
                      }

                      if (!targetLeadId) {
                        setFeedbackMsg('Please select or specify a lead to save this call.');
                        setIsSubmitting(false);
                        return;
                      }

                      // Save call
                      const callRes = await fetch(`/api/leads/${targetLeadId}/calls`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          callType: 'OUTBOUND',
                          outcome: callOutcome,
                          notes: callNotes.trim() || null,
                          nextAction: callNextAction.trim() || null,
                          nextActionAt: callNextActionAt ? new Date(callNextActionAt).toISOString() : null,
                          temperature: callTemperature,
                        }),
                      });

                      const callJson = await callRes.json();
                      if (!callJson.success) {
                        setFeedbackMsg(callJson.error || 'Failed to save call.');
                        setIsSubmitting(false);
                        return;
                      }

                      // Optional: save custom template if chosen
                      if (saveCustomTemplate && suggestedWhatsAppMsg && customTemplateName) {
                        await fetch('/api/whatsapp/templates', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: customTemplateName.trim(),
                            category: 'UTILITY',
                            content: suggestedWhatsAppMsg.trim(),
                          }),
                        });
                      }

                      setFeedbackMsg('Call logged & Reminder / Timeline synchronized!');
                      setTimeout(() => resetStateAndClose(), 1000);
                    } catch (err: any) {
                      setFeedbackMsg(err.message || 'Error saving call.');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>Save Call</span>
                </button>
              </div>
            </div>
          ) : selectedAction === 'add-follow-up' || selectedAction === 'schedule-call' ? (
            /* Quick Reminder & Follow-up Scheduler */
            <div className="mt-3 space-y-3 overflow-y-auto pr-1 text-xs flex-1">
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="font-bold text-slate-800">{currentAction?.title} & Push Reminder</span>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Back
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  const formData = new FormData(e.currentTarget);
                  const title = formData.get('title') as string;
                  const dateStr = formData.get('scheduledAt') as string;
                  const offset = parseInt((formData.get('offset') as string) || '15', 10);
                  const notes = formData.get('notes') as string;

                  if (!title || !dateStr) {
                    setIsSubmitting(false);
                    return;
                  }

                  const scheduledTime = new Date(dateStr).getTime();
                  const remindAtTime = new Date(scheduledTime - offset * 60 * 1000);

                  try {
                    await fetch('/api/reminders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title,
                        message: notes || `Scheduled ${currentAction?.title}`,
                        remindAt: remindAtTime.toISOString(),
                        type: selectedAction === 'schedule-call' ? 'CALL' : 'FOLLOW_UP',
                      }),
                    });

                    setFeedbackMsg('Follow-up activity & Push Reminder created successfully!');
                    setTimeout(() => resetStateAndClose(), 1000);
                  } catch (err) {
                    console.error('Error creating reminder:', err);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Title / Purpose</label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g. Call decision maker regarding OneComPro setup"
                    className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Scheduled Date & Time</label>
                    <input
                      type="datetime-local"
                      name="scheduledAt"
                      required
                      defaultValue={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                      className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reminder Alert</label>
                    <select
                      name="offset"
                      defaultValue="15"
                      className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="0">At time of activity</option>
                      <option value="5">5 minutes before</option>
                      <option value="15">15 minutes before</option>
                      <option value="30">30 minutes before</option>
                      <option value="60">1 hour before</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes / Context (Optional)</label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Key topics, objections, or deal context..."
                    className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Activity & Set Push Reminder</span>
                </button>
              </form>
            </div>
          ) : selectedAction === 'schedule-demo' ? (
            /* SCHEDULE DEMO FORM */
            <div className="mt-3 space-y-3 overflow-y-auto pr-1 text-xs flex-1">
              <div className="flex items-center justify-between bg-violet-50 p-2.5 rounded-xl border border-violet-100">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-violet-600" />
                  <span className="font-bold text-violet-900">Schedule Product Demo</span>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Back
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  const formData = new FormData(e.currentTarget);
                  const scheduledAt = formData.get('scheduledAt') as string;
                  const durationMinutes = parseInt((formData.get('durationMinutes') as string) || '30', 10);
                  const meetingUrl = formData.get('meetingUrl') as string;
                  const notes = formData.get('notes') as string;

                  try {
                    const leadId = selectedLead?.id || searchResults[0]?.id;
                    if (!leadId) {
                      setFeedbackMsg('Please search or select a lead to schedule demo.');
                      setIsSubmitting(false);
                      return;
                    }

                    const res = await fetch(`/api/demos`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        leadId,
                        scheduledAt,
                        durationMinutes,
                        meetingUrl,
                        notes,
                      }),
                    });

                    const json = await res.json();
                    if (json.success) {
                      setFeedbackMsg('Demo scheduled & Live Demo Plan created!');
                      setTimeout(() => resetStateAndClose(), 1000);
                    } else {
                      setFeedbackMsg(json.error || 'Failed to schedule demo');
                    }
                  } catch (err: any) {
                    console.error('Error scheduling demo:', err);
                    setFeedbackMsg(err.message || 'Error scheduling demo');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prospect / Lead</label>
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search prospect by name or business..."
                    className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-1 max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 shadow-sm">
                      {searchResults.slice(0, 4).map((ld) => (
                        <button
                          key={ld.id}
                          type="button"
                          onClick={() => {
                            setSelectedLead(ld);
                            setLeadSearch(ld.title);
                          }}
                          className={cn(
                            'w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex justify-between items-center',
                            selectedLead?.id === ld.id && 'bg-violet-50 text-violet-900 font-bold'
                          )}
                        >
                          <span>{ld.title}</span>
                          <span className="text-[10px] text-slate-500">{ld.contact?.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Scheduled Date & Time</label>
                    <input
                      type="datetime-local"
                      name="scheduledAt"
                      required
                      defaultValue={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
                      className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Duration</label>
                    <select
                      name="durationMinutes"
                      defaultValue="30"
                      className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Meeting Link (Optional)</label>
                  <input
                    type="url"
                    name="meetingUrl"
                    placeholder="https://meet.google.com/xyz-abc-def"
                    className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Demo Preparation Notes</label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Key pain points, features requested, or customized requirements..."
                    className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-md shadow-violet-600/20 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                  <span>Book Demo & Build Live Demo Plan</span>
                </button>
              </form>
            </div>
          ) : selectedAction === 'add-task' ? (
            /* ADD TASK FORM */
            <div className="mt-3 space-y-3 overflow-y-auto pr-1 text-xs flex-1">
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-slate-600" />
                  <span className="font-bold text-slate-800">Create Task / Action Item</span>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Back
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  const formData = new FormData(e.currentTarget);
                  const title = formData.get('title') as string;
                  const priority = formData.get('priority') as string;
                  const dueDate = formData.get('dueDate') as string;
                  const description = formData.get('description') as string;

                  try {
                    const leadId = selectedLead?.id;
                    const endpoint = leadId ? `/api/leads/${leadId}/tasks` : '/api/reminders';

                    const res = await fetch(endpoint, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title,
                        priority: priority || 'MEDIUM',
                        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                        remindAt: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
                        description,
                        message: description,
                        type: 'TASK',
                      }),
                    });

                    const json = await res.json();
                    if (json.success) {
                      setFeedbackMsg('Task created successfully!');
                      setTimeout(() => resetStateAndClose(), 1000);
                    } else {
                      setFeedbackMsg(json.error || 'Failed to create task');
                    }
                  } catch (err: any) {
                    console.error('Error creating task:', err);
                    setFeedbackMsg(err.message || 'Error creating task');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Task Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g. Send customized pricing proposal"
                    className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Priority</label>
                    <select
                      name="priority"
                      defaultValue="HIGH"
                      className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      name="dueDate"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Description / Details</label>
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="Action item context or requirements..."
                    className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Task to Action Center</span>
                </button>
              </form>
            </div>
          ) : selectedAction === 'add-sale' ? (
            /* RECORD SALE FORM */
            <div className="mt-3 space-y-3 overflow-y-auto pr-1 text-xs flex-1">
              <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="font-bold text-emerald-900">Record Closed Sale & Revenue</span>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Back
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  const formData = new FormData(e.currentTarget);
                  const amount = formData.get('amount') as string;
                  const currency = (formData.get('currency') as string) || 'INR';
                  const closedAt = formData.get('closedAt') as string;
                  const notes = formData.get('notes') as string;

                  try {
                    const leadId = selectedLead?.id;
                    const res = await fetch('/api/sales', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        leadId: leadId || null,
                        amount,
                        currency,
                        closedAt,
                        notes,
                      }),
                    });

                    const json = await res.json();
                    if (json.success) {
                      setFeedbackMsg(`Sale of ₹${Number(amount).toLocaleString('en-IN')} recorded & persisted!`);
                      setTimeout(() => resetStateAndClose(), 1000);
                    } else {
                      setFeedbackMsg(json.error || 'Failed to record sale');
                    }
                  } catch (err: any) {
                    console.error('Error recording sale:', err);
                    setFeedbackMsg(err.message || 'Error recording sale');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Associated Customer / Lead (Optional)</label>
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search lead to mark WON..."
                    className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-1 max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 shadow-sm">
                      {searchResults.slice(0, 4).map((ld) => (
                        <button
                          key={ld.id}
                          type="button"
                          onClick={() => {
                            setSelectedLead(ld);
                            setLeadSearch(ld.title);
                          }}
                          className={cn(
                            'w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex justify-between items-center',
                            selectedLead?.id === ld.id && 'bg-emerald-50 text-emerald-900 font-bold'
                          )}
                        >
                          <span>{ld.title}</span>
                          <span className="text-[10px] text-emerald-600 font-mono">₹{ld.estimatedValue || '0'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Deal Value (₹)</label>
                    <input
                      type="number"
                      name="amount"
                      required
                      placeholder="e.g. 50000"
                      step="500"
                      className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Closed Date</label>
                    <input
                      type="date"
                      name="closedAt"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Package / Sale Details</label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Package plan selected, payment terms, or invoice reference..."
                    className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  <span>Record Sale & Update Target Pace</span>
                </button>
              </form>
            </div>
          ) : selectedAction === 'import-excel-csv' ? (
            /* CSV BULK IMPORT */
            <div className="mt-3 space-y-3 overflow-y-auto pr-1 text-xs flex-1">
              <div className="flex items-center justify-between bg-teal-50 p-2.5 rounded-xl border border-teal-100">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-teal-600" />
                  <span className="font-bold text-teal-900">Bulk Import Leads (CSV / Text)</span>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Back
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!csvText.trim()) return;
                  setIsSubmitting(true);

                  try {
                    const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
                    let count = 0;

                    for (const line of lines) {
                      const parts = line.split(',').map((p) => p.trim());
                      const name = parts[0] || 'Imported Prospect';
                      const phone = parts[1] || '0000000000';
                      const email = parts[2] || '';
                      const source = parts[3] || 'CSV Import';

                      if (name && phone) {
                        await fetch('/api/leads', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            contactName: name,
                            phone,
                            email: email || undefined,
                            source,
                            notes: `Imported via bulk tool on ${new Date().toLocaleDateString()}`,
                          }),
                        });
                        count++;
                      }
                    }

                    setFeedbackMsg(`Successfully imported ${count} leads into database!`);
                    setTimeout(() => resetStateAndClose(), 1200);
                  } catch (err: any) {
                    console.error('Error importing CSV:', err);
                    setFeedbackMsg(err.message || 'Error processing CSV import');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Paste CSV Records (Format: <span className="font-mono text-teal-700">Name, Phone, Email, Source</span>)
                  </label>
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    rows={5}
                    placeholder={`Rajesh Sharma, 9876543210, rajesh@store.com, Cold Call\nPriya Verma, 9811223344, priya@market.com, Website`}
                    className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 font-mono text-[11px] focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Lines detected: {csvText.split('\n').filter((l) => l.trim()).length}</span>
                  <span>Supported: comma separated</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !csvText.trim()}
                  className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>Execute Bulk Import into Database</span>
                </button>
              </form>
            </div>
          ) : selectedAction === 'upload-recording' ? (
            /* RECORDING LOGGER */
            <div className="mt-3 space-y-3 overflow-y-auto pr-1 text-xs flex-1">
              <div className="flex items-center justify-between bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-rose-600" />
                  <span className="font-bold text-rose-900">Log Call Audio / Transcript Notes</span>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Back
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  const formData = new FormData(e.currentTarget);
                  const notes = formData.get('notes') as string;
                  const callType = (formData.get('callType') as string) || 'OUTBOUND';
                  const outcome = (formData.get('outcome') as string) || 'CONNECTED';

                  try {
                    const leadId = selectedLead?.id;
                    if (!leadId) {
                      setFeedbackMsg('Please search and select a target lead first.');
                      setIsSubmitting(false);
                      return;
                    }

                    const res = await fetch(`/api/leads/${leadId}/calls`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        callType,
                        outcome,
                        notes,
                        durationSeconds: 120,
                      }),
                    });

                    const json = await res.json();
                    if (json.success) {
                      setFeedbackMsg('Call transcript logged for AI Analysis!');
                      setTimeout(() => resetStateAndClose(), 1000);
                    } else {
                      setFeedbackMsg(json.error || 'Failed to log call audio');
                    }
                  } catch (err: any) {
                    console.error('Error logging audio call:', err);
                    setFeedbackMsg(err.message || 'Error logging audio call');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Lead</label>
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search prospect by name or phone..."
                    className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-1 max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 shadow-sm">
                      {searchResults.slice(0, 4).map((ld) => (
                        <button
                          key={ld.id}
                          type="button"
                          onClick={() => {
                            setSelectedLead(ld);
                            setLeadSearch(ld.title);
                          }}
                          className={cn(
                            'w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex justify-between items-center',
                            selectedLead?.id === ld.id && 'bg-rose-50 text-rose-900 font-bold'
                          )}
                        >
                          <span>{ld.title}</span>
                          <span className="text-[10px] text-slate-500">{ld.contact?.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transcript / Recording Takeaways</label>
                  <textarea
                    name="notes"
                    required
                    rows={3}
                    placeholder="Paste call transcript, voice note summary, or client discussion points..."
                    className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center gap-2 text-slate-500 text-[11px]">
                  <FileText className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>Transcripts are processed by AI Call Intelligence to extract Customer Memory.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                  <span>Save Recording Data for AI Analysis</span>
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      {/* Real Lead Create Modal */}
      <LeadCreateModal
        isOpen={isLeadCreateOpen}
        onClose={() => setIsLeadCreateOpen(false)}
        onSuccess={() => {
          setIsLeadCreateOpen(false);
          onClose();
        }}
      />

      {/* Real Quick Call Logger Modal when opened with pre-selected lead */}
      {selectedLeadForCall && (
        <QuickCallLoggerModal
          isOpen={true}
          onClose={() => {
            setSelectedLeadForCall(null);
            setSelectedAction(null);
            onClose();
          }}
          leadId={selectedLeadForCall.id}
          leadTitle={selectedLeadForCall.title}
          contactName={selectedLeadForCall.contact?.name}
          contactPhone={selectedLeadForCall.contact?.phone}
          initialTemperature={selectedLeadForCall.temperature}
          onSuccess={() => {
            setSelectedLeadForCall(null);
            setSelectedAction(null);
            onClose();
          }}
        />
      )}
    </>
  );
};
