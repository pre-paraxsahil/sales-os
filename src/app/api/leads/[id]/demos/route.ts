import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();

    const { scheduledAt, durationMinutes, meetingUrl, notes } = body;

    if (!scheduledAt) {
      return NextResponse.json(
        { success: false, error: 'Scheduled date and time are required.' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const demo = await tx.demo.create({
        data: {
          leadId,
          userId: lead.userId,
          contactId: lead.contactId,
          status: 'SCHEDULED',
          scheduledAt: new Date(scheduledAt),
          durationMinutes: durationMinutes ? Number(durationMinutes) : 30,
          meetingUrl: meetingUrl?.trim() || null,
          notes: notes?.trim() || null,
        },
      });

      await tx.activity.create({
        data: {
          userId: lead.userId,
          leadId,
          type: 'DEMO_SCHEDULED',
          title: 'Demo Scheduled',
          description: `Product demo scheduled for ${new Date(scheduledAt).toLocaleString()}`,
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: {
          nextActionDate: new Date(scheduledAt),
          status: lead.status === 'NEW' ? 'QUALIFIED' : lead.status,
        },
      });

      return demo;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error scheduling demo:', error);
    return NextResponse.json({ success: false, error: 'Failed to schedule demo.' }, { status: 500 });
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

