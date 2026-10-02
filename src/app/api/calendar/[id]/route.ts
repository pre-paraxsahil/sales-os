import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkTimeConflicts } from '@/lib/calendar/conflictProtectionEngine';

import { parseSalesDate, isSlotInPast } from '@/lib/time/salesTimeEngine';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { action, sourceEntity, newStartTime, durationMinutes = 30, bufferMinutes = 0, notes } = body;

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

      const reschStart = parseSalesDate(newStartTime);
      if (isNaN(reschStart.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid new start time.' },
          { status: 400 }
        );
      }

      if (isSlotInPast(reschStart)) {
        return NextResponse.json(
          { success: false, error: 'That slot has already passed.' },
          { status: 400 }
        );
      }

      const numDuration = Number(durationMinutes) || 30;
      const numBuffer = Number(bufferMinutes) || 0;

      // Re-check conflict for new time slot!
      const conflictResult = await checkTimeConflicts({
        startTime: reschStart,
        durationMinutes: numDuration,
        bufferMinutes: numBuffer,
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

      const reschEnd = new Date(reschStart.getTime() + numDuration * 60000);

      // Perform update inside transaction
      await prisma.$transaction(async (tx) => {
        if (sourceEntity === 'DEMO') {
          const updatedDemo = await tx.demo.update({
            where: { id: rawId },
            data: {
              scheduledAt: reschStart,
              durationMinutes: numDuration,
              status: 'SCHEDULED',
              ...(notes ? { notes } : {}),
            },
          });
          if (updatedDemo.leadId) {
            await tx.lead.update({
              where: { id: updatedDemo.leadId },
              data: { nextActionDate: reschStart },
            });
          }
        } else if (sourceEntity === 'FOLLOW_UP') {
          const fu = await tx.followUp.findUnique({ where: { id: rawId } });
          const userNote = notes || (fu?.notes ? fu.notes.replace(/\[duration:\d+\]\s*/gi, '').trim() : '');
          const newNotes = `[duration:${numDuration}] ${userNote}`;

          const updatedFu = await tx.followUp.update({
            where: { id: rawId },
            data: {
              scheduledAt: reschStart,
              status: 'PENDING',
              notes: newNotes,
            },
          });
          if (updatedFu.leadId) {
            await tx.lead.update({
              where: { id: updatedFu.leadId },
              data: { nextActionDate: reschStart },
            });
          }
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
              metadata: JSON.stringify({ bufferMinutes: numBuffer, durationMinutes: numDuration }),
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
      // Snooze reminder for requested minutes or default 15 mins
      const snoozeMins = Number(body.snoozeMinutes || 15);
      const snoozeUntil = new Date(Date.now() + snoozeMins * 60000);
      await prisma.reminder.updateMany({
        where: { entityId: rawId },
        data: { snoozedUntil: snoozeUntil, status: 'SNOOZED' },
      });

      return NextResponse.json({
        success: true,
        message: `Snoozed for ${snoozeMins} minutes.`,
      });
    }

    if (action === 'CHANGE_REMINDER') {
      const reminderLeadMins = Number(body.reminderLeadMinutes || 10);
      let targetStartTime: Date | null = null;

      if (sourceEntity === 'DEMO') {
        const demo = await prisma.demo.findUnique({ where: { id: rawId } });
        if (demo) targetStartTime = demo.scheduledAt;
      } else if (sourceEntity === 'FOLLOW_UP') {
        const fu = await prisma.followUp.findUnique({ where: { id: rawId } });
        if (fu) targetStartTime = fu.scheduledAt;
      } else if (sourceEntity === 'TASK') {
        const t = await prisma.task.findUnique({ where: { id: rawId } });
        if (t) targetStartTime = t.dueDate;
      } else {
        const sb = await prisma.scheduleBlock.findUnique({ where: { id: rawId } });
        if (sb) targetStartTime = sb.startTime;
      }

      const baseTime = targetStartTime || new Date();
      const remindAt = new Date(baseTime.getTime() - reminderLeadMins * 60000);

      await prisma.reminder.updateMany({
        where: { entityId: rawId },
        data: {
          remindAt: remindAt > new Date() ? remindAt : new Date(Date.now() + 60000),
          status: 'PENDING',
          isRead: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Reminder updated to ${reminderLeadMins} mins prior.`,
      });
    }

    if (action === 'EDIT_NOTES') {
      if (sourceEntity === 'DEMO') {
        await prisma.demo.update({ where: { id: rawId }, data: { notes: notes || null } });
      } else if (sourceEntity === 'FOLLOW_UP') {
        await prisma.followUp.update({ where: { id: rawId }, data: { notes: notes || null } });
      } else if (sourceEntity === 'TASK') {
        await prisma.task.update({ where: { id: rawId }, data: { description: notes || null } });
      } else {
        await prisma.scheduleBlock.update({ where: { id: rawId }, data: { notes: notes || null } });
      }

      return NextResponse.json({
        success: true,
        message: 'Notes updated.',
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
