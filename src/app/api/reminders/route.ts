import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveReminders } from '@/lib/schedule/reminderService';

export async function GET() {
  try {
    const reminders = await getActiveReminders();
    return NextResponse.json({ success: true, data: reminders });
  } catch (error: any) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch active reminders.', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, message, level, type, remindAt, leadId, entityId, entityType } = body;

    if (!title || !remindAt) {
      return NextResponse.json(
        { success: false, error: 'Title and remindAt are required.' },
        { status: 400 }
      );
    }

    const reminder = await prisma.reminder.create({
      data: {
        title,
        message: message || null,
        level: level || 'NORMAL',
        type: type || 'GENERAL',
        remindAt: new Date(remindAt),
        leadId: leadId || null,
        entityId: entityId || null,
        entityType: entityType || null,
      },
      include: {
        lead: { include: { contact: true, business: true } },
      },
    });

    return NextResponse.json({ success: true, data: reminder }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating reminder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create reminder.', details: error?.message },
      { status: 500 }
    );
  }
}
