import { prisma } from '@/lib/prisma';
import { WorkHoursConfig, DefaultBlockDefinition } from './types';

export const DEFAULT_WORK_HOURS_CONFIG: WorkHoursConfig = {
  startHour: 10,
  startMinute: 0,
  endHour: 18,
  endMinute: 0,
  workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
  weeklyOffDays: [0], // Sunday
  timezone: 'Asia/Kolkata',
  lunch: {
    startHour: 14,
    startMinute: 0,
    endHour: 15,
    endMinute: 0,
    isProtected: true,
  },
  reminderThresholds: {
    demoMinutesBefore: 20,
    overdueCheckMinutes: 30,
    reminderLeadTimeMinutes: 10,
  },
};

export const DEFAULT_SALES_BLOCKS: DefaultBlockDefinition[] = [
  {
    startHour: 10,
    startMinute: 0,
    endHour: 10,
    endMinute: 20,
    title: "Previous Leads Check & Today's Plan",
    blockType: 'PLANNING',
    isProtected: false,
    goal: 'Review yesterday notes & align today priorities',
    primaryAction: 'PLAN DAY',
  },
  {
    startHour: 10,
    startMinute: 20,
    endHour: 10,
    endMinute: 40,
    title: 'Sales Warm-Up & Target Review',
    blockType: 'ADMIN',
    isProtected: false,
    goal: 'Check pipeline numbers & prepare pitch battle cards',
    primaryAction: 'WARM UP',
  },
  {
    startHour: 10,
    startMinute: 40,
    endHour: 12,
    endMinute: 30,
    title: '🔥 Fresh Calling & High-Response Window',
    blockType: 'CALLING',
    isProtected: false,
    goal: 'New qualified conversations and discovery calls',
    primaryAction: 'CALL NOW',
  },
  {
    startHour: 12,
    startMinute: 30,
    endHour: 13,
    endMinute: 0,
    title: 'Interested Leads & Priority Follow-ups',
    blockType: 'FOLLOW_UP',
    isProtected: false,
    goal: 'Advance engaged prospects and answer questions',
    primaryAction: 'FOLLOW UP',
  },
  {
    startHour: 13,
    startMinute: 0,
    endHour: 14,
    endMinute: 0,
    title: 'Demos / Flexible Calling',
    blockType: 'DEMO',
    isProtected: false,
    goal: 'Live OneComPro walkthroughs & requirement discovery',
    primaryAction: 'RUN DEMO',
  },
  {
    startHour: 14,
    startMinute: 0,
    endHour: 15,
    endMinute: 0,
    title: '🍴 Lunch & Re-charge (Protected)',
    blockType: 'LUNCH',
    isProtected: true,
    goal: 'Protected rest & recharge block',
    primaryAction: 'LUNCH BREAK',
  },
  {
    startHour: 15,
    startMinute: 0,
    endHour: 16,
    endMinute: 30,
    title: 'Afternoon Calls & Product Demos',
    blockType: 'CALLING',
    isProtected: false,
    goal: 'Post-lunch active selling and scheduled presentations',
    primaryAction: 'CALL / DEMO',
  },
  {
    startHour: 16,
    startMinute: 30,
    endHour: 17,
    endMinute: 30,
    title: 'Hot Leads, Closing & Objections',
    blockType: 'CLOSING',
    isProtected: false,
    goal: 'Lock in pricing, resolve pushbacks & close deals',
    primaryAction: 'CLOSE DEALS',
  },
  {
    startHour: 17,
    startMinute: 30,
    endHour: 18,
    endMinute: 0,
    title: 'Callbacks, CRM Updates & Day Report',
    blockType: 'REPORT',
    isProtected: false,
    goal: 'Complete pending callbacks, update notes & review stats',
    primaryAction: 'LOG UPDATES',
  },
];

/**
 * Loads configured work hours from UserSetting preferences or returns defaults.
 */
export async function getWorkHoursConfig(userId?: string | null): Promise<WorkHoursConfig> {
  try {
    let setting = null;
    if (userId) {
      setting = await prisma.userSetting.findUnique({ where: { userId } });
    } else {
      setting = await prisma.userSetting.findFirst();
    }

    if (setting?.preferences) {
      const prefs = JSON.parse(setting.preferences);
      if (prefs.workHours) {
        return {
          ...DEFAULT_WORK_HOURS_CONFIG,
          ...prefs.workHours,
          lunch: {
            ...DEFAULT_WORK_HOURS_CONFIG.lunch,
            ...(prefs.workHours.lunch || {}),
          },
          reminderThresholds: {
            ...DEFAULT_WORK_HOURS_CONFIG.reminderThresholds,
            ...(prefs.workHours.reminderThresholds || {}),
          },
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse user work hours preferences, using defaults:', err);
  }

  return DEFAULT_WORK_HOURS_CONFIG;
}

/**
 * Persists work hours configuration to the database.
 */
export async function saveWorkHoursConfig(
  userId: string,
  newConfig: Partial<WorkHoursConfig>
): Promise<WorkHoursConfig> {
  let setting = await prisma.userSetting.findUnique({ where: { userId } });
  let currentPrefs: Record<string, any> = {};

  if (setting?.preferences) {
    try {
      currentPrefs = JSON.parse(setting.preferences);
    } catch {
      currentPrefs = {};
    }
  }

  const mergedConfig: WorkHoursConfig = {
    ...DEFAULT_WORK_HOURS_CONFIG,
    ...(currentPrefs.workHours || {}),
    ...newConfig,
    lunch: {
      ...DEFAULT_WORK_HOURS_CONFIG.lunch,
      ...(currentPrefs.workHours?.lunch || {}),
      ...(newConfig.lunch || {}),
    },
    reminderThresholds: {
      ...DEFAULT_WORK_HOURS_CONFIG.reminderThresholds,
      ...(currentPrefs.workHours?.reminderThresholds || {}),
      ...(newConfig.reminderThresholds || {}),
    },
  };

  currentPrefs.workHours = mergedConfig;

  await prisma.userSetting.upsert({
    where: { userId },
    update: { preferences: JSON.stringify(currentPrefs) },
    create: {
      userId,
      theme: 'dark',
      preferences: JSON.stringify(currentPrefs),
    },
  });

  return mergedConfig;
}

/**
 * Generates absolute start and end Date objects for default blocks on a specific calendar day.
 */
export function getDefaultBlocksForDate(
  date: Date,
  blocks: DefaultBlockDefinition[] = DEFAULT_SALES_BLOCKS
) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  return blocks.map((b) => {
    const startTime = new Date(y, m, d, b.startHour, b.startMinute, 0, 0);
    const endTime = new Date(y, m, d, b.endHour, b.endMinute, 0, 0);
    return {
      ...b,
      startTime,
      endTime,
    };
  });
}
