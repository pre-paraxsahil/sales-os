import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkTimeConflicts } from '@/lib/calendar/conflictProtectionEngine';
import { parseSalesDate, formatISTTime, formatISTDateDDMMYYYY } from '@/lib/time/salesTimeEngine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();

    const { type, scheduledAt, notes, durationMinutes = 30, reminderLeadMinutes = 10 } = body;

    if (!scheduledAt) {
      return NextResponse.json(
        { success: false, error: 'Follow-up date and time are required.' },
        { status: 400 }
      );
    }

    const targetDate = parseSalesDate(scheduledAt);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduled date format.' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const duration = Number(durationMinutes) || 30;
    const numReminderLead = Number(reminderLeadMinutes) || 10;

    // Conflict Check
    const conflictResult = await checkTimeConflicts({
      startTime: targetDate,
      durationMinutes: duration,
      userId: lead.userId,
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

    const userNote = notes?.trim() || '';
    const noteWithDuration = `[duration:${duration}] ${userNote || `${type || 'Follow-up'} with ${lead.title}`}`;

    const result = await prisma.$transaction(async (tx) => {
      const followUp = await tx.followUp.create({
        data: {
          leadId,
          userId: lead.userId,
          type: type || 'CALL',
          status: 'PENDING',
          scheduledAt: targetDate,
          notes: noteWithDuration,
        },
      });

      await tx.activity.create({
        data: {
          userId: lead.userId,
          leadId,
          type: 'FOLLOW_UP_SET',
          title: `FOLLOW-UP SCHEDULED: ${formatISTDateDDMMYYYY(targetDate)} ${formatISTTime(targetDate)}`,
          description: userNote ? `${type || 'Follow-up'}: ${userNote}` : `${type || 'Follow-up'} with ${lead.title} scheduled for ${formatISTTime(targetDate)}`,
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: {
          nextActionDate: targetDate,
        },
      });

      const remindAt = new Date(targetDate.getTime() - numReminderLead * 60000);
      await tx.reminder.create({
        data: {
          userId: lead.userId,
          leadId,
          title: `⏰ Reminder: ${type || 'Follow-up'} with ${lead.title}`,
          message: userNote || `Follow-up scheduled for ${formatISTTime(targetDate)}`,
          remindAt: remindAt > new Date() ? remindAt : new Date(Date.now() + 60000),
          entityId: followUp.id,
          entityType: 'FOLLOW_UP',
          status: 'PENDING',
          isRead: false,
        },
      });

      return followUp;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating follow-up:', error);
    return NextResponse.json({ success: false, error: 'Failed to create follow-up.' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const followUps = await prisma.followUp.findMany({
      where: { leadId },
      orderBy: { scheduledAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: followUps });
  } catch (error: any) {
    console.error('Error fetching follow-ups:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch follow-ups' }, { status: 500 });
  }
}
