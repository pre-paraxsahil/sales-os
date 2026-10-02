import { getWorkHoursConfig } from '@/lib/schedule/scheduleConfig';
import { getLocalTimeParts, parseSalesDate, makeISTDate, DEFAULT_TIMEZONE, formatISTDateDDMMYYYY } from '@/lib/time/salesTimeEngine';
import { getUnifiedCalendarEvents } from './salesCalendarEngine';

export interface FindFreeTimeParams {
  dateString: string; // YYYY-MM-DD, DD/MM/YYYY, or relative
  durationMinutes: number;
  bufferMinutes?: number;
  activityType?: string;
  userId?: string | null;
}

export interface AvailableTimeSlot {
  startTimeIso: string;
  endTimeIso: string;
  formattedTime: string; // e.g. "04:30 PM"
  formattedRange: string; // e.g. "04:30 PM – 05:00 PM"
}

export interface FindFreeTimeResult {
  isWorkingDay: boolean;
  dateLabel: string;
  dateFormatted: string; // "DD/MM/YYYY"
  slots: AvailableTimeSlot[];
  reason?: string;
}

/**
 * Searches for all free time slots available on a target date for the specified duration & buffer.
 */
export async function findFreeTimeSlots({
  dateString,
  durationMinutes,
  bufferMinutes = 0,
  userId,
}: FindFreeTimeParams): Promise<FindFreeTimeResult> {
  const config = await getWorkHoursConfig(userId);
  const tz = config.timezone || DEFAULT_TIMEZONE;

  const targetDate = parseSalesDate(dateString, '00:00', tz);
  const parts = getLocalTimeParts(targetDate, tz);
  const dayStart = makeISTDate(parts.year, parts.month, parts.day, 0, 0, 0);
  const dayEnd = makeISTDate(parts.year, parts.month, parts.day, 23, 59, 59);

  // Check weekly off day
  const weeklyOffDays = config.weeklyOffDays || [0];
  if (weeklyOffDays.includes(parts.dayOfWeek)) {
    return {
      isWorkingDay: false,
      dateLabel: parts.displayDate,
      dateFormatted: formatISTDateDDMMYYYY(dayStart),
      slots: [],
      reason: `${parts.dayName} is a weekly off day. Office is closed.`,
    };
  }

  const existingEvents = await getUnifiedCalendarEvents(dayStart, dayEnd, userId);

  const officeStartHour = config.startHour;
  const officeStartMinute = config.startMinute || 0;
  const officeEndHour = config.endHour;
  const officeEndMinute = config.endMinute || 0;

  const totalRequiredMins = durationMinutes + bufferMinutes;
  const slots: AvailableTimeSlot[] = [];

  // Pointer starting at office opening in IST
  let current = makeISTDate(parts.year, parts.month, parts.day, officeStartHour, officeStartMinute, 0);
  const officeEnd = makeISTDate(parts.year, parts.month, parts.day, officeEndHour, officeEndMinute, 0);

  const lunchStart = makeISTDate(parts.year, parts.month, parts.day, config.lunch?.startHour ?? 14, config.lunch?.startMinute ?? 0, 0);
  const lunchEnd = makeISTDate(parts.year, parts.month, parts.day, config.lunch?.endHour ?? 15, config.lunch?.endMinute ?? 0, 0);

  const now = new Date();
  let pastSlotsSkipped = 0;
  let lunchOverlapCount = 0;
  let occupiedOverlapCount = 0;

  // Clean slot step: 30 minutes for 30m+ bookings, 15 minutes for shorter
  const stepMinutes = durationMinutes >= 30 ? 30 : 15;

  while (current.getTime() + totalRequiredMins * 60000 <= officeEnd.getTime()) {
    // Skip times in the past if searching for today or a past date
    if (current.getTime() < now.getTime()) {
      pastSlotsSkipped++;
      current = new Date(current.getTime() + stepMinutes * 60000);
      continue;
    }

    const candEnd = new Date(current.getTime() + totalRequiredMins * 60000);

    // Check lunch window overlap: max(current, lunchStart) < min(candEnd, lunchEnd)
    if (Math.max(current.getTime(), lunchStart.getTime()) < Math.min(candEnd.getTime(), lunchEnd.getTime())) {
      lunchOverlapCount++;
      current = new Date(lunchEnd.getTime());
      continue;
    }

    // Check existing event overlap
    let hasOverlap = false;
    let maxOverlapEnd = current.getTime();

    for (const ev of existingEvents) {
      if (['CANCELLED', 'MISSED', 'COMPLETED'].includes(ev.status)) continue;
      const evStart = new Date(ev.startTime).getTime();
      const evTotalEnd = new Date(ev.endTime.getTime() + (ev.bufferMinutes || 0) * 60000).getTime();

      if (Math.max(current.getTime(), evStart) < Math.min(candEnd.getTime(), evTotalEnd)) {
        hasOverlap = true;
        occupiedOverlapCount++;
        if (evTotalEnd > maxOverlapEnd) {
          maxOverlapEnd = evTotalEnd;
        }
      }
    }

    if (hasOverlap) {
      // Jump pointer to end of conflicting event rounded up to next 15-min mark in IST
      current = new Date(maxOverlapEnd);
      const curParts = getLocalTimeParts(current, tz);
      const rem = curParts.minute % 15;
      if (rem > 0) {
        current = new Date(current.getTime() + (15 - rem) * 60000);
      }
      continue;
    }

    // Free slot found!
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
    const formatTime = (dt: Date) =>
      dt.toLocaleTimeString('en-IN', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });

    slots.push({
      startTimeIso: current.toISOString(),
      endTimeIso: slotEnd.toISOString(),
      formattedTime: formatTime(current),
      formattedRange: `${formatTime(current)} – ${formatTime(slotEnd)}`,
    });

    // Advance pointer cleanly
    current = new Date(current.getTime() + stepMinutes * 60000);
  }

  let reason: string | undefined = undefined;
  if (slots.length === 0) {
    if (pastSlotsSkipped > 0 && current >= officeEnd) {
      reason = `Working hours for this date have already passed.`;
    } else if (occupiedOverlapCount > 0) {
      reason = `All available slots during working hours are occupied by scheduled commitments.`;
    } else {
      reason = `No slots available during working hours (${config.startHour}:00 – ${config.endHour}:00).`;
    }
  }

  return {
    isWorkingDay: true,
    dateLabel: parts.displayDate,
    dateFormatted: formatISTDateDDMMYYYY(dayStart),
    slots,
    reason,
  };
}
