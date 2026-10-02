import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkTimeConflicts } from '@/lib/calendar/conflictProtectionEngine';
import { normalizeActivityType } from '@/lib/calendar/salesCalendarEngine';
import { parseSalesDate, formatISTTime, formatISTDateDDMMYYYY, isSlotInPast } from '@/lib/time/salesTimeEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      activityType = 'CALL',
      leadId = null,
      startTime,
      dateString,
      timeString,
      durationMinutes = 30,
      bufferMinutes = 0,
      notes = null,
      reminderLeadMinutes = 10,
    } = body;

    if (!startTime && (!dateString || !timeString)) {
      return NextResponse.json(
        { success: false, error: 'Start time is required.' },
        { status: 400 }
      );
    }

    const start =
      dateString && timeString
        ? parseSalesDate(dateString, timeString)
        : parseSalesDate(startTime);

    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid start time format.' },
        { status: 400 }
      );
    }

    // Past time booking prevention (with 2-minute clock skew grace)
    if (isSlotInPast(start)) {
      return NextResponse.json(
        { success: false, error: 'That slot has already passed.' },
        { status: 400 }
      );
    }

    // Sanitize leadId
    const sanitizedLeadId =
      typeof leadId === 'string' && leadId.trim().length > 0 ? leadId.trim() : null;

    const user =
      (await prisma.user.findFirst({ where: { role: 'OWNER' } })) ||
      (await prisma.user.findFirst());
    const userId = user?.id || null;

    // Verify lead existence if leadId is provided
    let lead = null;
    if (sanitizedLeadId) {
      lead = await prisma.lead.findUnique({
        where: { id: sanitizedLeadId },
        include: { contact: true, business: true },
      });
      if (!lead) {
        return NextResponse.json(
          { success: false, error: 'Unable to save because the lead could not be found.' },
          { status: 404 }
        );
      }
    }

    const numDuration = Number(durationMinutes) || 30;
    const numBuffer = Number(bufferMinutes) || 0;
    const numReminderLead = Number(reminderLeadMinutes) || 10;

    // 1. Conflict Protection Pre-check
    const conflictResult = await checkTimeConflicts({
      startTime: start,
      durationMinutes: numDuration,
      bufferMinutes: numBuffer,
      userId,
    });

    if (conflictResult.hasConflict) {
      return NextResponse.json(
        {
          success: false,
          error: conflictResult.message || 'That slot is already booked.',
          conflict: conflictResult,
        },
        { status: 409 }
      );
    }

    const normalizedAct = normalizeActivityType(activityType);
    const leadName =
      lead?.business?.name || lead?.contact?.name || lead?.title || 'Prospect';
    const end = new Date(start.getTime() + numDuration * 60000);

    const userNote = notes?.trim() || '';
    const noteWithDuration = `[duration:${numDuration}] ${userNote || `${normalizedAct} with ${leadName}`}`;

    // 2. Perform atomic transactional write (Domain entity + Lead timeline Activity + Reminder)
    const result = await prisma.$transaction(async (tx) => {
      let createdRecordId = '';
      let sourceEntity: 'DEMO' | 'FOLLOW_UP' | 'TASK' | 'SCHEDULE_BLOCK' = 'SCHEDULE_BLOCK';

      if (normalizedAct === 'DEMO') {
        const demo = await tx.demo.create({
          data: {
            leadId: sanitizedLeadId,
            userId,
            scheduledAt: start,
            durationMinutes: numDuration,
            notes: userNote || `Demo scheduled with ${leadName}`,
            status: 'SCHEDULED',
          },
        });
        createdRecordId = demo.id;
        sourceEntity = 'DEMO';

        if (sanitizedLeadId) {
          await tx.activity.create({
            data: {
              leadId: sanitizedLeadId,
              userId,
              type: 'DEMO_SCHEDULED',
              title: `Demo Scheduled for ${formatISTTime(start)}`,
              description: userNote || `Demo booked with ${leadName}`,
            },
          });
          await tx.lead.update({
            where: { id: sanitizedLeadId },
            data: { nextActionDate: start },
          });
        }
      } else if (
        normalizedAct === 'CALLBACK' ||
        normalizedAct === 'FOLLOW_UP' ||
        normalizedAct === 'CALL' ||
        normalizedAct === 'CLOSING' ||
        normalizedAct === 'SEND_DETAILS' ||
        normalizedAct === 'WHATSAPP'
      ) {
        if (sanitizedLeadId) {
          const fuTypeMap: Record<string, 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'OTHER'> = {
            CALL: 'CALL',
            CALLBACK: 'CALL',
            CLOSING: 'CALL',
            FOLLOW_UP: 'CALL',
            SEND_DETAILS: 'WHATSAPP',
            WHATSAPP: 'WHATSAPP',
          };

          const followUp = await tx.followUp.create({
            data: {
              leadId: sanitizedLeadId,
              userId,
              scheduledAt: start,
              type: fuTypeMap[normalizedAct] || 'CALL',
              status: 'PENDING',
              notes: noteWithDuration,
            },
          });
          createdRecordId = followUp.id;
          sourceEntity = 'FOLLOW_UP';

          await tx.activity.create({
            data: {
              leadId: sanitizedLeadId,
              userId,
              type: 'FOLLOW_UP_SET',
              title: `FOLLOW-UP SCHEDULED: ${formatISTDateDDMMYYYY(start)} ${formatISTTime(start)}`,
              description: userNote ? `${normalizedAct}: ${userNote}` : `${normalizedAct} with ${leadName} scheduled for ${formatISTTime(start)}`,
            },
          });

          await tx.lead.update({
            where: { id: sanitizedLeadId },
            data: { nextActionDate: start },
          });
        } else {
          // General unassigned sales block
          const block = await tx.scheduleBlock.create({
            data: {
              leadId: null,
              userId,
              title: `${activityType}: General Sales Time`,
              blockType: 'CALLING',
              activityType: normalizedAct,
              startTime: start,
              endTime: end,
              priority: 'HIGH',
              status: 'ACTIVE',
              notes: userNote || `${activityType} booking`,
              metadata: JSON.stringify({ bufferMinutes: numBuffer, durationMinutes: numDuration }),
            },
          });
          createdRecordId = block.id;
          sourceEntity = 'SCHEDULE_BLOCK';
        }
      } else if (normalizedAct === 'TASK') {
        const task = await tx.task.create({
          data: {
            leadId: sanitizedLeadId,
            userId,
            title: userNote || `Sales Task: ${leadName}`,
            dueDate: start,
            priority: 'HIGH',
            status: 'PENDING',
            description: userNote,
          },
        });
        createdRecordId = task.id;
        sourceEntity = 'TASK';

        if (sanitizedLeadId) {
          await tx.activity.create({
            data: {
              leadId: sanitizedLeadId,
              userId,
              type: 'TASK_COMPLETED',
              title: `Task Scheduled: ${userNote || 'Sales Task'}`,
              description: `Due: ${formatISTTime(start)}`,
            },
          });
        }
      } else {
        // Custom block / general sales time
        const block = await tx.scheduleBlock.create({
          data: {
            leadId: sanitizedLeadId,
            userId,
            title: `${activityType}: ${leadName}`,
            blockType: 'CALLING',
            activityType: normalizedAct,
            startTime: start,
            endTime: end,
            priority: 'HIGH',
            status: 'ACTIVE',
            notes: userNote || `${activityType} booking`,
            metadata: JSON.stringify({ bufferMinutes: numBuffer, durationMinutes: numDuration }),
          },
        });
        createdRecordId = block.id;
        sourceEntity = 'SCHEDULE_BLOCK';
      }

      // Create Linked Reminder
      const remindAt = new Date(start.getTime() - numReminderLead * 60000);
      const reminder = await tx.reminder.create({
        data: {
          userId,
          leadId: sanitizedLeadId,
          title: `⏰ Reminder: ${activityType} with ${leadName}`,
          message:
            userNote ||
            `${activityType} starts at ${formatISTTime(start)}`,
          remindAt: remindAt > new Date() ? remindAt : new Date(Date.now() + 60000),
          entityId: createdRecordId,
          entityType: sourceEntity,
          status: 'PENDING',
          isRead: false,
        },
      });

      return {
        id: createdRecordId,
        sourceEntity,
        activityType: normalizedAct,
        leadName,
        leadId: sanitizedLeadId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMinutes: numDuration,
        reminderId: reminder.id,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Sales time booked successfully.',
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/calendar/book:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Something went wrong while saving. Nothing was created.',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

