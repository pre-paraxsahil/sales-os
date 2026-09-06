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
  Building,
  User,
  Flame,
  Sparkles,
  Tag,
  AlertCircle,
  Loader2,
  DollarSign,
  ChevronRight,
  CheckCircle2,
  MapPin,
  Trash2,
  AlertTriangle,
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
import { OneComProBrainModal } from '@/components/knowledge/OneComProBrainModal';

interface LeadProfileClientProps {
  id: string;
}

export const LeadProfileClient: React.FC<LeadProfileClientProps> = ({ id }) => {
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'memory' | 'timeline' | 'calls' | 'demos' | 'whatsapp' | 'notes' | 'ai'
  >('overview');

  // Intelligence & Dossier Drawer
  const [isTellMeEverythingOpen, setIsTellMeEverythingOpen] = useState(false);
  const [isSalesBrainOpen, setIsSalesBrainOpen] = useState(false);

  // Call Modals
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [isCallLoggerOpen, setIsCallLoggerOpen] = useState(false);
  const [isQuickWhatsAppOpen, setIsQuickWhatsAppOpen] = useState(false);
  const [quickWhatsAppCategory, setQuickWhatsAppCategory] = useState<string>('DAY_1_FOLLOWUP');

  // Other Quick Action Modal States
  const [actionModal, setActionModal] = useState<
    'whatsapp' | 'demo' | 'followup' | 'task' | 'note' | 'edit' | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Delete / Archive Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

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

  const handleDeleteLead = async () => {
    setIsDeletingLead(true);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setIsDeleteModalOpen(false);
        router.push('/leads');
      } else {
        alert(json.error || 'Failed to archive lead.');
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
      alert('Network error deleting lead.');
    } finally {
      setIsDeletingLead(false);
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
      <div className="space-y-4 animate-pulse">
        <div className="h-32 w-full rounded-2xl bg-white border border-slate-200" />
        <div className="h-12 w-full rounded-xl bg-white border border-slate-200" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 rounded-2xl bg-white border border-slate-200 col-span-2" />
          <div className="h-64 rounded-2xl bg-white border border-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-xs">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600 mb-2" />
        <h3 className="text-sm font-bold text-slate-900">{error || 'Lead not found.'}</h3>
        <Link
          href="/leads"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Leads
        </Link>
      </div>
    );
  }

  const tempBadge = {
    HOT: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    WARM: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
    COLD: 'bg-slate-100 text-slate-600 border-slate-200 font-medium',
  }[lead.temperature as 'HOT' | 'WARM' | 'COLD'] || 'bg-slate-100 text-slate-600';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'memory', label: `What I Know (${lead.memories?.length || 0})` },
    { id: 'timeline', label: 'Activity History' },
    { id: 'calls', label: `Calls (${lead.calls?.length || 0})` },
    { id: 'demos', label: `Demos (${lead.demos?.length || 0})` },
    { id: 'whatsapp', label: `WhatsApp (${lead.whatsAppMsgs?.length || 0})` },
    { id: 'notes', label: `Notes (${lead.notesList?.length || 0})` },
    { id: 'ai', label: 'AI Intelligence' },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pipeline
        </Link>

        {/* Lead Quick Status Badges */}
        <div className="flex items-center gap-2">
          <span className={cn('rounded-md border px-2.5 py-0.5 text-xs', tempBadge)}>
            <Flame className="inline h-3.5 w-3.5 mr-1" />
            {lead.temperature}
          </span>
          <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
            Stage: {lead.status}
          </span>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
            title="Archive / Delete Lead"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 1. SALES-FIRST MASTER SUMMARY CARD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-slate-900">{lead.title}</h1>
                {lead.estimatedValue && (
                  <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                    ₹{Number(lead.estimatedValue).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-3 mt-1 flex-wrap">
                {lead.contact?.name && (
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    {lead.contact.name}
                  </span>
                )}
                {lead.contact?.phone && (
                  <span className="font-mono font-bold text-indigo-700 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {lead.contact.phone}
                  </span>
                )}
                {lead.business?.city && (
                  <span className="font-medium text-slate-600 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {lead.business.city}
                  </span>
                )}
                <span>Source: {lead.source || 'Outreach'}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsBriefOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 active:scale-95 transition"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>CALL NOW</span>
            </button>

            <button
              onClick={() => setIsTellMeEverythingOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 active:scale-95 transition shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>TELL ME EVERYTHING</span>
            </button>

            <button
              onClick={() => setIsSalesBrainOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-800 hover:bg-purple-100 active:scale-95 transition shadow-xs"
              title="OneComPro Product Advisor & Objection Battlecards"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span>Product Advisor</span>
            </button>

            <button
              onClick={() => setIsCallLoggerOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>Log Call</span>
            </button>

            <button
              onClick={() => setIsQuickWhatsAppOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => setActionModal('demo')}
              className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800 hover:bg-violet-100 transition"
            >
              <Video className="h-3.5 w-3.5 text-violet-600" />
              <span>Schedule Demo</span>
            </button>
          </div>
        </div>

        {/* What Happened & Next Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              What Happened Recently?
            </span>
            <p className="text-slate-800 font-medium leading-relaxed">
              {lead.notes || 'Prospect added to pipeline. Ready for discovery calling and qualification.'}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Next Action Scheduled
            </span>
            {lead.nextActionDate ? (
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>
                  Due on {new Date(lead.nextActionDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ) : (
              <span className="text-slate-500">No upcoming action set. Click &quot;Add Follow-up&quot; to schedule.</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-1 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Display */}
      <div className="mt-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <CustomerMemoryTab leadId={id} />
              <CompleteTimelineTab leadId={id} />
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs text-xs">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Lead Details & Stage
                </h3>
                <div className="space-y-2 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stage:</span>
                    <strong className="text-slate-900">{lead.status}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Temperature:</span>
                    <strong className="text-slate-900">{lead.temperature}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Deal Value:</span>
                    <strong className="font-mono text-emerald-700">₹{lead.estimatedValue || '0'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created:</span>
                    <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => handleStatusUpdate('WON')}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition text-center"
                  >
                    Mark WON
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('LOST')}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 font-bold text-xs transition text-center"
                  >
                    Mark Lost
                  </button>
                </div>
              </div>

              <DemoListAndCockpit
                leadId={id}
                leadName={lead.contact?.name || lead.title}
                businessName={lead.business?.name || lead.title}
              />
            </div>
          </div>
        )}

        {activeTab === 'memory' && <CustomerMemoryTab leadId={id} />}
        {activeTab === 'timeline' && <CompleteTimelineTab leadId={id} />}
        {activeTab === 'calls' && <CallHistoryTab leadId={id} onOpenLogCall={() => setIsCallLoggerOpen(true)} />}
        {activeTab === 'demos' && (
          <DemoListAndCockpit
            leadId={id}
            leadName={lead.contact?.name || lead.title}
            businessName={lead.business?.name || lead.title}
          />
        )}
        {activeTab === 'whatsapp' && <LeadWhatsAppTab leadId={id} lead={lead} onRefreshNeeded={fetchLeadDetails} />}
      </div>

      {/* Modals & Drawers */}
      <TellMeEverythingDrawer
        leadId={id}
        isOpen={isTellMeEverythingOpen}
        onClose={() => setIsTellMeEverythingOpen(false)}
      />

      {isBriefOpen && (
        <BeforeCallBriefModal
          lead={lead}
          isOpen={isBriefOpen}
          onClose={() => setIsBriefOpen(false)}
          onStartCallLogging={() => {
            setIsBriefOpen(false);
            setIsCallLoggerOpen(true);
          }}
        />
      )}

      {isCallLoggerOpen && (
        <QuickCallLoggerModal
          leadId={id}
          leadTitle={lead.title}
          contactName={lead.contact?.name}
          contactPhone={lead.contact?.phone}
          initialTemperature={lead.temperature}
          isOpen={isCallLoggerOpen}
          onClose={() => {
            setIsCallLoggerOpen(false);
            fetchLeadDetails();
          }}
          onSuccess={() => {
            setIsCallLoggerOpen(false);
            fetchLeadDetails();
          }}
          onOpenWhatsApp={(cat) => {
            setIsCallLoggerOpen(false);
            setQuickWhatsAppCategory(cat);
            setIsQuickWhatsAppOpen(true);
          }}
        />
      )}

      {isQuickWhatsAppOpen && (
        <QuickWhatsAppModal
          leadId={id}
          initialCategory={quickWhatsAppCategory}
          isOpen={isQuickWhatsAppOpen}
          onClose={() => setIsQuickWhatsAppOpen(false)}
        />
      )}

      {/* Action Modal (Schedule Demo / Followup / Task) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900 capitalize">
              {actionModal === 'demo' ? 'Schedule Product Demo' : actionModal === 'followup' ? 'Add Follow-up' : 'Add Task'}
            </h3>

            <form onSubmit={handleActionSubmit} className="space-y-3">
              {actionModal === 'demo' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={demoDate}
                      onChange={(e) => setDemoDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 p-2 text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      value={demoNotes}
                      onChange={(e) => setDemoNotes(e.target.value)}
                      placeholder="Demo objectives..."
                      className="w-full rounded-lg border border-slate-200 p-2 text-slate-900"
                    />
                  </div>
                </>
              )}

              {actionModal === 'followup' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Follow-up Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={followupDate}
                      onChange={(e) => setFollowupDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 p-2 text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      value={followupNotes}
                      onChange={(e) => setFollowupNotes(e.target.value)}
                      placeholder="Follow-up context..."
                      className="w-full rounded-lg border border-slate-200 p-2 text-slate-900"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {actionLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-200 bg-white p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Archive / Delete Lead</h3>
                <p className="text-xs text-slate-500">Soft delete with full history preservation</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Are you sure you want to archive <strong>{lead.title}</strong>?
              <br />
              <span className="text-slate-500 text-[11px] block mt-1">
                All associated calls, customer memory, and sales audit history will remain safely preserved in reports.
              </span>
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingLead}
                onClick={handleDeleteLead}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {isDeletingLead ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Confirm Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OneComPro AI Sales Brain Modal */}
      <OneComProBrainModal
        isOpen={isSalesBrainOpen}
        onClose={() => setIsSalesBrainOpen(false)}
        initialIndustry={lead.business?.industry || ''}
      />
    </div>
  );
};
