import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();

    const { type, scheduledAt, notes } = body;

    if (!scheduledAt) {
      return NextResponse.json(
        { success: false, error: 'Follow-up date and time are required.' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const followUp = await tx.followUp.create({
        data: {
          leadId,
          userId: lead.userId,
          type: type || 'CALL',
          status: 'PENDING',
          scheduledAt: new Date(scheduledAt),
          notes: notes?.trim() || null,
        },
      });

      await tx.activity.create({
        data: {
          userId: lead.userId,
          leadId,
          type: 'FOLLOW_UP_SET',
          title: 'Follow-up Scheduled',
          description: `Follow-up set for ${new Date(scheduledAt).toLocaleString()} (${type || 'CALL'})`,
        },
      });

      const targetDate = new Date(scheduledAt);

      await tx.lead.update({
        where: { id: leadId },
        data: {
          nextActionDate: targetDate,
        },
      });

      const remindAt = new Date(targetDate.getTime() - 10 * 60000);
      await tx.reminder.create({
        data: {
          userId: lead.userId,
          leadId,
          title: `⏰ Reminder: ${type || 'Follow-up'} with ${lead.title}`,
          message: notes?.trim() || `Follow-up scheduled for ${targetDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
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
