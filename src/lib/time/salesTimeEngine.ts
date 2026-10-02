import { WorkHoursConfig, DefaultBlockDefinition } from '@/lib/schedule/types';
import { DEFAULT_WORK_HOURS_CONFIG, DEFAULT_SALES_BLOCKS } from '@/lib/schedule/scheduleConfig';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

/**
 * Creates a Date object representing an exact instant in Asia/Kolkata (IST, UTC+05:30).
 */
export function makeISTDate(year: number, month: number, day: number, hour: number = 0, minute: number = 0, second: number = 0): Date {
  const yStr = String(year);
  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  const hStr = String(hour).padStart(2, '0');
  const minStr = String(minute).padStart(2, '0');
  const secStr = String(second).padStart(2, '0');
  return new Date(`${yStr}-${mStr}-${dStr}T${hStr}:${minStr}:${secStr}.000+05:30`);
}

/**
 * Returns current business Date/time in Asia/Kolkata timezone.
 */
export function getNowInIST(tz: string = BUSINESS_TIMEZONE): Date {
  const parts = getLocalTimeParts(new Date(), tz);
  return makeISTDate(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second);
}

/**
 * Centralized parser for Indian (DD/MM/YYYY), ISO (YYYY-MM-DD), and relative date strings in Asia/Kolkata (IST).
 * 
 * Rules:
 * - DD/MM/YYYY: 02/10/2026 = 2 October 2026. 12/10/2026 = 12 October 2026. 10/02/2026 = 10 February 2026.
 * - DD-MM-YYYY: 02-10-2026 = 2 October 2026.
 * - YYYY-MM-DD: Standard HTML5 input date format.
 * - Relative shortcuts: "today", "tomorrow", "4 days", "10 days", "next week".
 * - Time: "16:30", "4:30 PM", "04:30 PM", "4:30pm".
 */
/**
 * Parses time strings in 12-hour (e.g. "4:30 PM", "4:30pm", "4 PM") or 24-hour ("16:30", "16:30:00", "00:00") format.
 */
export function parseTimeString(tStr: string): { hour: number; minute: number; second: number } | null {
  const trimmed = tStr.trim();
  if (!trimmed) return null;

  // 1. Matches "4:30 PM", "04:30 PM", "4:30:15 PM", "4:30pm", "4 PM", "12 AM", "12 PM"
  const ampmMatch = trimmed.match(/^(\d{1,2})(?:[:.](\d{2}))?(?::(\d{2}))?\s*([AaPp][Mm])$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const s = ampmMatch[3] ? parseInt(ampmMatch[3], 10) : 0;
    const meridiem = ampmMatch[4].toUpperCase();
    if (meridiem === 'PM' && h < 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return { hour: h, minute: m, second: s };
  }

  // 2. Matches "16:30", "16:30:00", "09:15", "9:00", "00:00:00"
  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    const s = colonMatch[3] ? parseInt(colonMatch[3], 10) : 0;
    if (!isNaN(h) && !isNaN(m)) {
      return { hour: h, minute: m, second: s };
    }
  }

  return null;
}

/**
 * Determines whether a given slot instant has already passed relative to the current instant,
 * with a business clock skew grace window (default 2 minutes).
 */
export function isSlotInPast(
  slotDate: Date,
  currentInstant: Date = new Date(),
  skewGraceMs: number = 2 * 60000
): boolean {
  return slotDate.getTime() < currentInstant.getTime() - skewGraceMs;
}

/**
 * Centralized parser for Indian (DD/MM/YYYY), ISO (YYYY-MM-DD), and relative date strings in Asia/Kolkata (IST).
 * 
 * Rules:
 * - DD/MM/YYYY: 02/10/2026 = 2 October 2026. 12/10/2026 = 12 October 2026. 10/02/2026 = 10 February 2026.
 * - DD-MM-YYYY: 02-10-2026 = 2 October 2026.
 * - YYYY-MM-DD: Standard HTML5 input date format.
 * - Relative shortcuts: "today", "tomorrow", "yesterday", "4 days", "10 days", "next week".
 * - Time: "16:30", "4:30 PM", "04:30 PM", "4:30pm", "4 PM".
 * - Full ISO timestamps: "2026-10-02T11:00:00.000Z" (converted to IST instant).
 */
export function parseSalesDate(
  dateInput: string | Date,
  timeInput?: string | null,
  tz: string = BUSINESS_TIMEZONE
): Date {
  const now = new Date();
  const nowParts = getLocalTimeParts(now, tz);

  let year = nowParts.year;
  let month = nowParts.month;
  let day = nowParts.day;
  let hour = 10; // Default sales business start hour
  let minute = 0;
  let second = 0;
  let timeExplicitlySet = false;

  // 1. Process explicit timeInput if provided
  if (timeInput && timeInput.trim()) {
    const parsedTime = parseTimeString(timeInput);
    if (parsedTime) {
      hour = parsedTime.hour;
      minute = parsedTime.minute;
      second = parsedTime.second;
      timeExplicitlySet = true;
    }
  }

  // 2. If dateInput is a Date object
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return new Date(NaN);
    const parts = getLocalTimeParts(dateInput, tz);
    year = parts.year;
    month = parts.month;
    day = parts.day;
    if (!timeExplicitlySet) {
      hour = parts.hour;
      minute = parts.minute;
      second = parts.second;
    }
    return makeISTDate(year, month, day, hour, minute, second);
  }

  // 3. If dateInput is a string
  if (typeof dateInput === 'string') {
    const raw = dateInput.trim();
    const lower = raw.toLowerCase();

    // A. Relative shortcuts: "today", "tomorrow", "yesterday", "next week", "+4 days", "+10 days", etc.
    if (lower === 'today') {
      year = nowParts.year;
      month = nowParts.month;
      day = nowParts.day;
    } else if (lower === 'tomorrow') {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const parts = getLocalTimeParts(tomorrow, tz);
      year = parts.year;
      month = parts.month;
      day = parts.day;
    } else if (lower === 'yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const parts = getLocalTimeParts(yesterday, tz);
      year = parts.year;
      month = parts.month;
      day = parts.day;
    } else if (lower.includes('next week')) {
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const parts = getLocalTimeParts(nextWeek, tz);
      year = parts.year;
      month = parts.month;
      day = parts.day;
    } else if (/^(\+)?(\d+)\s*(days?|d)?(\s*later|\s*from\s*now)?$/i.test(lower)) {
      const match = lower.match(/^(\+)?(\d+)/);
      const daysToAdd = match ? parseInt(match[2], 10) : 0;
      const target = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      const parts = getLocalTimeParts(target, tz);
      year = parts.year;
      month = parts.month;
      day = parts.day;
    }
    // B. ISO 8601 strings containing 'T' (e.g. "2026-10-02T11:00:00.000Z", "2026-10-02T16:30:00+05:30", "2026-10-02T16:30:00")
    else if (raw.includes('T')) {
      const hasTzIndicator =
        raw.endsWith('Z') ||
        raw.endsWith('z') ||
        /[+-]\d{2}(?::?\d{2})?$/.test(raw);

      if (hasTzIndicator) {
        // Absolute instant with explicit UTC or offset
        const parsedIso = new Date(raw);
        if (!isNaN(parsedIso.getTime())) {
          const parts = getLocalTimeParts(parsedIso, tz);
          year = parts.year;
          month = parts.month;
          day = parts.day;
          if (!timeExplicitlySet) {
            hour = parts.hour;
            minute = parts.minute;
            second = parts.second;
          }
          return makeISTDate(year, month, day, hour, minute, second);
        }
      }

      // ISO format without explicit timezone offset (e.g. "2026-10-02T16:30:00" or "2026-10-02T16:30")
      // In business logic, this represents Asia/Kolkata wall-clock time
      const [datePart, timePart] = raw.split('T');
      const segs = datePart.split('-').map((s) => parseInt(s.trim(), 10));
      if (segs.length === 3) {
        if (segs[0] > 1000) {
          year = segs[0];
          month = segs[1];
          day = segs[2];
        } else {
          day = segs[0];
          month = segs[1];
          year = segs[2] < 100 ? 2000 + segs[2] : segs[2];
        }
      }
      if (!timeExplicitlySet && timePart) {
        const cleanTime = timePart.split('.')[0].replace(/Z$/i, '');
        const parsedT = parseTimeString(cleanTime);
        if (parsedT) {
          hour = parsedT.hour;
          minute = parsedT.minute;
          second = parsedT.second;
        }
      }
      return makeISTDate(year, month, day, hour, minute, second);
    }
    // C. Non-ISO strings (Indian DD/MM/YYYY, YYYY-MM-DD, with or without space-delimited time)
    else {
      let datePart = raw;
      const firstSpaceIdx = raw.indexOf(' ');
      if (firstSpaceIdx > 0) {
        const candidateDate = raw.slice(0, firstSpaceIdx).trim();
        const candidateTime = raw.slice(firstSpaceIdx + 1).trim();
        // If candidateDate looks like DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD
        if (/^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(candidateDate)) {
          datePart = candidateDate;
          if (!timeExplicitlySet) {
            const parsedT = parseTimeString(candidateTime);
            if (parsedT) {
              hour = parsedT.hour;
              minute = parsedT.minute;
              second = parsedT.second;
            }
          }
        }
      }

      if (datePart.includes('/')) {
        // Indian DD/MM/YYYY format:
        // 02/10/2026 = 2 October 2026
        // 12/10/2026 = 12 October 2026
        // 10/02/2026 = 10 February 2026
        const parts = datePart.split('/').map((s) => parseInt(s.trim(), 10));
        if (parts.length === 3) {
          day = parts[0];
          month = parts[1];
          year = parts[2] < 100 ? 2000 + parts[2] : parts[2];
        }
      } else if (datePart.includes('-')) {
        const segs = datePart.split('-').map((s) => parseInt(s.trim(), 10));
        if (segs.length === 3) {
          if (segs[0] > 1000) {
            // YYYY-MM-DD
            year = segs[0];
            month = segs[1];
            day = segs[2];
          } else {
            // DD-MM-YYYY
            day = segs[0];
            month = segs[1];
            year = segs[2] < 100 ? 2000 + segs[2] : segs[2];
          }
        }
      } else {
        // Fallback: standard Date parse
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) {
          const parts = getLocalTimeParts(parsed, tz);
          year = parts.year;
          month = parts.month;
          day = parts.day;
          if (!timeExplicitlySet) {
            hour = parts.hour;
            minute = parts.minute;
            second = parts.second;
          }
        }
      }
    }
  }

  return makeISTDate(year, month, day, hour, minute, second);
}

/**
 * Converts frontend date pickers ("YYYY-MM-DD" or "DD/MM/YYYY") and time pickers directly to
 * an Asia/Kolkata (IST) Date instance, immune to browser or server local timezone shifts.
 */
export function parseISTDateStringAndTime(dateString: string, timeString: string): Date {
  return parseSalesDate(dateString, timeString);
}

/**
 * Formats a Date object into standard Indian date display: DD/MM/YYYY (e.g. "02/10/2026").
 */
export function formatISTDateDDMMYYYY(date: Date): string {
  const parts = getLocalTimeParts(date, BUSINESS_TIMEZONE);
  const dStr = String(parts.day).padStart(2, '0');
  const mStr = String(parts.month).padStart(2, '0');
  return `${dStr}/${mStr}/${parts.year}`;
}

/**
 * Formats a Date object into 12-hour IST time string with AM/PM (e.g. "4:30 PM").
 */
export function formatISTTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    timeZone: BUSINESS_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a Date object into full Indian date and time (e.g. "02/10/2026 4:30 PM").
 */
export function formatISTDateTime(date: Date): string {
  return `${formatISTDateDDMMYYYY(date)} ${formatISTTime(date)}`;
}

/**
 * Formats a Date object into IST date display string with day name (e.g. "Fri, 2 Oct 2026").
 */
export function formatISTDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    timeZone: BUSINESS_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats relative human-readable context for future/past sales commitments.
 * Examples: "Today", "Tomorrow", "10 days from now", "Due in 4 days", "Yesterday".
 */
export function formatRelativeTimeUntil(targetDate: Date, baseDate: Date = new Date(), tz: string = BUSINESS_TIMEZONE): string {
  const targetParts = getLocalTimeParts(targetDate, tz);
  const baseParts = getLocalTimeParts(baseDate, tz);

  // Compare calendar days in IST
  const targetMidnight = new Date(`${targetParts.year}-${String(targetParts.month).padStart(2, '0')}-${String(targetParts.day).padStart(2, '0')}T00:00:00.000+05:30`).getTime();
  const baseMidnight = new Date(`${baseParts.year}-${String(baseParts.month).padStart(2, '0')}-${String(baseParts.day).padStart(2, '0')}T00:00:00.000+05:30`).getTime();

  const diffDays = Math.round((targetMidnight - baseMidnight) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `Due in ${diffDays} days`;
  if (diffDays > 7) return `${diffDays} days from now`;
  return `${Math.abs(diffDays)} days ago`;
}

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
