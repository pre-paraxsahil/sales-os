'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MessageSquare,
  Sparkles,
  Users,
  FileText,
  Clock,
  Send,
  Copy,
  ExternalLink,
  Check,
  AlertTriangle,
  Flame,
  Search,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Calendar,
  Building,
  Phone,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { WHATSAPP_CATEGORIES } from '@/lib/ai/schemas/whatsappSchema';
import { QuickWhatsAppModal } from './QuickWhatsAppModal';

type SubView = 'followups' | 'inbox' | 'writer' | 'templates' | 'campaigns';

export function WhatsAppClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTab = searchParams?.get('tab') as SubView | null;
  const [activeTab, setActiveTab] = useState<SubView>(
    queryTab && ['followups', 'inbox', 'writer', 'templates', 'campaigns'].includes(queryTab)
      ? queryTab
      : 'followups'
  );
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (queryTab && ['followups', 'inbox', 'writer', 'templates', 'campaigns'].includes(queryTab)) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  const switchTab = (tab: SubView) => {
    setActiveTab(tab);
    try {
      router.replace(`/whatsapp?tab=${tab}`);
    } catch {
      // safe fallback
    }
  };

  // Overview data
  const [stats, setStats] = useState<any>({
    totalSent: 0,
    totalDelivered: 0,
    totalReplies: 0,
    totalTemplates: 0,
    totalCampaigns: 0,
  });
  const [pendingFollowUps, setPendingFollowUps] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [leadsNeedingOutreach, setLeadsNeedingOutreach] = useState<any[]>([]);

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateCategory, setTemplateCategory] = useState<string>('ALL');
  const [showCreateTemplate, setShowCreateTemplate] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<string>('DAY_1_FOLLOWUP');
  const [newTemplateContent, setNewTemplateContent] = useState<string>('');

  // AI Writer
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [writerCategory, setWriterCategory] = useState<string>('DAY_1_FOLLOWUP');
  const [writerObjective, setWriterObjective] = useState<string>('');
  const [writerContent, setWriterContent] = useState<string>('');
  const [writerResult, setWriterResult] = useState<any>(null);
  const [loadingAIWriter, setLoadingAIWriter] = useState<boolean>(false);
  const [writerCopied, setWriterCopied] = useState<boolean>(false);

  // Campaign Planner
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [segmentIndustry, setSegmentIndustry] = useState<string>('ALL');
  const [segmentStatus, setSegmentStatus] = useState<string>('ALL');
  const [segmentTemp, setSegmentTemp] = useState<string>('ALL');
  const [minDaysSinceContact, setMinDaysSinceContact] = useState<string>('2');
  const [audiencePreview, setAudiencePreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [campaignName, setCampaignName] = useState<string>('');
  const [campaignObjective, setCampaignObjective] = useState<string>('Reactivation of cold/stalled prospects');
  const [campaignCategory, setCampaignCategory] = useState<string>('REACTIVATION');
  const [campaignMessage, setCampaignMessage] = useState<string>('');
  const [campaignCta, setCampaignCta] = useState<string>('Can I share a 1-minute video demo?');
  const [campaignTiming, setCampaignTiming] = useState<string>('Tomorrow 11:30 AM');
  const [campaignFollowUpPlan, setCampaignFollowUpPlan] = useState<string>('Send Day 2 follow-up if no reply within 48h');
  const [savingCampaign, setSavingCampaign] = useState<boolean>(false);

  // Quick Modal Target
  const [modalTargetLead, setModalTargetLead] = useState<{
    id: string;
    name: string;
    businessName?: string;
    phone?: string | null;
    category?: string;
  } | null>(null);

  useEffect(() => {
    loadOverview();
    loadTemplates();
    loadLeads();
    loadCampaigns();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/overview');
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data.stats);
        setPendingFollowUps(json.data.pendingFollowUps || []);
        setRecentMessages(json.data.recentMessages || []);
        setLeadsNeedingOutreach(json.data.leadsNeedingOutreach || []);
      }
    } catch (err) {
      console.error('Error loading overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/whatsapp/templates');
      const json = await res.json();
      if (json.success && json.data) {
        setTemplates(json.data);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const loadLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      const json = await res.json();
      if (json.success && json.data) {
        setLeadsList(json.data);
        if (json.data.length > 0 && !selectedLeadId) {
          setSelectedLeadId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading leads:', err);
    }
  };

  const loadCampaigns = async () => {
    try {
      const res = await fetch('/api/whatsapp/campaigns');
      const json = await res.json();
      if (json.success && json.data) {
        setCampaigns(json.data);
      }
    } catch (err) {
      console.error('Error loading campaigns:', err);
    }
  };

  // Run Campaign Audience Preview
  const runAudiencePreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch('/api/whatsapp/campaigns/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: segmentIndustry,
          status: segmentStatus,
          temperature: segmentTemp,
          minDaysSinceLastContact: minDaysSinceContact,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAudiencePreview(json.data);
      }
    } catch {
      alert('Error fetching audience preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // AI Writer generation
  const handleGenerateAIWriter = async () => {
    if (!selectedLeadId) return;
    setLoadingAIWriter(true);
    try {
      const res = await fetch('/api/ai/whatsapp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          category: writerCategory,
          customObjective: writerObjective.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setWriterContent(json.data.messageResult.message);
        setWriterResult(json.data);
      } else {
        alert(json.error || 'AI writing unavailable. You can draft manually.');
      }
    } catch {
      alert('Network error communicating with AI writer.');
    } finally {
      setLoadingAIWriter(false);
    }
  };

  // Save Campaign Plan
  const handleSaveCampaign = async () => {
    if (!campaignName.trim() || !campaignMessage.trim()) {
      alert('Campaign Name and Message Body are required.');
      return;
    }

    setSavingCampaign(true);
    try {
      const eligibleLeadIds = audiencePreview?.previewLeads
        ?.filter((p: any) => !p.isMissingPhone && !p.isRecentlyContacted)
        ?.map((p: any) => p.id) || [];

      const res = await fetch('/api/whatsapp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName.trim(),
          objective: campaignObjective,
          category: campaignCategory,
          messageBody: campaignMessage.trim(),
          cta: campaignCta,
          plannedTiming: campaignTiming,
          followUpPlan: campaignFollowUpPlan,
          segmentFilters: {
            industry: segmentIndustry,
            status: segmentStatus,
            temperature: segmentTemp,
            minDaysSinceContact,
          },
          leadIds: eligibleLeadIds,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert(`Campaign "${campaignName}" planned with ${json.data.totalRecipients} recipients.`);
        setCampaignName('');
        setCampaignMessage('');
        loadCampaigns();
      } else {
        alert(json.error || 'Failed to save campaign plan.');
      }
    } catch {
      alert('Network error saving campaign plan.');
    } finally {
      setSavingCampaign(false);
    }
  };

  // Create Template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      alert('Template Name and Content are required.');
      return;
    }

    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          category: newTemplateCategory,
          content: newTemplateContent.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateTemplate(false);
        setNewTemplateName('');
        setNewTemplateContent('');
        loadTemplates();
      } else {
        alert(json.error || 'Failed to create template.');
      }
    } catch {
      alert('Error creating template.');
    }
  };

  const selectedLead = leadsList.find((l) => l.id === selectedLeadId);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. TOP HEADER & METRICS BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20 shadow-sm">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                WhatsApp Sales Command Center
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  Build 08
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Contextual sales intelligence, follow-up decision engine & review-first dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
            <span className="text-[11px] text-slate-500 block">Outbound Sent</span>
            <span className="text-base font-extrabold text-slate-100">{stats.totalSent}</span>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
            <span className="text-[11px] text-slate-500 block">Prospect Replies</span>
            <span className="text-base font-extrabold text-emerald-400">{stats.totalReplies}</span>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
            <span className="text-[11px] text-slate-500 block">Active Templates</span>
            <span className="text-base font-extrabold text-indigo-400">{templates.length}</span>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
            <span className="text-[11px] text-slate-500 block">Planned Campaigns</span>
            <span className="text-base font-extrabold text-amber-400">{campaigns.length}</span>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          type="button"
          id="tab-btn-followups"
          onClick={() => switchTab('followups')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === 'followups'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          Follow-ups & Intelligence ({pendingFollowUps.length})
        </button>

        <button
          type="button"
          id="tab-btn-inbox"
          onClick={() => switchTab('inbox')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === 'inbox'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Inbox / History ({recentMessages.length})
        </button>

        <button
          type="button"
          id="tab-btn-writer"
          onClick={() => switchTab('writer')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === 'writer'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4 text-indigo-400" />
          AI Writer
        </button>

        <button
          type="button"
          id="tab-btn-templates"
          onClick={() => switchTab('templates')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === 'templates'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          Templates ({templates.length})
        </button>

        <button
          type="button"
          id="tab-btn-campaigns"
          onClick={() => {
            switchTab('campaigns');
            if (!audiencePreview) runAudiencePreview();
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === 'campaigns'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          Campaign Planner
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: FOLLOW-UPS & INTELLIGENCE */}
      {activeTab === 'followups' && (
        <div className="space-y-6">
          {/* Pending Follow-ups */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  Scheduled WhatsApp Follow-ups
                </h2>
                <p className="text-xs text-slate-400">
                  Follow-ups logged or scheduled from previous calls & demos.
                </p>
              </div>
              <button
                onClick={loadOverview}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>

            {pendingFollowUps.length > 0 ? (
              <div className="divide-y divide-slate-800/80">
                {pendingFollowUps.map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/leads/${f.leadId}`}
                          className="font-bold text-slate-200 hover:text-indigo-400 transition-colors"
                        >
                          {f.contactName}
                        </Link>
                        {f.businessName && (
                          <span className="text-slate-400">({f.businessName})</span>
                        )}
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                            f.temperature === 'HOT'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {f.temperature}
                        </span>
                        <span className="text-slate-500">Stage: {f.stage}</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{f.notes || 'WhatsApp follow-up'}</p>
                      <span className="text-[10px] text-slate-500">
                        Scheduled: {new Date(f.scheduledAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() =>
                          setModalTargetLead({
                            id: f.leadId,
                            name: f.contactName,
                            businessName: f.businessName,
                            phone: f.phone,
                            category: 'DAY_1_FOLLOWUP',
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-all"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Quick Follow-up
                      </button>
                      <Link
                        href={`/leads/${f.leadId}`}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-6 text-center text-xs text-slate-500">
                No scheduled WhatsApp follow-ups due right now.
              </div>
            )}
          </div>

          {/* Stalled Hot / Warm Leads */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-400" />
                Active Leads with No Message in 48+ Hours
              </h2>
              <p className="text-xs text-slate-400">
                Warm and Hot prospects at risk of stalling without follow-up touchpoint.
              </p>
            </div>

            {leadsNeedingOutreach.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leadsNeedingOutreach.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/leads/${l.id}`}
                          className="font-bold text-slate-200 hover:text-indigo-400"
                        >
                          {l.contactName}
                        </Link>
                        <span className="rounded bg-rose-500/10 text-rose-400 px-1.5 py-0.5 text-[10px] font-bold">
                          {l.temperature}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{l.businessName || 'Business'}</p>
                      {l.lastCallOutcome && (
                        <p className="text-slate-500 text-[10px] mt-1">
                          Last Call: {l.lastCallOutcome}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setModalTargetLead({
                          id: l.id,
                          name: l.contactName,
                          businessName: l.businessName,
                          phone: l.phone,
                          category: 'REACTIVATION',
                        })
                      }
                      className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 text-center flex items-center justify-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      Generate Outreach
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">All active leads are up to date on messaging.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INBOX / HISTORY */}
      {activeTab === 'inbox' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                Universal WhatsApp History Log
              </h2>
              <p className="text-xs text-slate-400">
                Audit trail of recent WhatsApp messages sent and logged across the sales pipeline.
              </p>
            </div>
            <span className="text-xs text-slate-500">{recentMessages.length} entries</span>
          </div>

          {recentMessages.length > 0 ? (
            <div className="space-y-3">
              {recentMessages.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 font-bold ${
                          m.direction === 'OUTBOUND'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {m.direction}
                      </span>
                      {m.leadId ? (
                        <Link
                          href={`/leads/${m.leadId}`}
                          className="font-bold text-slate-200 hover:text-indigo-400"
                        >
                          {m.contactName} {m.businessName ? `(${m.businessName})` : ''}
                        </Link>
                      ) : (
                        <span className="font-bold text-slate-200">{m.contactName}</span>
                      )}
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-400">
                        {m.category?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-500">{m.phone}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                      <span>{new Date(m.sentAt).toLocaleString()}</span>
                      <span className="rounded border border-slate-800 px-1.5 py-0.5 text-slate-400">
                        {m.status}
                      </span>
                      {m.responseStatus && (
                        <span
                          className={`font-semibold ${
                            m.responseStatus === 'REPLIED'
                              ? 'text-emerald-400'
                              : m.responseStatus === 'NO_RESPONSE'
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          Status: {m.responseStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-200 pl-2 border-l-2 border-slate-800 leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No WhatsApp messages logged in the system yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AI WRITER */}
      {activeTab === 'writer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Lead Context & Configuration */}
          <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              AI Writer Setup
            </h2>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Select Target Lead</label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                {leadsList.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.contact?.name || l.title} — {l.business?.name || 'Business'} ({l.temperature})
                  </option>
                ))}
              </select>
            </div>

            {selectedLead && (
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2 text-[11px] text-slate-400">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span>{selectedLead.contact?.name || selectedLead.title}</span>
                  <span className="text-indigo-400">{selectedLead.status}</span>
                </div>
                <p>Phone: {selectedLead.contact?.phone || 'No phone recorded'}</p>
                <p>Industry: {selectedLead.business?.industry || 'Commerce'}</p>
                <p>Temperature: {selectedLead.temperature}</p>
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Message Category</label>
              <select
                value={writerCategory}
                onChange={(e) => setWriterCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                {WHATSAPP_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Custom Angle / Objective</label>
              <input
                type="text"
                value={writerObjective}
                onChange={(e) => setWriterObjective(e.target.value)}
                placeholder="e.g. Reference their order leak pain point"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleGenerateAIWriter}
              disabled={loadingAIWriter || !selectedLeadId}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 font-bold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-50 transition-all"
            >
              {loadingAIWriter ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Personalized Message
            </button>
          </div>

          {/* Right: Output & Controls */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-100">AI Generated Sales Message</h2>
                <p className="text-xs text-slate-400">
                  Strictly follows HOOK + CONTEXT + VALUE + CTA with confirmed context.
                </p>
              </div>
              <span className="text-xs text-slate-500">{writerContent.length} chars</span>
            </div>

            <textarea
              rows={6}
              value={writerContent}
              onChange={(e) => setWriterContent(e.target.value)}
              placeholder="Click 'Generate Personalized Message' to build message with Customer Memory..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none leading-relaxed"
            />

            {writerResult && (
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">
                    Recommended Timing: {writerResult.messageResult?.recommendedTiming}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Confidence: {Math.round((writerResult.messageResult?.confidence || 0.8) * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Strategy:</span>{' '}
                  {writerResult.messageResult?.reasoning}
                </p>

                {writerResult.frequencyProtection?.warning && (
                  <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-amber-300 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{writerResult.frequencyProtection.warning}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!writerContent) return;
                    await navigator.clipboard.writeText(writerContent);
                    setWriterCopied(true);
                    setTimeout(() => setWriterCopied(false), 2000);
                  }}
                  disabled={!writerContent}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                >
                  {writerCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {writerCopied ? 'Copied' : 'Copy'}
                </button>

                <button
                  onClick={() => {
                    if (!writerContent || !selectedLead) return;
                    const cleanPhone = (selectedLead.contact?.phone || '').replace(/[^0-9]/g, '');
                    const url = cleanPhone
                      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(writerContent)}`
                      : `https://web.whatsapp.com/send?text=${encodeURIComponent(writerContent)}`;
                    window.open(url, '_blank');
                  }}
                  disabled={!writerContent}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/20 disabled:opacity-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open WhatsApp
                </button>
              </div>

              <button
                onClick={async () => {
                  if (!writerContent || !selectedLeadId) return;
                  const res = await fetch(`/api/leads/${selectedLeadId}/whatsapp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      content: writerContent,
                      direction: 'OUTBOUND',
                      category: writerCategory,
                    }),
                  });
                  const json = await res.json();
                  if (json.success) {
                    alert('Message logged and activity saved successfully!');
                    loadOverview();
                  } else {
                    alert(json.error || 'Failed to log message.');
                  }
                }}
                disabled={!writerContent}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Mark Sent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Filter Category:</span>
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {WHATSAPP_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowCreateTemplate(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-500 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates
              .filter((t) => templateCategory === 'ALL' || t.category === templateCategory)
              .map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-200">{t.name}</h3>
                      <span className="rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      {t.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                    <span className="text-slate-500">
                      Vars: {t.variables ? JSON.parse(t.variables).join(', ') : 'None'}
                    </span>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(t.content);
                        alert('Template text copied to clipboard!');
                      }}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Create Template Modal */}
          {showCreateTemplate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4 shadow-2xl text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-slate-100">Create Sales Template</h3>
                  <button onClick={() => setShowCreateTemplate(false)} className="text-slate-400">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateTemplate} className="space-y-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Template Name</label>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g. Retail Order Leak Follow-up"
                      required
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Category</label>
                    <select
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      {WHATSAPP_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Template Content
                      <span className="text-[11px] text-slate-500 ml-1">
                        (Variables: &#123;&#123;customer_name&#125;&#125;, &#123;&#123;business_name&#125;&#125;, &#123;&#123;industry&#125;&#125;)
                      </span>
                    </label>
                    <textarea
                      rows={4}
                      value={newTemplateContent}
                      onChange={(e) => setNewTemplateContent(e.target.value)}
                      placeholder="Hi {{customer_name}}, just following up..."
                      required
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateTemplate(false)}
                      className="rounded-lg px-3 py-1.5 text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-indigo-600 px-4 py-1.5 font-bold text-white hover:bg-indigo-500"
                    >
                      Save Template
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CAMPAIGN PLANNER */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audience Filter & Safety Preview */}
          <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Users className="h-4 w-4 text-emerald-400" />
              Audience Filter & Safety
            </h2>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Pipeline Stage</label>
              <select
                value={segmentStatus}
                onChange={(e) => setSegmentStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200"
              >
                <option value="ALL">All Stages</option>
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
                <option value="NEGOTIATION">NEGOTIATION</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Temperature</label>
              <select
                value={segmentTemp}
                onChange={(e) => setSegmentTemp(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200"
              >
                <option value="ALL">All Temperatures</option>
                <option value="HOT">HOT</option>
                <option value="WARM">WARM</option>
                <option value="COLD">COLD</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Min Days Since Last Contact
              </label>
              <input
                type="number"
                min="0"
                value={minDaysSinceContact}
                onChange={(e) => setMinDaysSinceContact(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200"
              />
            </div>

            <button
              onClick={runAudiencePreview}
              disabled={loadingPreview}
              className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 font-bold text-emerald-400 hover:bg-emerald-500/20 text-center flex items-center justify-center gap-1.5 transition-all"
            >
              {loadingPreview ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              Recalculate Safe Audience
            </button>

            {audiencePreview && (
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Matched in Database:</span>
                  <span className="font-bold text-slate-200">{audiencePreview.totalMatched}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Eligible (Safe to Contact):</span>
                  <span className="font-bold text-emerald-400">{audiencePreview.eligibleCount}</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Recently Contacted (&lt;24h):</span>
                  <span>{audiencePreview.safetySummary.recentlyContactedCount}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Missing Phone Number:</span>
                  <span>{audiencePreview.safetySummary.missingPhoneCount}</span>
                </div>

                {audiencePreview.safetySummary.warning && (
                  <p className="text-amber-400/90 pt-1 border-t border-slate-800">
                    {audiencePreview.safetySummary.warning}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Campaign Copy & Strategy */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              Campaign Plan & Message Strategy
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Q3 Retail Reactivation Blitz"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Sales Objective</label>
                <input
                  type="text"
                  value={campaignObjective}
                  onChange={(e) => setCampaignObjective(e.target.value)}
                  placeholder="e.g. Reconnect with cold leads with WhatsApp catalogue feature"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Campaign Message Body (Concise Hook + Value)
              </label>
              <textarea
                rows={4}
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                placeholder="Hi {{customer_name}}, checking in to see if automating orders for {{business_name}} is still top of mind..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-200 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Call to Action (CTA)</label>
                <input
                  type="text"
                  value={campaignCta}
                  onChange={(e) => setCampaignCta(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Planned Timing</label>
                <input
                  type="text"
                  value={campaignTiming}
                  onChange={(e) => setCampaignTiming(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Follow-up Strategy</label>
                <input
                  type="text"
                  value={campaignFollowUpPlan}
                  onChange={(e) => setCampaignFollowUpPlan(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-200"
                />
              </div>
            </div>

            {/* Campaign Safety Reminder */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300">V1 Safety Principle:</span>
              <p>
                Campaigns are saved as structured plans with attached audience records. No automated
                background blasting is permitted. You can review each prospect individually before
                dispatching.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={handleSaveCampaign}
                disabled={savingCampaign || !campaignName.trim() || !campaignMessage.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white shadow hover:bg-emerald-500 disabled:opacity-50 transition-all"
              >
                {savingCampaign ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save Campaign Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK MODAL LAUNCHER */}
      {modalTargetLead && (
        <QuickWhatsAppModal
          isOpen={!!modalTargetLead}
          onClose={() => setModalTargetLead(null)}
          leadId={modalTargetLead.id}
          leadName={modalTargetLead.name}
          businessName={modalTargetLead.businessName}
          phone={modalTargetLead.phone}
          initialCategory={modalTargetLead.category || 'DAY_1_FOLLOWUP'}
          onMessageLogged={() => {
            loadOverview();
          }}
        />
      )}
    </div>
  );
}
