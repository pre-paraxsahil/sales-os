'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Clock,
  DollarSign,
  ShieldAlert,
  Flame,
  UserCheck,
  Package,
  Layers,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CallAnalysisResult, CandidateMemoryUpdate, MemoryConflict } from '@/lib/ai/types';

interface CallAiAnalysisSectionProps {
  callId: string;
  leadId: string;
  onMemoryUpdated?: () => void;
}

export const CallAiAnalysisSection: React.FC<CallAiAnalysisSectionProps> = ({
  callId,
  leadId,
  onMemoryUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [applyingMemory, setApplyingMemory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigError, setIsConfigError] = useState(false);
  const [analysis, setAnalysis] = useState<CallAnalysisResult | null>(null);
  const [candidates, setCandidates] = useState<CandidateMemoryUpdate[]>([]);
  const [conflicts, setConflicts] = useState<MemoryConflict[]>([]);
  const [model, setModel] = useState<string | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected candidates for memory application
  const [selectedCandidates, setSelectedCandidates] = useState<Record<number, boolean>>({});

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/calls/${callId}/analysis`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setAnalysis(json.data.analysis);
        setCandidates(json.data.candidates || []);
        setConflicts(json.data.conflicts || []);
        setModel(json.data.model);
        setAnalyzedAt(json.data.createdAt);

        // Pre-select non-conflicting candidates
        const initialSelected: Record<number, boolean> = {};
        (json.data.candidates || []).forEach((c: CandidateMemoryUpdate, idx: number) => {
          if (!c.hasConflict) initialSelected[idx] = true;
        });
        setSelectedCandidates(initialSelected);
      } else {
        setAnalysis(null);
      }
    } catch (err: any) {
      console.error('Error fetching call AI analysis:', err);
      setError('Could not load AI analysis.');
    } finally {
      setLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const handleRunAnalysis = async (forceReanalyze = false) => {
    setAnalyzing(true);
    setError(null);
    setIsConfigError(false);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/ai/calls/${callId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceReanalyze }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.isConfigError) {
          setIsConfigError(true);
        }
        setError(json.error || 'AI call analysis failed. Your call data is safe.');
        return;
      }

      setAnalysis(json.data.analysis);
      setCandidates(json.data.candidates || []);
      setConflicts(json.data.conflicts || []);
      setModel(json.data.model);
      setAnalyzedAt(json.data.createdAt);

      // Pre-select non-conflicting candidates
      const initialSelected: Record<number, boolean> = {};
      (json.data.candidates || []).forEach((c: CandidateMemoryUpdate, idx: number) => {
        if (!c.hasConflict) initialSelected[idx] = true;
      });
      setSelectedCandidates(initialSelected);

      setSuccessMessage(
        json.data.isCached
          ? 'Loaded existing analysis without extra API tokens.'
          : 'Call analyzed successfully with OpenAI intelligence.'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Error executing call analysis:', err);
      setError('A network error occurred while reaching the AI service.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplySelectedMemory = async () => {
    const itemsToApply = candidates
      .filter((_, idx) => selectedCandidates[idx])
      .map((c) => ({
        category: c.category,
        key: c.key,
        value: c.value,
        verificationState: c.status,
        confidence: c.confidence,
      }));

    if (itemsToApply.length === 0) return;

    setApplyingMemory(true);
    try {
      const res = await fetch(`/api/ai/calls/${callId}/apply-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToApply }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMessage(`Applied ${itemsToApply.length} facts to Customer Memory!`);
        setTimeout(() => setSuccessMessage(null), 4000);
        if (onMemoryUpdated) onMemoryUpdated();
        fetchAnalysis();
      } else {
        setError(json.error || 'Failed to apply memory items.');
      }
    } catch (err: any) {
      setError('Network error while saving memory items.');
    } finally {
      setApplyingMemory(false);
    }
  };

  const handleResolveConflict = async (conflict: MemoryConflict, overwrite: boolean) => {
    if (!overwrite) {
      // User chose to keep existing confirmed fact; remove from conflict display
      setConflicts((prev) => prev.filter((c) => c.existingMemoryId !== conflict.existingMemoryId));
      return;
    }

    setApplyingMemory(true);
    try {
      const res = await fetch(`/api/ai/calls/${callId}/apply-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              category: conflict.category,
              key: conflict.key,
              value: conflict.newValue,
              verificationState: conflict.newState,
              confidence: conflict.confidence,
              overwriteMemoryId: conflict.existingMemoryId,
            },
          ],
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMessage(`Updated confirmed memory for "${conflict.key}"!`);
        setTimeout(() => setSuccessMessage(null), 4000);
        if (onMemoryUpdated) onMemoryUpdated();
        fetchAnalysis();
      }
    } catch (err: any) {
      setError('Failed to resolve memory conflict.');
    } finally {
      setApplyingMemory(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 animate-pulse">
        <div className="h-4 w-32 bg-slate-800 rounded mb-2" />
        <div className="h-10 w-full bg-slate-900 rounded" />
      </div>
    );
  }

  // Trust badge styling helper
  const renderTrustBadge = (status: string, confidence?: number) => {
    const config = {
      CONFIRMED: {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        icon: <CheckCircle2 className="h-3 w-3 inline mr-1" />,
      },
      INFERRED: {
        bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
        icon: <TrendingUp className="h-3 w-3 inline mr-1" />,
      },
      UNKNOWN: {
        bg: 'bg-slate-800/80 text-slate-400 border-slate-700',
        icon: <HelpCircle className="h-3 w-3 inline mr-1" />,
      },
      REJECTED: {
        bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        icon: <AlertTriangle className="h-3 w-3 inline mr-1" />,
      },
    }[status] || {
      bg: 'bg-slate-800 text-slate-300 border-slate-700',
      icon: null,
    };

    return (
      <span
        className={cn(
          'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
          config.bg
        )}
      >
        {config.icon}
        {status}
        {confidence !== undefined && status !== 'UNKNOWN'
          ? ` (${Math.round(confidence * 100)}%)`
          : ''}
      </span>
    );
  };

  return (
    <div className="mt-3 rounded-xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/20 to-slate-950/80 p-4 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                AI Call Analysis
              </h4>
              {model && (
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                  {model}
                </span>
              )}
              {analysis && (
                <span className="rounded border border-indigo-500/30 bg-indigo-950/40 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300">
                  {Math.round((analysis.confidence || 0.85) * 100)}% Confidence
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {analyzedAt
                ? `Analyzed on ${new Date(analyzedAt).toLocaleString()} • Original notes preserved`
                : 'Extract actionable intelligence, requirements, and product fit.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {analysis ? (
            <button
              onClick={() => handleRunAnalysis(true)}
              disabled={analyzing}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
              title="Request a fresh analysis from OpenAI"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 text-indigo-400', analyzing && 'animate-spin')} />
              <span>{analyzing ? 'Analyzing...' : 'Re-analyze'}</span>
            </button>
          ) : (
            <button
              onClick={() => handleRunAnalysis(false)}
              disabled={analyzing}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              <Sparkles className={cn('h-3.5 w-3.5', analyzing && 'animate-spin')} />
              <span>{analyzing ? 'Analyzing Call...' : 'Analyze Call'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          className={cn(
            'rounded-lg p-3 text-xs flex items-start gap-2.5 border',
            isConfigError
              ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
              : 'border-rose-500/40 bg-rose-950/30 text-rose-200'
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-1">
            <p className="font-semibold">{error}</p>
            {isConfigError ? (
              <p className="text-[11px] text-amber-300/80">
                Core CRM features and call notes continue to work safely. To enable AI intelligence,
                configure your <code className="bg-slate-900 px-1 py-0.5 rounded font-mono">OPENAI_API_KEY</code> in the server environment.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Your original call data remains completely safe. You can retry the analysis at any time.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Analysis Content Display */}
      {analysis && (
        <div className="space-y-4 text-xs">
          {/* Executive Summary Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Call Executive Summary
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">Recommended Temperature:</span>
                <span
                  className={cn(
                    'rounded border px-2 py-0.5 text-[10px] font-black uppercase flex items-center gap-1',
                    analysis.leadTemperature === 'HOT' &&
                      'bg-rose-500/10 text-rose-400 border-rose-500/30',
                    analysis.leadTemperature === 'WARM' &&
                      'bg-amber-500/10 text-amber-400 border-amber-500/30',
                    analysis.leadTemperature === 'COLD' &&
                      'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  )}
                >
                  <Flame className="h-3 w-3" />
                  {analysis.leadTemperature}
                </span>
              </div>
            </div>
            <p className="text-slate-200 leading-relaxed font-medium">{analysis.summary}</p>
            {analysis.businessUnderstanding && (
              <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 mt-2">
                <strong className="text-slate-300">Business Understanding: </strong>
                {analysis.businessUnderstanding}
              </p>
            )}
          </div>

          {/* Conflict Alert Banner */}
          {conflicts.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <ShieldAlert className="h-4 w-4" />
                <span>Possible Customer Memory Conflict ({conflicts.length})</span>
              </div>
              <p className="text-[11px] text-slate-300">
                AI extracted facts that differ from existing <strong>CONFIRMED</strong> customer memory.
                Confirmed memory is protected from automatic overwrite — please review and decide:
              </p>

              <div className="space-y-2">
                {conflicts.map((conflict, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-200 uppercase tracking-wider">
                        {conflict.key} ({conflict.category})
                      </span>
                      <span className="text-amber-400 text-[10px] font-semibold">Conflict Detected</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded bg-slate-950 p-2 border border-slate-800">
                        <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">
                          Existing Confirmed Memory:
                        </span>
                        <p className="text-slate-300">{conflict.existingValue}</p>
                      </div>
                      <div className="rounded bg-slate-950 p-2 border border-indigo-900/40">
                        <span className="text-[10px] text-indigo-400 font-bold block mb-0.5">
                          New Call Extraction:
                        </span>
                        <p className="text-slate-300">{conflict.newValue}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleResolveConflict(conflict, false)}
                        disabled={applyingMemory}
                        className="rounded px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        Keep Existing Confirmed
                      </button>
                      <button
                        onClick={() => handleResolveConflict(conflict, true)}
                        disabled={applyingMemory}
                        className="rounded px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
                      >
                        Update to New Fact
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Extracted Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Requirements */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-400" /> Customer Requirements
              </span>
              {analysis.requirements.length > 0 ? (
                <ul className="space-y-1.5">
                  {analysis.requirements.map((req, idx) => (
                    <li
                      key={idx}
                      className="rounded bg-slate-950/80 p-2 border border-slate-800/80 flex items-start justify-between gap-2"
                    >
                      <span className="text-slate-200">{req.value}</span>
                      {renderTrustBadge(req.status, req.confidence)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No specific requirements stated.</p>
              )}
            </div>

            {/* Pain Points */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" /> Pain Points Identified
              </span>
              {analysis.painPoints.length > 0 ? (
                <ul className="space-y-1.5">
                  {analysis.painPoints.map((pp, idx) => (
                    <li
                      key={idx}
                      className="rounded bg-slate-950/80 p-2 border border-slate-800/80 flex items-start justify-between gap-2"
                    >
                      <span className="text-slate-200">{pp.value}</span>
                      {renderTrustBadge(pp.status, pp.confidence)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No pain points detected.</p>
              )}
            </div>

            {/* Buying Signals & Objections */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Buying Signals
              </span>
              {analysis.buyingSignals.length > 0 ? (
                <ul className="space-y-1.5">
                  {analysis.buyingSignals.map((bs, idx) => (
                    <li
                      key={idx}
                      className="rounded bg-emerald-950/20 p-2 border border-emerald-500/20 text-emerald-300"
                    >
                      {bs.value}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No explicit buying signals recorded.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> Objections & Hesitations
              </span>
              {analysis.objections.length > 0 ? (
                <ul className="space-y-1.5">
                  {analysis.objections.map((obj, idx) => (
                    <li
                      key={idx}
                      className="rounded bg-amber-950/20 p-2 border border-amber-500/20 text-amber-300"
                    >
                      {obj.value}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No objections raised during this call.</p>
              )}
            </div>
          </div>

          {/* Qualification Specs: Budget, Timeline, Decision Maker, Package */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Budget */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Budget
              </span>
              <p className="text-xs font-semibold text-slate-200">{analysis.budget.value}</p>
              <div>{renderTrustBadge(analysis.budget.status)}</div>
            </div>

            {/* Timeline */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Timeline
              </span>
              <p className="text-xs font-semibold text-slate-200">{analysis.timeline.value}</p>
              <div>{renderTrustBadge(analysis.timeline.status)}</div>
            </div>

            {/* Decision Maker */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> Decision Maker
              </span>
              <p className="text-xs font-semibold text-slate-200">{analysis.decisionMaker.value}</p>
              <div>{renderTrustBadge(analysis.decisionMaker.status)}</div>
            </div>

            {/* Package / Product Knowledge */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <Package className="h-3 w-3" /> Package Fit
              </span>
              <p className="text-xs font-semibold text-slate-200">
                {analysis.packageDiscussed.value}
              </p>
              <div>{renderTrustBadge(analysis.packageDiscussed.status)}</div>
            </div>
          </div>

          {/* Next Action & Unknowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                Recommended Next Action
              </span>
              <p className="text-slate-100 font-semibold">{analysis.nextAction.value}</p>
              <div className="flex items-center gap-2">
                {renderTrustBadge(analysis.nextAction.status, analysis.nextAction.confidence)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Info className="h-3 w-3 text-slate-500" /> Unknown / Missing Qualification
              </span>
              {analysis.unknownInformation.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {analysis.unknownInformation.map((u, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-slate-950 border border-slate-800 px-2 py-0.5 text-[10px] text-slate-400"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No missing information noted.</p>
              )}
            </div>
          </div>

          {/* Apply Candidate Facts to Customer Memory */}
          {candidates.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h5 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Promote AI Facts to Customer Memory ({candidates.length})
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Select candidate facts to save into persistent Customer Memory.
                  </p>
                </div>
                <button
                  onClick={handleApplySelectedMemory}
                  disabled={applyingMemory || Object.values(selectedCandidates).every((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 self-start sm:self-auto"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{applyingMemory ? 'Applying...' : 'Apply Selected to Memory'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {candidates.map((cand, idx) => (
                  <label
                    key={idx}
                    className={cn(
                      'flex items-start gap-2 rounded-lg p-2 border transition-all cursor-pointer text-[11px]',
                      selectedCandidates[idx]
                        ? 'bg-slate-950 border-indigo-500/40 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selectedCandidates[idx])}
                      onChange={(e) =>
                        setSelectedCandidates((prev) => ({
                          ...prev,
                          [idx]: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          {cand.category}
                        </span>
                        {cand.hasConflict && (
                          <span className="text-[9px] text-amber-400 font-semibold border border-amber-500/30 px-1 rounded bg-amber-950/20">
                            Conflict
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2">{cand.value}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
