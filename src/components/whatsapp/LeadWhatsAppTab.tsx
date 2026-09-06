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
        return 'bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse';
      case 'SEND WHATSAPP':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
      case 'WAIT':
        return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
      case 'CHANGE ANGLE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
      case 'FOLLOW UP LATER':
        return 'bg-sky-50 text-sky-700 border-sky-200 font-bold';
      case 'STOP TEMPORARILY':
        return 'bg-slate-100 text-slate-600 border-slate-200 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 font-bold';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. WHAT SHOULD I DO WITH THIS LEAD? — INTELLIGENCE CARD */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-50 p-1.5 border border-indigo-100 text-indigo-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                AI Next Action Intelligence
              </h3>
              <p className="text-[11px] text-slate-500">
                Evaluates recency, responses, objections, and sales temperature.
              </p>
            </div>
          </div>

          <button
            onClick={handleAskDecisionEngine}
            disabled={loadingAI}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
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
                <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-xs">
                  Angle: {recommendation.suggestedCategory.replace(/_/g, ' ')}
                </span>
              )}

              {recommendation.recommendedTiming && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <Clock className="h-3 w-3 text-indigo-600" />
                  {recommendation.recommendedTiming}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-800 leading-relaxed bg-white p-2.5 rounded-lg border border-indigo-100 shadow-xs">
              {recommendation.reasoning}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between py-1 text-xs text-slate-500">
            <span>Click &quot;Analyze Next Action&quot; to review optimal sales timing and hook.</span>
            {frequencyProtection?.hoursSinceLastContact !== null && (
              <span className="text-[11px] text-slate-500 font-medium">
                Last contact: {frequencyProtection.hoursSinceLastContact}h ago
              </span>
            )}
          </div>
        )}

        {/* Frequency Protection Alert */}
        {frequencyProtection?.warning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[11px]">Frequency Protection Alert</p>
              <p className="text-[11px] text-amber-700">{frequencyProtection.warning}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. MESSAGE COMPOSER & QUICK DISPATCH */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              WhatsApp Sales Message Composer
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Category Selector */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
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
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
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
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors shadow-xs"
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
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none leading-relaxed transition-colors"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Concise rule: HOOK + CONTEXT + VALUE + CTA</span>
            <span className="font-mono">{content.length} characters</span>
          </div>
        </div>

        {/* Schedule Next Follow-up (Inline) */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            <span>Next Follow-up (optional):</span>
          </div>
          <input
            type="datetime-local"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!content}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-xs transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              onClick={handleOpenWhatsApp}
              disabled={!content}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition-colors shadow-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open WhatsApp (wa.me)
            </button>
          </div>

          <button
            onClick={handleMarkSent}
            disabled={loggingMessage || !content.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
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
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            WhatsApp Conversation History ({messages.length})
          </h3>
          <span className="text-[11px] text-slate-500">Newest first</span>
        </div>

        {messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-2 shadow-xs"
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
                    <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-slate-700 font-medium">
                      {(m.category || 'GENERAL').replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-500 font-mono">to {m.phone}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500">
                    <span>{new Date(m.sentAt || m.createdAt).toLocaleString()}</span>
                    <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 font-semibold">
                      {m.status}
                    </span>
                  </div>
                </div>

                <p className="text-slate-900 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-emerald-500 font-normal">
                  {m.content}
                </p>

                {/* Response Tracking Toggle */}
                {m.direction === 'OUTBOUND' && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      Response Status:
                      <span
                        className={`font-bold ${
                          m.responseStatus === 'REPLIED'
                            ? 'text-emerald-700'
                            : m.responseStatus === 'NO_RESPONSE'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {m.responseStatus || 'PENDING'}
                      </span>
                    </span>

                    <div className="flex items-center gap-1">
                      {m.responseStatus !== 'REPLIED' && (
                        <button
                          onClick={() => handleUpdateResponseStatus(m.id, 'REPLIED')}
                          className="inline-flex items-center gap-1 rounded bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition-colors shadow-xs"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Mark Replied
                        </button>
                      )}
                      {m.responseStatus !== 'NO_RESPONSE' && (
                        <button
                          onClick={() => handleUpdateResponseStatus(m.id, 'NO_RESPONSE')}
                          className="inline-flex items-center gap-1 rounded bg-white hover:bg-amber-50 hover:text-amber-800 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition-colors shadow-xs"
                        >
                          <XCircle className="h-3 w-3 text-amber-600" />
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
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
            No WhatsApp messages recorded for this lead yet.
          </div>
        )}
      </div>
    </div>
  );
}
