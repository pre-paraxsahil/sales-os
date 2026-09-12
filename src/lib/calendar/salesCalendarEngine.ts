import { prisma } from '@/lib/prisma';
import { getWorkHoursConfig } from '@/lib/schedule/scheduleConfig';
import { getStartAndEndOfDay, getLocalTimeParts, DEFAULT_TIMEZONE } from '@/lib/time/salesTimeEngine';

export type CalendarActivityType =
  | 'CALL'
  | 'DEMO'
  | 'CALLBACK'
  | 'SEND_DETAILS'
  | 'FOLLOW_UP'
  | 'CLOSING'
  | 'QUOTATION'
  | 'SAMPLE'
  | 'WHATSAPP'
  | 'TASK'
  | 'LUNCH'
  | 'OTHER';

export type CalendarEventStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'MISSED'
  | 'CANCELLED'
  | 'SNOOZED';

export interface CalendarEvent {
  id: string;
  type: CalendarActivityType;
  title: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  bufferMinutes: number;
  status: CalendarEventStatus;
  sourceEntity: 'SCHEDULE_BLOCK' | 'DEMO' | 'FOLLOW_UP' | 'TASK' | 'CALL';
  entityId: string;
  leadId?: string | null;
  lead?: {
    id: string;
    title: string;
    contactName?: string | null;
    businessName?: string | null;
    phone?: string | null;
    status?: string | null;
  } | null;
  notes?: string | null;
  reminder?: {
    id: string;
    remindAt: Date;
    isRead: boolean;
    status: string;
  } | null;
  isProtected?: boolean;
}

export interface DayCapacityStats {
  bookedMinutes: number;
  bookedFormatted: string;
  freeMinutes: number;
  freeFormatted: string;
  callsCount: number;
  demosCount: number;
  followUpsCount: number;
  totalEventsCount: number;
  completedEventsCount: number;
  missedEventsCount: number;
}

/**
 * Normalizes activity type strings into standard CalendarActivityType
 */
export function normalizeActivityType(rawType: string): CalendarActivityType {
  const upper = rawType?.toUpperCase() || 'OTHER';
  if (upper.includes('DEMO')) return 'DEMO';
  if (upper.includes('CALLBACK')) return 'CALLBACK';
  if (upper.includes('SEND_DETAILS') || upper.includes('DETAILS') || upper.includes('WHATSAPP_DETAILS')) return 'SEND_DETAILS';
  if (upper.includes('FOLLOW')) return 'FOLLOW_UP';
  if (upper.includes('CLOSING')) return 'CLOSING';
  if (upper.includes('QUOTATION') || upper.includes('QUOTE')) return 'QUOTATION';
  if (upper.includes('SAMPLE')) return 'SAMPLE';
  if (upper.includes('WHATSAPP')) return 'WHATSAPP';
  if (upper.includes('TASK')) return 'TASK';
  if (upper.includes('LUNCH') || upper.includes('BREAK')) return 'LUNCH';
  if (upper.includes('CALL')) return 'CALL';
  return 'OTHER';
}

/**
 * Computes event status taking current time into account
 */
export function resolveEventStatus(
  rawStatus: string,
  startTime: Date,
  endTime: Date,
  now: Date = new Date()
): CalendarEventStatus {
  const upper = (rawStatus || '').toUpperCase();

  if (['COMPLETED', 'DONE', 'CLOSED'].includes(upper)) return 'COMPLETED';
  if (['CANCELLED', 'CANCELED', 'REJECTED'].includes(upper)) return 'CANCELLED';
  if (['SNOOZED', 'DEFERRED'].includes(upper)) return 'SNOOZED';
  if (['MISSED', 'OVERDUE'].includes(upper)) return 'MISSED';

  // If time range is active right now
  if (now >= startTime && now <= endTime) {
    return 'IN_PROGRESS';
  }

  // If scheduled end time has passed without completion
  if (now > endTime) {
    return 'MISSED';
  }

  return 'SCHEDULED';
}

/**
 * Fetches and aggregates all unified calendar events for a specific date range
 */
export async function getUnifiedCalendarEvents(
  startDate: Date,
  endDate: Date,
  userId?: string | null
): Promise<CalendarEvent[]> {
  const now = new Date();

  // 1. Fetch Demos
  const demos = await prisma.demo.findMany({
    where: {
      scheduledAt: { gte: startDate, lte: endDate },
      lead: { archivedAt: null },
      ...(userId ? { userId } : {}),
    },
    include: {
      lead: { include: { contact: true, business: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  // 2. Fetch FollowUps
  const followUps = await prisma.followUp.findMany({
    where: {
      scheduledAt: { gte: startDate, lte: endDate },
      lead: { archivedAt: null },
      ...(userId ? { userId } : {}),
    },
    include: {
      lead: { include: { contact: true, business: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  // 3. Fetch ScheduleBlocks
  const blocks = await prisma.scheduleBlock.findMany({
    where: {
      startTime: { gte: startDate, lte: endDate },
      ...(userId ? { userId } : {}),
    },
    include: {
      lead: { include: { contact: true, business: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  // 4. Fetch Timed Tasks (Tasks with dueDate in range)
  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: startDate, lte: endDate },
      lead: { archivedAt: null },
      ...(userId ? { userId } : {}),
    },
    include: {
      lead: { include: { contact: true, business: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  // 5. Fetch Reminders to link to events
  const reminders = await prisma.reminder.findMany({
    where: {
      remindAt: { gte: startDate, lte: endDate },
      ...(userId ? { userId } : {}),
    },
  });

  const reminderMap = new Map<string, typeof reminders[0]>();
  for (const r of reminders) {
    if (r.entityId) {
      reminderMap.set(r.entityId, r);
    }
  }

  const events: CalendarEvent[] = [];
  const processedEntityIds = new Set<string>();

  // Process Demos
  for (const d of demos) {
    const duration = d.durationMinutes || 30;
    const startTime = new Date(d.scheduledAt);
    const endTime = new Date(startTime.getTime() + duration * 60000);
    const status = resolveEventStatus(d.status, startTime, endTime, now);
    const linkedReminder = reminderMap.get(d.id);

    events.push({
      id: `demo-${d.id}`,
      type: 'DEMO',
      title: d.lead?.business?.name || d.lead?.title || 'Product Demo',
      startTime,
      endTime,
      durationMinutes: duration,
      bufferMinutes: 10,
      status,
      sourceEntity: 'DEMO',
      entityId: d.id,
      leadId: d.leadId,
      lead: d.lead
        ? {
            id: d.lead.id,
            title: d.lead.title,
            contactName: d.lead.contact?.name,
            businessName: d.lead.business?.name,
            phone: d.lead.contact?.phone,
            status: d.lead.status,
          }
        : null,
      notes: d.notes || d.outcome,
      reminder: linkedReminder
        ? {
            id: linkedReminder.id,
            remindAt: linkedReminder.remindAt,
            isRead: linkedReminder.isRead,
            status: linkedReminder.status,
          }
        : null,
      isProtected: true,
    });
    processedEntityIds.add(d.id);
  }

  // Process FollowUps
  for (const fu of followUps) {
    const startTime = new Date(fu.scheduledAt);
    const duration = 15; // default follow-up duration
    const endTime = new Date(startTime.getTime() + duration * 60000);
    const status = resolveEventStatus(fu.status, startTime, endTime, now);
    const linkedReminder = reminderMap.get(fu.id);
    const actType = normalizeActivityType(fu.type);

    events.push({
      id: `followup-${fu.id}`,
      type: actType === 'OTHER' ? 'FOLLOW_UP' : actType,
      title: `${fu.type || 'Follow-up'}: ${fu.lead?.business?.name || fu.lead?.title || 'Prospect'}`,
      startTime,
      endTime,
      durationMinutes: duration,
      bufferMinutes: 5,
      status,
      sourceEntity: 'FOLLOW_UP',
      entityId: fu.id,
      leadId: fu.leadId,
      lead: fu.lead
        ? {
            id: fu.lead.id,
            title: fu.lead.title,
            contactName: fu.lead.contact?.name,
            businessName: fu.lead.business?.name,
            phone: fu.lead.contact?.phone,
            status: fu.lead.status,
          }
        : null,
      notes: fu.notes,
      reminder: linkedReminder
        ? {
            id: linkedReminder.id,
            remindAt: linkedReminder.remindAt,
            isRead: linkedReminder.isRead,
            status: linkedReminder.status,
          }
        : null,
    });
    processedEntityIds.add(fu.id);
  }

  // Process Timed Tasks
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const startTime = new Date(t.dueDate);
    const duration = 20;
    const endTime = new Date(startTime.getTime() + duration * 60000);
    const status = resolveEventStatus(t.status, startTime, endTime, now);
    const linkedReminder = reminderMap.get(t.id);

    events.push({
      id: `task-${t.id}`,
      type: 'TASK',
      title: `📋 ${t.title}`,
      startTime,
      endTime,
      durationMinutes: duration,
      bufferMinutes: 0,
      status,
      sourceEntity: 'TASK',
      entityId: t.id,
      leadId: t.leadId,
      lead: t.lead
        ? {
            id: t.lead.id,
            title: t.lead.title,
            contactName: t.lead.contact?.name,
            businessName: t.lead.business?.name,
            phone: t.lead.contact?.phone,
            status: t.lead.status,
          }
        : null,
      notes: t.description,
      reminder: linkedReminder
        ? {
            id: linkedReminder.id,
            remindAt: linkedReminder.remindAt,
            isRead: linkedReminder.isRead,
            status: linkedReminder.status,
          }
        : null,
    });
    processedEntityIds.add(t.id);
  }

  // Process ScheduleBlocks (custom user bookings & lunch)
  for (const b of blocks) {
    const startTime = new Date(b.startTime);
    const endTime = new Date(b.endTime);

    // Skip ScheduleBlock if an authoritative Demo, FollowUp, or Task already exists for the same lead at the same start time
    if (b.leadId) {
      const isAlreadyRendered = events.some(
        (ev) => ev.leadId === b.leadId && Math.abs(ev.startTime.getTime() - startTime.getTime()) < 60000
      );
      if (isAlreadyRendered) continue;
    }
    const duration = Math.max(5, Math.round((endTime.getTime() - startTime.getTime()) / 60000));
    const status = resolveEventStatus(b.status || 'ACTIVE', startTime, endTime, now);
    const linkedReminder = reminderMap.get(b.id);
    const actType = normalizeActivityType(b.activityType || b.blockType);

    // Parse metadata if JSON
    let bufferMinutes = 0;
    if (b.metadata) {
      try {
        const meta = JSON.parse(b.metadata);
        if (typeof meta.bufferMinutes === 'number') bufferMinutes = meta.bufferMinutes;
      } catch {
        // non-json
      }
    }

    events.push({
      id: `block-${b.id}`,
      type: actType,
      title: b.title,
      startTime,
      endTime,
      durationMinutes: duration,
      bufferMinutes,
      status,
      sourceEntity: 'SCHEDULE_BLOCK',
      entityId: b.id,
      leadId: b.leadId,
      lead: b.lead
        ? {
            id: b.lead.id,
            title: b.lead.title,
            contactName: b.lead.contact?.name,
            businessName: b.lead.business?.name,
            phone: b.lead.contact?.phone,
            status: b.lead.status,
          }
        : null,
      notes: b.notes,
      reminder: linkedReminder
        ? {
            id: linkedReminder.id,
            remindAt: linkedReminder.remindAt,
            isRead: linkedReminder.isRead,
            status: linkedReminder.status,
          }
        : null,
      isProtected: b.isProtected || b.blockType === 'LUNCH',
    });
  }

  // Sort events chronologically
  return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

/**
 * Computes exact daily capacity metrics from real database events
 */
export async function calculateDayCapacity(
  date: Date = new Date(),
  userId?: string | null
): Promise<DayCapacityStats> {
  const config = await getWorkHoursConfig(userId);
  const { start, end } = getStartAndEndOfDay(date, config.timezone || DEFAULT_TIMEZONE);
  const events = await getUnifiedCalendarEvents(start, end, userId);

  // Office total available minutes (e.g. 10:00 to 18:00 = 480 mins, minus lunch 60 mins = 420 mins)
  const officeStartMins = config.startHour * 60 + config.startMinute;
  const officeEndMins = config.endHour * 60 + config.endMinute;
  const lunchMins = (config.lunch?.endHour! - config.lunch?.startHour!) * 60;
  const totalOfficeMins = Math.max(0, officeEndMins - officeStartMins - lunchMins);

  let bookedMinutes = 0;
  let callsCount = 0;
  let demosCount = 0;
  let followUpsCount = 0;
  let completedEventsCount = 0;
  let missedEventsCount = 0;

  for (const ev of events) {
    if (ev.type === 'LUNCH') continue; // exclude lunch from sales booked time

    if (['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(ev.status)) {
      bookedMinutes += ev.durationMinutes;
    }

    if (ev.type === 'CALL' || ev.type === 'CALLBACK' || ev.type === 'CLOSING') {
      callsCount++;
    } else if (ev.type === 'DEMO') {
      demosCount++;
    } else if (ev.type === 'FOLLOW_UP' || ev.type === 'SEND_DETAILS') {
      followUpsCount++;
    }

    if (ev.status === 'COMPLETED') completedEventsCount++;
    if (ev.status === 'MISSED') missedEventsCount++;
  }

  const freeMinutes = Math.max(0, totalOfficeMins - bookedMinutes);

  const formatHoursMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  return {
    bookedMinutes,
    bookedFormatted: formatHoursMins(bookedMinutes),
    freeMinutes,
    freeFormatted: formatHoursMins(freeMinutes),
    callsCount,
    demosCount,
    followUpsCount,
    totalEventsCount: events.filter((e) => e.type !== 'LUNCH').length,
    completedEventsCount,
    missedEventsCount,
  };
}
