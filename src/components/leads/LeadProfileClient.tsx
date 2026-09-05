'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  PhoneCall,
  MessageSquare,
  Video,
  Clock,
  CheckSquare,
  FileText,
  Edit,
  Trophy,
  XCircle,
  Building,
  User,
  Flame,
  Sparkles,
  Tag,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BeforeCallBriefModal } from '@/components/calls/BeforeCallBriefModal';
import { QuickCallLoggerModal } from '@/components/calls/QuickCallLoggerModal';
import { CallHistoryTab } from '@/components/calls/CallHistoryTab';
import { CustomerMemoryTab } from '@/components/leads/CustomerMemoryTab';
import { CompleteTimelineTab } from '@/components/leads/CompleteTimelineTab';
import { TellMeEverythingDrawer } from '@/components/leads/TellMeEverythingDrawer';
import { DemoListAndCockpit } from '@/components/demos/DemoListAndCockpit';
import { LeadWhatsAppTab } from '@/components/whatsapp/LeadWhatsAppTab';
import { QuickWhatsAppModal } from '@/components/whatsapp/QuickWhatsAppModal';

interface LeadProfileClientProps {
  id: string;
}

export const LeadProfileClient: React.FC<LeadProfileClientProps> = ({ id }) => {
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'memory' | 'timeline' | 'calls' | 'demos' | 'whatsapp' | 'notes' | 'ai'>('overview');

  // Intelligence & Dossier Drawer
  const [isTellMeEverythingOpen, setIsTellMeEverythingOpen] = useState(false);

  // Call Modals
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [isCallLoggerOpen, setIsCallLoggerOpen] = useState(false);
  const [isQuickWhatsAppOpen, setIsQuickWhatsAppOpen] = useState(false);
  const [quickWhatsAppCategory, setQuickWhatsAppCategory] = useState<string>('DAY_1_FOLLOWUP');

  // Other Quick Action Modal States
  const [actionModal, setActionModal] = useState<'whatsapp' | 'demo' | 'followup' | 'task' | 'note' | 'edit' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Action Form Inputs
  const [demoDate, setDemoDate] = useState('');
  const [demoNotes, setDemoNotes] = useState('');

  const [followupDate, setFollowupDate] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const [waContent, setWaContent] = useState('');

  const [editTemperature, setEditTemperature] = useState('WARM');
  const [editStatus, setEditStatus] = useState('NEW');

  const fetchLeadDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${id}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to load lead details.');
        setLead(null);
      } else {
        setLead(json.data);
        setEditTemperature(json.data.temperature);
        setEditStatus(json.data.status);
      }
    } catch (err: any) {
      console.error('Error loading lead details:', err);
      setError('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeadDetails();
  }, [fetchLeadDetails]);

  // Handle Mark Won / Mark Lost
  const handleStatusUpdate = async (newStatus: 'WON' | 'LOST') => {
    if (!confirm(`Are you sure you want to mark this lead as ${newStatus}?`)) return;
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        fetchLeadDetails();
      } else {
        alert(json.error || 'Failed to update status.');
      }
    } catch (err) {
      alert('Network error updating status.');
    }
  };

  // Submit Action Forms
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      let endpoint = '';
      let payload = {};

      if (actionModal === 'demo') {
        endpoint = `/api/leads/${id}/demos`;
        payload = { scheduledAt: demoDate, notes: demoNotes };
      } else if (actionModal === 'followup') {
        endpoint = `/api/leads/${id}/follow-ups`;
        payload = { scheduledAt: followupDate, notes: followupNotes };
      } else if (actionModal === 'task') {
        endpoint = `/api/leads/${id}/tasks`;
        payload = { title: taskTitle, dueDate: taskDueDate || null };
      } else if (actionModal === 'note') {
        endpoint = `/api/leads/${id}/notes`;
        payload = { title: noteTitle, content: noteContent };
      } else if (actionModal === 'whatsapp') {
        endpoint = `/api/leads/${id}/whatsapp`;
        payload = { content: waContent };
      } else if (actionModal === 'edit') {
        endpoint = `/api/leads/${id}`;
        payload = { status: editStatus, temperature: editTemperature };
        const res = await fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setActionModal(null);
          fetchLeadDetails();
        }
        setActionLoading(false);
        return;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionModal(null);
        setDemoDate('');
        setDemoNotes('');
        setFollowupDate('');
        setFollowupNotes('');
        setTaskTitle('');
        setNoteContent('');
        setWaContent('');
        fetchLeadDetails();
      } else {
        alert(json.error || 'Action failed.');
      }
    } catch (err) {
      alert('Network error submitting action.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 w-full rounded-2xl skeleton-shimmer border border-slate-800" />
        <div className="h-12 w-full rounded-xl skeleton-shimmer border border-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 rounded-2xl skeleton-shimmer border border-slate-800 col-span-2" />
          <div className="h-64 rounded-2xl skeleton-shimmer border border-slate-800" />
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-400 mb-2" />
        <h3 className="text-sm font-semibold text-slate-200">{error || 'Lead not found.'}</h3>
        <Link
          href="/leads"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Leads
        </Link>
      </div>
    );
  }

  const tempBadge = {
    HOT: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    WARM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    COLD: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  }[lead.temperature as 'HOT' | 'WARM' | 'COLD'] || 'bg-slate-500/10 text-slate-400';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'memory', label: `Customer Memory (${lead.memories?.length || 0})` },
    { id: 'timeline', label: 'Complete Timeline' },
    { id: 'calls', label: `Calls (${lead.calls?.length || 0})` },
    { id: 'demos', label: `Demos (${lead.demos?.length || 0})` },
    { id: 'whatsapp', label: `WhatsApp (${lead.whatsAppMsgs?.length || 0})` },
    { id: 'notes', label: `Notes (${lead.notesList?.length || 0})` },
    { id: 'ai', label: 'AI Intelligence' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lead List
        </Link>

        {/* Lead Quick Status Badges */}
        <div className="flex items-center gap-2">
          <span className={cn('rounded border px-2.5 py-0.5 text-xs font-semibold', tempBadge)}>
            <Flame className="inline h-3.5 w-3.5 mr-1" />
            {lead.temperature}
          </span>
          <span className="rounded border border-indigo-500/30 bg-indigo-950/40 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
            Stage: {lead.status}
          </span>
        </div>
      </div>

      {/* Main Title & Lead Actions Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100">{lead.title}</h1>
                <p className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                  <span>Source: {lead.source || 'Direct Outreach'}</span>
                  <span>•</span>
                  <span>Created {new Date(lead.createdAt).toLocaleDateString()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* CALL NOW (Opens Before-Call Brief) */}
            <button
              onClick={() => setIsBriefOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all shadow-md shadow-emerald-600/25"
            >
              <PhoneCall className="h-3.5 w-3.5 animate-pulse" />
              <span>CALL NOW</span>
            </button>

            {/* TELL ME EVERYTHING BUTTON */}
            <button
              onClick={() => setIsTellMeEverythingOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3.5 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-900/60 active:scale-95 transition-all shadow-md shadow-indigo-950/50"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>TELL ME EVERYTHING</span>
            </button>

            {/* Quick Log Call Result */}
            <button
              onClick={() => setIsCallLoggerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/40 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Log Call</span>
            </button>

            <button
              onClick={() => setIsQuickWhatsAppOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-950/30 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-900/40 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              WhatsApp
            </button>

            <button
              onClick={() => setActionModal('demo')}
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-950/30 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-900/40 transition-colors"
            >
              <Video className="h-3.5 w-3.5" />
              Schedule Demo
            </button>

            <button
              onClick={() => setActionModal('followup')}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-900/40 transition-colors"
            >
              <Clock className="h-3.5 w-3.5" />
              Add Follow-up
            </button>

            <button
              onClick={() => setActionModal('task')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Add Task
            </button>

            <button
              onClick={() => setActionModal('note')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Add Note
            </button>

            <button
              onClick={() => setActionModal('edit')}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-900/50 transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit
            </button>

            {lead.status !== 'WON' && (
              <button
                onClick={() => handleStatusUpdate('WON')}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/20"
              >
                <Trophy className="h-3.5 w-3.5" />
                Mark Won
              </button>
            )}

            {lead.status !== 'LOST' && (
              <button
                onClick={() => handleStatusUpdate('LOST')}
                className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-900/50 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Mark Lost
              </button>
            )}
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Column 1: Contact & Business Details */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="h-4 w-4 text-indigo-400" /> Primary Contact
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Name</span>
                  <span className="font-semibold text-slate-200">{lead.contact?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone</span>
                  <span className="font-mono text-indigo-300 font-semibold">{lead.contact?.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email</span>
                  <span className="text-slate-300">{lead.contact?.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building className="h-4 w-4 text-emerald-400" /> Business Profile
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Business Name</span>
                  <span className="font-semibold text-slate-200">{lead.business?.name || 'Individual Prospect'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Industry</span>
                  <span className="text-slate-300">{lead.business?.industry || 'Unspecified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">City / Location</span>
                  <span className="text-slate-300">{lead.business?.city || 'Unspecified'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Deal & Sales Signals */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-amber-400" /> Pipeline & Status
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Lead Score</span>
                  <span className="text-sm font-extrabold text-indigo-400">
                    {lead.scoreValue ? `${lead.scoreValue} / 100` : 'Unscored'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Est. Value</span>
                  <span className="text-sm font-extrabold text-emerald-400">
                    {lead.estimatedValue ? `₹${Number(lead.estimatedValue).toLocaleString()}` : 'TBD'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Last Contact</span>
                  <span className="text-slate-300">{new Date(lead.updatedAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Next Action</span>
                  <span className="text-amber-400 font-semibold">
                    {lead.nextActionDate ? new Date(lead.nextActionDate).toLocaleDateString() : 'None set'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-violet-400" /> Sales Notes & Context
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {lead.notes || 'No notes added yet.'}
              </p>
            </div>
          </div>

          {/* Column 3: Buying Signals & Requirements */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-400" /> Customer Memory Facts
                </h3>
                <button
                  onClick={() => setActiveTab('memory')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5"
                >
                  Manage ({lead.memories?.length || 0}) →
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {lead.memories && lead.memories.length > 0 ? (
                  lead.memories.slice(0, 5).map((m: any) => (
                    <div key={m.id} className="rounded-lg bg-slate-950 p-2.5 border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-slate-200 block">{m.key}</span>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.2 text-[9px] font-bold border',
                            m.verificationState === 'CONFIRMED'
                              ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                              : m.verificationState === 'INFERRED'
                              ? 'bg-amber-950/30 text-amber-400 border-amber-500/20'
                              : 'bg-rose-950/30 text-rose-400 border-rose-500/20 line-through'
                          )}
                        >
                          {m.verificationState}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">{m.value}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-xs text-slate-500">
                      No customer memory facts recorded yet.
                    </p>
                    <button
                      onClick={() => setActiveTab('memory')}
                      className="text-xs text-indigo-400 hover:underline font-medium"
                    >
                      + Add first fact in Customer Memory
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER MEMORY TAB */}
      {activeTab === 'memory' && (
        <CustomerMemoryTab
          leadId={id}
          onMemoryChanged={fetchLeadDetails}
        />
      )}

      {/* COMPLETE TIMELINE TAB */}
      {activeTab === 'timeline' && (
        <CompleteTimelineTab
          leadId={id}
          onOpenCallDetails={() => setActiveTab('calls')}
        />
      )}

      {/* CALLS TAB - Built with CallHistoryTab */}
      {activeTab === 'calls' && (
        <CallHistoryTab
          leadId={id}
          onOpenLogCall={() => setIsCallLoggerOpen(true)}
        />
      )}

      {/* DEMOS TAB */}
      {activeTab === 'demos' && (
        <DemoListAndCockpit
          leadId={id}
          leadName={lead?.contact?.name || lead?.contactName}
          businessName={lead?.business?.name || lead?.businessName}
        />
      )}

      {/* WHATSAPP TAB */}
      {activeTab === 'whatsapp' && (
        <LeadWhatsAppTab
          leadId={id}
          lead={lead}
          onRefreshNeeded={fetchLeadDetails}
        />
      )}

      {/* NOTES TAB */}
      {activeTab === 'notes' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sales Notes</h3>
            <button
              onClick={() => setActionModal('note')}
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              <FileText className="h-3 w-3" /> Add Note
            </button>
          </div>
          {lead.notesList && lead.notesList.length > 0 ? (
            <div className="space-y-2">
              {lead.notesList.map((n: any) => (
                <div key={n.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{n.title}</span>
                    <span className="text-[11px] text-slate-500">{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No extra notes added yet.</p>
          )}
        </div>
      )}

      {/* AI INTELLIGENCE TAB */}
      {activeTab === 'ai' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> AI Sales Intelligence Shell
          </h3>
          <p className="text-xs text-slate-400">
            AI automated lead scoring, call transcript analysis, and recommendation engines will bind to this lead context in future phases.
          </p>
        </div>
      )}

      {/* BEFORE CALL BRIEF MODAL */}
      <BeforeCallBriefModal
        isOpen={isBriefOpen}
        onClose={() => setIsBriefOpen(false)}
        lead={lead}
        onStartCallLogging={() => setIsCallLoggerOpen(true)}
      />

      {/* QUICK CALL LOGGER MODAL */}
      <QuickCallLoggerModal
        isOpen={isCallLoggerOpen}
        onClose={() => setIsCallLoggerOpen(false)}
        leadId={id}
        leadTitle={lead.title}
        contactName={lead.contact?.name}
        initialTemperature={lead.temperature}
        onSuccess={() => {
          fetchLeadDetails();
          setActiveTab('calls');
        }}
        onOpenWhatsApp={(cat) => {
          setQuickWhatsAppCategory(cat);
          setIsQuickWhatsAppOpen(true);
        }}
      />

      {/* QUICK WHATSAPP MODAL */}
      <QuickWhatsAppModal
        isOpen={isQuickWhatsAppOpen}
        onClose={() => setIsQuickWhatsAppOpen(false)}
        leadId={id}
        leadName={lead.contact?.name || lead.title}
        businessName={lead.business?.name}
        phone={lead.contact?.phone}
        initialCategory={quickWhatsAppCategory}
        onMessageLogged={() => {
          fetchLeadDetails();
          setActiveTab('whatsapp');
        }}
      />

      {/* OTHER ACTION MODAL DIALOGS */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                {actionModal === 'demo' && 'Schedule Demo'}
                {actionModal === 'followup' && 'Add Follow-up'}
                {actionModal === 'task' && 'Add Task'}
                {actionModal === 'note' && 'Add Note'}
                {actionModal === 'whatsapp' && 'Log WhatsApp Message'}
                {actionModal === 'edit' && 'Edit Lead Status'}
              </h3>
              <button
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="space-y-3 text-xs">
              {actionModal === 'demo' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={demoDate}
                      onChange={(e) => setDemoDate(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Demo Notes / Focus</label>
                    <textarea
                      rows={2}
                      value={demoNotes}
                      onChange={(e) => setDemoNotes(e.target.value)}
                      placeholder="Key features to present..."
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100"
                    />
                  </div>
                </>
              )}

              {actionModal === 'followup' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Follow-up Date & Time</label>
                    <input
                      type="datetime-local"
                      value={followupDate}
                      onChange={(e) => setFollowupDate(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Reminder Notes</label>
                    <textarea
                      rows={2}
                      value={followupNotes}
                      onChange={(e) => setFollowupNotes(e.target.value)}
                      placeholder="e.g. Call back regarding pricing proposal"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100"
                    />
                  </div>
                </>
              )}

              {actionModal === 'task' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Task Title</label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      required
                      placeholder="e.g. Send quotation proposal PDF"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Due Date</label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100"
                    />
                  </div>
                </>
              )}

              {actionModal === 'note' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Note Title</label>
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="e.g. Budget confirmation"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Content</label>
                    <textarea
                      rows={3}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      required
                      placeholder="Enter detailed notes..."
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100"
                    />
                  </div>
                </>
              )}

              {actionModal === 'whatsapp' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Message Content</label>
                    <textarea
                      rows={3}
                      value={waContent}
                      onChange={(e) => setWaContent(e.target.value)}
                      required
                      placeholder="Type WhatsApp message..."
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100"
                    />
                  </div>
                </>
              )}

              {actionModal === 'edit' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Lead Stage / Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100"
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="QUALIFIED">Qualified</option>
                      <option value="UNQUALIFIED">Unqualified</option>
                      <option value="PROPOSAL_SENT">Proposal Sent</option>
                      <option value="NEGOTIATION">Negotiation</option>
                      <option value="WON">Won</option>
                      <option value="LOST">Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Temperature</label>
                    <select
                      value={editTemperature}
                      onChange={(e) => setEditTemperature(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-100"
                    >
                      <option value="COLD">Cold</option>
                      <option value="WARM">Warm</option>
                      <option value="HOT">Hot</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TELL ME EVERYTHING DOSSIER DRAWER */}
      <TellMeEverythingDrawer
        isOpen={isTellMeEverythingOpen}
        onClose={() => setIsTellMeEverythingOpen(false)}
        leadId={id}
      />
    </div>
  );
};
