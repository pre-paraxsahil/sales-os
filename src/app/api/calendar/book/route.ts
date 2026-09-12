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

    const user = (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());
    const userId = user?.id;

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
          error: conflictResult.message || 'That time is already booked.',
          conflict: conflictResult,
        },
        { status: 409 }
      );
    }

    const normalizedAct = normalizeActivityType(activityType);
    let lead = null;
    if (leadId) {
      lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { contact: true, business: true },
      });
    }

    const leadName = lead?.business?.name || lead?.contact?.name || lead?.title || 'Prospect';
    const end = new Date(start.getTime() + Number(durationMinutes) * 60000);

    let createdRecordId = '';
    let sourceEntity = 'SCHEDULE_BLOCK';

    // 2. Create authoritative record
    if (normalizedAct === 'DEMO') {
      const demo = await prisma.demo.create({
        data: {
          leadId: leadId || null,
          userId: userId || null,
          scheduledAt: start,
          durationMinutes: Number(durationMinutes),
          notes: notes || `Demo scheduled with ${leadName}`,
          status: 'SCHEDULED',
        },
      });
      createdRecordId = demo.id;
      sourceEntity = 'DEMO';

      // Log Lead Activity
      if (leadId) {
        await prisma.activity.create({
          data: {
            leadId,
            userId: userId || null,
            type: 'DEMO_SCHEDULED',
            title: `Demo Scheduled for ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            description: notes || `Demo booked with ${leadName}`,
          },
        });
      }
    } else if (normalizedAct === 'CALLBACK' || normalizedAct === 'FOLLOW_UP' || normalizedAct === 'SEND_DETAILS') {
      const fuTypeMap: Record<string, 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'OTHER'> = {
        CALLBACK: 'CALL',
        FOLLOW_UP: 'CALL',
        SEND_DETAILS: 'WHATSAPP',
      };

      const followUp = await prisma.followUp.create({
        data: {
          leadId: leadId || null,
          userId: userId || null,
          scheduledAt: start,
          type: fuTypeMap[normalizedAct] || 'CALL',
          status: 'PENDING',
          notes: notes || `${normalizedAct} with ${leadName}`,
        },
      });
      createdRecordId = followUp.id;
      sourceEntity = 'FOLLOW_UP';

      if (leadId) {
        await prisma.activity.create({
          data: {
            leadId,
            userId: userId || null,
            type: 'FOLLOW_UP_SET',
            title: `${normalizedAct} Scheduled`,
            description: notes || `Scheduled for ${start.toLocaleString()}`,
          },
        });
      }
    } else if (normalizedAct === 'TASK') {
      const task = await prisma.task.create({
        data: {
          leadId: leadId || null,
          userId: userId || null,
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
      // General Sales Booking / Block
      const block = await prisma.scheduleBlock.create({
        data: {
          leadId: leadId || null,
          userId: userId || null,
          title: `${activityType}: ${leadName}`,
          blockType: 'CALLING',
          activityType: normalizedAct,
          startTime: start,
          endTime: end,
          priority: 'HIGH',
          status: 'ACTIVE',
          notes: notes || `${activityType} booking`,
          metadata: JSON.stringify({ bufferMinutes: Number(bufferMinutes) }),
        },
      });
      createdRecordId = block.id;
      sourceEntity = 'SCHEDULE_BLOCK';
    }

    // 3. Create Linked Reminder
    const remindAt = new Date(start.getTime() - Number(reminderLeadMinutes) * 60000);
    const reminder = await prisma.reminder.create({
      data: {
        userId: userId || null,
        leadId: leadId || null,
        title: `⏰ Reminder: ${activityType} with ${leadName}`,
        message: notes || `${activityType} starts at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        remindAt: remindAt > new Date() ? remindAt : new Date(Date.now() + 60000),
        entityId: createdRecordId,
        entityType: 'CALENDAR_BOOKING',
        status: 'PENDING',
        isRead: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Sales time booked successfully.',
        data: {
          id: createdRecordId,
          sourceEntity,
          activityType: normalizedAct,
          leadName,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          durationMinutes: Number(durationMinutes),
          reminderId: reminder.id,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/calendar/book:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to book sales time.', details: error?.message },
      { status: 500 }
    );
  }
}
