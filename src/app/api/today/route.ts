import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTargetPaceStatus } from '@/lib/schedule/targetPaceService';
import { DEFAULT_SALES_BLOCKS } from '@/lib/schedule/scheduleConfig';
import { getActiveReminders } from '@/lib/schedule/reminderService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

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

    // Current block resolution
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    let currentBlock = null;
    let nextBlock = null;

    for (let i = 0; i < DEFAULT_SALES_BLOCKS.length; i++) {
      const b = DEFAULT_SALES_BLOCKS[i];
      const bStart = b.startHour * 60 + b.startMinute;
      const bEnd = b.endHour * 60 + b.endMinute;

      if (currentTotalMinutes >= bStart && currentTotalMinutes < bEnd) {
        const remainingMinutes = bEnd - currentTotalMinutes;
        currentBlock = {
          ...b,
          remainingMinutes,
          remainingFormatted: `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`,
          timeRangeFormatted: `${String(b.startHour).padStart(2, '0')}:${String(b.startMinute).padStart(2, '0')} – ${String(b.endHour).padStart(2, '0')}:${String(b.endMinute).padStart(2, '0')}`,
        };
        if (i + 1 < DEFAULT_SALES_BLOCKS.length) {
          nextBlock = DEFAULT_SALES_BLOCKS[i + 1];
        }
        break;
      }
    }

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
        time: nextScheduledDemo.scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        time: nextFollowUp.scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
