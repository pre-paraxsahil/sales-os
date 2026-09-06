import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTargetPaceStatus } from '@/lib/schedule/targetPaceService';
import { getWorkHoursConfig } from '@/lib/schedule/scheduleConfig';
import { getActiveReminders } from '@/lib/schedule/reminderService';
import {
  getStartAndEndOfDay,
  getTodayDateString,
  calculateOfficeStatus,
  getActiveSalesBlock,
  getLocalTimeParts,
} from '@/lib/time/salesTimeEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const user = (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());
    const config = await getWorkHoursConfig(user?.id);
    const tz = config.timezone || 'Asia/Kolkata';

    const now = new Date();
    const { start: startOfToday, end: endOfToday } = getStartAndEndOfDay(now, tz);
    const todayDateStr = getTodayDateString(now, tz);

    // Fetch user's active session for today
    const activeSession = user
      ? await prisma.workSession.findFirst({
          where: {
            userId: user.id,
            workDate: todayDateStr,
            clockOut: null,
          },
          orderBy: { clockIn: 'desc' },
        })
      : null;

    const officeStatus = calculateOfficeStatus(config, activeSession, now);

    const [
      todayCallsCount,
      pendingFollowUpsCount,
      todayDemosCount,
      totalLeadsCount,
      overdueFollowUpsCount,
      connectedCallsCount,
      targetPace,
      activeReminders,
      nextScheduledDemo,
      nextFollowUp,
    ] = await Promise.all([
      prisma.call.count({
        where: {
          occurredAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
      prisma.followUp.count({
        where: {
          status: 'PENDING',
          scheduledAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
      prisma.demo.count({
        where: {
          scheduledAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
      prisma.lead.count(),
      prisma.followUp.count({
        where: {
          status: 'PENDING',
          scheduledAt: { lt: now },
        },
      }),
      prisma.call.count({
        where: {
          occurredAt: { gte: startOfToday, lte: endOfToday },
          outcome: { in: ['CONNECTED', 'INTERESTED', 'SCHEDULED_DEMO', 'DEMO_BOOKED'] },
        },
      }),
      getTargetPaceStatus(),
      getActiveReminders(),
      prisma.demo.findFirst({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { gte: now, lte: endOfToday },
        },
        include: {
          lead: { include: { contact: true, business: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.followUp.findFirst({
        where: {
          status: 'PENDING',
          scheduledAt: { gte: now, lte: endOfToday },
        },
        include: {
          lead: { include: { contact: true, business: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);

    // Active block resolution via unified time engine
    const { currentBlock, nextBlock } = getActiveSalesBlock(now, config);

    // Determine next activity (demo takes precedence over regular follow-up if earlier or equal)
    let nextActivity = null;
    if (nextScheduledDemo) {
      const diffMinutes = Math.round((nextScheduledDemo.scheduledAt.getTime() - now.getTime()) / 60000);
      nextActivity = {
        type: 'DEMO',
        id: nextScheduledDemo.id,
        leadId: nextScheduledDemo.leadId,
        title: `Product Demo with ${nextScheduledDemo.lead?.business?.name || nextScheduledDemo.lead?.title || 'Prospect'}`,
        contactName: nextScheduledDemo.lead?.contact?.name,
        time: getLocalTimeParts(nextScheduledDemo.scheduledAt, tz).formattedTime,
        countdownMinutes: diffMinutes,
        countdownText: diffMinutes > 60 ? `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m` : `${diffMinutes} minutes`,
      };
    } else if (nextFollowUp) {
      const diffMinutes = Math.round((nextFollowUp.scheduledAt.getTime() - now.getTime()) / 60000);
      nextActivity = {
        type: nextFollowUp.type,
        id: nextFollowUp.id,
        leadId: nextFollowUp.leadId,
        title: `Follow-up with ${nextFollowUp.lead?.contact?.name || nextFollowUp.lead?.title || 'Lead'}`,
        contactName: nextFollowUp.lead?.contact?.name,
        time: getLocalTimeParts(nextFollowUp.scheduledAt, tz).formattedTime,
        countdownMinutes: diffMinutes,
        countdownText: diffMinutes > 60 ? `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m` : `${diffMinutes} minutes`,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          todayCalls: todayCallsCount,
          connectedCalls: connectedCallsCount,
          pendingFollowUps: pendingFollowUpsCount,
          overdueFollowUps: overdueFollowUpsCount,
          todayDemos: todayDemosCount,
          totalLeads: totalLeadsCount,
        },
        officeStatus,
        activeSession,
        targetPace,
        currentBlock,
        nextBlock,
        nextActivity,
        activeReminders,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/today:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch today overview.', details: error?.message },
      { status: 500 }
    );
  }
}
