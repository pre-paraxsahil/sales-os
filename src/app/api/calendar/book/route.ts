import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkTimeConflicts } from '@/lib/calendar/conflictProtectionEngine';
import { normalizeActivityType } from '@/lib/calendar/salesCalendarEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      activityType = 'CALL',
      leadId = null,
      startTime,
      durationMinutes = 30,
      bufferMinutes = 10,
      notes = null,
      reminderLeadMinutes = 10,
    } = body;

    if (!startTime) {
      return NextResponse.json(
        { success: false, error: 'Start time is required.' },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid start time format.' },
        { status: 400 }
      );
    }

    // Past time booking prevention
    const now = new Date();
    if (start.getTime() < now.getTime() - 60000) {
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

    // 1. Conflict Protection Pre-check
    const conflictResult = await checkTimeConflicts({
      startTime: start,
      durationMinutes: Number(durationMinutes),
      bufferMinutes: Number(bufferMinutes),
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
    const end = new Date(start.getTime() + Number(durationMinutes) * 60000);
    const numDuration = Number(durationMinutes);
    const numBuffer = Number(bufferMinutes);
    const numReminderLead = Number(reminderLeadMinutes);

    // 2. Perform transactional write (Domain entity + Activity + Reminder)
    const result = await prisma.$transaction(async (tx) => {
      let createdRecordId = '';
      let sourceEntity = 'SCHEDULE_BLOCK';

      if (normalizedAct === 'DEMO') {
        const demo = await tx.demo.create({
          data: {
            leadId: sanitizedLeadId,
            userId,
            scheduledAt: start,
            durationMinutes: numDuration,
            notes: notes || `Demo scheduled with ${leadName}`,
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
              title: `Demo Scheduled for ${start.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}`,
              description: notes || `Demo booked with ${leadName}`,
            },
          });
        }
      } else if (
        normalizedAct === 'CALLBACK' ||
        normalizedAct === 'FOLLOW_UP' ||
        normalizedAct === 'SEND_DETAILS'
      ) {
        const fuTypeMap: Record<string, 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'OTHER'> = {
          CALLBACK: 'CALL',
          FOLLOW_UP: 'CALL',
          SEND_DETAILS: 'WHATSAPP',
        };

        const followUp = await tx.followUp.create({
          data: {
            leadId: sanitizedLeadId,
            userId,
            scheduledAt: start,
            type: fuTypeMap[normalizedAct] || 'CALL',
            status: 'PENDING',
            notes: notes || `${normalizedAct} with ${leadName}`,
          },
        });
        createdRecordId = followUp.id;
        sourceEntity = 'FOLLOW_UP';

        if (sanitizedLeadId) {
          await tx.activity.create({
            data: {
              leadId: sanitizedLeadId,
              userId,
              type: 'FOLLOW_UP_SET',
              title: `${normalizedAct} Scheduled`,
              description: notes || `Scheduled for ${start.toLocaleString('en-IN')}`,
            },
          });
        }
      } else if (normalizedAct === 'TASK') {
        const task = await tx.task.create({
          data: {
            leadId: sanitizedLeadId,
            userId,
            title: notes || `Sales Task: ${leadName}`,
            dueDate: start,
            priority: 'HIGH',
            status: 'PENDING',
            description: notes,
          },
        });
        createdRecordId = task.id;
        sourceEntity = 'TASK';
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
            notes: notes || `${activityType} booking`,
            metadata: JSON.stringify({ bufferMinutes: numBuffer }),
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
            notes ||
            `${activityType} starts at ${start.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}`,
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
        error: 'Something went wrong while saving. Nothing was created.',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

