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
  BookmarkPlus,
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

  function buildPersonalizedDraft(lead: any, category: string, customNote?: string): string {
    if (!lead) return '';
    const contactName = lead.contact?.name || lead.title || 'there';
    const businessName = lead.business?.name || lead.title || '';

    const bizRef = businessName ? ` regarding ${businessName}` : '';
    const noteRef = customNote ? ` Specifically, ${customNote}.` : '';

    switch (category) {
      case 'NO_ANSWER':
        return `Hi ${contactName}, I tried calling you earlier${bizRef}. Please let me know when you are free for a brief 2-minute conversation.${noteRef}`;
      case 'DEMO_REMINDER':
        return `Hi ${contactName}, look forward to our product demo session today${bizRef}. I will walk you through how we can solve your sales tracking and workflow needs.${noteRef} See you soon!`;
      case 'POST_DEMO_RECAP':
        return `Hi ${contactName}, thank you for your time on the demo today${bizRef}. As discussed, here are the key highlights and next steps.${noteRef} Let me know if you would like me to share the custom proposal.`;
      case 'PRICE_OBJECTION':
        return `Hi ${contactName}, following up on the quotation sent for ${businessName || 'your business'}. We can customize the plan to best match your current budget and requirements.${noteRef} What time works today to finalize?`;
      case 'CLOSING_PUSH':
        return `Hi ${contactName}, we are ready to activate your Sales OS workspace for ${businessName || 'your team'}. Let me know if we can complete the onboarding steps today.${noteRef}`;
      case 'REACTIVATION':
        return `Hi ${contactName}, checking in on ${businessName || 'your business operations'}. We have introduced new features that streamline daily outreach and pipeline visibility.${noteRef} Would you be open to a 5-minute update?`;
      case 'DAY_1_FOLLOWUP':
      default:
        if (lead.temperature === 'HOT') {
          return `Hi ${contactName}, following up on our recent discussion${bizRef}. I have prepared the tailored solution we discussed.${noteRef} Let me know when is a good time to connect today.`;
        }
        return `Hi ${contactName}, hope you are having a productive week. Following up on our discussion${bizRef}.${noteRef} Would you have 5 minutes today for a quick chat?`;
    }
  }

  const loadLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      const json = await res.json();
      if (json.success && json.data) {
        setLeadsList(json.data);
        if (json.data.length > 0 && !selectedLeadId) {
          const firstLead = json.data[0];
          setSelectedLeadId(firstLead.id);
          setWriterContent(buildPersonalizedDraft(firstLead, writerCategory, writerObjective));
        }
      }
    } catch (err) {
      console.error('Error loading leads:', err);
    }
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const targetLead = leadsList.find((l) => l.id === leadId);
    if (targetLead) {
      setWriterContent(buildPersonalizedDraft(targetLead, writerCategory, writerObjective));
    }
  };

  const handleCategoryChange = (newCat: string) => {
    setWriterCategory(newCat);
    const targetLead = leadsList.find((l) => l.id === selectedLeadId);
    if (targetLead) {
      setWriterContent(buildPersonalizedDraft(targetLead, newCat, writerObjective));
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
      const eligibleLeadIds =
        audiencePreview?.previewLeads
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
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-emerald-600" />
            WhatsApp Sales Assistant
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Send instant follow-ups, personalized AI messages, and campaign templates to your leads.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Messages Sent</span>
            <span className="text-lg font-bold text-slate-900">{stats.totalSent}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Replies Received</span>
            <span className="text-lg font-bold text-emerald-600">{stats.totalReplies}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Saved Templates</span>
            <span className="text-lg font-bold text-indigo-600">{templates.length}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Planned Campaigns</span>
            <span className="text-lg font-bold text-amber-600">{campaigns.length}</span>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 text-xs font-semibold overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => switchTab('followups')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
            activeTab === 'followups'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="h-4 w-4 text-emerald-600" />
          Follow-up Queue ({pendingFollowUps.length})
        </button>

        <button
          type="button"
          onClick={() => switchTab('writer')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
            activeTab === 'writer'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="h-4 w-4 text-indigo-600" />
          AI Message Writer
        </button>

        <button
          type="button"
          onClick={() => switchTab('templates')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
            activeTab === 'templates'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="h-4 w-4 text-slate-600" />
          Message Templates ({templates.length})
        </button>

        <button
          type="button"
          onClick={() => switchTab('inbox')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
            activeTab === 'inbox'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="h-4 w-4 text-slate-600" />
          Message History ({recentMessages.length})
        </button>

        <button
          type="button"
          onClick={() => {
            switchTab('campaigns');
            if (!audiencePreview) runAudiencePreview();
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
            activeTab === 'campaigns'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4 text-slate-600" />
          Campaigns
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: FOLLOW-UPS */}
      {activeTab === 'followups' && (
        <div className="space-y-6">
          {/* Pending Follow-ups */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  Scheduled WhatsApp Follow-ups
                </h2>
                <p className="text-xs text-slate-500">
                  Follow-ups logged or scheduled from previous calls & demos.
                </p>
              </div>
              <button
                onClick={loadOverview}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>

            {pendingFollowUps.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {pendingFollowUps.map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/leads/${f.leadId}`}
                          className="font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                        >
                          {f.contactName}
                        </Link>
                        {f.businessName && (
                          <span className="text-slate-500 font-medium">({f.businessName})</span>
                        )}
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                            f.temperature === 'HOT'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {f.temperature}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{f.notes || 'WhatsApp follow-up'}</p>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Due: {new Date(f.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
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
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Send WhatsApp
                      </button>
                      <Link
                        href={`/leads/${f.leadId}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Open Lead
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-6 text-center text-xs text-slate-500 font-medium">
                No scheduled WhatsApp follow-ups due right now.
              </div>
            )}
          </div>

          {/* Warm & Hot Leads needing outreach */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-600" />
                Active Leads with No Message in 48+ Hours
              </h2>
              <p className="text-xs text-slate-500">
                Warm and Hot prospects that need a follow-up touchpoint.
              </p>
            </div>

            {leadsNeedingOutreach.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leadsNeedingOutreach.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/leads/${l.id}`}
                          className="font-bold text-slate-900 hover:text-indigo-600"
                        >
                          {l.contactName}
                        </Link>
                        <span className="rounded bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold">
                          {l.temperature}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] font-medium">{l.businessName || 'Business'}</p>
                      {l.lastCallOutcome && (
                        <p className="text-slate-600 text-[10px] mt-1">
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
                      className="w-full rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 text-center flex items-center justify-center gap-1 transition"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Write WhatsApp Message
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium">All active leads are up to date on messaging.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI WRITER */}
      {activeTab === 'writer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Setup */}
          <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-5 space-y-4 text-xs shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              WHATSAPP SALES
            </h2>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Who do you want to message?
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => handleSelectLead(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 font-medium focus:border-indigo-500 focus:outline-none"
              >
                {leadsList.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.contact?.name || l.title} — {l.business?.name || 'Business'} ({l.temperature})
                  </option>
                ))}
              </select>
            </div>

            {selectedLead && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center justify-between text-slate-900 font-bold">
                  <span>{selectedLead.contact?.name || selectedLead.title}</span>
                  <span className="text-indigo-600 font-semibold">{selectedLead.status}</span>
                </div>
                <p>Phone: <span className="font-mono font-semibold text-slate-800">{selectedLead.contact?.phone || 'No phone'}</span></p>
                <p>Industry: <span className="font-medium text-slate-800">{selectedLead.business?.industry || 'Commerce'}</span></p>
                <p className="text-indigo-700 font-semibold pt-1 border-t border-slate-200">
                  Customer Context: {selectedLead.notes || 'Interested in solution'}
                </p>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Why are you messaging?</label>
              <select
                value={writerCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 font-medium focus:border-emerald-500 focus:outline-none"
              >
                <option value="DAY_1_FOLLOWUP">Follow-up</option>
                <option value="DEMO_REMINDER">Demo reminder</option>
                <option value="POST_DEMO_RECAP">Asked for details</option>
                <option value="PRICE_OBJECTION">Pricing / Quotation</option>
                <option value="NO_ANSWER">No answer / Switched off</option>
                <option value="REACTIVATION">Reactivation</option>
                <option value="CLOSING_PUSH">Closing Deal</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Custom Note (Optional)</label>
              <input
                type="text"
                value={writerObjective}
                onChange={(e) => setWriterObjective(e.target.value)}
                placeholder="e.g. Reference retail order management"
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleGenerateAIWriter}
              disabled={loadingAIWriter || !selectedLeadId}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {loadingAIWriter ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Write Message with AI
            </button>
          </div>

          {/* Right: Output */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Suggested WhatsApp Message</h2>
                <p className="text-xs text-slate-500">
                  Editable message crafted for this customer.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">{writerContent.length} chars</span>
            </div>

            <textarea
              rows={6}
              value={writerContent}
              onChange={(e) => setWriterContent(e.target.value)}
              placeholder="Click 'Write Message with AI' or type your message here..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none leading-relaxed font-medium"
            />

            {writerResult && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Recommended Timing: {writerResult.messageResult?.recommendedTiming}
                  </span>
                  <span className="text-emerald-700 font-bold">
                    Confidence: {Math.round((writerResult.messageResult?.confidence || 0.8) * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Strategy:</span>{' '}
                  {writerResult.messageResult?.reasoning}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!writerContent) return;
                    await navigator.clipboard.writeText(writerContent);
                    setWriterCopied(true);
                    setTimeout(() => setWriterCopied(false), 2000);
                  }}
                  disabled={!writerContent}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-xs"
                >
                  {writerCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open WhatsApp
                </button>

                <button
                  onClick={() => {
                    if (!writerContent) return;
                    setNewTemplateContent(writerContent);
                    setNewTemplateName(`Template: ${writerCategory}`);
                    setShowCreateTemplate(true);
                  }}
                  disabled={!writerContent}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-xs"
                >
                  <BookmarkPlus className="h-3.5 w-3.5 text-indigo-600" />
                  Save as Template
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
                    alert('Message logged and customer memory updated!');
                    loadOverview();
                  } else {
                    alert(json.error || 'Failed to log message.');
                  }
                }}
                disabled={!writerContent}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Mark Sent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">Category:</span>
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 font-medium focus:border-indigo-500 focus:outline-none"
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
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all"
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
                  className="rounded-xl border border-slate-200 bg-white p-4 text-xs space-y-2 flex flex-col justify-between shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900">{t.name}</h3>
                      <span className="rounded bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-bold">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                      {t.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500 font-mono text-[10px]">
                      {t.variables ? JSON.parse(t.variables).join(', ') : 'No variables'}
                    </span>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(t.content);
                        alert('Template text copied!');
                      }}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-bold"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Create Template Modal */}
          {showCreateTemplate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xl text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Create Sales Template</h3>
                  <button onClick={() => setShowCreateTemplate(false)} className="text-slate-400 hover:text-slate-700">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateTemplate} className="space-y-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Template Name</label>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g. Retail Order Leak Follow-up"
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Category</label>
                    <select
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 focus:border-indigo-500 focus:outline-none"
                    >
                      {WHATSAPP_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Template Content
                      <span className="text-[11px] text-slate-500 ml-1 font-normal">
                        (Variables: &#123;&#123;customer_name&#125;&#125;, &#123;&#123;business_name&#125;&#125;)
                      </span>
                    </label>
                    <textarea
                      rows={4}
                      value={newTemplateContent}
                      onChange={(e) => setNewTemplateContent(e.target.value)}
                      placeholder="Hi {{customer_name}}, just following up..."
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowCreateTemplate(false)}
                      className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-indigo-600 px-4 py-1.5 font-bold text-white hover:bg-indigo-700"
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

      {/* TAB 4: INBOX / HISTORY */}
      {activeTab === 'inbox' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                WhatsApp Message History
              </h2>
              <p className="text-xs text-slate-500">
                Log of WhatsApp messages sent and recorded across the sales pipeline.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{recentMessages.length} entries</span>
          </div>

          {recentMessages.length > 0 ? (
            <div className="space-y-3">
              {recentMessages.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 font-bold ${
                          m.direction === 'OUTBOUND'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {m.direction}
                      </span>
                      {m.leadId ? (
                        <Link
                          href={`/leads/${m.leadId}`}
                          className="font-bold text-slate-900 hover:text-indigo-600"
                        >
                          {m.contactName} {m.businessName ? `(${m.businessName})` : ''}
                        </Link>
                      ) : (
                        <span className="font-bold text-slate-900">{m.contactName}</span>
                      )}
                      <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-slate-600 font-medium">
                        {m.category?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <span className="text-slate-500 text-[10px]">
                      {new Date(m.sentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <p className="text-slate-800 pl-2 border-l-2 border-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                    {m.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">
              No WhatsApp messages logged in the system yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-5 space-y-4 text-xs shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Audience Filter & Safety
            </h2>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Pipeline Stage</label>
              <select
                value={segmentStatus}
                onChange={(e) => setSegmentStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 font-medium"
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
              <label className="block text-slate-700 font-bold mb-1">Temperature</label>
              <select
                value={segmentTemp}
                onChange={(e) => setSegmentTemp(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 font-medium"
              >
                <option value="ALL">All Temperatures</option>
                <option value="HOT">HOT</option>
                <option value="WARM">WARM</option>
                <option value="COLD">COLD</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Min Days Since Last Contact
              </label>
              <input
                type="number"
                min="0"
                value={minDaysSinceContact}
                onChange={(e) => setMinDaysSinceContact(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 font-medium"
              />
            </div>

            <button
              onClick={runAudiencePreview}
              disabled={loadingPreview}
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 py-2 font-bold text-emerald-700 hover:bg-emerald-100 text-center flex items-center justify-center gap-1.5 transition-all"
            >
              {loadingPreview ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              Recalculate Safe Audience
            </button>

            {audiencePreview && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">Matched in Database:</span>
                  <span className="font-bold text-slate-900">{audiencePreview.totalMatched}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Eligible (Safe to Contact):</span>
                  <span className="font-bold text-emerald-700">{audiencePreview.eligibleCount}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Recently Contacted (&lt;24h):</span>
                  <span className="font-bold">{audiencePreview.safetySummary.recentlyContactedCount}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Missing Phone Number:</span>
                  <span className="font-bold">{audiencePreview.safetySummary.missingPhoneCount}</span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 space-y-4 text-xs shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              Campaign Plan & Message Strategy
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Q3 Retail Reactivation Blitz"
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Sales Objective</label>
                <input
                  type="text"
                  value={campaignObjective}
                  onChange={(e) => setCampaignObjective(e.target.value)}
                  placeholder="e.g. Reconnect with cold leads"
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Campaign Message Body (Concise Hook + Value)
              </label>
              <textarea
                rows={4}
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                placeholder="Hi {{customer_name}}, checking in to see if automating orders for {{business_name}} is still top of mind..."
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 leading-relaxed font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Call to Action (CTA)</label>
                <input
                  type="text"
                  value={campaignCta}
                  onChange={(e) => setCampaignCta(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Planned Timing</label>
                <input
                  type="text"
                  value={campaignTiming}
                  onChange={(e) => setCampaignTiming(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Follow-up Strategy</label>
                <input
                  type="text"
                  value={campaignFollowUpPlan}
                  onChange={(e) => setCampaignFollowUpPlan(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={handleSaveCampaign}
                disabled={savingCampaign || !campaignName.trim() || !campaignMessage.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all"
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
