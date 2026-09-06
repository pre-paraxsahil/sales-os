'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Copy,
  Check,
  Building,
  User,
  AlertCircle,
  HelpCircle,
  Clock,
  Target,
  FileText,
  Flame,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TellMeEverythingResult, TellMeEverythingSection } from '@/lib/memory/summaryService';

interface TellMeEverythingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
}

export const TellMeEverythingDrawer: React.FC<TellMeEverythingDrawerProps> = ({
  isOpen,
  onClose,
  leadId,
}) => {
  const [data, setData] = useState<TellMeEverythingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchBriefing = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/leads/${leadId}/tell-me-everything`);
        const json = await res.json();

        if (isMounted) {
          if (res.ok && json.success) {
            setData(json.data);
          } else {
            setError(json.error || 'Failed to generate briefing.');
          }
        }
      } catch (err: any) {
        if (isMounted) setError('Network error fetching client intelligence.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBriefing();

    return () => {
      isMounted = false;
    };
  }, [isOpen, leadId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!data) return;

    const text = data.sections
      .map((s) => {
        let secText = `## ${s.number}. ${s.title}\n${s.content}\n`;
        if (s.bullets && s.bullets.length > 0) {
          secText += s.bullets.map((b) => `- ${b}`).join('\n') + '\n';
        }
        return secText;
      })
      .join('\n');

    const fullText = `# Tell Me Everything: ${data.customerName} (${data.businessName})\nGenerated: ${new Date(data.generatedAt).toLocaleString()}\n\n${text}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative h-full w-full max-w-2xl border-l border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="border-b border-slate-200 bg-slate-50/80 p-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full border px-2.5 py-0.5 text-xs font-bold border-indigo-200 bg-indigo-50 text-indigo-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Tell Me Everything
              </span>
              <span className="text-[11px] text-emerald-700 font-mono font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Database Source of Truth
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              {data?.customerName || 'Customer Intelligence Briefing'}
            </h2>
            <p className="text-xs text-slate-500">
              {data?.businessName ? `Company: ${data.businessName} • ` : ''}
              14-Point Comprehensive Sales Dossier (Zero External AI)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {data && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                title="Copy entire dossier to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    Copy All
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Aggregating database facts and call history...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700 text-xs font-medium">
              {error}
            </div>
          ) : data ? (
            <div className="space-y-4">
              {data.sections.map((sec) => {
                const isUnknownSec = sec.id === 'unknown-information';

                return (
                  <div
                    key={sec.id}
                    className={cn(
                      'rounded-xl border p-4 transition-all space-y-2 shadow-xs',
                      isUnknownSec
                        ? 'border-amber-200 bg-amber-50/50'
                        : 'border-slate-200 bg-slate-50/50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold border border-indigo-200">
                          {sec.number}
                        </span>
                        {sec.title}
                      </h4>

                      {!sec.isAvailable && (
                        <span className="text-[10px] font-medium text-slate-400 italic">
                          Not available
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {sec.content}
                    </p>

                    {sec.bullets && sec.bullets.length > 0 && (
                      <ul className="space-y-1.5 pt-1">
                        {sec.bullets.map((b, idx) => (
                          <li
                            key={idx}
                            className={cn(
                              'text-xs flex items-start gap-2',
                              b.includes('Not available')
                                ? 'text-slate-400 italic'
                                : 'text-slate-800 font-medium'
                            )}
                          >
                            <span className="text-indigo-600 mt-1">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Engine: Pure Database Synthesis</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 font-bold text-white hover:bg-indigo-700 transition shadow-xs"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
