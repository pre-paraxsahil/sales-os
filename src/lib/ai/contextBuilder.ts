import { prisma } from '@/lib/prisma';
import { CallAnalysisContext, DemoPlanContext, BeforeDemoBrief } from './types';

/**
 * Builds compact, high-relevance sales context for AI analysis.
 * Strictly adheres to privacy: only queries the target lead and call,
 * with relevant customer memory and product knowledge.
 */
export async function buildCallAnalysisContext(
  leadId: string,
  callId: string
): Promise<CallAnalysisContext> {
  // 1. Fetch lead with business and contact
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      business: true,
      contact: true,
    },
  });

  if (!lead) {
    throw new Error(`Lead with ID "${leadId}" not found.`);
  }

  // 2. Fetch target call
  const targetCall = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      transcripts: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!targetCall || targetCall.leadId !== leadId) {
    throw new Error(`Call with ID "${callId}" not found for lead "${leadId}".`);
  }

  // 3. Fetch customer memory (excluding REJECTED items)
  const memories = await prisma.customerMemory.findMany({
    where: {
      leadId,
      verificationState: { in: ['CONFIRMED', 'INFERRED'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // 4. Fetch recent call history (last 3 calls other than the target call)
  const recentCalls = await prisma.call.findMany({
    where: {
      leadId,
      id: { not: callId },
    },
    orderBy: { occurredAt: 'desc' },
    take: 3,
    select: {
      outcome: true,
      notes: true,
      occurredAt: true,
    },
  });

  // 5. Query active Product Knowledge from PostgreSQL tables
  let plans = await prisma.plan.findMany({
    where: {
      availability: 'AVAILABLE',
      isPublic: true,
    },
    include: {
      prices: {
        orderBy: { validFrom: 'desc' },
        take: 1,
      },
      features: {
        include: {
          feature: true,
        },
        take: 6,
      },
    },
    take: 5,
  });

  // If plans table is not yet seeded, seed OneComPro plans from verified product sheet
  if (plans.length === 0) {
    try {
      await ensureProductKnowledgeSeeded();
      plans = await prisma.plan.findMany({
        where: { availability: 'AVAILABLE' },
        include: {
          prices: { take: 1 },
          features: { include: { feature: true }, take: 6 },
        },
      });
    } catch (err) {
      console.warn('Could not auto-seed product knowledge:', err);
    }
  }

  const productKnowledgeFormatted = plans.map((p) => {
    const latestPrice = p.prices[0];
    const priceFormatted = latestPrice
      ? `${latestPrice.currency} ${Number(latestPrice.price).toLocaleString('en-IN')}`
      : 'Pricing on request';

    return {
      planName: p.name,
      planCode: p.code,
      priceFormatted,
      billingCycle: latestPrice?.billingCycle || 'MONTHLY',
      features: p.features.map((f) => f.feature.name),
    };
  });

  return {
    lead: {
      id: lead.id,
      title: lead.title,
      source: lead.source,
      status: lead.status,
      temperature: lead.temperature,
      notes: lead.notes,
    },
    business: lead.business
      ? {
          name: lead.business.name,
          industry: lead.business.industry,
          city: lead.business.city,
        }
      : null,
    contact: lead.contact
      ? {
          name: lead.contact.name,
          phone: lead.contact.phone,
          email: lead.contact.email,
          designation: lead.contact.designation,
        }
      : null,
    targetCall: {
      id: targetCall.id,
      callType: targetCall.callType,
      outcome: targetCall.outcome,
      durationSeconds: targetCall.durationSeconds,
      notes: targetCall.notes,
      nextAction: targetCall.nextAction,
      occurredAt: (targetCall.occurredAt || targetCall.createdAt).toISOString(),
      transcriptText: targetCall.transcripts[0]?.content || undefined,
    },
    existingMemories: memories.map((m) => ({
      category: m.category,
      key: m.key,
      value: m.value,
      verificationState: m.verificationState,
      confidence: m.confidence,
    })),
    recentCallsSummary: recentCalls.map((c) => ({
      outcome: c.outcome,
      notes: c.notes,
      occurredAt: c.occurredAt ? c.occurredAt.toISOString() : '',
    })),
    productKnowledge: productKnowledgeFormatted,
  };
}

/**
 * Ensures baseline OneComPro product knowledge is present in PostgreSQL
 * if the database was not previously populated.
 */
async function ensureProductKnowledgeSeeded() {
  const existingOffering = await prisma.productOffering.findFirst({
    where: { code: 'ONECOMPRO' },
  });

  if (existingOffering) return;

  const offering = await prisma.productOffering.create({
    data: {
      name: 'OneComPro Commerce & Sales Platform',
      code: 'ONECOMPRO',
      description: 'Unified multi-channel commerce and sales operations platform for growing businesses.',
      availability: 'AVAILABLE',
      plans: {
        create: [
          {
            name: 'Starter Plan',
            code: 'STARTER',
            description: 'Essential sales and single-store operations.',
            isPublic: true,
            availability: 'AVAILABLE',
            prices: {
              create: {
                price: 2999,
                currency: 'INR',
                billingCycle: 'MONTHLY',
              },
            },
          },
          {
            name: 'Growth Plan',
            code: 'GROWTH',
            description: 'Multi-store inventory sync, advanced CRM, and automated WhatsApp workflows.',
            isPublic: true,
            availability: 'AVAILABLE',
            prices: {
              create: {
                price: 7999,
                currency: 'INR',
                billingCycle: 'MONTHLY',
              },
            },
          },
          {
            name: 'Enterprise Plan',
            code: 'ENTERPRISE',
            description: 'Custom integrations, dedicated SLA, unlimited stores, and AI sales intelligence.',
            isPublic: true,
            availability: 'AVAILABLE',
            prices: {
              create: {
                price: 19999,
                currency: 'INR',
                billingCycle: 'MONTHLY',
              },
            },
          },
        ],
      },
    },
    include: {
      plans: true,
    },
  });

  // Seed core features
  const f1 = await prisma.feature.upsert({
    where: { code: 'MULTI_STORE_SYNC' },
    update: {},
    create: {
      name: 'Multi-store Inventory Sync',
      code: 'MULTI_STORE_SYNC',
      description: 'Real-time inventory synchronization across Shopify, Amazon, and offline outlets.',
    },
  });

  const f2 = await prisma.feature.upsert({
    where: { code: 'WHATSAPP_WORKFLOWS' },
    update: {},
    create: {
      name: 'WhatsApp Automation & Alerts',
      code: 'WHATSAPP_WORKFLOWS',
      description: 'Automated order confirmations, payment reminders, and cart recovery.',
    },
  });

  const f3 = await prisma.feature.upsert({
    where: { code: 'SALES_OS_CRM' },
    update: {},
    create: {
      name: 'Dedicated Sales CRM',
      code: 'SALES_OS_CRM',
      description: 'Single-user call logs, customer memory, and follow-up tracking.',
    },
  });

  // Connect features to Growth & Enterprise plans
  const growthPlan = offering.plans.find((p) => p.code === 'GROWTH');
  if (growthPlan) {
    await prisma.planFeature.createMany({
      data: [
        { planId: growthPlan.id, featureId: f1.id, isIncluded: true },
        { planId: growthPlan.id, featureId: f2.id, isIncluded: true },
        { planId: growthPlan.id, featureId: f3.id, isIncluded: true },
      ],
      skipDuplicates: true,
    });
  }
}

/**
 * Builds high-density, personalized context for the AI Demo Engine.
 */
export async function buildDemoPlanContext(
  leadId: string,
  demoId: string
): Promise<DemoPlanContext> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      business: true,
      contact: true,
    },
  });

  if (!lead) {
    throw new Error(`Lead with ID "${leadId}" not found.`);
  }

  const demo = await prisma.demo.findUnique({
    where: { id: demoId },
  });

  if (!demo || demo.leadId !== leadId) {
    throw new Error(`Demo with ID "${demoId}" not found for lead "${leadId}".`);
  }

  // 1. Existing confirmed & inferred customer memories
  const memories = await prisma.customerMemory.findMany({
    where: {
      leadId,
      verificationState: { in: ['CONFIRMED', 'INFERRED'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 2. Recent calls
  const recentCalls = await prisma.call.findMany({
    where: { leadId },
    orderBy: { occurredAt: 'desc' },
    take: 3,
    select: {
      outcome: true,
      notes: true,
      occurredAt: true,
    },
  });

  // 3. AI call analyses summaries
  const analyses = await prisma.aIAnalysis.findMany({
    where: { leadId, analysisType: 'CALL_ANALYSIS' },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  const callAnalysisSummaries = analyses
    .map((a) => {
      try {
        const parsed = JSON.parse(a.result);
        return parsed.summary || null;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as string[];

  // 4. Product knowledge from PostgreSQL
  let plans = await prisma.plan.findMany({
    where: { availability: 'AVAILABLE', isPublic: true },
    include: {
      prices: { take: 1, orderBy: { validFrom: 'desc' } },
      features: { include: { feature: true }, take: 8 },
    },
  });

  if (plans.length === 0) {
    await ensureProductKnowledgeSeeded();
    plans = await prisma.plan.findMany({
      where: { availability: 'AVAILABLE' },
      include: {
        prices: { take: 1 },
        features: { include: { feature: true }, take: 8 },
      },
    });
  }

  const productKnowledgeFormatted = plans.map((p) => {
    const latestPrice = p.prices[0];
    const priceFormatted = latestPrice
      ? `${latestPrice.currency} ${Number(latestPrice.price).toLocaleString('en-IN')}`
      : 'Pricing on request';

    return {
      planName: p.name,
      planCode: p.code,
      priceFormatted,
      billingCycle: latestPrice?.billingCycle || 'MONTHLY',
      features: p.features.map((f) => f.feature.name),
    };
  });

  return {
    lead: {
      id: lead.id,
      title: lead.title,
      source: lead.source,
      status: lead.status,
      temperature: lead.temperature,
      notes: lead.notes,
    },
    business: lead.business
      ? {
          name: lead.business.name,
          industry: lead.business.industry,
          city: lead.business.city,
        }
      : null,
    contact: lead.contact
      ? {
          name: lead.contact.name,
          phone: lead.contact.phone,
          email: lead.contact.email,
          designation: lead.contact.designation,
        }
      : null,
    targetDemo: {
      id: demo.id,
      status: demo.status,
      scheduledAt: demo.scheduledAt.toISOString(),
      durationMinutes: demo.durationMinutes,
      meetingUrl: demo.meetingUrl,
      notes: demo.notes,
    },
    existingMemories: memories.map((m) => ({
      category: m.category,
      key: m.key,
      value: m.value,
      verificationState: m.verificationState,
      confidence: m.confidence,
    })),
    recentCalls: recentCalls.map((c) => ({
      outcome: c.outcome,
      notes: c.notes,
      occurredAt: (c.occurredAt || new Date()).toISOString(),
    })),
    callAnalysisSummaries,
    productKnowledge: productKnowledgeFormatted,
  };
}

/**
 * Builds the Before-Demo Brief deterministically from PostgreSQL records.
 */
export async function buildBeforeDemoBrief(
  leadId: string,
  demoId: string
): Promise<BeforeDemoBrief> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      business: true,
      contact: true,
      calls: { orderBy: { occurredAt: 'desc' }, take: 1 },
    },
  });

  if (!lead) throw new Error(`Lead "${leadId}" not found.`);

  const demo = await prisma.demo.findUnique({
    where: { id: demoId },
  });

  if (!demo) throw new Error(`Demo "${demoId}" not found.`);

  const memories = await prisma.customerMemory.findMany({
    where: { leadId, verificationState: { in: ['CONFIRMED', 'INFERRED'] } },
  });

  // Extract by category
  const getValues = (cat: string) =>
    memories.filter((m) => m.category === cat).map((m) => m.value);

  const requirements = getValues('REQUIREMENT');
  const painPoints = getValues('PAIN_POINT');
  const goals = getValues('GOAL');
  const currentProcess = getValues('CURRENT_PROCESS')[0] || 'Manual tracking via spreadsheets';
  const decisionMaker =
    getValues('DECISION_MAKER')[0] ||
    (lead.contact
      ? `${lead.contact.name}${lead.contact.designation ? ` (${lead.contact.designation})` : ''}`
      : 'Decision maker not identified');
  const timeline = getValues('TIMELINE')[0] || 'Implementation timeline not specified';

  const previousObjections = getValues('OBJECTION');
  const buyingSignals = getValues('BUYING_SIGNAL');
  const packageDiscussed = getValues('PACKAGE')[0] || 'Package not yet selected';
  const pricingDiscussed = getValues('BUDGET')[0] || 'Budget not discussed';
  const previousPromises = getValues('PROMISE');

  const lastCall = lead.calls[0];
  const lastInteraction = lastCall
    ? `Call [${lastCall.outcome}] on ${new Date(lastCall.occurredAt || lastCall.createdAt).toLocaleDateString()}`
    : 'Initial demo session';

  // Formulate demo objective & key risk
  const demoObjective =
    requirements.length > 0
      ? `Demonstrate OneComPro ${packageDiscussed.includes('Growth') ? 'Growth plan' : 'core platform'} solving: ${requirements.slice(0, 2).join(' and ')}, securing commitment for rollout.`
      : 'Validate customer operational workflow, present OneComPro capabilities, and qualify buying intent.';

  const keyRisk =
    previousObjections.length > 0
      ? `Main known concern: "${previousObjections[0]}"`
      : 'Customer budget and decision timeline remain unconfirmed.';

  // Identify unknown fields
  const unknown: string[] = [];
  if (pricingDiscussed.includes('not discussed')) unknown.push('Approved monthly budget');
  if (timeline.includes('not specified')) unknown.push('Hard launch deadline');
  if (!getValues('DECISION_MAKER')[0]) unknown.push('Final financial decision maker');
  if (requirements.length === 0) unknown.push('Core technical integrations');

  return {
    customer: {
      name: lead.contact?.name || lead.title,
      business: lead.business?.name || lead.title,
      industry: lead.business?.industry || 'Commerce',
      temperature: lead.temperature,
      stage: lead.status,
    },
    whatWeKnow: {
      requirements: requirements.length > 0 ? requirements : ['No confirmed requirements yet.'],
      painPoints: painPoints.length > 0 ? painPoints : ['Specific operational pain not yet logged.'],
      goals: goals.length > 0 ? goals : ['Business expansion & automation.'],
      currentSystem: currentProcess,
      orderingProcess: currentProcess,
      decisionMaker,
      timeline,
    },
    salesContext: {
      previousObjections: previousObjections.length > 0 ? previousObjections : ['None logged'],
      buyingSignals: buyingSignals.length > 0 ? buyingSignals : ['Initial discovery interest'],
      packageDiscussed,
      pricingDiscussed,
      lastInteraction,
      previousPromises: previousPromises.length > 0 ? previousPromises : ['None recorded'],
    },
    demoObjective,
    keyRisk,
    unknown,
  };
}

/**
 * Builds rich, strictly confirmed sales context for WhatsApp message intelligence & follow-up decisions.
 * Implements Frequency Protection checks to avoid aggressive or redundant outreach.
 */
export async function buildWhatsAppContext(
  leadId: string,
  options?: {
    requestedCategory?: string;
    customObjective?: string;
  }
): Promise<import('./types').WhatsAppGenerationContext> {
  // 1. Fetch Lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      business: true,
      contact: true,
    },
  });

  if (!lead) {
    throw new Error(`Lead with ID "${leadId}" not found.`);
  }

  // 2. Fetch Customer Memories (Confirmed & Inferred only)
  const memories = await prisma.customerMemory.findMany({
    where: {
      leadId,
      verificationState: { in: ['CONFIRMED', 'INFERRED'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      category: true,
      key: true,
      value: true,
      verificationState: true,
    },
  });

  // 3. Fetch Recent Calls
  const recentCalls = await prisma.call.findMany({
    where: { leadId },
    orderBy: { occurredAt: 'desc' },
    take: 3,
    select: {
      id: true,
      outcome: true,
      notes: true,
      nextAction: true,
      occurredAt: true,
    },
  });

  // 4. Fetch Recent Demos
  const recentDemos = await prisma.demo.findMany({
    where: { leadId },
    orderBy: { scheduledAt: 'desc' },
    take: 2,
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      notes: true,
    },
  });

  // 5. Fetch Recent WhatsApp Messages
  const recentWhatsAppMessages = await prisma.whatsAppMessage.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: {
      id: true,
      direction: true,
      category: true,
      content: true,
      status: true,
      responseStatus: true,
      sentAt: true,
      createdAt: true,
    },
  });

  // 6. Frequency Protection & Recency Calculation
  const now = new Date();
  let latestContactDate: Date | null = null;

  if (recentCalls.length > 0 && recentCalls[0].occurredAt) {
    latestContactDate = new Date(recentCalls[0].occurredAt);
  }

  const outboundMsgs = recentWhatsAppMessages.filter((m) => m.direction === 'OUTBOUND');
  if (outboundMsgs.length > 0 && outboundMsgs[0].sentAt) {
    const msgDate = new Date(outboundMsgs[0].sentAt);
    if (!latestContactDate || msgDate > latestContactDate) {
      latestContactDate = msgDate;
    }
  }

  let hoursSinceLastContact: number | null = null;
  if (latestContactDate) {
    hoursSinceLastContact = Math.max(0, Math.round((now.getTime() - latestContactDate.getTime()) / (1000 * 60 * 60)));
  }

  // Count consecutive unanswered outbound messages
  let unansweredCount = 0;
  for (const msg of recentWhatsAppMessages) {
    if (msg.direction === 'INBOUND' || msg.responseStatus === 'REPLIED') {
      break;
    }
    if (msg.direction === 'OUTBOUND') {
      unansweredCount++;
    }
  }

  // Check pending scheduled follow-ups
  const upcomingFollowUp = await prisma.followUp.findFirst({
    where: {
      leadId,
      status: 'PENDING',
      scheduledAt: { gte: now },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  // Build Frequency Protection warnings
  let warning: string | null = null;
  let isHighRiskOfSpam = false;

  if (lead.status === 'LOST' || lead.status === 'UNQUALIFIED') {
    warning = `Lead status is ${lead.status}. Do not send aggressive follow-up.`;
    isHighRiskOfSpam = true;
  } else if (hoursSinceLastContact !== null && hoursSinceLastContact < 4) {
    warning = `Recently contacted (${hoursSinceLastContact} hours ago). Consider waiting before reaching out again.`;
    isHighRiskOfSpam = true;
  } else if (unansweredCount >= 2) {
    warning = `${unansweredCount} consecutive unanswered follow-ups. High risk of annoying prospect. Change angle or wait.`;
    isHighRiskOfSpam = true;
  } else if (upcomingFollowUp) {
    const timeStr = upcomingFollowUp.scheduledAt.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    warning = `A follow-up is already scheduled for ${timeStr}.`;
  }

  // 7. Product Knowledge
  let plans = await prisma.plan.findMany({
    where: { availability: 'AVAILABLE', isPublic: true },
    include: {
      prices: { orderBy: { validFrom: 'desc' }, take: 1 },
      features: { include: { feature: true }, take: 5 },
    },
    take: 3,
  });

  if (plans.length === 0) {
    try {
      await ensureProductKnowledgeSeeded();
      plans = await prisma.plan.findMany({
        where: { availability: 'AVAILABLE' },
        include: {
          prices: { take: 1 },
          features: { include: { feature: true }, take: 5 },
        },
        take: 3,
      });
    } catch {
      // safe ignore
    }
  }

  const productKnowledgeFormatted = plans.map((p) => {
    const latestPrice = p.prices[0];
    const priceFormatted = latestPrice
      ? `${latestPrice.currency} ${Number(latestPrice.price).toLocaleString('en-IN')}`
      : 'Pricing on request';

    return {
      planName: p.name,
      planCode: p.code,
      priceFormatted,
      billingCycle: latestPrice?.billingCycle || 'MONTHLY',
      features: p.features.map((f) => f.feature.name),
    };
  });

  return {
    lead: {
      id: lead.id,
      title: lead.title,
      source: lead.source,
      status: lead.status,
      temperature: lead.temperature,
      notes: lead.notes,
    },
    business: lead.business
      ? {
          name: lead.business.name,
          industry: lead.business.industry,
          city: lead.business.city,
        }
      : null,
    contact: lead.contact
      ? {
          name: lead.contact.name,
          phone: lead.contact.phone,
          email: lead.contact.email,
          designation: lead.contact.designation,
        }
      : null,
    memories: memories.map((m) => ({
      category: m.category,
      key: m.key,
      value: m.value,
      verificationState: m.verificationState,
    })),
    recentCalls: recentCalls.map((c) => ({
      id: c.id,
      outcome: c.outcome,
      notes: c.notes,
      nextAction: c.nextAction,
      occurredAt: c.occurredAt ? c.occurredAt.toISOString() : new Date().toISOString(),
    })),
    recentDemos: recentDemos.map((d) => ({
      id: d.id,
      status: d.status,
      scheduledAt: d.scheduledAt ? d.scheduledAt.toISOString() : new Date().toISOString(),
      notes: d.notes,
    })),
    recentWhatsAppMessages: recentWhatsAppMessages.map((w) => ({
      id: w.id,
      direction: w.direction,
      category: w.category,
      content: w.content,
      status: w.status,
      responseStatus: w.responseStatus,
      sentAt: w.sentAt ? w.sentAt.toISOString() : w.createdAt.toISOString(),
    })),
    frequencyProtection: {
      hoursSinceLastContact,
      unansweredCount,
      hasScheduledFollowUp: !!upcomingFollowUp,
      scheduledFollowUpDate: upcomingFollowUp ? upcomingFollowUp.scheduledAt.toISOString() : null,
      warning,
      isHighRiskOfSpam,
    },
    productKnowledge: productKnowledgeFormatted,
    requestedCategory: options?.requestedCategory,
    customObjective: options?.customObjective,
  };
}


