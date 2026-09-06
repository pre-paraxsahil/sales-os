import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStartAndEndOfDay, DEFAULT_TIMEZONE } from '@/lib/time/salesTimeEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();
    const { start: startOfToday, end: endOfToday } = getStartAndEndOfDay(now, DEFAULT_TIMEZONE);

    // 1. Overdue Follow-up Calls (excluding archived leads)
    const overdueFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lt: startOfToday },
        type: 'CALL',
        lead: { archivedAt: null },
      },
      include: {
        lead: {
          include: { contact: true, business: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    // 2. Scheduled Calls for Today (excluding archived leads)
    const todayFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
        type: 'CALL',
        lead: { archivedAt: null },
      },
      include: {
        lead: {
          include: { contact: true, business: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 15,
    });

    // 3. High Priority / Hot Leads needing outreach (excluding archived leads)
    const hotLeads = await prisma.lead.findMany({
      where: {
        temperature: 'HOT',
        status: { notIn: ['WON', 'LOST'] },
        archivedAt: null,
      },
      include: { contact: true, business: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    // 4. Upcoming Scheduled Demos for Today (excluding archived leads)
    const todayDemos = await prisma.demo.findMany({
      where: {
        scheduledAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
        status: 'SCHEDULED',
        lead: { archivedAt: null },
      },
      include: {
        lead: {
          include: { contact: true, business: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        overdue: overdueFollowUps,
        today: todayFollowUps,
        hotLeads,
        todayDemos,
        counts: {
          overdue: overdueFollowUps.length,
          today: todayFollowUps.length,
          hotLeads: hotLeads.length,
          demos: todayDemos.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching today calls cockpit data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch today calls data.', details: error?.message },
      { status: 500 }
    );
  }
}
