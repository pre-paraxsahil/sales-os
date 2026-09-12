import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWorkHoursConfig } from '@/lib/schedule/scheduleConfig';
import { getStartAndEndOfDay, getTodayDateString } from '@/lib/time/salesTimeEngine';
import { getUnifiedCalendarEvents, calculateDayCapacity } from '@/lib/calendar/salesCalendarEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const viewParam = searchParams.get('view') || 'TODAY'; // TODAY, TOMORROW, WEEK
    const dateParam = searchParams.get('date'); // YYYY-MM-DD

    const user = (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());
    const userId = user?.id;

    const config = await getWorkHoursConfig(userId);
    const tz = config.timezone || 'Asia/Kolkata';

    let targetDate = new Date();
    if (dateParam) {
      const [y, m, d] = dateParam.split('-').map((v) => parseInt(v, 10));
      if (y && m && d) {
        targetDate = new Date(y, m - 1, d, 12, 0, 0);
      }
    } else if (viewParam === 'TOMORROW') {
      targetDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    let startDate: Date;
    let endDate: Date;

    if (viewParam === 'WEEK') {
      // 7-day window starting from targetDate
      const { start } = getStartAndEndOfDay(targetDate, tz);
      startDate = start;
      const endWeek = new Date(targetDate.getTime() + 6 * 24 * 60 * 60 * 1000);
      endDate = getStartAndEndOfDay(endWeek, tz).end;
    } else {
      const { start, end } = getStartAndEndOfDay(targetDate, tz);
      startDate = start;
      endDate = end;
    }

    const [events, capacity] = await Promise.all([
      getUnifiedCalendarEvents(startDate, endDate, userId),
      calculateDayCapacity(targetDate, userId),
    ]);

    // Extract missed events across the system
    const now = new Date();
    const missedEvents = events.filter(
      (ev) => ev.status === 'MISSED' && ev.type !== 'LUNCH'
    );

    return NextResponse.json({
      success: true,
      data: {
        view: viewParam,
        dateString: getTodayDateString(targetDate, tz),
        displayDate: targetDate.toDateString(),
        events,
        capacity,
        missedEvents,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales calendar events.', details: error?.message },
      { status: 500 }
    );
  }
}
