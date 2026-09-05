import { PriorityLevel, PriorityScoreResult } from './types';

export interface LeadPriorityInput {
  id: string;
  title: string;
  status: string;
  temperature: string;
  estimatedValue?: any;
  updatedAt?: Date | string;
  nextActionDate?: Date | string | null;
  followUps?: Array<{
    id: string;
    type: string;
    status: string;
    scheduledAt: Date | string;
  }>;
  demos?: Array<{
    id: string;
    status: string;
    scheduledAt: Date | string;
  }>;
  memories?: Array<{
    category: string;
    key: string;
    value: string;
    verificationState: string;
  }>;
}

export interface PriorityContext {
  currentTime?: Date;
  isTargetBehind?: boolean;
}

/**
 * Deterministically evaluates sales urgency and priority score for a lead without relying on AI.
 */
export function calculateLeadPriority(
  lead: LeadPriorityInput,
  context: PriorityContext = {}
): PriorityScoreResult {
  const now = context.currentTime || new Date();
  let score = 0;
  const reasons: string[] = [];

  const factors = {
    temperature: 0,
    stage: 0,
    urgency: 0,
    dealValue: 0,
    buyingSignals: 0,
    objections: 0,
  };

  // 1. Lead Temperature Factor
  if (lead.temperature === 'HOT') {
    factors.temperature = 30;
    reasons.push('Hot temperature lead');
  } else if (lead.temperature === 'WARM') {
    factors.temperature = 18;
  } else {
    factors.temperature = 5;
  }
  score += factors.temperature;

  // 2. Stage / Status Factor
  const st = (lead.status || '').toUpperCase();
  if (st === 'WON' || st === 'LOST' || st === 'UNQUALIFIED') {
    return {
      score: 0,
      level: 'LOW',
      reason: `Lead is already marked ${st.toLowerCase()}`,
      factors,
    };
  }

  if (st === 'NEGOTIATION' || st === 'PROPOSAL_SENT') {
    factors.stage = 25;
    reasons.push('Active closing / proposal negotiation stage');
  } else if (st === 'QUALIFIED') {
    factors.stage = 15;
    reasons.push('Qualified prospect');
  } else if (st === 'CONTACTED') {
    factors.stage = 10;
  } else {
    factors.stage = 5;
  }
  score += factors.stage;

  // 3. Follow-up and Demo Urgency
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Check pending follow-ups
  const pendingFollowUps = (lead.followUps || []).filter((f) => f.status === 'PENDING');
  let hasOverdueFollowUp = false;
  let hasTodayFollowUp = false;

  for (const fu of pendingFollowUps) {
    const sDate = new Date(fu.scheduledAt);
    if (sDate < now) {
      hasOverdueFollowUp = true;
    } else if (sDate >= todayStart && sDate <= todayEnd) {
      hasTodayFollowUp = true;
    }
  }

  // Check today's demo
  const pendingDemos = (lead.demos || []).filter((d) => d.status === 'SCHEDULED');
  let hasTodayDemo = false;
  let isDemoImminent = false;

  for (const d of pendingDemos) {
    const dDate = new Date(d.scheduledAt);
    if (dDate >= todayStart && dDate <= todayEnd) {
      hasTodayDemo = true;
      const diffMinutes = (dDate.getTime() - now.getTime()) / (1000 * 60);
      if (diffMinutes >= 0 && diffMinutes <= 60) {
        isDemoImminent = true;
      }
    }
  }

  if (isDemoImminent) {
    factors.urgency += 40;
    reasons.push('Scheduled demo starting within 60 minutes');
  } else if (hasTodayDemo) {
    factors.urgency += 25;
    reasons.push('Product demo scheduled today');
  }

  if (hasOverdueFollowUp) {
    factors.urgency += 35;
    reasons.push('Overdue follow-up callback pending resolution');
  } else if (hasTodayFollowUp) {
    factors.urgency += 20;
    reasons.push('Scheduled follow-up due today');
  }
  score += factors.urgency;

  // 4. Deal Value Factor
  if (lead.estimatedValue && Number(lead.estimatedValue) > 0) {
    const val = Number(lead.estimatedValue);
    if (val >= 50000) {
      factors.dealValue = 15;
      reasons.push(`High deal value (₹${val.toLocaleString('en-IN')})`);
    } else if (val >= 20000) {
      factors.dealValue = 10;
    } else {
      factors.dealValue = 5;
    }
    score += factors.dealValue;
  }

  // 5. Customer Memories (Buying signals, Objections, Decision Maker)
  const confirmedMemories = (lead.memories || []).filter(
    (m) => m.verificationState === 'CONFIRMED'
  );

  const hasBuyingSignal = confirmedMemories.some((m) => m.category === 'BUYING_SIGNAL');
  const hasDecisionMaker = confirmedMemories.some((m) => m.category === 'DECISION_MAKER');
  const hasObjection = confirmedMemories.some((m) => m.category === 'OBJECTION');
  const hasTimeline = confirmedMemories.some((m) => m.category === 'TIMELINE');

  if (hasBuyingSignal) {
    factors.buyingSignals = 10;
    reasons.push('Strong confirmed buying signals');
    score += factors.buyingSignals;
  }
  if (hasDecisionMaker) {
    reasons.push('Direct decision maker involved');
    score += 5;
  }
  if (hasObjection) {
    factors.objections = 5;
    reasons.push('Identified objection needs handling');
    score += factors.objections;
  }
  if (hasTimeline) {
    score += 5;
  }

  // 6. Target Recovery Boost
  if (context.isTargetBehind && (lead.temperature === 'HOT' || factors.stage >= 15)) {
    score += 10;
    reasons.push('High-probability deal boosted during target recovery');
  }

  // Final score clamping
  const finalScore = Math.min(100, Math.max(0, score));

  // Determine priority level
  let level: PriorityLevel = 'LOW';
  if (isDemoImminent || finalScore >= 75) {
    level = 'CRITICAL';
  } else if (finalScore >= 50) {
    level = 'HIGH';
  } else if (finalScore >= 25) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  const reason =
    reasons.length > 0
      ? reasons.join(', ') + '.'
      : 'Standard pipeline outreach based on engagement status.';

  return {
    score: finalScore,
    level,
    reason,
    factors,
  };
}
