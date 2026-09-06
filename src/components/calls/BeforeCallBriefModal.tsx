'use client';

import React from 'react';
import {
  X,
  PhoneCall,
  Building,
  User,
  Flame,
  Calendar,
  Clock,
  Target,
  Sparkles,
  ArrowRight,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeCallBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  onStartCallLogging: () => void;
}

export const BeforeCallBriefModal: React.FC<BeforeCallBriefModalProps> = ({
  isOpen,
  onClose,
  lead,
  onStartCallLogging,
}) => {
  if (!isOpen || !lead) return null;

  const contactName = lead.contact?.name || 'Customer';
  const businessName = lead.business?.name || 'their business';
  const phone = lead.contact?.phone || '';
  const industry = lead.business?.industry || 'Not available';

  // Last Interaction extraction
  const lastCall = lead.calls && lead.calls.length > 0 ? lead.calls[0] : null;
  const lastWhatsApp = lead.whatsAppMsgs && lead.whatsAppMsgs.length > 0 ? lead.whatsAppMsgs[0] : null;

  // Next action / pending follow up
  const pendingFollowUp = lead.followUps?.find((f: any) => f.status === 'PENDING');

  // Customer Memory extraction (Build 05)
  const memoriesList: any[] = Array.isArray(lead.memories) ? lead.memories : [];
  const confirmedReqs = memoriesList
    .filter((m) => m.category === 'REQUIREMENT' && m.verificationState === 'CONFIRMED')
    .map((m) => m.value);

  const confirmedPains = memoriesList
    .filter((m) => m.category === 'PAIN_POINT' && m.verificationState === 'CONFIRMED')
    .map((m) => m.value);

  const objections = memoriesList
    .filter((m) => m.category === 'OBJECTION' && m.verificationState !== 'REJECTED')
    .map((m) => m.value);

  const pendingPromises = memoriesList
    .filter((m) => m.category === 'PROMISE' && m.verificationState !== 'REJECTED')
    .map((m) => m.value);

  const decisionMakerFact = memoriesList.find((m) => m.category === 'DECISION_MAKER')?.value;
  const decisionMaker = decisionMakerFact || lead.contact?.designation || 'Not available';

  const timelineFact = memoriesList.find((m) => m.category === 'TIMELINE')?.value;
  const timeline = timelineFact || 'Not available';

  const packageDiscussed = memoriesList.find((m) => m.category === 'PACKAGE')?.value || 'Not discussed yet';

  const requirementsDisplay =
    confirmedReqs.length > 0
      ? confirmedReqs.join('; ')
      : lead.notes
      ? lead.notes.substring(0, 120)
      : 'Not available';

  const painPointsDisplay =
    confirmedPains.length > 0 ? confirmedPains.join('; ') : 'Not available';

  // Simple Factual Call Objective
  let callObjective = 'Connect with prospect, understand current sales challenges, and confirm readiness for a product demo.';
  if (lead.status === 'QUALIFIED' || lead.status === 'DEMO_SCHEDULED') {
    callObjective = 'Confirm demo attendance and identify key decision makers.';
  } else if (lead.status === 'PROPOSAL_SENT' || lead.status === 'NEGOTIATION') {
    callObjective = 'Review quotation, address any pricing objections, and agree on next steps for deal closure.';
  } else if (lastCall && lastCall.outcome === 'FOLLOW_UP_REQUIRED') {
    callObjective = `Follow up on previous discussion regarding ${lead.title}.`;
  }

  // Personalized Rule-Based Opener (Zero Hallucination)
  let opener = '';
  if (lastCall) {
    const lastDateStr = new Date(lastCall.occurredAt || lastCall.createdAt).toLocaleDateString();
    opener = `“Hi ${contactName}, James here from BroStartup. When we spoke on ${lastDateStr}, we discussed ${businessName}’s requirements. I wanted to quickly follow up on our previous conversation.”`;
  } else if (lead.business?.name) {
    opener = `“Hi ${contactName}, James here from BroStartup. I am calling regarding your interest in exploring BroStartup Sales OS for ${businessName}.”`;
  } else {
    opener = `“Hi ${contactName}, James here from BroStartup. I am reaching out to follow up on your enquiry regarding our Sales OS.”`;
  }

  const tempBadge = {
    HOT: 'bg-rose-50 text-rose-700 border-rose-200',
    WARM: 'bg-amber-50 text-amber-700 border-amber-200',
    COLD: 'bg-slate-100 text-slate-600 border-slate-200',
  }[lead.temperature as 'HOT' | 'WARM' | 'COLD'] || 'bg-slate-100 text-slate-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Before-Call Brief</h2>
                <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold', tempBadge)}>
                  <Flame className="inline h-3 w-3 mr-0.5" />
                  {lead.temperature}
                </span>
                <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  {lead.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-call intelligence snapshot for <strong className="text-slate-800">{contactName}</strong> ({businessName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Brief Body */}
        <div className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1 text-xs">
          {/* Personalized Opener Box */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Suggested Opening Line
            </div>
            <p className="text-xs text-slate-800 italic leading-relaxed font-serif">{opener}</p>
          </div>

          {/* Call Objective */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              <Target className="h-3.5 w-3.5" />
              Call Objective
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{callObjective}</p>
          </div>

          {/* Grid of Sections: Customer Profile & Last Interaction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Customer Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-xs">
              <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" /> Customer Profile
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact:</span>
                  <span className="font-bold text-slate-800">{contactName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-mono text-indigo-700 font-semibold">{phone || 'Not available'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Business:</span>
                  <span className="text-slate-800 font-medium">{businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Industry:</span>
                  <span className="text-slate-700">{industry}</span>
                </div>
              </div>
            </div>

            {/* Last Interaction */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-xs">
              <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> Last Interaction
              </h3>
              {lastCall ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span className="text-slate-700 font-medium">
                      {new Date(lastCall.occurredAt || lastCall.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Outcome:</span>
                    <span className="font-bold text-emerald-700">{lastCall.outcome}</span>
                  </div>
                  {lastCall.notes && (
                    <div className="mt-1 pt-1 border-t border-slate-100 text-slate-600 italic line-clamp-2">
                      &ldquo;{lastCall.notes}&rdquo;
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No previous calls recorded for this lead.</p>
              )}
            </div>
          </div>

          {/* Customer Memory Intelligence (Requirements, Objections, Decision Maker, Timeline) */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-xs">
            <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Customer Memory Intelligence
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Confirmed Requirements:</span>
                <span className="text-slate-800 font-medium">{requirementsDisplay}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Pain Points:</span>
                <span className="text-slate-800">{painPointsDisplay}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Decision Maker:</span>
                <span className="text-slate-800">{decisionMaker}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Target Timeline:</span>
                <span className="text-slate-800">{timeline}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Objections / Hesitations:</span>
                <span className={objections.length > 0 ? 'text-amber-700 font-semibold' : 'text-slate-400'}>
                  {objections.length > 0 ? objections.join('; ') : 'None logged'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Pending Commitments:</span>
                <span className={pendingPromises.length > 0 ? 'text-indigo-700 font-semibold' : 'text-slate-400'}>
                  {pendingPromises.length > 0 ? pendingPromises.join('; ') : 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-xs"
            >
              <PhoneCall className="h-4 w-4 text-indigo-600" />
              <span>Dial {phone}</span>
            </a>
          ) : (
            <span className="text-xs text-slate-400">No phone number available to dial.</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onStartCallLogging();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 active:scale-95 transition-all shadow-sm"
            >
              <span>Log Call Result</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
