'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Copy,
  ExternalLink,
  Check,
  AlertTriangle,
  Clock,
  MessageSquare,
  Loader2,
  Calendar,
} from 'lucide-react';
import { WHATSAPP_CATEGORIES } from '@/lib/ai/schemas/whatsappSchema';

interface QuickWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName?: string;
  businessName?: string;
  phone?: string | null;
  initialCategory?: string;
  onMessageLogged?: () => void;
}

export function QuickWhatsAppModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  businessName,
  phone,
  initialCategory = 'DAY_1_FOLLOWUP',
  onMessageLogged,
}: QuickWhatsAppModalProps) {
  const [category, setCategory] = useState<string>(initialCategory);
  const [content, setContent] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [logging, setLogging] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [aiDetails, setAiDetails] = useState<any>(null);
  const [frequencyWarning, setFrequencyWarning] = useState<string | null>(null);
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('');
  const [customObjective, setCustomObjective] = useState<string>('');

  useEffect(() => {
    if (isOpen && leadId) {
      setCategory(initialCategory);
      generateAI(initialCategory);
    }
  }, [isOpen, leadId, initialCategory]);

  const generateAI = async (cat: string) => {
    setLoadingAI(true);
    try {
      const res = await fetch('/api/ai/whatsapp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          category: cat,
          customObjective: customObjective.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setContent(json.data.messageResult.message);
        setAiDetails(json.data.messageResult);
        if (json.data.frequencyProtection?.warning) {
          setFrequencyWarning(json.data.frequencyProtection.warning);
        } else {
          setFrequencyWarning(null);
        }
      } else {
        alert(json.error || 'AI generation unavailable. You can draft manually.');
      }
    } catch {
      alert('Network error while generating message.');
    } finally {
      setLoadingAI(false);
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
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(content)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(content)}`;
    window.open(url, '_blank');
  };

  const handleMarkSent = async () => {
    if (!content.trim()) {
      alert('Message content cannot be empty.');
      return;
    }

    setLogging(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          direction: 'OUTBOUND',
          category,
          metadata: aiDetails,
          nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        if (onMessageLogged) onMessageLogged();
        onClose();
      } else {
        alert(json.error || 'Failed to log WhatsApp message.');
      }
    } catch {
      alert('Network error saving message record.');
    } finally {
      setLogging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">WhatsApp Follow-up Preparation</h3>
              <p className="text-[11px] text-slate-500">
                {leadName || 'Lead'} • {businessName || 'Prospect'} {phone ? `(${phone})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Frequency Protection Alert if any */}
        {frequencyWarning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Frequency Protection Notice</p>
              <p className="text-[11px] text-amber-700">{frequencyWarning}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Message Category</label>
            <select
              value={category}
              onChange={(e) => {
                const newCat = e.target.value;
                setCategory(newCat);
                generateAI(newCat);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
            >
              {WHATSAPP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Custom Angle / Objective (Optional)</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customObjective}
                onChange={(e) => setCustomObjective(e.target.value)}
                placeholder="e.g. Mention 10% annual billing saving"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none text-xs transition-colors"
              />
              <button
                type="button"
                onClick={() => generateAI(category)}
                disabled={loadingAI}
                className="rounded-lg bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1 font-bold text-xs shadow-xs transition-colors"
              >
                {loadingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Regen
              </button>
            </div>
          </div>
        </div>

        {/* Message Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-slate-700 font-bold flex items-center gap-1">
              Personalized Message Body
              {aiDetails && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                  HOOK + CONTEXT + VALUE + CTA
                </span>
              )}
            </label>
            <span className="text-[11px] text-slate-400 font-mono">{content.length} chars</span>
          </div>

          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="AI is preparing contextual message..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none leading-relaxed transition-colors"
          />

          {aiDetails && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-1 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Objective:</span>
                <span>{aiDetails.objective}</span>
              </div>
              {aiDetails.recommendedTiming && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-indigo-600" />
                  <span>Timing: {aiDetails.recommendedTiming}</span>
                </div>
              )}
              {aiDetails.personalizationUsed && aiDetails.personalizationUsed.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-slate-500">Personalized with:</span>
                  {aiDetails.personalizationUsed.map((p: string, idx: number) => (
                    <span key={idx} className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700 font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Next Follow-up Schedule (Optional) */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            Schedule Next Follow-up (Optional)
          </label>
          <input
            type="datetime-local"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!content}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-xs transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={!content}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition-colors shadow-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open WhatsApp
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleMarkSent}
              disabled={logging || !content.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-all"
            >
              {logging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Mark Sent & Log Activity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
