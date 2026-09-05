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
    HOT: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    WARM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    COLD: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  }[lead.temperature as 'HOT' | 'WARM' | 'COLD'] || 'bg-slate-500/10 text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Before-Call Brief</h2>
                <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold', tempBadge)}>
                  <Flame className="inline h-3 w-3 mr-0.5" />
                  {lead.temperature}
                </span>
                <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                  {lead.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pre-call intelligence snapshot for <strong className="text-slate-200">{contactName}</strong> ({businessName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Brief Body */}
        <div className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1 text-xs">
          {/* Personalized Opener Box */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Suggested Opening Line
            </div>
            <p className="text-xs text-slate-200 italic leading-relaxed">{opener}</p>
          </div>

          {/* Call Objective */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              <Target className="h-3.5 w-3.5" />
              Call Objective
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{callObjective}</p>
          </div>

          {/* Grid of Sections: Customer Profile & Last Interaction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Customer Details */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 space-y-2">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-500" /> Customer Profile
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact:</span>
                  <span className="font-semibold text-slate-200">{contactName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-mono text-indigo-300">{phone || 'Not available'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Business:</span>
                  <span className="text-slate-200">{businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Industry:</span>
                  <span className="text-slate-300">{industry}</span>
                </div>
              </div>
            </div>

            {/* Last Interaction */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 space-y-2">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" /> Last Interaction
              </h3>
              {lastCall ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span className="text-slate-300">
                      {new Date(lastCall.occurredAt || lastCall.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Outcome:</span>
                    <span className="font-medium text-emerald-400">{lastCall.outcome}</span>
                  </div>
                  {lastCall.notes && (
                    <div className="mt-1 pt-1 border-t border-slate-800/80 text-slate-300 line-clamp-2">
                      &ldquo;{lastCall.notes}&rdquo;
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No previous calls recorded for this lead.</p>
              )}
            </div>
          </div>

          {/* Customer Memory Intelligence (Requirements, Objections, Decision Maker, Timeline) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 space-y-2">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Customer Memory Intelligence
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Confirmed Requirements:</span>
                <span className="text-slate-200 font-medium">{requirementsDisplay}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Pain Points:</span>
                <span className="text-slate-200">{painPointsDisplay}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Decision Maker:</span>
                <span className="text-slate-200">{decisionMaker}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Target Timeline:</span>
                <span className="text-slate-200">{timeline}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Objections / Hesitations:</span>
                <span className={objections.length > 0 ? 'text-amber-300 font-medium' : 'text-slate-400'}>
                  {objections.length > 0 ? objections.join('; ') : 'None logged'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Pending Commitments:</span>
                <span className={pendingPromises.length > 0 ? 'text-indigo-300 font-medium' : 'text-slate-400'}>
                  {pendingPromises.length > 0 ? pendingPromises.join('; ') : 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/50 transition-colors"
            >
              <PhoneCall className="h-4 w-4 text-indigo-400" />
              <span>Dial {phone}</span>
            </a>
          ) : (
            <span className="text-xs text-slate-500">No phone number available to dial.</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onStartCallLogging();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 active:scale-95 transition-all shadow-md shadow-emerald-600/20"
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
