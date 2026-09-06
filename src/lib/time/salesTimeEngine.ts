import { WorkHoursConfig, DefaultBlockDefinition } from '@/lib/schedule/types';
import { DEFAULT_WORK_HOURS_CONFIG, DEFAULT_SALES_BLOCKS } from '@/lib/schedule/scheduleConfig';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export interface LocalTimeParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  dayName: string; // 'Sunday', 'Monday', etc.
  formattedTime: string; // '10:30 AM'
  formattedDate: string; // 'YYYY-MM-DD'
  displayDate: string; // 'Sun, 6 Sep 2026'
}

export type OfficeStatusCode = 'WORKING' | 'LUNCH' | 'CLOSED' | 'NOT_CLOCKED_IN';

export interface OfficeStatusResult {
  code: OfficeStatusCode;
  badgeLabel: string; // '🟢 Working' | '🟡 Lunch' | '🔴 Office Closed' | '⚪ Not Clocked In'
  title: string;
  subText: string;
  isWorkingDay: boolean;
  isWeeklyOff: boolean;
  isLunchTime: boolean;
  isOfficeHours: boolean;
  isClockedIn: boolean;
  dayName: string;
  timeString: string;
  dateString: string;
  activeDurationSeconds: number;
  activeDurationFormatted: string;
  activeSessionId?: string | null;
  clockInTimeFormatted?: string | null;
}

export interface ActiveBlockResult {
  title: string;
  blockType: string;
  goal: string;
  primaryAction: string;
  isProtected: boolean;
  remainingMinutes: number;
  remainingFormatted: string;
  timeRangeFormatted: string;
  nextBlock?: {
    title: string;
    blockType: string;
    timeRangeFormatted: string;
  } | null;
}

/**
 * Extracts year, month, day, hour, minute, second, and weekday in the specified timezone.
 */
export function getLocalTimeParts(date: Date = new Date(), tz: string = DEFAULT_TIMEZONE): LocalTimeParts {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
      weekday: 'long',
    });

    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }

    const year = parseInt(map.year, 10) || date.getFullYear();
    const month = parseInt(map.month, 10) || date.getMonth() + 1;
    const day = parseInt(map.day, 10) || date.getDate();
    let hour = parseInt(map.hour, 10) || 0;
    if (hour === 24) hour = 0; // standard 24h normalization
    const minute = parseInt(map.minute, 10) || 0;
    const second = parseInt(map.second, 10) || 0;
    const dayName = map.weekday || 'Monday';

    // Map dayName to dayOfWeek (0=Sun, 1=Mon, ..., 6=Sat)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames.indexOf(dayName) !== -1 ? dayNames.indexOf(dayName) : date.getDay();

    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayH = hour % 12 === 0 ? 12 : hour % 12;
    const formattedTime = `${displayH}:${String(minute).padStart(2, '0')} ${ampm}`;
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const displayDateFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const displayDate = displayDateFormatter.format(date);

    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      dayOfWeek,
      dayName,
      formattedTime,
      formattedDate,
      displayDate,
    };
  } catch {
    // Fallback if Intl fails
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    const dayOfWeek = date.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek] || 'Monday';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayH = hour % 12 === 0 ? 12 : hour % 12;

    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      dayOfWeek,
      dayName,
      formattedTime: `${displayH}:${String(minute).padStart(2, '0')} ${ampm}`,
      formattedDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      displayDate: date.toDateString(),
    };
  }
}

/**
 * Returns today's date string YYYY-MM-DD in Asia/Kolkata
 */
export function getTodayDateString(date: Date = new Date(), tz: string = DEFAULT_TIMEZONE): string {
  return getLocalTimeParts(date, tz).formattedDate;
}

/**
 * Returns precise UTC boundaries for the start (00:00:00.000) and end (23:59:59.999)
 * of the given calendar day in Asia/Kolkata.
 */
export function getStartAndEndOfDay(date: Date = new Date(), tz: string = DEFAULT_TIMEZONE): { start: Date; end: Date; dateString: string } {
  const parts = getLocalTimeParts(date, tz);
  const dateString = parts.formattedDate;

  // In Asia/Kolkata (UTC+5:30), start of day 00:00:00 IST is previous day 18:30:00 UTC.
  // We can construct the date with ISO string representation and parse.
  // Alternatively for general timezone support:
  const startIso = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T00:00:00.000+05:30`;
  const endIso = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T23:59:59.999+05:30`;

  const start = new Date(startIso);
  const end = new Date(endIso);

  return {
    start: isNaN(start.getTime()) ? new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0) : start,
    end: isNaN(end.getTime()) ? new Date(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999) : end,
    dateString,
  };
}

/**
 * Returns date range bounds for analytics and reporting
 */
export function getDateRangeBounds(
  range: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM',
  customStart?: string,
  customEnd?: string,
  tz: string = DEFAULT_TIMEZONE
): { start: Date; end: Date; label: string } {
  const now = new Date();
  const parts = getLocalTimeParts(now, tz);

  switch (range) {
    case 'TODAY': {
      const { start, end } = getStartAndEndOfDay(now, tz);
      return { start, end, label: 'Today' };
    }
    case 'YESTERDAY': {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const { start, end } = getStartAndEndOfDay(yesterday, tz);
      return { start, end, label: 'Yesterday' };
    }
    case 'THIS_WEEK': {
      // Monday as week start
      const diffToMonday = (parts.dayOfWeek === 0 ? -6 : 1) - parts.dayOfWeek;
      const monday = new Date(now.getTime() + diffToMonday * 24 * 60 * 60 * 1000);
      const { start } = getStartAndEndOfDay(monday, tz);
      const { end } = getStartAndEndOfDay(now, tz);
      return { start, end, label: 'This Week' };
    }
    case 'LAST_WEEK': {
      const diffToMonday = (parts.dayOfWeek === 0 ? -6 : 1) - parts.dayOfWeek;
      const lastMonday = new Date(now.getTime() + (diffToMonday - 7) * 24 * 60 * 60 * 1000);
      const lastSunday = new Date(lastMonday.getTime() + 6 * 24 * 60 * 60 * 1000);
      const { start } = getStartAndEndOfDay(lastMonday, tz);
      const { end } = getStartAndEndOfDay(lastSunday, tz);
      return { start, end, label: 'Last Week' };
    }
    case 'THIS_MONTH': {
      const startIso = `${parts.year}-${String(parts.month).padStart(2, '0')}-01T00:00:00.000+05:30`;
      const start = new Date(startIso);
      const lastDay = new Date(parts.year, parts.month, 0).getDate();
      const endIso = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`;
      const end = new Date(endIso);
      return { start, end, label: 'This Month' };
    }
    case 'LAST_MONTH': {
      const prevMonthYear = parts.month === 1 ? parts.year - 1 : parts.year;
      const prevMonth = parts.month === 1 ? 12 : parts.month - 1;
      const startIso = `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}-01T00:00:00.000+05:30`;
      const start = new Date(startIso);
      const lastDay = new Date(prevMonthYear, prevMonth, 0).getDate();
      const endIso = `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`;
      const end = new Date(endIso);
      return { start, end, label: 'Last Month' };
    }
    case 'CUSTOM': {
      const start = customStart ? new Date(customStart) : getStartAndEndOfDay(now, tz).start;
      const end = customEnd ? new Date(customEnd) : getStartAndEndOfDay(now, tz).end;
      return { start, end, label: 'Custom Range' };
    }
    default: {
      const { start, end } = getStartAndEndOfDay(now, tz);
      return { start, end, label: 'Today' };
    }
  }
}

/**
 * Calculates current Live Office Status
 */
export function calculateOfficeStatus(
  config: WorkHoursConfig = DEFAULT_WORK_HOURS_CONFIG,
  activeSession: { id: string; clockIn: Date; clockOut?: Date | null; durationSeconds?: number } | null = null,
  now: Date = new Date()
): OfficeStatusResult {
  const tz = config.timezone || DEFAULT_TIMEZONE;
  const parts = getLocalTimeParts(now, tz);

  const weeklyOffDays = config.weeklyOffDays || [0];
  const isWeeklyOff = weeklyOffDays.includes(parts.dayOfWeek);
  const isWorkingDay = (config.workingDays || [1, 2, 3, 4, 5, 6]).includes(parts.dayOfWeek) && !isWeeklyOff;

  const currentMinutes = parts.hour * 60 + parts.minute;
  const officeStartMinutes = config.startHour * 60 + (config.startMinute || 0);
  const officeEndMinutes = config.endHour * 60 + (config.endMinute || 0);

  const lunchStartMinutes = (config.lunch?.startHour ?? 14) * 60 + (config.lunch?.startMinute ?? 0);
  const lunchEndMinutes = (config.lunch?.endHour ?? 15) * 60 + (config.lunch?.endMinute ?? 0);

  const isOfficeHours = currentMinutes >= officeStartMinutes && currentMinutes < officeEndMinutes;
  const isLunchTime = currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes;
  const isClockedIn = Boolean(activeSession && !activeSession.clockOut);

  // Active duration calculation
  let activeDurationSeconds = activeSession?.durationSeconds || 0;
  if (isClockedIn && activeSession) {
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - new Date(activeSession.clockIn).getTime()) / 1000));
    activeDurationSeconds += elapsedSeconds;
  }

  const durH = Math.floor(activeDurationSeconds / 3600);
  const durM = Math.floor((activeDurationSeconds % 3600) / 60);
  const activeDurationFormatted = durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;

  const clockInTimeFormatted = isClockedIn && activeSession?.clockIn
    ? getLocalTimeParts(new Date(activeSession.clockIn), tz).formattedTime
    : null;

  const formatHourMinute = (h: number, m: number = 0) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Status determination
  if (isClockedIn) {
    let badge = '🟢 Working';
    let title = 'Sales Office Active';
    if (isWeeklyOff) {
      badge = '🟢 Working (Sunday Shift)';
      title = `${parts.dayName} Working Shift`;
    } else if (!isOfficeHours) {
      badge = '🟢 Working (After-Hours)';
      title = 'After-Hours Active Work';
    } else if (isLunchTime) {
      badge = '🟡 Lunch Window';
      title = 'Lunch Window Active';
    }

    const subText = clockInTimeFormatted
      ? `Clocked in at ${clockInTimeFormatted} • Active for ${activeDurationFormatted}`
      : `Active work session in progress • ${activeDurationFormatted}`;

    return {
      code: isLunchTime ? 'LUNCH' : 'WORKING',
      badgeLabel: badge,
      title,
      subText,
      isWorkingDay,
      isWeeklyOff,
      isLunchTime,
      isOfficeHours,
      isClockedIn: true,
      dayName: parts.dayName,
      timeString: parts.formattedTime,
      dateString: parts.formattedDate,
      activeDurationSeconds,
      activeDurationFormatted,
      activeSessionId: activeSession?.id,
      clockInTimeFormatted,
    };
  }

  // When NOT clocked in:
  if (isWeeklyOff) {
    return {
      code: 'CLOSED',
      badgeLabel: '🔴 Office Closed',
      title: `${parts.dayName} — Office Closed`,
      subText: `Weekly off day. Normal sales calls and scheduled tasks are paused today.`,
      isWorkingDay: false,
      isWeeklyOff: true,
      isLunchTime: false,
      isOfficeHours: false,
      isClockedIn: false,
      dayName: parts.dayName,
      timeString: parts.formattedTime,
      dateString: parts.formattedDate,
      activeDurationSeconds: 0,
      activeDurationFormatted: '0m',
      activeSessionId: null,
      clockInTimeFormatted: null,
    };
  }

  if (!isOfficeHours) {
    const isBefore = currentMinutes < officeStartMinutes;
    const timingStr = `${formatHourMinute(config.startHour, config.startMinute)} – ${formatHourMinute(config.endHour, config.endMinute)}`;
    return {
      code: 'CLOSED',
      badgeLabel: '🔴 Office Closed',
      title: 'Office Closed',
      subText: isBefore
        ? `Office opens at ${formatHourMinute(config.startHour, config.startMinute)} (Schedule: ${timingStr})`
        : `Office closed for the day (Schedule: ${timingStr})`,
      isWorkingDay,
      isWeeklyOff: false,
      isLunchTime: false,
      isOfficeHours: false,
      isClockedIn: false,
      dayName: parts.dayName,
      timeString: parts.formattedTime,
      dateString: parts.formattedDate,
      activeDurationSeconds: 0,
      activeDurationFormatted: '0m',
      activeSessionId: null,
      clockInTimeFormatted: null,
    };
  }

  if (isLunchTime) {
    const lunchTimingStr = `${formatHourMinute(config.lunch?.startHour ?? 14, config.lunch?.startMinute ?? 0)} – ${formatHourMinute(config.lunch?.endHour ?? 15, config.lunch?.endMinute ?? 0)}`;
    return {
      code: 'LUNCH',
      badgeLabel: '🟡 Lunch',
      title: 'Lunch Window',
      subText: `Protected rest & recharge window (${lunchTimingStr}). Outbound calls paused.`,
      isWorkingDay: true,
      isWeeklyOff: false,
      isLunchTime: true,
      isOfficeHours: true,
      isClockedIn: false,
      dayName: parts.dayName,
      timeString: parts.formattedTime,
      dateString: parts.formattedDate,
      activeDurationSeconds: 0,
      activeDurationFormatted: '0m',
      activeSessionId: null,
      clockInTimeFormatted: null,
    };
  }

  return {
    code: 'NOT_CLOCKED_IN',
    badgeLabel: '⚪ Not Clocked In',
    title: 'Not Clocked In',
    subText: 'Office is active. Please Clock In to start your sales day and track activity time.',
    isWorkingDay: true,
    isWeeklyOff: false,
    isLunchTime: false,
    isOfficeHours: true,
    isClockedIn: false,
    dayName: parts.dayName,
    timeString: parts.formattedTime,
    dateString: parts.formattedDate,
    activeDurationSeconds: 0,
    activeDurationFormatted: '0m',
    activeSessionId: null,
    clockInTimeFormatted: null,
  };
}

/**
 * Resolves current active sales block
 */
export function getActiveSalesBlock(
  now: Date = new Date(),
  config: WorkHoursConfig = DEFAULT_WORK_HOURS_CONFIG,
  blocks: DefaultBlockDefinition[] = DEFAULT_SALES_BLOCKS
): { currentBlock: ActiveBlockResult | null; nextBlock: DefaultBlockDefinition | null } {
  const parts = getLocalTimeParts(now, config.timezone || DEFAULT_TIMEZONE);
  const currentTotalMinutes = parts.hour * 60 + parts.minute;

  let currentBlock: ActiveBlockResult | null = null;
  let nextBlock: DefaultBlockDefinition | null = null;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const bStart = b.startHour * 60 + b.startMinute;
    const bEnd = b.endHour * 60 + b.endMinute;

    if (currentTotalMinutes >= bStart && currentTotalMinutes < bEnd) {
      const remainingMinutes = bEnd - currentTotalMinutes;
      const nextDef = i + 1 < blocks.length ? blocks[i + 1] : null;

      currentBlock = {
        title: b.title,
        blockType: b.blockType,
        goal: b.goal,
        primaryAction: b.primaryAction,
        isProtected: b.isProtected,
        remainingMinutes,
        remainingFormatted: `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`,
        timeRangeFormatted: `${String(b.startHour).padStart(2, '0')}:${String(b.startMinute).padStart(2, '0')} – ${String(b.endHour).padStart(2, '0')}:${String(b.endMinute).padStart(2, '0')}`,
        nextBlock: nextDef
          ? {
              title: nextDef.title,
              blockType: nextDef.blockType,
              timeRangeFormatted: `${String(nextDef.startHour).padStart(2, '0')}:${String(nextDef.startMinute).padStart(2, '0')} – ${String(nextDef.endHour).padStart(2, '0')}:${String(nextDef.endMinute).padStart(2, '0')}`,
            }
          : null,
      };
      nextBlock = nextDef;
      break;
    }
  }

  return { currentBlock, nextBlock };
}
