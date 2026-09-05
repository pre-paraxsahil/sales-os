'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  Copy,
  ExternalLink,
  Check,
  AlertTriangle,
  Clock,
  RefreshCw,
  PhoneCall,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { WHATSAPP_CATEGORIES } from '@/lib/ai/schemas/whatsappSchema';
import { interpolateTemplate } from '@/lib/whatsapp/templateService';

interface LeadWhatsAppTabProps {
  leadId: string;
  lead: any;
  onRefreshNeeded?: () => void;
}

export function LeadWhatsAppTab({ leadId, lead, onRefreshNeeded }: LeadWhatsAppTabProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [loggingMessage, setLoggingMessage] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Intelligence & Recommendation state
  const [recommendation, setRecommendation] = useState<any>(null);
  const [frequencyProtection, setFrequencyProtection] = useState<any>(null);

  // Composer state
  const [selectedCategory, setSelectedCategory] = useState<string>('DAY_1_FOLLOWUP');
  const [content, setContent] = useState<string>('');
  const [aiMetadata, setAiMetadata] = useState<any>(null);
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [leadId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [msgRes, tmplRes] = await Promise.all([
        fetch(`/api/leads/${leadId}/whatsapp`),
        fetch('/api/whatsapp/templates'),
      ]);

      const msgJson = await msgRes.json();
      const tmplJson = await tmplRes.json();

      if (msgJson.success && msgJson.data) {
        setMessages(msgJson.data.messages || []);
        setFrequencyProtection(msgJson.data.frequencyProtection || null);
      }

      if (tmplJson.success && tmplJson.data) {
        setTemplates(tmplJson.data || []);
      }
    } catch (err) {
      console.error('Error loading WhatsApp tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAskDecisionEngine = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch('/api/ai/whatsapp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          category: selectedCategory,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setRecommendation(json.data.recommendation);
        setFrequencyProtection(json.data.frequencyProtection);
        setContent(json.data.messageResult.message);
        setAiMetadata(json.data.messageResult);
        if (json.data.recommendation?.suggestedCategory) {
          setSelectedCategory(json.data.recommendation.suggestedCategory);
        }
      } else {
        alert(json.error || 'AI writing unavailable. You can write or edit the message manually.');
      }
    } catch {
      alert('Network error communicating with AI engine.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleTemplateSelect = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    if (!tmplId) return;

    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      const interpolated = interpolateTemplate(tmpl.content, {
        customer_name: lead.contact?.name || lead.title,
        business_name: lead.business?.name || lead.title,
        industry: lead.business?.industry || 'retail',
        next_action: 'our next step',
        demo_date: 'our scheduled demo',
        plan_name: 'OneComPro',
      });
      setContent(interpolated);
      setSelectedCategory(tmpl.category);
    }
  };

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    if (!content) return;
    const rawPhone = lead.contact?.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(content)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(content)}`;
    window.open(url, '_blank');
  };

  const handleMarkSent = async () => {
    if (!content.trim()) {
      alert('Please enter or generate message content first.');
      return;
    }

    setLoggingMessage(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          direction: 'OUTBOUND',
          category: selectedCategory,
          metadata: aiMetadata,
          nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setContent('');
        setAiMetadata(null);
        setNextFollowUpDate('');
        fetchData();
        if (onRefreshNeeded) onRefreshNeeded();
      } else {
        alert(json.error || 'Failed to log message.');
      }
    } catch {
      alert('Network error logging message.');
    } finally {
      setLoggingMessage(false);
    }
  };

  const handleUpdateResponseStatus = async (messageId: string, status: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/whatsapp/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseStatus: status }),
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
        if (onRefreshNeeded) onRefreshNeeded();
      } else {
        alert(json.error || 'Failed to update status.');
      }
    } catch {
      alert('Error updating response status.');
    }
  };

  // Action badge style
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CALL NOW':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      case 'SEND WHATSAPP':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'WAIT':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'CHANGE ANGLE':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'FOLLOW UP LATER':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'STOP TEMPORARILY':
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. WHAT SHOULD I DO WITH THIS LEAD? — INTELLIGENCE CARD */}
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-900/90 p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-500/10 p-1.5 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                AI Next Action Intelligence
              </h3>
              <p className="text-[11px] text-slate-400">
                Evaluates recency, responses, objections, and sales temperature.
              </p>
            </div>
          </div>

          <button
            onClick={handleAskDecisionEngine}
            disabled={loadingAI}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loadingAI ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Analyze Next Action
          </button>
        </div>

        {recommendation ? (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border px-2.5 py-1 text-xs font-extrabold tracking-wide ${getActionBadge(
                  recommendation.recommendedAction
                )}`}
              >
                {recommendation.recommendedAction}
              </span>

              {recommendation.suggestedCategory && (
                <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                  Angle: {recommendation.suggestedCategory.replace(/_/g, ' ')}
                </span>
              )}

              {recommendation.recommendedTiming && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="h-3 w-3 text-indigo-400" />
                  {recommendation.recommendedTiming}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
              {recommendation.reasoning}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between py-1 text-xs text-slate-400">
            <span>Click &quot;Analyze Next Action&quot; to review optimal sales timing and hook.</span>
            {frequencyProtection?.hoursSinceLastContact !== null && (
              <span className="text-[11px] text-slate-500">
                Last contact: {frequencyProtection.hoursSinceLastContact}h ago
              </span>
            )}
          </div>
        )}

        {/* Frequency Protection Alert */}
        {frequencyProtection?.warning && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 flex items-start gap-2 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[11px]">Frequency Protection Alert</p>
              <p className="text-[11px] text-amber-400/90">{frequencyProtection.warning}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. MESSAGE COMPOSER & QUICK DISPATCH */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              WhatsApp Sales Message Composer
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Category Selector */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
            >
              {WHATSAPP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            {/* Template Selector */}
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Choose Template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>

            <button
              onClick={handleAskDecisionEngine}
              disabled={loadingAI}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {loadingAI ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              AI Write
            </button>
          </div>
        </div>

        {/* Message Input */}
        <div className="space-y-1.5">
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your WhatsApp message, select a template above, or click 'AI Write' for contextual generation..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none leading-relaxed"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Concise rule: HOOK + CONTEXT + VALUE + CTA</span>
            <span>{content.length} characters</span>
          </div>
        </div>

        {/* Schedule Next Follow-up (Inline) */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            <span>Next Follow-up (optional):</span>
          </div>
          <input
            type="datetime-local"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!content}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              onClick={handleOpenWhatsApp}
              disabled={!content}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/20 disabled:opacity-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open WhatsApp (wa.me)
            </button>
          </div>

          <button
            onClick={handleMarkSent}
            disabled={loggingMessage || !content.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
          >
            {loggingMessage ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Mark Sent & Log Activity
          </button>
        </div>
      </div>

      {/* 3. MESSAGE LOG HISTORY */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            WhatsApp Conversation History ({messages.length})
          </h3>
          <span className="text-[11px] text-slate-500">Newest first</span>
        </div>

        {messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((m) => (
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
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
                      {(m.category || 'GENERAL').replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-500">to {m.phone}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500">
                    <span>{new Date(m.sentAt || m.createdAt).toLocaleString()}</span>
                    <span className="rounded border border-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                      {m.status}
                    </span>
                  </div>
                </div>

                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap pl-1 border-l-2 border-slate-800">
                  {m.content}
                </p>

                {/* Response Tracking Toggle */}
                {m.direction === 'OUTBOUND' && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      Response Status:
                      <span
                        className={`font-semibold ${
                          m.responseStatus === 'REPLIED'
                            ? 'text-emerald-400'
                            : m.responseStatus === 'NO_RESPONSE'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {m.responseStatus || 'PENDING'}
                      </span>
                    </span>

                    <div className="flex items-center gap-1">
                      {m.responseStatus !== 'REPLIED' && (
                        <button
                          onClick={() => handleUpdateResponseStatus(m.id, 'REPLIED')}
                          className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 px-2 py-0.5 text-[10px] text-slate-300 transition-colors"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          Mark Replied
                        </button>
                      )}
                      {m.responseStatus !== 'NO_RESPONSE' && (
                        <button
                          onClick={() => handleUpdateResponseStatus(m.id, 'NO_RESPONSE')}
                          className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-amber-950 hover:text-amber-300 px-2 py-0.5 text-[10px] text-slate-300 transition-colors"
                        >
                          <XCircle className="h-3 w-3 text-amber-400" />
                          No Response
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-6 text-center text-xs text-slate-500">
            No WhatsApp messages recorded for this lead yet.
          </div>
        )}
      </div>
    </div>
  );
}
