'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  Layers,
  Copy,
  Check,
  Building,
  CreditCard,
  ArrowRight,
  ExternalLink,
  Loader2,
  Send,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeatureCapabilityResult, PlanKnowledgeOutput } from '@/lib/knowledge/productKnowledgeService';

interface OneComProBrainModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialIndustry?: string;
}

export const OneComProBrainModal: React.FC<OneComProBrainModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  initialIndustry = '',
}) => {
  const [activeTab, setActiveTab] = useState<'CAPABILITIES' | 'OBJECTIONS' | 'PLANS'>('CAPABILITIES');
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [capabilityResult, setCapabilityResult] = useState<FeatureCapabilityResult | null>(null);

  const [plans, setPlans] = useState<PlanKnowledgeOutput[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);

  const [objections, setObjections] = useState<any[]>([]);
  const [selectedObjection, setSelectedObjection] = useState<string>('SHOPIFY_ALREADY_HAI');
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialQuery) {
        setQuery(initialQuery);
        handleEvaluateCapability(initialQuery);
      }
      fetchPlans();
      fetchObjections();
    }
  }, [isOpen, initialQuery]);

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const res = await fetch('/api/ai/knowledge/plans');
      const json = await res.json();
      if (json.success) {
        setPlans(json.data.plans || []);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchObjections = async () => {
    try {
      const res = await fetch('/api/ai/knowledge/objections');
      const json = await res.json();
      if (json.success) {
        setObjections(json.data.objections || []);
      }
    } catch (err) {
      console.error('Failed to fetch objections:', err);
    }
  };

  const handleEvaluateCapability = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setCapabilityResult(null);

    try {
      const res = await fetch('/api/ai/knowledge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const json = await res.json();
      if (json.success) {
        setCapabilityResult(json.data);
      }
    } catch (err) {
      console.error('Failed to query capability:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  if (!isOpen) return null;

  const currentObjectionData = objections.find((o) => o.key === selectedObjection) || objections[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">OneComPro AI Sales Brain</h2>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                  v1.0.0 Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Authoritative product knowledge, capability checker & live objection battlecards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-slate-200 bg-white text-xs">
          <button
            onClick={() => setActiveTab('CAPABILITIES')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5',
              activeTab === 'CAPABILITIES'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <Search className="w-3.5 h-3.5" /> Can OneComPro do this?
          </button>
          <button
            onClick={() => setActiveTab('OBJECTIONS')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5',
              activeTab === 'OBJECTIONS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Objection Battlecards
          </button>
          <button
            onClick={() => setActiveTab('PLANS')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5',
              activeTab === 'PLANS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <Layers className="w-3.5 h-3.5" /> Plans & Live DB Pricing
          </button>
        </div>

        {/* Tab 1: Capability Finder ("Can OneComPro do this?") */}
        {activeTab === 'CAPABILITIES' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Search Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEvaluateCapability(query);
              }}
              className="space-y-2"
            >
              <label className="block text-xs font-bold text-slate-800">
                Ask any feature or capability question:
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Can OneComPro sync stock between Shopify and physical store POS?"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:border-indigo-500 outline-none shadow-2xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Check
                </button>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1">
                <span className="text-slate-400 font-medium">Quick checks:</span>
                {[
                  'Multi-store inventory sync with Shopify',
                  'Retail POS with barcode scanner',
                  'Automated WhatsApp cart recovery',
                  'B2B wholesale portal with GST',
                  'Custom ERP / Tally connector',
                  'Drone delivery tracking',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setQuery(preset);
                      handleEvaluateCapability(preset);
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </form>

            {/* Results Display */}
            {capabilityResult && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs animate-in fade-in duration-200">
                {/* Status Badge */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-black tracking-wide border uppercase flex items-center gap-1.5 shadow-2xs',
                        capabilityResult.status === 'YES'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : capabilityResult.status === 'PLAN_RESTRICTED'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : capabilityResult.status === 'ADD_ON'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : capabilityResult.status === 'COMING_SOON'
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      )}
                    >
                      {capabilityResult.status === 'YES' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : capabilityResult.status === 'UNKNOWN' ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Status: {capabilityResult.status}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{capabilityResult.featureName}</span>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-500">
                    Plan: <strong className="text-slate-800">{capabilityResult.relevantPlan}</strong>
                  </span>
                </div>

                {/* 4 Key Pillars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Pillar 1: Simple Answer */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                      1. Simple Answer
                    </span>
                    <p className="text-slate-800 font-semibold leading-relaxed">
                      {capabilityResult.simpleAnswer}
                    </p>
                  </div>

                  {/* Pillar 2: Why It Matters */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      2. Why It Matters to Merchant
                    </span>
                    <p className="text-slate-700 leading-relaxed">{capabilityResult.whyItMatters}</p>
                  </div>

                  {/* Pillar 3: What to say to customer */}
                  <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-700" /> 3. What To Say To Customer (Sales Pitch)
                      </span>
                      <button
                        onClick={() => handleCopy(capabilityResult.whatToSayToCustomer)}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> {copiedScript ? 'Copied!' : 'Copy Script'}
                      </button>
                    </div>
                    <p className="text-xs font-medium text-emerald-950 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                      &quot;{capabilityResult.whatToSayToCustomer}&quot;
                    </p>
                  </div>

                  {/* Pillar 4: What NOT to promise */}
                  <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200 space-y-1.5 md:col-span-2">
                    <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> 4. What NOT To Promise (Boundary Guardrail)
                    </span>
                    <p className="text-xs font-semibold text-rose-950 leading-relaxed">
                      {capabilityResult.whatNotToPromise}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Sales Objection Battlecards */}
        {activeTab === 'OBJECTIONS' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Objection Selector Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {objections.map((obj) => (
                <button
                  key={obj.key}
                  onClick={() => setSelectedObjection(obj.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition border',
                    selectedObjection === obj.key
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {obj.title}
                </button>
              ))}
            </div>

            {/* Selected Battlecard */}
            {currentObjectionData && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                      Objection Battlecard
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{currentObjectionData.title}</h3>
                  </div>
                  <button
                    onClick={() => handleCopy(currentObjectionData.fullPitch)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200"
                  >
                    <Copy className="w-3.5 h-3.5" /> {copiedScript ? 'Copied Pitch!' : 'Copy Script'}
                  </button>
                </div>

                {/* Counter Strategy */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                    Strategic Angle
                  </span>
                  <p className="text-slate-800 font-medium">{currentObjectionData.counterSummary}</p>
                </div>

                {/* Exact Word-for-Word Pitch */}
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs space-y-2">
                  <span className="font-bold text-indigo-900 uppercase text-[10px] tracking-wider block">
                    What To Say On Call
                  </span>
                  <p className="text-slate-900 font-medium leading-relaxed bg-white p-3 rounded-lg border border-indigo-100">
                    &quot;{currentObjectionData.fullPitch}&quot;
                  </p>
                </div>

                {/* Boundary Alert */}
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs space-y-1">
                  <span className="font-bold text-rose-800 uppercase text-[10px] tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> What NOT To Promise
                  </span>
                  <p className="text-rose-950 font-semibold">{currentObjectionData.whatNotToPromise}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Plans & Live Database Pricing Matrix */}
        {activeTab === 'PLANS' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Verified OneComPro Plans (Loaded from PostgreSQL)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Dynamic plan pricing, limits, and feature access.
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                Live Database Active
              </span>
            </div>

            {plansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 rounded-xl bg-slate-100 border border-slate-200" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((p) => {
                  const isGrowth = p.code === 'GROWTH';
                  const isEnterprise = p.code === 'ENTERPRISE';

                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'rounded-2xl border p-5 flex flex-col justify-between space-y-4 shadow-xs transition',
                        isGrowth
                          ? 'bg-indigo-50/40 border-indigo-300 ring-2 ring-indigo-500/20'
                          : isEnterprise
                          ? 'bg-slate-900 text-white border-slate-800'
                          : 'bg-white border-slate-200'
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'text-[10px] font-black uppercase px-2 py-0.5 rounded border',
                              isGrowth
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : isEnterprise
                                ? 'bg-slate-800 text-indigo-300 border-slate-700'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            )}
                          >
                            {p.code}
                          </span>
                          {isGrowth && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                              ⭐ Best Seller
                            </span>
                          )}
                        </div>

                        <div>
                          <h4
                            className={cn(
                              'text-sm font-bold',
                              isEnterprise ? 'text-white' : 'text-slate-900'
                            )}
                          >
                            {p.name}
                          </h4>
                          <div className="mt-1 flex items-baseline gap-1">
                            <span
                              className={cn(
                                'text-xl font-black font-mono',
                                isEnterprise ? 'text-white' : 'text-slate-900'
                              )}
                            >
                              {p.monthlyPriceFormatted}
                            </span>
                            <span
                              className={cn(
                                'text-[11px]',
                                isEnterprise ? 'text-slate-400' : 'text-slate-500'
                              )}
                            >
                              / month
                            </span>
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-mono block mt-0.5',
                              isEnterprise ? 'text-indigo-300' : 'text-indigo-700 font-semibold'
                            )}
                          >
                            Annual: {p.annualPriceFormatted} (2 months free)
                          </span>
                        </div>

                        <p
                          className={cn(
                            'text-[11px] leading-relaxed',
                            isEnterprise ? 'text-slate-300' : 'text-slate-600'
                          )}
                        >
                          {p.description}
                        </p>

                        {/* Limits */}
                        <div
                          className={cn(
                            'p-2.5 rounded-xl text-[11px] space-y-1',
                            isEnterprise ? 'bg-slate-800/80 border border-slate-700' : 'bg-slate-50 border border-slate-200'
                          )}
                        >
                          {p.limits.slice(0, 3).map((l) => (
                            <div key={l.key} className="flex items-center justify-between">
                              <span className={isEnterprise ? 'text-slate-400' : 'text-slate-500'}>
                                {l.key.replace(/_/g, ' ')}:
                              </span>
                              <strong className={isEnterprise ? 'text-white' : 'text-slate-800'}>
                                {l.value} {l.unit}
                              </strong>
                            </div>
                          ))}
                        </div>

                        {/* Features List */}
                        <div className="space-y-1.5 pt-1 text-xs">
                          <span
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wider block',
                              isEnterprise ? 'text-slate-400' : 'text-slate-500'
                            )}
                          >
                            Included Capabilities:
                          </span>
                          {p.features.map((f) => (
                            <div key={f} className="flex items-start gap-1.5">
                              <CheckCircle2
                                className={cn(
                                  'w-3.5 h-3.5 shrink-0 mt-0.5',
                                  isEnterprise ? 'text-indigo-400' : 'text-emerald-600'
                                )}
                              />
                              <span
                                className={cn(
                                  'text-[11px] font-medium leading-tight',
                                  isEnterprise ? 'text-slate-200' : 'text-slate-700'
                                )}
                              >
                                {f}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Source of Truth: https://onecompro.com/ • Version {capabilityResult?.version || 'v1.0.0'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
