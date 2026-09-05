import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 1. Overdue Follow-up Calls
    const overdueFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lt: startOfToday },
        type: 'CALL',
      },
      include: {
        lead: {
          include: { contact: true, business: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    // 2. Scheduled Calls for Today
    const todayFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
        type: 'CALL',
      },
      include: {
        lead: {
          include: { contact: true, business: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 15,
    });

    // 3. High Priority / Hot Leads needing outreach
    const hotLeads = await prisma.lead.findMany({
      where: {
        temperature: 'HOT',
        status: { notIn: ['WON', 'LOST'] },
      },
      include: { contact: true, business: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    // 4. Upcoming Scheduled Demos for Today
    const todayDemos = await prisma.demo.findMany({
      where: {
        scheduledAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
        status: 'SCHEDULED',
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
