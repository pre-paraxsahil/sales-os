import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDefaultBlocksForDate } from '@/lib/schedule/scheduleConfig';
import { detectScheduleConflicts, ScheduleItem } from '@/lib/schedule/reschedulingEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // 1. Fetch persisted schedule blocks
    let blocks = await prisma.scheduleBlock.findMany({
      where: {
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        lead: { include: { contact: true, business: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // If no blocks exist for today yet, auto-populate from default blocks
    if (blocks.length === 0) {
      const defaultBlocks = getDefaultBlocksForDate(targetDate);
      await prisma.scheduleBlock.createMany({
        data: defaultBlocks.map((b) => ({
          title: b.title,
          blockType: b.blockType,
          startTime: b.startTime,
          endTime: b.endTime,
          isProtected: b.isProtected,
          priority: b.isProtected ? 'CRITICAL' : 'MEDIUM',
          notes: b.goal,
        })),
      });

      blocks = await prisma.scheduleBlock.findMany({
        where: {
          startTime: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          lead: { include: { contact: true, business: true } },
        },
        orderBy: { startTime: 'asc' },
      });
    }

    // 2. Fetch scheduled Demos for that date
    const demos = await prisma.demo.findMany({
      where: {
        scheduledAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        lead: { include: { contact: true, business: true } },
        demoPlan: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // 3. Fetch scheduled Follow-up calls
    const followUps = await prisma.followUp.findMany({
      where: {
        scheduledAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        lead: { include: { contact: true, business: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // 4. Map to unified schedule items for conflict detection
    const scheduleItems: ScheduleItem[] = [
      ...blocks.map((b) => ({
        id: b.id,
        title: b.title,
        type: b.blockType === 'LUNCH' ? 'LUNCH' : 'BLOCK',
        startTime: b.startTime,
        endTime: b.endTime,
        isProtected: b.isProtected,
        priority: b.priority || 'MEDIUM',
      })),
      ...demos.map((d) => {
        const duration = d.durationMinutes || 30;
        return {
          id: d.id,
          title: `Demo: ${d.lead?.business?.name || d.lead?.title || 'Prospect'}`,
          type: 'DEMO',
          startTime: d.scheduledAt,
          endTime: new Date(d.scheduledAt.getTime() + duration * 60000),
          isProtected: true,
          priority: 'CRITICAL',
          leadId: d.leadId,
        };
      }),
    ];

    const conflicts = detectScheduleConflicts(scheduleItems);

    return NextResponse.json({
      success: true,
      data: {
        date: targetDate.toISOString(),
        blocks,
        demos,
        followUps,
        conflicts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule.', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, blockType, startTime, endTime, isProtected, notes, leadId, priority } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Title, startTime, and endTime are required.' },
        { status: 400 }
      );
    }

    const block = await prisma.scheduleBlock.create({
      data: {
        title,
        blockType: blockType || 'CUSTOM',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isProtected: !!isProtected,
        priority: priority || 'MEDIUM',
        notes: notes || null,
        leadId: leadId || null,
      },
      include: {
        lead: { include: { contact: true, business: true } },
      },
    });

    return NextResponse.json({ success: true, data: block }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating schedule block:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create schedule block.', details: error?.message },
      { status: 500 }
    );
  }
}
