import { getWorkHoursConfig } from '@/lib/schedule/scheduleConfig';
import { getLocalTimeParts, getStartAndEndOfDay, DEFAULT_TIMEZONE } from '@/lib/time/salesTimeEngine';
import { getUnifiedCalendarEvents, CalendarEvent } from './salesCalendarEngine';

export interface ConflictCheckParams {
  startTime: Date;
  durationMinutes: number;
  bufferMinutes?: number;
  excludeEntityId?: string;
  userId?: string | null;
}

export interface SuggestedSlot {
  startTime: Date;
  endTime: Date;
  formattedTime: string; // e.g. "11:40 AM"
  formattedRange: string; // e.g. "11:40 AM – 12:10 PM"
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason?: 'OFFICE_CLOSED' | 'OUTSIDE_WORKING_HOURS' | 'LUNCH_CONFLICT' | 'EVENT_OVERLAP';
  message?: string;
  conflictingEvent?: {
    id: string;
    title: string;
    type: string;
    leadName?: string | null;
    timeRange: string;
  } | null;
  suggestedSlots: SuggestedSlot[];
}

/**
 * Validates requested booking time against office hours, lunch window, working days,
 * and existing sales commitments + buffers.
 */
export async function checkTimeConflicts({
  startTime,
  durationMinutes,
  bufferMinutes = 0,
  excludeEntityId,
  userId,
}: ConflictCheckParams): Promise<ConflictCheckResult> {
  const config = await getWorkHoursConfig(userId);
  const tz = config.timezone || DEFAULT_TIMEZONE;

  const reqStart = new Date(startTime);
  const reqEnd = new Date(reqStart.getTime() + durationMinutes * 60000);
  const reqTotalEnd = new Date(reqStart.getTime() + (durationMinutes + bufferMinutes) * 60000);

  const startParts = getLocalTimeParts(reqStart, tz);

  // 1. Check Working Days / Off-Days
  const weeklyOffDays = config.weeklyOffDays || [0];
  if (weeklyOffDays.includes(startParts.dayOfWeek)) {
    const suggestedSlots = await findNextAvailableSlots(reqStart, durationMinutes, bufferMinutes, userId, 3);
    return {
      hasConflict: true,
      reason: 'OFFICE_CLOSED',
      message: `${startParts.dayName} is a weekly off day. Office is closed.`,
      suggestedSlots,
    };
  }

  // 2. Check Working Hours (e.g. 10:00 to 18:00)
  const reqStartMins = startParts.hour * 60 + startParts.minute;
  const reqEndMins = reqStartMins + durationMinutes + bufferMinutes;
  const officeStartMins = config.startHour * 60 + (config.startMinute || 0);
  const officeEndMins = config.endHour * 60 + (config.endMinute || 0);

  if (reqStartMins < officeStartMins || reqEndMins > officeEndMins) {
    const suggestedSlots = await findNextAvailableSlots(reqStart, durationMinutes, bufferMinutes, userId, 3);
    return {
      hasConflict: true,
      reason: 'OUTSIDE_WORKING_HOURS',
      message: `Selected time is outside office hours (${config.startHour}:00 – ${config.endHour}:00).`,
      suggestedSlots,
    };
  }

  // 3. Check Lunch Window (e.g. 14:00 to 15:00)
  const lunchStartMins = (config.lunch?.startHour ?? 14) * 60 + (config.lunch?.startMinute ?? 0);
  const lunchEndMins = (config.lunch?.endHour ?? 15) * 60 + (config.lunch?.endMinute ?? 0);

  if (reqStartMins < lunchEndMins && reqEndMins > lunchStartMins) {
    const suggestedSlots = await findNextAvailableSlots(reqStart, durationMinutes, bufferMinutes, userId, 3);
    return {
      hasConflict: true,
      reason: 'LUNCH_CONFLICT',
      message: `That time overlaps with protected Lunch Window (${config.lunch?.startHour ?? 14}:00 – ${config.lunch?.endHour ?? 15}:00).`,
      suggestedSlots,
    };
  }

  // 4. Fetch existing events for the target day using Asia/Kolkata bounds
  const { start: dayStart, end: dayEnd } = getStartAndEndOfDay(reqStart, tz);
  const existingEvents = await getUnifiedCalendarEvents(dayStart, dayEnd, userId);

  for (const ev of existingEvents) {
    if (excludeEntityId && (ev.entityId === excludeEntityId || ev.id.endsWith(excludeEntityId))) {
      continue;
    }
    if (['CANCELLED', 'MISSED'].includes(ev.status)) {
      continue;
    }

    // Existing event range including its buffer
    const evStart = new Date(ev.startTime);
    const evTotalEnd = new Date(ev.endTime.getTime() + (ev.bufferMinutes || 0) * 60000);

    // Check overlap: max(reqStart, evStart) < min(reqTotalEnd, evTotalEnd)
    if (Math.max(reqStart.getTime(), evStart.getTime()) < Math.min(reqTotalEnd.getTime(), evTotalEnd.getTime())) {
      const formatTime = (d: Date) =>
        d.toLocaleTimeString('en-IN', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });

      const suggestedSlots = await findNextAvailableSlots(reqStart, durationMinutes, bufferMinutes, userId, 3);

      return {
        hasConflict: true,
        reason: 'EVENT_OVERLAP',
        message: 'That time is already booked.',
        conflictingEvent: {
          id: ev.id,
          title: ev.title,
          type: ev.type,
          leadName: ev.lead?.contactName || ev.lead?.businessName || ev.lead?.title,
          timeRange: `${formatTime(ev.startTime)} – ${formatTime(ev.endTime)}`,
        },
        suggestedSlots,
      };
    }
  }

  return {
    hasConflict: false,
    suggestedSlots: [],
  };
}

/**
 * Searches forward from base date to find the next N open available time slots
 */
export async function findNextAvailableSlots(
  baseDate: Date,
  durationMinutes: number,
  bufferMinutes: number = 0,
  userId?: string | null,
  limit: number = 3
): Promise<SuggestedSlot[]> {
  const config = await getWorkHoursConfig(userId);
  const tz = config.timezone || DEFAULT_TIMEZONE;
  const suggested: SuggestedSlot[] = [];

  let candidate = new Date(baseDate);
  const totalDuration = durationMinutes + bufferMinutes;

  // Round up candidate time to nearest 10-minute mark
  const mins = candidate.getMinutes();
  const roundedMins = Math.ceil(mins / 10) * 10;
  candidate.setMinutes(roundedMins, 0, 0);

  let attempts = 0;
  while (suggested.length < limit && attempts < 100) {
    attempts++;
    const candidateParts = getLocalTimeParts(candidate, tz);

    // Skip weekly off days
    const weeklyOffDays = config.weeklyOffDays || [0];
    if (weeklyOffDays.includes(candidateParts.dayOfWeek)) {
      // Jump to next day at office start hour
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(config.startHour, config.startMinute || 0, 0, 0);
      continue;
    }

    const startMins = candidateParts.hour * 60 + candidateParts.minute;
    const endMins = startMins + totalDuration;
    const officeStartMins = config.startHour * 60 + (config.startMinute || 0);
    const officeEndMins = config.endHour * 60 + (config.endMinute || 0);
    const lunchStartMins = (config.lunch?.startHour ?? 14) * 60 + (config.lunch?.startMinute ?? 0);
    const lunchEndMins = (config.lunch?.endHour ?? 15) * 60 + (config.lunch?.endMinute ?? 0);

    // If candidate starts before office start, jump to office start
    if (startMins < officeStartMins) {
      candidate.setHours(config.startHour, config.startMinute || 0, 0, 0);
      continue;
    }

    // If candidate ends after office end, jump to next day
    if (endMins > officeEndMins) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(config.startHour, config.startMinute || 0, 0, 0);
      continue;
    }

    // If candidate overlaps lunch window, jump past lunch
    if (startMins < lunchEndMins && endMins > lunchStartMins) {
      candidate.setHours(config.lunch?.endHour ?? 15, config.lunch?.endMinute ?? 0, 0, 0);
      continue;
    }

    // Check overlap with existing events
    const { start: dayStart, end: dayEnd } = getStartAndEndOfDay(candidate, tz);
    const existingEvents = await getUnifiedCalendarEvents(dayStart, dayEnd, userId);

    let hasEventOverlap = false;
    for (const ev of existingEvents) {
      if (['CANCELLED', 'MISSED'].includes(ev.status)) continue;
      const evStart = new Date(ev.startTime);
      const evTotalEnd = new Date(ev.endTime.getTime() + (ev.bufferMinutes || 0) * 60000);
      const candEnd = new Date(candidate.getTime() + totalDuration * 60000);

      if (Math.max(candidate.getTime(), evStart.getTime()) < Math.min(candEnd.getTime(), evTotalEnd.getTime())) {
        hasEventOverlap = true;
        // Jump candidate to end of conflicting event
        candidate = new Date(evTotalEnd);
        // Round up to nearest 10 min
        const m = candidate.getMinutes();
        candidate.setMinutes(Math.ceil(m / 10) * 10, 0, 0);
        break;
      }
    }

    if (!hasEventOverlap) {
      const slotEnd = new Date(candidate.getTime() + durationMinutes * 60000);
      const formatTime = (d: Date) =>
        d.toLocaleTimeString('en-IN', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });

      suggested.push({
        startTime: new Date(candidate),
        endTime: slotEnd,
        formattedTime: formatTime(candidate),
        formattedRange: `${formatTime(candidate)} – ${formatTime(slotEnd)}`,
      });

      // Advance candidate by 20 minutes for next search
      candidate = new Date(candidate.getTime() + 20 * 60000);
    }
  }

  return suggested;
}
