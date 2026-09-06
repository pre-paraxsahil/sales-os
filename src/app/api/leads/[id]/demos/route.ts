import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();

    const { scheduledAt, durationMinutes = 30, meetingUrl, notes, title } = body;

    if (!scheduledAt) {
      return NextResponse.json(
        { success: false, error: 'Scheduled date and time are required.' },
        { status: 400 }
      );
    }

    const demoDate = new Date(scheduledAt);
    if (isNaN(demoDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date and time format provided.' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true, business: true },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const duration = durationMinutes ? Number(durationMinutes) : 30;
    const endTime = new Date(demoDate.getTime() + duration * 60000);
    const demoTitle = title || `Demo: ${lead.business?.name || lead.contact?.name || lead.title}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Demo record
      const demo = await tx.demo.create({
        data: {
          leadId,
          userId: lead.userId,
          contactId: lead.contactId,
          status: 'SCHEDULED',
          scheduledAt: demoDate,
          durationMinutes: duration,
          meetingUrl: meetingUrl?.trim() || null,
          notes: notes?.trim() || null,
        },
      });

      // 2. Create ScheduleBlock for Calendar & Today synchronization
      await tx.scheduleBlock.create({
        data: {
          userId: lead.userId,
          leadId,
          title: demoTitle,
          blockType: 'DEMO',
          startTime: demoDate,
          endTime,
          isProtected: true,
          priority: 'CRITICAL',
          notes: notes?.trim() || null,
        },
      });

      // 3. Create Reminder for push alerts
      await tx.reminder.create({
        data: {
          userId: lead.userId,
          leadId,
          title: `Upcoming Demo: ${lead.title}`,
          message: notes?.trim() || `Product demo scheduled for ${demoDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          level: 'HIGH',
          type: 'DEMO',
          entityId: demo.id,
          entityType: 'DEMO',
          remindAt: demoDate,
        },
      });

      // 4. Create Activity
      await tx.activity.create({
        data: {
          userId: lead.userId,
          leadId,
          type: 'DEMO_SCHEDULED',
          title: 'Demo Scheduled',
          description: `Product demo scheduled for ${demoDate.toLocaleString()}`,
          occurredAt: new Date(),
        },
      });

      // 5. Update Lead stage and next action date
      await tx.lead.update({
        where: { id: leadId },
        data: {
          nextActionDate: demoDate,
          status: lead.status === 'NEW' ? 'QUALIFIED' : lead.status,
          updatedAt: new Date(),
        },
      });

      return demo;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error scheduling demo:', error);
    return NextResponse.json({ success: false, error: 'Failed to schedule demo.', details: error?.message }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const demos = await prisma.demo.findMany({
      where: { leadId },
      orderBy: { scheduledAt: 'desc' },
      include: { demoPlan: true },
    });
    return NextResponse.json({ success: true, data: demos });
  } catch (error: any) {
    console.error('Error fetching demos:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch demos.' }, { status: 500 });
  }
}

