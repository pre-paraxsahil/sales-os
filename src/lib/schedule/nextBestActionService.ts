import { prisma } from '@/lib/prisma';
import { EnergyLevel, NextBestActionOutput } from './types';
import { getWorkHoursConfig, DEFAULT_SALES_BLOCKS } from './scheduleConfig';
import { calculateLeadPriority } from './priorityEngine';
import { getTargetPaceStatus } from './targetPaceService';
import { getLocalTimeParts, getStartAndEndOfDay, DEFAULT_TIMEZONE } from '@/lib/time/salesTimeEngine';

export interface NextBestActionOptions {
  currentTime?: Date;
  energy?: EnergyLevel;
  overrideLunch?: boolean;
  userId?: string | null;
}

/**
 * Reusable deterministic engine answering: "WHAT SHOULD I DO NOW?"
 * Evaluates current time, block, upcoming commitments, overdue follow-ups,
 * target pace mode, and user energy level without requiring AI.
 */
export async function getNextBestAction(
  options: NextBestActionOptions = {}
): Promise<NextBestActionOutput> {
  const now = options.currentTime || new Date();
  const energy: EnergyLevel = options.energy || 'NORMAL';
  const userId = options.userId;

  const config = await getWorkHoursConfig(userId);
  const tz = config.timezone || DEFAULT_TIMEZONE;
  const targetPace = await getTargetPaceStatus(userId);

  const parts = getLocalTimeParts(now, tz);
  const currentTotalMinutes = parts.hour * 60 + parts.minute;

  const weeklyOffDays = config.weeklyOffDays || [0];
  const isWeeklyOff = weeklyOffDays.includes(parts.dayOfWeek);

  // 0. WEEKLY OFF CHECK (e.g. Sunday)
  if (isWeeklyOff) {
    return {
      actionType: 'REST',
      title: `🏖️ ${parts.dayName} — Office Closed (Weekly Off)`,
      reason: `Today is configured as your weekly off (${parts.dayName}). Active outbound calling tasks are paused.`,
      objective: 'Recharge for the week ahead, or optionally review pipeline analytics in Insights.',
      priority: 'LOW',
      estimatedMinutes: 0,
      nextStep: 'Office resumes on Monday at 10:00 AM.',
      blockContext: 'Weekly Off',
      badge: 'Office Closed',
    };
  }

  const officeStartMinutes = config.startHour * 60 + (config.startMinute || 0);
  const officeEndMinutes = config.endHour * 60 + (config.endMinute || 0);

  const lunchStartMinutes = (config.lunch?.startHour ?? 14) * 60 + (config.lunch?.startMinute ?? 0);
  const lunchEndMinutes = (config.lunch?.endHour ?? 15) * 60 + (config.lunch?.endMinute ?? 0);

  // 1. LUNCH PROTECTION CHECK
  if (
    config.lunch?.isProtected &&
    !options.overrideLunch &&
    currentTotalMinutes >= lunchStartMinutes &&
    currentTotalMinutes < lunchEndMinutes
  ) {
    const minutesLeft = lunchEndMinutes - currentTotalMinutes;
    return {
      actionType: 'LUNCH',
      title: '🍴 Protected Lunch & Mental Recharge',
      reason: `Current time (${parts.formattedTime}) falls within your protected lunch window (${config.lunch.startHour}:00 - ${config.lunch.endHour}:00).`,
      objective: 'Step away from screens, recharge energy, and prepare for afternoon closing calls.',
      priority: 'MEDIUM',
      estimatedMinutes: minutesLeft,
      nextStep: 'Afternoon sales block starts after lunch.',
      blockContext: 'Lunch & Recharge',
      badge: 'Protected Block',
    };
  }

  // 2. OUTSIDE OFFICE HOURS CHECK
  if (currentTotalMinutes < officeStartMinutes || currentTotalMinutes >= officeEndMinutes) {
    const isBefore = currentTotalMinutes < officeStartMinutes;
    return {
      actionType: 'PLANNING',
      title: isBefore ? '🌅 Pre-Office Preparation & Target Review' : '🌙 Office Closed — Day Wrap-up & Tomorrow Planning',
      reason: isBefore
        ? `Office opens at ${config.startHour}:00 AM. Outbound prospect calling is paused.`
        : `Office closed at ${config.endHour}:00 PM. Sales calling hours are complete for today.`,
      objective: isBefore
        ? 'Review today target pacing, check upcoming demos, and organize high-priority callbacks.'
        : 'Log final deal updates, check daily report, and align priorities for tomorrow.',
      priority: 'LOW',
      estimatedMinutes: 20,
      nextStep: isBefore ? `Fresh calling window opens at ${config.startHour}:00 AM.` : 'Rest and prepare for tomorrow.',
      blockContext: 'Off Hours',
      badge: 'Office Closed',
    };
  }

  // 3. CHECK IMMINENT DEMO (within next 45 minutes)
  const { end: todayEnd } = getStartAndEndOfDay(now, tz);
  const nextDemo = await prisma.demo.findFirst({
    where: {
      status: 'SCHEDULED',
      scheduledAt: {
        gte: now,
        lte: todayEnd,
      },
      ...(userId ? { userId } : {}),
    },
    include: {
      lead: {
        include: { contact: true, business: true },
      },
      demoPlan: true,
    },
    orderBy: { scheduledAt: 'asc' },
  });

  if (nextDemo) {
    const minutesUntilDemo = Math.round((nextDemo.scheduledAt.getTime() - now.getTime()) / 60000);

    if (minutesUntilDemo <= 45) {
      const bName = nextDemo.lead?.business?.name || nextDemo.lead?.title || 'Prospect';
      const cName = nextDemo.lead?.contact?.name || 'Customer';
      return {
        actionType: 'DEMO',
        title: `Prepare & Run Demo: ${bName}`,
        leadId: nextDemo.leadId,
        leadName: cName,
        businessName: bName,
        phone: nextDemo.lead?.contact?.phone,
        reason: `Live product demo scheduled in ${minutesUntilDemo} minutes (at ${nextDemo.scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
        objective: 'Review customer requirements, open Before-Demo Brief, and launch Live Demo mode.',
        priority: 'CRITICAL',
        estimatedMinutes: Math.max(15, minutesUntilDemo + (nextDemo.durationMinutes || 30)),
        nextStep: 'Open demo plan and launch presenter view.',
        blockContext: 'Demo Imminent',
        badge: 'Top Urgency',
      };
    }
  }

  // 3. CHECK OVERDUE FOLLOW-UPS / CALLBACKS
  const overdueFollowUp = await prisma.followUp.findFirst({
    where: {
      status: 'PENDING',
      scheduledAt: { lt: now },
      ...(userId ? { userId } : {}),
    },
    include: {
      lead: {
        include: {
          contact: true,
          business: true,
          memories: true,
        },
      },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  if (overdueFollowUp && energy !== 'LOW') {
    const bName = overdueFollowUp.lead?.business?.name || overdueFollowUp.lead?.title || 'Lead';
    const cName = overdueFollowUp.lead?.contact?.name || 'Contact';
    const diffHours = Math.round((now.getTime() - overdueFollowUp.scheduledAt.getTime()) / (1000 * 60 * 60));
    const delayStr = diffHours > 0 ? `${diffHours}h overdue` : 'overdue';

    return {
      actionType: overdueFollowUp.type === 'WHATSAPP' ? 'WHATSAPP' : 'CALL',
      title: `Clear Overdue Callback: ${bName}`,
      leadId: overdueFollowUp.leadId,
      leadName: cName,
      businessName: bName,
      phone: overdueFollowUp.lead?.contact?.phone,
      reason: `Callback was scheduled for ${overdueFollowUp.scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} and is currently ${delayStr}.`,
      objective: 'Reconnect with decision-maker to prevent lead momentum from cooling down.',
      priority: 'HIGH',
      estimatedMinutes: 10,
      nextStep: 'Open Before-Call Brief and dial customer.',
      blockContext: 'Overdue Resolution',
      badge: 'Overdue Action',
    };
  }

  // 4. LOW ENERGY MODE HANDLING
  if (energy === 'LOW') {
    // Under low energy, recommend low-friction admin, notes completion, or sending pre-written WhatsApp messages
    const pendingTask = await prisma.task.findFirst({
      where: {
        status: 'PENDING',
        ...(userId ? { userId } : {}),
      },
      include: {
        lead: { include: { contact: true, business: true } },
      },
      orderBy: { priority: 'desc' },
    });

    if (pendingTask) {
      return {
        actionType: 'ADMIN',
        title: `Low-Energy Task: ${pendingTask.title}`,
        leadId: pendingTask.leadId,
        leadName: pendingTask.lead?.contact?.name,
        businessName: pendingTask.lead?.business?.name,
        reason: 'Low energy mode selected. System prioritized administrative task over high-friction cold outreach.',
        objective: pendingTask.description || 'Complete administrative requirement.',
        priority: 'MEDIUM',
        estimatedMinutes: 15,
        nextStep: 'Complete task and mark done.',
        blockContext: 'Low Friction Work',
        badge: 'Energy Adapted',
      };
    }

    return {
      actionType: 'PLANNING',
      title: 'Review CRM Notes & Clean Up Follow-up List',
      reason: 'Low energy mode selected. Ideal window for low-stress CRM hygiene, pipeline review, and schedule organization.',
      objective: 'Verify customer contact records and prepare tomorrow outreach lists.',
      priority: 'LOW',
      estimatedMinutes: 20,
      nextStep: 'Check lead records and update missing contact tags.',
      blockContext: 'CRM Maintenance',
      badge: 'Light Effort',
    };
  }

  // 5. IDENTIFY CURRENT WORK BLOCK
  let currentBlockTitle = 'Sales Calling';
  let blockActionType: 'CALL' | 'CLOSING' | 'FOLLOW_UP' | 'DEMO' | 'ADMIN' = 'CALL';

  for (const block of DEFAULT_SALES_BLOCKS) {
    const bStart = block.startHour * 60 + block.startMinute;
    const bEnd = block.endHour * 60 + block.endMinute;
    if (currentTotalMinutes >= bStart && currentTotalMinutes < bEnd) {
      currentBlockTitle = block.title;
      if (block.blockType === 'CLOSING') blockActionType = 'CLOSING';
      else if (block.blockType === 'FOLLOW_UP') blockActionType = 'FOLLOW_UP';
      else if (block.blockType === 'DEMO') blockActionType = 'DEMO';
      else if (block.blockType === 'PLANNING' || block.blockType === 'REPORT') blockActionType = 'ADMIN';
      break;
    }
  }

  // 6. QUERY ACTIVE LEADS & RUN PRIORITY SCORING
  const leads = await prisma.lead.findMany({
    where: {
      status: { notIn: ['WON', 'LOST'] },
      ...(userId ? { userId } : {}),
    },
    include: {
      contact: true,
      business: true,
      followUps: { where: { status: 'PENDING' } },
      demos: { where: { status: 'SCHEDULED' } },
      memories: { where: { verificationState: 'CONFIRMED' } },
    },
    take: 30,
  });

  if (leads.length > 0) {
    // Score all leads with deterministic priority engine
    const isBehind = targetPace.mode === 'RECOVERY';
    const scoredLeads = leads.map((l) => {
      const prio = calculateLeadPriority(l, { currentTime: now, isTargetBehind: isBehind });
      return {
        lead: l,
        prio,
      };
    });

    // Sort by priority score descending
    scoredLeads.sort((a, b) => b.prio.score - a.prio.score);
    const topScored = scoredLeads[0];
    const topLead = topScored.lead;
    const bName = topLead.business?.name || topLead.title;
    const cName = topLead.contact?.name || 'Contact';

    if (blockActionType === 'CLOSING' || topLead.temperature === 'HOT') {
      return {
        actionType: 'CLOSING',
        title: `Close Deal / Resolve Pushbacks: ${bName}`,
        leadId: topLead.id,
        leadName: cName,
        businessName: bName,
        phone: topLead.contact?.phone,
        reason: `${topScored.prio.reason} (Priority score: ${topScored.prio.score}/100)`,
        objective: 'Address lingering objections, discuss pricing package, and confirm close timeline.',
        priority: topScored.prio.level,
        estimatedMinutes: 15,
        nextStep: 'Open Call Brief, review objections, and dial prospect.',
        blockContext: currentBlockTitle,
        badge: topScored.prio.level === 'CRITICAL' ? 'High Leverage Deal' : 'Closing Priority',
      };
    }

    return {
      actionType: 'CALL',
      title: `Call Priority Lead: ${bName}`,
      leadId: topLead.id,
      leadName: cName,
      businessName: bName,
      phone: topLead.contact?.phone,
      reason: `${topScored.prio.reason} (Priority score: ${topScored.prio.score}/100)`,
      objective: 'Advance prospect through discovery and qualify for live OneComPro demo.',
      priority: topScored.prio.level,
      estimatedMinutes: 12,
      nextStep: 'Review brief and initiate discovery call.',
      blockContext: currentBlockTitle,
      badge: 'Highest Leverage Lead',
    };
  }

  // 7. DEFAULT FALLBACK
  return {
    actionType: 'PLANNING',
    title: 'Prospect New Leads & Review Pipeline',
    reason: 'No immediate overdue follow-ups or pending scheduled activities found in database.',
    objective: 'Import fresh leads or conduct outbound research to build upcoming pipeline.',
    priority: 'MEDIUM',
    estimatedMinutes: 25,
    nextStep: 'Create new leads or plan upcoming WhatsApp outreach campaigns.',
    blockContext: currentBlockTitle,
    badge: 'Pipeline Generation',
  };
}
