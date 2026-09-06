import { prisma } from '@/lib/prisma';
import { getWorkHoursConfig } from './scheduleConfig';

/**
 * Scans upcoming demos, callbacks, and overdue items to generate non-duplicate smart reminders.
 * Strictly ignores archived/deleted leads.
 */
export async function syncSmartReminders(userId?: string | null) {
  const now = new Date();
  const config = await getWorkHoursConfig(userId);
  const demoNoticeWindow = config.reminderThresholds.demoMinutesBefore || 20;

  // 1. Overdue HOT Leads (Highest priority) — only on active (non-archived) leads
  const overdueHotFollowUps = await prisma.followUp.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: { lt: now },
      lead: {
        archivedAt: null,
        temperature: 'HOT',
      },
      ...(userId ? { userId } : {}),
    },
    include: {
      lead: { include: { contact: true, business: true } },
    },
    take: 5,
  });

  for (const fu of overdueHotFollowUps) {
    if (!fu.lead || fu.lead.archivedAt) continue;

    const existing = await prisma.reminder.findFirst({
      where: {
        entityId: fu.id,
        entityType: 'FOLLOW_UP',
        completedAt: null,
        status: { notIn: ['COMPLETED', 'DONE', 'CANCELLED'] },
      },
    });

    if (!existing) {
      await prisma.reminder.create({
        data: {
          userId: fu.userId || userId,
          leadId: fu.leadId,
          entityId: fu.id,
          entityType: 'FOLLOW_UP',
          type: 'OVERDUE_HOT',
          level: 'CRITICAL',
          status: 'PENDING',
          title: `🔥 OVERDUE HOT LEAD: ${fu.lead?.contact?.name || fu.lead?.business?.name || 'Lead'}`,
          message: `Scheduled follow-up missed. High buying intent at risk. Call immediately.`,
          remindAt: now,
        },
      });
    }
  }

  // 2. Demos scheduled within demoNoticeWindow minutes — only on active leads
  const soonDemoWindow = new Date(now.getTime() + demoNoticeWindow * 60 * 1000);
  const upcomingDemos = await prisma.demo.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: {
        gte: now,
        lte: soonDemoWindow,
      },
      lead: {
        archivedAt: null,
      },
      ...(userId ? { userId } : {}),
    },
    include: {
      lead: {
        include: { contact: true, business: true },
      },
    },
  });

  for (const demo of upcomingDemos) {
    if (!demo.lead || demo.lead.archivedAt) continue;

    const existing = await prisma.reminder.findFirst({
      where: {
        entityId: demo.id,
        entityType: 'DEMO',
        completedAt: null,
        status: { notIn: ['COMPLETED', 'DONE', 'CANCELLED'] },
      },
    });

    if (!existing) {
      const minutesUntil = Math.max(1, Math.round((demo.scheduledAt.getTime() - now.getTime()) / 60000));
      await prisma.reminder.create({
        data: {
          userId: demo.userId || userId,
          leadId: demo.leadId,
          entityId: demo.id,
          entityType: 'DEMO',
          type: 'DEMO',
          level: 'CRITICAL',
          status: 'PENDING',
          title: `🎯 Demo in ${minutesUntil}m: ${demo.lead?.business?.name || demo.lead?.title || 'Prospect'}`,
          message: `Product walkthrough scheduled with ${demo.lead?.contact?.name || 'Contact'}. Prepare battle plan.`,
          remindAt: demo.scheduledAt,
        },
      });
    }
  }

  // 3. Regular Overdue Follow-ups (WARM/COLD) — only on active leads
  const otherOverdueFollowUps = await prisma.followUp.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: { lt: now },
      lead: {
        archivedAt: null,
        temperature: { not: 'HOT' },
      },
      ...(userId ? { userId } : {}),
    },
    include: {
      lead: {
        include: { contact: true, business: true },
      },
    },
    take: 5,
  });

  for (const fu of otherOverdueFollowUps) {
    if (!fu.lead || fu.lead.archivedAt) continue;

    const existing = await prisma.reminder.findFirst({
      where: {
        entityId: fu.id,
        entityType: 'FOLLOW_UP',
        completedAt: null,
        status: { notIn: ['COMPLETED', 'DONE', 'CANCELLED'] },
      },
    });

    if (!existing) {
      await prisma.reminder.create({
        data: {
          userId: fu.userId || userId,
          leadId: fu.leadId,
          entityId: fu.id,
          entityType: 'FOLLOW_UP',
          type: 'OVERDUE',
          level: 'IMPORTANT',
          status: 'PENDING',
          title: `⏰ Overdue Callback: ${fu.lead?.contact?.name || fu.lead?.title || 'Lead'}`,
          message: `Follow-up was scheduled for ${new Date(fu.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          remindAt: now,
        },
      });
    }
  }

  // 4. Neglected Hot Leads without contact in > 48h — only on active leads
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const neglectedHotLeads = await prisma.lead.findMany({
    where: {
      temperature: 'HOT',
      archivedAt: null,
      status: { notIn: ['WON', 'LOST', 'ARCHIVED'] },
      updatedAt: { lt: twoDaysAgo },
      ...(userId ? { userId } : {}),
    },
    include: { contact: true, business: true },
    take: 3,
  });

  for (const hl of neglectedHotLeads) {
    const existing = await prisma.reminder.findFirst({
      where: {
        entityId: hl.id,
        entityType: 'HOT_LEAD',
        completedAt: null,
        status: { notIn: ['COMPLETED', 'DONE', 'CANCELLED'] },
      },
    });

    if (!existing) {
      await prisma.reminder.create({
        data: {
          userId: hl.userId || userId,
          leadId: hl.id,
          entityId: hl.id,
          entityType: 'HOT_LEAD',
          type: 'HOT_LEAD',
          level: 'HIGH',
          status: 'PENDING',
          title: `🔥 Hot Lead Check-in: ${hl.business?.name || hl.title}`,
          message: 'No contact in over 48 hours. Keep buying momentum warm.',
          remindAt: now,
        },
      });
    }
  }
}

/**
 * Returns active reminders for the user, strictly filtering out completed, snoozed, and archived/deleted leads.
 */
export async function getActiveReminders(userId?: string | null) {
  const now = new Date();

  // Run sync to ensure latest reminders are present
  await syncSmartReminders(userId);

  // Mark pending reminders older than 15 minutes as MISSED
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  await prisma.reminder.updateMany({
    where: {
      completedAt: null,
      status: { in: ['PENDING', 'SENT'] },
      remindAt: { lt: fifteenMinutesAgo },
    },
    data: {
      status: 'MISSED',
    },
  }).catch(() => null);

  const reminders = await prisma.reminder.findMany({
    where: {
      completedAt: null,
      status: { notIn: ['COMPLETED', 'DONE', 'CANCELLED'] },
      OR: [
        { snoozedUntil: null },
        { snoozedUntil: { lte: now } },
      ],
      ...(userId ? { userId } : {}),
    },
    include: {
      lead: {
        include: { contact: true, business: true },
      },
    },
    orderBy: [
      { level: 'desc' },
      { remindAt: 'asc' },
    ],
    take: 20,
  });

  // Filter out any reminders linked to archived or non-existent leads
  return reminders.filter((r) => {
    if (r.leadId && (!r.lead || r.lead.archivedAt !== null)) {
      return false;
    }
    return true;
  });
}

/**
 * Marks a reminder completed.
 */
export async function completeReminder(reminderId: string) {
  return prisma.reminder.update({
    where: { id: reminderId },
    data: {
      completedAt: new Date(),
      status: 'COMPLETED',
      isRead: true,
    },
  });
}

/**
 * Snoozes a reminder by a given number of minutes.
 */
export async function snoozeReminder(reminderId: string, minutes: number = 15) {
  const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
  return prisma.reminder.update({
    where: { id: reminderId },
    data: {
      snoozedUntil,
      remindAt: snoozedUntil,
      status: 'SNOOZED',
    },
  });
}

/**
 * Marks a reminder as opened / clicked.
 */
export async function openReminder(reminderId: string) {
  return prisma.reminder.update({
    where: { id: reminderId },
    data: {
      isRead: true,
      status: 'OPENED',
    },
  }).catch(() => null);
}

/**
 * Reschedules a reminder to a new date and time.
 */
export async function rescheduleReminder(reminderId: string, newDate: Date) {
  return prisma.reminder.update({
    where: { id: reminderId },
    data: {
      remindAt: newDate,
      snoozedUntil: null,
      status: 'PENDING',
      isSent: false,
    },
  });
}

