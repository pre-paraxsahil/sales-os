import { prisma } from '@/lib/prisma';

export interface CustomerSummaryResult {
  customerName: string;
  businessName: string;
  industry: string;
  stage: string;
  temperature: string;
  currentRequirements: string[];
  painPoints: string[];
  lastInteraction: {
    type: string;
    date: string | null;
    summary: string;
  };
  currentNextAction: {
    action: string;
    date: string | null;
  };
  unknownFields: string[];
}

export interface TellMeEverythingSection {
  id: string;
  number: number;
  title: string;
  content: string;
  bullets?: string[];
  isAvailable: boolean;
}

export interface TellMeEverythingResult {
  leadId: string;
  customerName: string;
  businessName: string;
  generatedAt: string;
  engine: 'DATABASE_DETERMINISTIC' | 'OPENAI_AI';
  sections: TellMeEverythingSection[];
}

/**
 * Interface for summary provider (pluggable for future OpenAI AI implementation)
 */
export interface SummaryProvider {
  generateCustomerSummary(leadId: string): Promise<CustomerSummaryResult>;
  generateTellMeEverything(leadId: string): Promise<TellMeEverythingResult>;
}

/**
 * Deterministic Database-Backed Summary Provider (BUILD 05 source of truth)
 */
export class DeterministicSummaryProvider implements SummaryProvider {
  async generateCustomerSummary(leadId: string): Promise<CustomerSummaryResult> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        contact: true,
        business: true,
        memories: true,
        calls: {
          orderBy: { occurredAt: 'desc' },
          take: 1,
        },
        demos: {
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
        followUps: {
          where: { status: 'PENDING' },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!lead) {
      throw new Error(`Lead with ID ${leadId} not found.`);
    }

    const confirmedMemories = lead.memories.filter((m) => m.verificationState === 'CONFIRMED');

    // Requirements
    const reqMemories = confirmedMemories
      .filter((m) => m.category === 'REQUIREMENT' || m.key.toLowerCase().includes('requirement'))
      .map((m) => m.value);

    // Pain Points
    const painMemories = confirmedMemories
      .filter((m) => m.category === 'PAIN_POINT' || m.key.toLowerCase().includes('pain'))
      .map((m) => m.value);

    // Last interaction
    let lastInteraction = {
      type: 'None',
      date: null as string | null,
      summary: 'No previous calls or demos recorded.',
    };

    if (lead.calls && lead.calls.length > 0) {
      const call = lead.calls[0];
      lastInteraction = {
        type: `Call (${call.outcome.replace(/_/g, ' ')})`,
        date: (call.occurredAt || call.createdAt).toLocaleDateString(),
        summary: call.notes || `Call logged as ${call.outcome.replace(/_/g, ' ')}.`,
      };
    } else if (lead.demos && lead.demos.length > 0) {
      const demo = lead.demos[0];
      lastInteraction = {
        type: `Demo (${demo.status})`,
        date: demo.scheduledAt.toLocaleDateString(),
        summary: demo.notes || `Demo scheduled for ${demo.scheduledAt.toLocaleString()}.`,
      };
    }

    // Next action
    let nextAction = {
      action: 'None scheduled',
      date: null as string | null,
    };

    if (lead.followUps && lead.followUps.length > 0) {
      const fu = lead.followUps[0];
      nextAction = {
        action: fu.notes || 'Follow-up pending',
        date: fu.scheduledAt.toLocaleString(),
      };
    } else if (lead.nextActionDate) {
      nextAction = {
        action: 'Scheduled next action',
        date: lead.nextActionDate.toLocaleString(),
      };
    }

    // Determine Unknown Fields
    const unknownFields: string[] = [];
    const hasBudget = confirmedMemories.some((m) => m.category === 'BUDGET');
    if (!hasBudget && !lead.estimatedValue) unknownFields.push('Budget / Value');

    const hasDecisionMaker = confirmedMemories.some((m) => m.category === 'DECISION_MAKER');
    if (!hasDecisionMaker && !lead.contact?.designation) unknownFields.push('Decision Maker');

    const hasTimeline = confirmedMemories.some((m) => m.category === 'TIMELINE');
    if (!hasTimeline) unknownFields.push('Decision Timeline');

    const hasCompetitor = confirmedMemories.some((m) => m.category === 'COMPETITOR');
    if (!hasCompetitor) unknownFields.push('Competitor Considered');

    return {
      customerName: lead.contact?.name || 'Individual Customer',
      businessName: lead.business?.name || lead.title,
      industry: lead.business?.industry || 'Not available',
      stage: lead.status,
      temperature: lead.temperature,
      currentRequirements: reqMemories.length > 0 ? reqMemories : ['Not available'],
      painPoints: painMemories.length > 0 ? painMemories : ['Not available'],
      lastInteraction,
      currentNextAction: nextAction,
      unknownFields: unknownFields.length > 0 ? unknownFields : ['None identified'],
    };
  }

  async generateTellMeEverything(leadId: string): Promise<TellMeEverythingResult> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        contact: true,
        business: true,
        memories: {
          orderBy: { updatedAt: 'desc' },
        },
        calls: {
          orderBy: { occurredAt: 'desc' },
        },
        demos: {
          orderBy: { scheduledAt: 'desc' },
          include: { demoPlan: true },
        },
        whatsAppMsgs: {
          orderBy: { createdAt: 'desc' },
        },
        notesList: {
          orderBy: { createdAt: 'desc' },
        },
        followUps: {
          orderBy: { scheduledAt: 'desc' },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        sales: true,
      },
    });

    if (!lead) {
      throw new Error(`Lead with ID ${leadId} not found.`);
    }

    const memories = lead.memories;
    const confirmed = memories.filter((m) => m.verificationState === 'CONFIRMED');
    const inferred = memories.filter((m) => m.verificationState === 'INFERRED');

    const findMemories = (cat: string) => confirmed.filter((m) => m.category === cat);
    const findInferred = (cat: string) => inferred.filter((m) => m.category === cat);

    // Section 1: Who they are
    const contactName = lead.contact?.name || 'Customer';
    const role = lead.contact?.designation || 'Role not specified';
    const phone = lead.contact?.phone || 'Not available';
    const email = lead.contact?.email || 'Not available';
    const sec1Bullets = [
      `Full Name: ${contactName}`,
      `Designation / Role: ${role}`,
      `Phone Number: ${phone}`,
      `Email Address: ${email}`,
    ];

    // Section 2: Business
    const bizName = lead.business?.name || lead.title;
    const bizIndustry = lead.business?.industry || 'Not available';
    const bizCity = lead.business?.city || 'Not available';
    const sec2Bullets = [
      `Business Name: ${bizName}`,
      `Industry Sector: ${bizIndustry}`,
      `Location / City: ${bizCity}`,
      `Lead Source: ${lead.source || 'Direct Outreach'}`,
    ];

    // Section 3: What they need
    const reqs = findMemories('REQUIREMENT');
    const sec3Bullets =
      reqs.length > 0
        ? reqs.map((r) => r.value)
        : lead.notes
        ? [lead.notes]
        : ['Not available'];

    // Section 4: Their problems
    const pains = findMemories('PAIN_POINT');
    const currProcesses = findMemories('CURRENT_PROCESS');
    const sec4Bullets: string[] = [];
    if (pains.length > 0) {
      pains.forEach((p) => sec4Bullets.push(`Pain Point: ${p.value}`));
    }
    if (currProcesses.length > 0) {
      currProcesses.forEach((c) => sec4Bullets.push(`Current Setup: ${c.value}`));
    }
    if (sec4Bullets.length === 0) {
      sec4Bullets.push('Not available');
    }

    // Section 5: What we discussed
    const sec5Bullets: string[] = [];
    if (lead.calls && lead.calls.length > 0) {
      lead.calls.slice(0, 3).forEach((c) => {
        const dateStr = new Date(c.occurredAt || c.createdAt).toLocaleDateString();
        const outcome = c.outcome.replace(/_/g, ' ');
        sec5Bullets.push(
          `Call (${dateStr}) - ${outcome}: ${c.notes || 'No detailed call notes recorded.'}`
        );
      });
    }
    if (lead.notesList && lead.notesList.length > 0) {
      lead.notesList.slice(0, 2).forEach((n) => {
        sec5Bullets.push(`Note: ${n.content}`);
      });
    }
    if (sec5Bullets.length === 0) {
      sec5Bullets.push('No call or discussion history recorded yet.');
    }

    // Section 6: What they liked / Buying signals
    const signals = findMemories('BUYING_SIGNAL');
    const goals = findMemories('GOAL');
    const sec6Bullets: string[] = [];
    if (signals.length > 0) sec6Bullets.push(...signals.map((s) => s.value));
    if (goals.length > 0) sec6Bullets.push(...goals.map((g) => `Goal: ${g.value}`));
    if (sec6Bullets.length === 0) {
      sec6Bullets.push('Not available');
    }

    // Section 7: Objections
    const objections = findMemories('OBJECTION');
    const sec7Bullets =
      objections.length > 0
        ? objections.map((o) => o.value)
        : ['No active objections logged.'];

    // Section 8: Decision maker
    const dmMemories = findMemories('DECISION_MAKER');
    const teamMemories = findMemories('TEAM');
    const sec8Bullets: string[] = [];
    if (dmMemories.length > 0) {
      sec8Bullets.push(...dmMemories.map((d) => `Decision Maker: ${d.value}`));
    } else if (lead.contact?.designation) {
      sec8Bullets.push(`Contact Designation: ${lead.contact.designation}`);
    } else {
      sec8Bullets.push('Decision maker: Not available');
    }
    if (teamMemories.length > 0) {
      sec8Bullets.push(...teamMemories.map((t) => `Team involved: ${t.value}`));
    }

    // Section 9: Timeline
    const timelineMemories = findMemories('TIMELINE');
    const sec9Bullets =
      timelineMemories.length > 0
        ? timelineMemories.map((t) => t.value)
        : ['Decision timeline: Not available'];

    // Section 10: Package/pricing discussion
    const packageMemories = findMemories('PACKAGE');
    const budgetMemories = findMemories('BUDGET');
    const sec10Bullets: string[] = [];
    if (packageMemories.length > 0) {
      sec10Bullets.push(...packageMemories.map((p) => `Package Discussed: ${p.value}`));
    }
    if (budgetMemories.length > 0) {
      sec10Bullets.push(...budgetMemories.map((b) => `Budget: ${b.value}`));
    }
    if (lead.estimatedValue) {
      sec10Bullets.push(`Estimated Pipeline Value: ₹${Number(lead.estimatedValue).toLocaleString()}`);
    }
    if (sec10Bullets.length === 0) {
      sec10Bullets.push('Pricing / package discussion: Not available');
    }

    // Section 11: Last interaction
    const sec11Bullets: string[] = [];
    if (lead.calls && lead.calls.length > 0) {
      const latestCall = lead.calls[0];
      const callDate = new Date(latestCall.occurredAt || latestCall.createdAt).toLocaleString();
      sec11Bullets.push(`Last Call: ${callDate} (${latestCall.outcome.replace(/_/g, ' ')})`);
      if (latestCall.notes) sec11Bullets.push(`Call Note: ${latestCall.notes}`);
    }
    if (lead.demos && lead.demos.length > 0) {
      const latestDemo = lead.demos[0];
      sec11Bullets.push(
        `Demo: ${new Date(latestDemo.scheduledAt).toLocaleString()} (${latestDemo.status})`
      );
    }
    if (lead.whatsAppMsgs && lead.whatsAppMsgs.length > 0) {
      const latestWa = lead.whatsAppMsgs[0];
      sec11Bullets.push(
        `WhatsApp: ${new Date(latestWa.createdAt).toLocaleString()} (${latestWa.direction}) - "${latestWa.content.substring(0, 60)}"`
      );
    }
    if (sec11Bullets.length === 0) {
      sec11Bullets.push('No prior interactions logged.');
    }

    // Section 12: Pending promise
    const promiseMemories = findMemories('PROMISE');
    const sec12Bullets =
      promiseMemories.length > 0
        ? promiseMemories.map((p) => p.value)
        : ['No pending promises recorded.'];

    // Section 13: Next action
    const nextActionMemories = findMemories('NEXT_ACTION');
    const pendingFu = lead.followUps.find((f) => f.status === 'PENDING');
    const sec13Bullets: string[] = [];
    if (pendingFu) {
      sec13Bullets.push(
        `Pending Follow-up: ${pendingFu.notes || 'Call'} scheduled for ${new Date(pendingFu.scheduledAt).toLocaleString()}`
      );
    }
    if (nextActionMemories.length > 0) {
      sec13Bullets.push(...nextActionMemories.map((n) => `Action: ${n.value}`));
    }
    if (lead.nextActionDate && !pendingFu) {
      sec13Bullets.push(`Target Date: ${new Date(lead.nextActionDate).toLocaleString()}`);
    }
    if (sec13Bullets.length === 0) {
      sec13Bullets.push('No next action scheduled.');
    }

    // Section 14: Unknown information
    const unknownList: string[] = [];
    if (reqs.length === 0 && !lead.notes) unknownList.push('Specific Feature Requirements');
    if (pains.length === 0) unknownList.push('Primary Pain Points & Operational Bottlenecks');
    if (dmMemories.length === 0 && !lead.contact?.designation) unknownList.push('Ultimate Decision Maker');
    if (timelineMemories.length === 0) unknownList.push('Target Implementation Timeline / Urgency');
    if (budgetMemories.length === 0 && !lead.estimatedValue) unknownList.push('Explicit Budget Constraints');
    if (packageMemories.length === 0) unknownList.push('Specific OneComPro Package Preferred');
    if (findMemories('COMPETITOR').length === 0) unknownList.push('Competitor Alternatives Being Evaluated');

    const sec14Bullets =
      unknownList.length > 0
        ? unknownList.map((u) => `Missing fact: ${u} (Not available)`)
        : ['All primary sales criteria recorded.'];

    // Assemble 14 sections
    const sections: TellMeEverythingSection[] = [
      {
        id: 'who-they-are',
        number: 1,
        title: 'Who They Are',
        content: `Contact profile for ${contactName}.`,
        bullets: sec11Bullets[0] !== 'Not available' ? sec1Bullets : undefined,
        isAvailable: true,
      },
      {
        id: 'business',
        number: 2,
        title: 'Business Profile',
        content: `Enterprise context for ${bizName}.`,
        bullets: sec2Bullets,
        isAvailable: true,
      },
      {
        id: 'what-they-need',
        number: 3,
        title: 'What They Need',
        content: reqs.length > 0 ? 'Documented client requirements:' : 'Requirements not confirmed yet.',
        bullets: sec3Bullets,
        isAvailable: reqs.length > 0 || !!lead.notes,
      },
      {
        id: 'their-problems',
        number: 4,
        title: 'Their Problems & Pain Points',
        content: pains.length > 0 ? 'Existing challenges identified:' : 'Pain points not logged yet.',
        bullets: sec4Bullets,
        isAvailable: pains.length > 0 || currProcesses.length > 0,
      },
      {
        id: 'what-we-discussed',
        number: 5,
        title: 'What We Discussed',
        content: 'Historical dialogue and call excerpts.',
        bullets: sec5Bullets,
        isAvailable: (lead.calls && lead.calls.length > 0) || (lead.notesList && lead.notesList.length > 0),
      },
      {
        id: 'what-they-liked',
        number: 6,
        title: 'What They Liked & Buying Signals',
        content: signals.length > 0 ? 'Positive buying indicators detected:' : 'No explicit buying signals recorded.',
        bullets: sec6Bullets,
        isAvailable: signals.length > 0 || goals.length > 0,
      },
      {
        id: 'objections',
        number: 7,
        title: 'Objections & Hesitations',
        content: objections.length > 0 ? 'Recorded client objections:' : 'No objections recorded.',
        bullets: sec7Bullets,
        isAvailable: objections.length > 0,
      },
      {
        id: 'decision-maker',
        number: 8,
        title: 'Decision Maker & Stakeholders',
        content: dmMemories.length > 0 ? 'Confirmed stakeholders:' : 'Stakeholder hierarchy not fully confirmed.',
        bullets: sec8Bullets,
        isAvailable: dmMemories.length > 0 || !!lead.contact?.designation,
      },
      {
        id: 'timeline',
        number: 9,
        title: 'Timeline & Urgency',
        content: timelineMemories.length > 0 ? 'Client timeline expectation:' : 'Decision timeline not available.',
        bullets: sec9Bullets,
        isAvailable: timelineMemories.length > 0,
      },
      {
        id: 'package-pricing',
        number: 10,
        title: 'Package & Pricing Discussion',
        content: packageMemories.length > 0 || budgetMemories.length > 0 ? 'Commercial parameters discussed:' : 'Pricing not discussed yet.',
        bullets: sec10Bullets,
        isAvailable: packageMemories.length > 0 || budgetMemories.length > 0 || !!lead.estimatedValue,
      },
      {
        id: 'last-interaction',
        number: 11,
        title: 'Last Interaction',
        content: 'Most recent touchpoint recorded with prospect.',
        bullets: sec11Bullets,
        isAvailable: lead.calls.length > 0 || lead.demos.length > 0 || lead.whatsAppMsgs.length > 0,
      },
      {
        id: 'pending-promises',
        number: 12,
        title: 'Pending Commitments & Promises',
        content: promiseMemories.length > 0 ? 'Active promises made to customer:' : 'No pending promises.',
        bullets: sec12Bullets,
        isAvailable: promiseMemories.length > 0,
      },
      {
        id: 'next-action',
        number: 13,
        title: 'Next Action & Next Step',
        content: pendingFu || nextActionMemories.length > 0 ? 'Next sales step committed:' : 'No next action scheduled.',
        bullets: sec13Bullets,
        isAvailable: !!pendingFu || nextActionMemories.length > 0 || !!lead.nextActionDate,
      },
      {
        id: 'unknown-information',
        number: 14,
        title: 'Unknown / Unconfirmed Information',
        content: 'Crucial sales intelligence still to be uncovered during upcoming interactions:',
        bullets: sec14Bullets,
        isAvailable: true,
      },
    ];

    return {
      leadId: lead.id,
      customerName: contactName,
      businessName: bizName,
      generatedAt: new Date().toISOString(),
      engine: 'DATABASE_DETERMINISTIC',
      sections,
    };
  }
}

// Singleton summary service instance
export const summaryService = new DeterministicSummaryProvider();
