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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadCreateModal } from '@/components/leads/LeadCreateModal';
import { QuickCallLoggerModal } from '@/components/calls/QuickCallLoggerModal';

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
    accent: 'border-indigo-500/30 text-indigo-400 bg-indigo-950/30',
  },
  {
    id: 'log-call',
    title: 'Log Call',
    description: 'Record notes and details from a completed phone call',
    icon: PhoneCall,
    accent: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/30',
  },
  {
    id: 'schedule-call',
    title: 'Schedule Call',
    description: 'Set a future call slot on calendar',
    icon: Calendar,
    accent: 'border-sky-500/30 text-sky-400 bg-sky-950/30',
  },
  {
    id: 'schedule-demo',
    title: 'Schedule Demo',
    description: 'Book a product presentation or demo session',
    icon: Video,
    accent: 'border-violet-500/30 text-violet-400 bg-violet-950/30',
  },
  {
    id: 'add-follow-up',
    title: 'Add Follow-up',
    description: 'Set a high-priority follow-up reminder',
    icon: Clock,
    accent: 'border-amber-500/30 text-amber-400 bg-amber-950/30',
  },
  {
    id: 'add-task',
    title: 'Add Task',
    description: 'Create a quick task or action item',
    icon: CheckSquare,
    accent: 'border-slate-500/30 text-slate-300 bg-slate-800/40',
  },
  {
    id: 'add-sale',
    title: 'Add Sale',
    description: 'Record a closed deal and payment entry',
    icon: DollarSign,
    accent: 'border-emerald-500/30 text-emerald-300 bg-emerald-950/40',
  },
  {
    id: 'import-excel-csv',
    title: 'Import Excel/CSV',
    description: 'Bulk import leads or call lists from text / CSV format',
    icon: FileSpreadsheet,
    accent: 'border-teal-500/30 text-teal-300 bg-teal-950/30',
  },
  {
    id: 'upload-recording',
    title: 'Upload Recording',
    description: 'Log audio recording or transcript for AI processing',
    icon: Mic,
    accent: 'border-rose-500/30 text-rose-300 bg-rose-950/30',
  },
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

  // CSV Import state
  const [csvText, setCsvText] = useState('');

  // Debounced search for Lead selection
  useEffect(() => {
    if (!selectedAction || selectedAction === 'new-lead' || selectedAction === 'import-excel-csv') return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = leadSearch ? `?search=${encodeURIComponent(leadSearch)}` : '';
        const res = await fetch(`/api/leads${query}`);
        const json = await res.json();
        if (json.success) {
          setSearchResults(json.data || []);
        }
      } catch (err) {
        console.error('Error searching leads:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [leadSearch, selectedAction]);

  if (!isOpen) return null;

  const currentAction = quickAddActions.find((a) => a.id === selectedAction);

  const resetStateAndClose = () => {
    setSelectedAction(null);
    setSelectedLead(null);
    setSelectedLeadForCall(null);
    setLeadSearch('');
    setCsvText('');
    setFeedbackMsg(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Quick Add Action
              </h2>
              <p className="text-xs text-slate-500">
                Select an action trigger to create or record entries in BroStartup Sales OS.
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
            <div className="mt-3 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between">
              <span>{feedbackMsg}</span>
              <button onClick={() => setFeedbackMsg(null)} className="underline text-[10px]">
                Dismiss
              </button>
            </div>
          )}

          {/* Action Selection List */}
          {!selectedAction ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
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
                      'flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all hover:scale-[1.01] hover:border-indigo-500/50 group',
                      action.accent
                    )}
                  >
                    <div className="rounded-md p-2 bg-slate-900/80 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300">
                          {action.title}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-400" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : selectedAction === 'log-call' ? (
            /* Real Database Lead Search for Global Log Call */
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md p-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    <PhoneCall className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-200">Log Call — Select Lead</h3>
                    <p className="text-[11px] text-slate-400">Search prospect by name, business, or phone</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-xs text-slate-400 hover:text-indigo-400 underline"
                >
                  Back
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Search lead by name, company, phone..."
                  autoFocus
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {isSearching ? (
                  <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    <span>Searching database...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    <p>No leads found matching your search.</p>
                    <button
                      onClick={() => {
                        setSelectedAction(null);
                        setIsLeadCreateOpen(true);
                      }}
                      className="mt-2 text-indigo-400 hover:underline font-medium"
                    >
                      + Create New Lead Instead
                    </button>
                  </div>
                ) : (
                  searchResults.map((ld) => (
                    <button
                      key={ld.id}
                      onClick={() => {
                        setSelectedLeadForCall(ld);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-slate-900 text-left transition-all group"
                    >
                      <div>
                        <span className="font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
                          {ld.title}
                        </span>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                          {ld.contact?.name && <span>{ld.contact.name}</span>}
                          {ld.contact?.phone && <span className="font-mono text-indigo-300">{ld.contact.phone}</span>}
                          {ld.business?.industry && <span>• {ld.business.industry}</span>}
                        </div>
                      </div>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        Select Lead →
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : selectedAction === 'add-follow-up' || selectedAction === 'schedule-call' ? (
            /* Quick Reminder & Follow-up Scheduler */
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md p-1.5 bg-slate-900">
                    <Clock className="h-4 w-4 text-amber-400" />
                  </div>
                  <span className="font-semibold text-sm text-slate-200">{currentAction?.title} & Reminder</span>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-xs text-slate-400 hover:text-indigo-400 underline"
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
                className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Title / Purpose</label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g. Call ABC Supermarket decision maker"
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduled Date & Time</label>
                    <input
                      type="datetime-local"
                      name="scheduledAt"
                      required
                      defaultValue={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Reminder Alert Preset</label>
                    <select
                      name="offset"
                      defaultValue="15"
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Context (Optional)</label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Key topics, objections, or deal notes..."
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Activity & Set Push Reminder</span>
                </button>
              </form>
            </div>
          ) : selectedAction === 'schedule-demo' ? (
            /* Schedule Demo Form */
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md p-1.5 bg-violet-950/60 text-violet-400 border border-violet-500/30">
                    <Video className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-sm text-slate-200">Schedule Product Demo</span>
                </div>
                <button onClick={() => setSelectedAction(null)} className="text-xs text-slate-400 hover:text-indigo-400 underline">
                  Back
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  const formData = new FormData(e.currentTarget);
                  const scheduledAt = formData.get('scheduledAt') as string;
                  const durationMinutes = parseInt(formData.get('durationMinutes') as string || '30', 10);
                  const meetingUrl = formData.get('meetingUrl') as string;
                  const notes = formData.get('notes') as string;

                  try {
                    const leadId = selectedLead?.id || searchResults[0]?.id;
                    if (!leadId) {
                      setFeedbackMsg('Please search or select a lead to schedule demo.');
                      setIsSubmitting(false);
                      return;
                    }

                    const res = await fetch(`/api/leads/${leadId}/demos`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
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
                className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Prospect / Lead</label>
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search prospect by name or business..."
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-1 max-h-32 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg divide-y divide-slate-800">
                      {searchResults.slice(0, 4).map((ld) => (
                        <button
                          key={ld.id}
                          type="button"
                          onClick={() => {
                            setSelectedLead(ld);
                            setLeadSearch(ld.title);
                          }}
                          className={cn(
                            'w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex justify-between items-center',
                            selectedLead?.id === ld.id && 'bg-violet-950/40 text-violet-300'
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
                    <label className="block font-semibold text-slate-300 mb-1">Scheduled Date & Time</label>
                    <input
                      type="datetime-local"
                      name="scheduledAt"
                      required
                      defaultValue={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Duration</label>
                    <select
                      name="durationMinutes"
                      defaultValue="30"
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Google Meet / Zoom Link (Optional)</label>
                  <input
                    type="url"
                    name="meetingUrl"
                    placeholder="https://meet.google.com/xyz-abc-def"
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Demo Preparation Notes</label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Key pain points, features requested, or customized requirements..."
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-600/30 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                  <span>Book Demo & Build Live Demo Plan</span>
                </button>
              </form>
            </div>
          ) : selectedAction === 'add-task' ? (
            /* Add Task Form */
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md p-1.5 bg-slate-900">
                    <CheckSquare className="h-4 w-4 text-slate-300" />
                  </div>
                  <span className="font-semibold text-sm text-slate-200">Create Task / Action Item</span>
                </div>
                <button onClick={() => setSelectedAction(null)} className="text-xs text-slate-400 hover:text-indigo-400 underline">
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
                className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Task Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g. Send custom pricing proposal PDF"
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Priority</label>
                    <select
                      name="priority"
                      defaultValue="HIGH"
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Due Date</label>
                    <input
                      type="date"
                      name="dueDate"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Description / Details</label>
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="Action item context or requirements..."
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Task to Action Center</span>
                </button>
              </form>
            </div>
          ) : selectedAction === 'add-sale' ? (
            /* Add Sale Form */
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md p-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-sm text-slate-200">Record Closed Sale & Revenue</span>
                </div>
                <button onClick={() => setSelectedAction(null)} className="text-xs text-slate-400 hover:text-indigo-400 underline">
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
                      setFeedbackMsg(`Sale of ₹${Number(amount).toLocaleString('en-IN')} recorded & lead marked WON!`);
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
                className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Associated Customer / Lead (Optional)</label>
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search lead to mark WON..."
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-1 max-h-32 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg divide-y divide-slate-800">
                      {searchResults.slice(0, 4).map((ld) => (
                        <button
                          key={ld.id}
                          type="button"
                          onClick={() => {
                            setSelectedLead(ld);
                            setLeadSearch(ld.title);
                          }}
                          className={cn(
                            'w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex justify-between items-center',
                            selectedLead?.id === ld.id && 'bg-emerald-950/40 text-emerald-300'
                          )}
                        >
                          <span>{ld.title}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">₹{ld.estimatedValue || '0'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Deal Value (₹)</label>
                    <input
                      type="number"
                      name="amount"
                      required
                      placeholder="e.g. 50000"
                      step="500"
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Closed Date</label>
                    <input
                      type="date"
                      name="closedAt"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Package / Sale Details</label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Package plan selected, payment terms, or invoice reference..."
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  <span>Record Sale & Update Target Pace</span>
                </button>
              </form>
            </div>
          ) : selectedAction === 'import-excel-csv' ? (
            /* CSV Bulk Import Form */
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md p-1.5 bg-teal-950/60 text-teal-400 border border-teal-500/30">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-sm text-slate-200">Bulk Import Leads (CSV / Text)</span>
                </div>
                <button onClick={() => setSelectedAction(null)} className="text-xs text-slate-400 hover:text-indigo-400 underline">
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
                className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Paste CSV / Plain Text Records (One prospect per line: <span className="font-mono text-teal-400">Name, Phone, Email, Source</span>)
                  </label>
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    rows={5}
                    placeholder={`Rajesh Sharma, 9876543210, rajesh@store.com, Cold Call\nPriya Verma, 9811223344, priya@market.com, Website`}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-600 font-mono text-[11px] focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Lines detected: {csvText.split('\n').filter((l) => l.trim()).length}</span>
                  <span>Supported format: comma separated</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !csvText.trim()}
                  className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>Execute Bulk Import into Database</span>
                </button>
              </form>
            </div>
          ) : selectedAction === 'upload-recording' ? (
            /* Call Recording & Transcript Logger */
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md p-1.5 bg-rose-950/60 text-rose-400 border border-rose-500/30">
                    <Mic className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-sm text-slate-200">Log Call Audio / Transcript Notes</span>
                </div>
                <button onClick={() => setSelectedAction(null)} className="text-xs text-slate-400 hover:text-indigo-400 underline">
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
                      setFeedbackMsg('Call transcript & recording logged for AI Analysis!');
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
                className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Target Lead</label>
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search prospect by name or phone..."
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-1 max-h-32 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg divide-y divide-slate-800">
                      {searchResults.slice(0, 4).map((ld) => (
                        <button
                          key={ld.id}
                          type="button"
                          onClick={() => {
                            setSelectedLead(ld);
                            setLeadSearch(ld.title);
                          }}
                          className={cn(
                            'w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex justify-between items-center',
                            selectedLead?.id === ld.id && 'bg-rose-950/40 text-rose-300'
                          )}
                        >
                          <span>{ld.title}</span>
                          <span className="text-[10px] text-slate-400">{ld.contact?.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Transcript / Recording Key Takeaways</label>
                  <textarea
                    name="notes"
                    required
                    rows={3}
                    placeholder="Paste call transcript, voice note summary, or client discussion points..."
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2 text-slate-400 text-[11px]">
                  <FileText className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>Audio recordings are transcribed & analyzed by AI Call Intelligence to extract Customer Memory.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
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

      {/* Real Quick Call Logger Modal when lead is selected */}
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
