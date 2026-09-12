import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkTimeConflicts } from '@/lib/calendar/conflictProtectionEngine';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { action, sourceEntity, newStartTime, durationMinutes = 30, bufferMinutes = 10, notes } = body;

    // Remove prefix if present (e.g., demo-uuid -> uuid)
    const rawId = id.includes('-') ? id.split('-').slice(1).join('-') : id;

    const user = (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());
    const userId = user?.id;

    if (action === 'RESCHEDULE') {
      if (!newStartTime) {
        return NextResponse.json(
          { success: false, error: 'New start time is required for rescheduling.' },
          { status: 400 }
        );
      }

      const reschStart = new Date(newStartTime);
      if (isNaN(reschStart.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid new start time.' },
          { status: 400 }
        );
      }

      // Re-check conflict for new time slot!
      const conflictResult = await checkTimeConflicts({
        startTime: reschStart,
        durationMinutes: Number(durationMinutes),
        bufferMinutes: Number(bufferMinutes),
        excludeEntityId: rawId,
        userId,
      });

      if (conflictResult.hasConflict) {
        return NextResponse.json(
          {
            success: false,
            error: conflictResult.message || 'That time is already booked.',
            conflict: conflictResult,
          },
          { status: 409 }
        );
      }

      const reschEnd = new Date(reschStart.getTime() + Number(durationMinutes) * 60000);

      // Perform update inside transaction
      await prisma.$transaction(async (tx) => {
        if (sourceEntity === 'DEMO') {
          await tx.demo.update({
            where: { id: rawId },
            data: {
              scheduledAt: reschStart,
              durationMinutes: Number(durationMinutes),
              status: 'SCHEDULED',
              ...(notes ? { notes } : {}),
            },
          });
        } else if (sourceEntity === 'FOLLOW_UP') {
          await tx.followUp.update({
            where: { id: rawId },
            data: {
              scheduledAt: reschStart,
              status: 'PENDING',
              ...(notes ? { notes } : {}),
            },
          });
        } else if (sourceEntity === 'TASK') {
          await tx.task.update({
            where: { id: rawId },
            data: {
              dueDate: reschStart,
              status: 'PENDING',
              ...(notes ? { description: notes } : {}),
            },
          });
        } else {
          await tx.scheduleBlock.update({
            where: { id: rawId },
            data: {
              startTime: reschStart,
              endTime: reschEnd,
              status: 'ACTIVE',
              ...(notes ? { notes } : {}),
            },
          });
        }

        // Update linked reminder
        const remindAt = new Date(reschStart.getTime() - 10 * 60000);
        await tx.reminder.updateMany({
          where: { entityId: rawId },
          data: {
            remindAt: remindAt > new Date() ? remindAt : new Date(Date.now() + 60000),
            status: 'PENDING',
            isRead: false,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Rescheduled successfully.',
      });
    }

    if (action === 'MARK_DONE') {
      await prisma.$transaction(async (tx) => {
        if (sourceEntity === 'DEMO') {
          await tx.demo.update({
            where: { id: rawId },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
        } else if (sourceEntity === 'FOLLOW_UP') {
          await tx.followUp.update({
            where: { id: rawId },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
        } else if (sourceEntity === 'TASK') {
          await tx.task.update({
            where: { id: rawId },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
        } else {
          await tx.scheduleBlock.update({
            where: { id: rawId },
            data: { status: 'COMPLETED' },
          });
        }

        // Mark linked reminder done
        await tx.reminder.updateMany({
          where: { entityId: rawId },
          data: { status: 'COMPLETED', completedAt: new Date(), isRead: true },
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Marked as completed.',
      });
    }

    if (action === 'CANCEL') {
      await prisma.$transaction(async (tx) => {
        if (sourceEntity === 'DEMO') {
          await tx.demo.update({
            where: { id: rawId },
            data: { status: 'CANCELLED' },
          });
        } else if (sourceEntity === 'FOLLOW_UP') {
          await tx.followUp.update({
            where: { id: rawId },
            data: { status: 'CANCELLED' },
          });
        } else if (sourceEntity === 'TASK') {
          await tx.task.update({
            where: { id: rawId },
            data: { status: 'CANCELLED' },
          });
        } else {
          await tx.scheduleBlock.update({
            where: { id: rawId },
            data: { status: 'CANCELLED' },
          });
        }

        await tx.reminder.updateMany({
          where: { entityId: rawId },
          data: { status: 'CANCELLED' },
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Booking cancelled.',
      });
    }

    if (action === 'SNOOZE') {
      // Snooze reminder for 15 mins
      const snoozeUntil = new Date(Date.now() + 15 * 60000);
      await prisma.reminder.updateMany({
        where: { entityId: rawId },
        data: { snoozedUntil: snoozeUntil, status: 'SNOOZED' },
      });

      return NextResponse.json({
        success: true,
        message: 'Snoozed for 15 minutes.',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in PATCH /api/calendar/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update booking.', details: error?.message },
      { status: 500 }
    );
  }
}
