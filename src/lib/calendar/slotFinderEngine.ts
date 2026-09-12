import { getWorkHoursConfig } from '@/lib/schedule/scheduleConfig';
import { getLocalTimeParts, DEFAULT_TIMEZONE } from '@/lib/time/salesTimeEngine';
import { getUnifiedCalendarEvents } from './salesCalendarEngine';

export interface FindFreeTimeParams {
  dateString: string; // YYYY-MM-DD in Asia/Kolkata
  durationMinutes: number;
  bufferMinutes?: number;
  activityType?: string;
  userId?: string | null;
}

export interface AvailableTimeSlot {
  startTimeIso: string;
  endTimeIso: string;
  formattedTime: string; // e.g. "02:30 PM"
  formattedRange: string; // e.g. "02:30 PM – 03:00 PM"
}

/**
 * Searches for all free time slots available on a target date for the specified duration & buffer.
 */
export async function findFreeTimeSlots({
  dateString,
  durationMinutes,
  bufferMinutes = 0,
  userId,
}: FindFreeTimeParams): Promise<{ isWorkingDay: boolean; dateLabel: string; slots: AvailableTimeSlot[] }> {
  const config = await getWorkHoursConfig(userId);
  const tz = config.timezone || DEFAULT_TIMEZONE;

  const [y, m, d] = dateString.split('-').map((v) => parseInt(v, 10));
  const targetDate = new Date(y, m - 1, d, 0, 0, 0, 0);

  const parts = getLocalTimeParts(targetDate, tz);

  // Check weekly off day
  const weeklyOffDays = config.weeklyOffDays || [0];
  if (weeklyOffDays.includes(parts.dayOfWeek)) {
    return {
      isWorkingDay: false,
      dateLabel: parts.displayDate,
      slots: [],
    };
  }

  const dayStart = new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
  const dayEnd = new Date(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999);
  const existingEvents = await getUnifiedCalendarEvents(dayStart, dayEnd, userId);

  const officeStartHour = config.startHour;
  const officeStartMinute = config.startMinute || 0;
  const officeEndHour = config.endHour;
  const officeEndMinute = config.endMinute || 0;

  const lunchStartMins = (config.lunch?.startHour ?? 14) * 60 + (config.lunch?.startMinute ?? 0);
  const lunchEndMins = (config.lunch?.endHour ?? 15) * 60 + (config.lunch?.endMinute ?? 0);

  const totalRequiredMins = durationMinutes + bufferMinutes;

  const slots: AvailableTimeSlot[] = [];

  // Pointer starting at office opening
  let current = new Date(parts.year, parts.month - 1, parts.day, officeStartHour, officeStartMinute, 0, 0);
  const officeEnd = new Date(parts.year, parts.month - 1, parts.day, officeEndHour, officeEndMinute, 0, 0);

  const now = new Date();

  while (current.getTime() + totalRequiredMins * 60000 <= officeEnd.getTime()) {
    // Skip times in the past if searching for today
    if (current.getTime() < now.getTime()) {
      current = new Date(current.getTime() + 15 * 60000);
      continue;
    }

    const curParts = getLocalTimeParts(current, tz);
    const startMins = curParts.hour * 60 + curParts.minute;
    const endMins = startMins + totalRequiredMins;

    // Check lunch window overlap
    if (startMins < lunchEndMins && endMins > lunchStartMins) {
      current = new Date(parts.year, parts.month - 1, parts.day, config.lunch?.endHour ?? 15, config.lunch?.endMinute ?? 0, 0, 0);
      continue;
    }

    // Check existing event overlap
    let hasOverlap = false;
    let maxOverlapEnd = current.getTime();

    for (const ev of existingEvents) {
      if (['CANCELLED', 'MISSED'].includes(ev.status)) continue;
      const evStart = new Date(ev.startTime).getTime();
      const evTotalEnd = new Date(ev.endTime.getTime() + (ev.bufferMinutes || 0) * 60000).getTime();
      const candEnd = current.getTime() + totalRequiredMins * 60000;

      if (Math.max(current.getTime(), evStart) < Math.min(candEnd, evTotalEnd)) {
        hasOverlap = true;
        if (evTotalEnd > maxOverlapEnd) {
          maxOverlapEnd = evTotalEnd;
        }
      }
    }

    if (hasOverlap) {
      // Jump pointer to end of conflicting event rounded to next 10 mins
      current = new Date(maxOverlapEnd);
      const rem = current.getMinutes() % 10;
      if (rem > 0) {
        current.setMinutes(current.getMinutes() + (10 - rem), 0, 0);
      }
      continue;
    }

    // Free slot found!
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
    const formatTime = (d: Date) =>
      d.toLocaleTimeString('en-IN', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });

    slots.push({
      startTimeIso: current.toISOString(),
      endTimeIso: slotEnd.toISOString(),
      formattedTime: formatTime(current),
      formattedRange: `${formatTime(current)} – ${formatTime(slotEnd)}`,
    });

    // Advance pointer by 20 minutes for next candidate slot
    current = new Date(current.getTime() + 20 * 60000);
  }

  return {
    isWorkingDay: true,
    dateLabel: parts.displayDate,
    slots,
  };
}
