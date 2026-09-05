import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dynamicallyRearrangeSchedule, ScheduleItem } from '@/lib/schedule/reschedulingEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { newCommitment, date } = body;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // Fetch existing schedule blocks for the day
    const existingBlocks = await prisma.scheduleBlock.findMany({
      where: {
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { startTime: 'asc' },
    });

    const mappedBlocks: ScheduleItem[] = existingBlocks.map((b) => ({
      id: b.id,
      title: b.title,
      type: b.blockType === 'LUNCH' ? 'LUNCH' : 'BLOCK',
      startTime: b.startTime,
      endTime: b.endTime,
      isProtected: b.isProtected,
      priority: b.priority || 'MEDIUM',
    }));

    let commitmentItem: ScheduleItem;
    if (newCommitment) {
      commitmentItem = {
        id: newCommitment.id || 'new-demo',
        title: newCommitment.title || 'New Product Demo',
        type: newCommitment.type || 'DEMO',
        startTime: new Date(newCommitment.startTime),
        endTime: new Date(newCommitment.endTime),
        isProtected: true,
        priority: 'CRITICAL',
      };
    } else {
      // Find latest scheduled demo for today to test rearrangement
      const latestDemo = await prisma.demo.findFirst({
        where: {
          scheduledAt: { gte: startOfDay, lte: endOfDay },
          status: 'SCHEDULED',
        },
        include: { lead: { include: { business: true } } },
      });

      if (!latestDemo) {
        return NextResponse.json({
          success: true,
          message: 'No demo to rearrange around.',
          data: { movedItems: [], conflictsRemaining: [] },
        });
      }

      const duration = latestDemo.durationMinutes || 30;
      commitmentItem = {
        id: latestDemo.id,
        title: `Demo: ${latestDemo.lead?.business?.name || 'Prospect'}`,
        type: 'DEMO',
        startTime: latestDemo.scheduledAt,
        endTime: new Date(latestDemo.scheduledAt.getTime() + duration * 60000),
        isProtected: true,
        priority: 'CRITICAL',
      };
    }

    const rearrangeResult = dynamicallyRearrangeSchedule(commitmentItem, mappedBlocks);

    // Persist updated blocks in transaction
    await prisma.$transaction(async (tx) => {
      for (const moved of rearrangeResult.movedItems) {
        const found = rearrangeResult.updatedBlocks.find((b) => b.id === moved.id);
        if (found && !found.id.startsWith('new-')) {
          await tx.scheduleBlock.update({
            where: { id: found.id },
            data: {
              startTime: found.startTime,
              endTime: found.endTime,
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'SCHEDULE UPDATED',
      data: {
        movedItems: rearrangeResult.movedItems,
        conflictsRemaining: rearrangeResult.conflictsRemaining,
      },
    });
  } catch (error: any) {
    console.error('Error recalculating schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to recalculate schedule.', details: error?.message },
      { status: 500 }
    );
  }
}
