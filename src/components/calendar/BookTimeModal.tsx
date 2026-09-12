'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  User,
  Search,
  CheckCircle2,
  AlertTriangle,
  PhoneCall,
  Video,
  RefreshCw,
  MessageSquare,
  Flame,
  FileText,
  Package,
  CheckSquare,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadOption {
  id: string;
  title: string;
  contactName?: string | null;
  businessName?: string | null;
  phone?: string | null;
}

interface SuggestedSlot {
  startTime: string;
  endTime: string;
  formattedTime: string;
  formattedRange: string;
}

interface BookTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTime?: string | null;
  initialDate?: string | null;
}

const PRIMARY_ACTIVITIES = [
  { id: 'CALL', label: 'Call', icon: PhoneCall, color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { id: 'DEMO', label: 'Demo', icon: Video, color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
  { id: 'CALLBACK', label: 'Callback', icon: RefreshCw, color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
  { id: 'SEND_DETAILS', label: 'Send Details', icon: MessageSquare, color: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100' },
  { id: 'FOLLOW_UP', label: 'Follow-up', icon: CheckCircle2, color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
];

const MORE_ACTIVITIES = [
  { id: 'CLOSING', label: 'Closing Call', icon: Flame, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'QUOTATION', label: 'Quotation', icon: FileText, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'SAMPLE', label: 'Sample', icon: Package, color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  { id: 'TASK', label: 'Task', icon: CheckSquare, color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export const BookTimeModal: React.FC<BookTimeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTime,
  initialDate,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [activityType, setActivityType] = useState<string>('CALL');
  const [showMoreActivities, setShowMoreActivities] = useState<boolean>(false);
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null);
  const [leadSearchQuery, setLeadSearchQuery] = useState<string>('');
  const [leadSearchResults, setLeadSearchResults] = useState<LeadOption[]>([]);
  const [searchingLeads, setSearchingLeads] = useState<boolean>(false);

  const [dateString, setDateString] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [timeString, setTimeString] = useState<string>(initialTime || '11:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [bufferMinutes, setBufferMinutes] = useState<number>(10);
  const [notes, setNotes] = useState<string>('');

  // Conflict / Loading State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [conflictingEventInfo, setConflictingEventInfo] = useState<any>(null);
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlot[]>([]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setActivityType('CALL');
      setSelectedLead(null);
      setDateString(initialDate || new Date().toISOString().split('T')[0]);
      setTimeString(initialTime || '11:00');
      setDurationMinutes(30);
      setBufferMinutes(10);
      setNotes('');
      setConflictError(null);
      setConflictingEventInfo(null);
      setSuggestedSlots([]);
    }
  }, [isOpen, initialDate, initialTime]);

  // Lead search debounce
  useEffect(() => {
    if (!leadSearchQuery.trim()) {
      setLeadSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingLeads(true);
        const res = await fetch(`/api/leads?search=${encodeURIComponent(leadSearchQuery)}`);
        if (res.ok) {
          const json = await res.json();
          setLeadSearchResults(json.leads || json.data || []);
        }
      } catch (err) {
        console.error('Failed to search leads:', err);
      } finally {
        setSearchingLeads(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [leadSearchQuery]);

  if (!isOpen) return null;

  const handleSelectSuggestedSlot = (slot: SuggestedSlot) => {
    const slotDate = new Date(slot.startTime);
    const h = String(slotDate.getHours()).padStart(2, '0');
    const m = String(slotDate.getMinutes()).padStart(2, '0');
    setTimeString(`${h}:${m}`);
    setConflictError(null);
    setConflictingEventInfo(null);
    setSuggestedSlots([]);
  };

  const handleBook = async () => {
    try {
      setSubmitting(true);
      setConflictError(null);
      setConflictingEventInfo(null);

      // Construct ISO start date string
      const [y, mon, d] = dateString.split('-').map((v) => parseInt(v, 10));
      const [h, m] = timeString.split(':').map((v) => parseInt(v, 10));
      const startObj = new Date(y, mon - 1, d, h, m, 0, 0);

      const payload = {
        activityType,
        leadId: selectedLead?.id || null,
        startTime: startObj.toISOString(),
        durationMinutes,
        bufferMinutes,
        notes,
      };

      const res = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.conflict) {
          setConflictError(json.error || 'That time is already booked.');
          setConflictingEventInfo(json.conflict.conflictingEvent);
          setSuggestedSlots(json.conflict.suggestedSlots || []);
        } else {
          setConflictError(json.error || 'Failed to create booking.');
        }
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submitting booking:', err);
      setConflictError(err.message || 'Server connection error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              +
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Book Time</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Step {step} of 4 — {step === 1 && 'What are you doing?'}
                {step === 2 && 'Who is it with?'}
                {step === 3 && 'When & Duration'}
                {step === 4 && 'Confirm Booking'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="flex border-b border-slate-100 bg-slate-50/30">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                'flex-1 h-1 transition-all',
                s <= step ? 'bg-indigo-600' : 'bg-slate-200'
              )}
            />
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto max-h-[70vh] space-y-4">
          {/* STEP 1: ACTIVITY SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Primary Sales Activities
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PRIMARY_ACTIVITIES.map((act) => {
                  const Icon = act.icon;
                  const isSelected = activityType === act.id;
                  return (
                    <button
                      key={act.id}
                      onClick={() => setActivityType(act.id)}
                      className={cn(
                        'flex flex-col items-center justify-center p-3.5 rounded-xl border font-bold text-xs transition-all gap-1.5',
                        act.color,
                        isSelected && 'ring-2 ring-indigo-600 ring-offset-1 border-indigo-600 font-extrabold shadow-2xs'
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{act.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Toggle More Options */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowMoreActivities(!showMoreActivities)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                >
                  {showMoreActivities ? '– Hide More Options' : '+ More Activity Choices'}
                </button>
              </div>

              {showMoreActivities && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 animate-in fade-in duration-150">
                  {MORE_ACTIVITIES.map((act) => {
                    const Icon = act.icon;
                    const isSelected = activityType === act.id;
                    return (
                      <button
                        key={act.id}
                        onClick={() => setActivityType(act.id)}
                        className={cn(
                          'flex flex-col items-center justify-center p-3 rounded-xl border font-bold text-xs transition-all gap-1.5',
                          act.color,
                          isSelected && 'ring-2 ring-indigo-600 ring-offset-1 border-indigo-600 shadow-2xs'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{act.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: LEAD SELECTION */}
          {step === 2 && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Lead / Customer
              </label>

              {/* Selected Lead Box */}
              {selectedLead ? (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {selectedLead.contactName || selectedLead.businessName || selectedLead.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {selectedLead.businessName || selectedLead.phone || 'Lead'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={leadSearchQuery}
                      onChange={(e) => setLeadSearchQuery(e.target.value)}
                      placeholder="Type name, business, or phone number..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {searchingLeads && (
                    <div className="text-xs text-slate-400 p-2 text-center">Searching database...</div>
                  )}

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {leadSearchResults.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-900">
                          {lead.contactName || lead.businessName || lead.title}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {lead.businessName || lead.phone || ''}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setSelectedLead(null)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
                    >
                      Skip Lead (Internal / Custom Block)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: WHEN & DURATION */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={dateString}
                    onChange={(e) => setDateString(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={timeString}
                    onChange={(e) => setTimeString(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Duration</label>
                <div className="flex items-center gap-2">
                  {[10, 15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationMinutes(m)}
                      className={cn(
                        'flex-1 py-2 text-xs font-bold rounded-xl border transition-all',
                        durationMinutes === m
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Buffer Time</label>
                <div className="flex items-center gap-2">
                  {[0, 5, 10, 15].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBufferMinutes(b)}
                      className={cn(
                        'flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all',
                        bufferMinutes === b
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {b === 0 ? 'No buffer' : `${b} min`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Purpose</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Call back to discuss pricing quotation..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRMATION & CONFLICT WARNING */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Activity:</span>
                  <span className="font-bold text-slate-900 uppercase">{activityType}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Lead / Customer:</span>
                  <span className="font-bold text-slate-900">
                    {selectedLead?.contactName || selectedLead?.businessName || 'General / Unlinked'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Date & Time:</span>
                  <span className="font-bold text-slate-900">
                    {dateString} at {timeString} ({durationMinutes} mins)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Buffer Window:</span>
                  <span className="font-semibold text-slate-700">{bufferMinutes} mins after</span>
                </div>
              </div>

              {/* Smart Conflict Warning Box */}
              {conflictError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5 text-rose-800">
                    <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">{conflictError}</div>
                      {conflictingEventInfo && (
                        <div className="text-[11px] text-rose-700 mt-1">
                          <strong>CURRENT BOOKING:</strong> {conflictingEventInfo.timeRange} —{' '}
                          {conflictingEventInfo.title}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Suggested Slots */}
                  {suggestedSlots.length > 0 && (
                    <div className="pt-2 border-t border-rose-200">
                      <div className="text-[11px] font-bold text-rose-900 mb-1.5">
                        Suggested available slots:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestedSlots.map((slot, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSuggestedSlot(slot)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-900 font-bold text-xs hover:bg-rose-100 shadow-2xs transition-all"
                          >
                            {slot.formattedTime}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200/80 bg-slate-50/50">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as any)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-all"
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleBook}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-all disabled:opacity-50"
            >
              {submitting ? 'Checking & Booking...' : 'Confirm Book Time'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
