import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  completeReminder,
  snoozeReminder,
  openReminder,
  rescheduleReminder,
} from '@/lib/schedule/reminderService';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { action, minutes } = body;

    const normalizedAction = action?.toString().toUpperCase();

    let result;
    if (normalizedAction === 'COMPLETE') {
      result = await completeReminder(id);
    } else if (normalizedAction === 'SNOOZE') {
      result = await snoozeReminder(id, minutes || 15);
    } else if (normalizedAction === 'OPEN') {
      result = await openReminder(id);
    } else if (normalizedAction === 'RESCHEDULE' && body.newDate) {
      result = await rescheduleReminder(id, new Date(body.newDate));
    } else if (normalizedAction === 'DISMISS') {
      result = await prisma.reminder.update({
        where: { id },
        data: { isRead: true },
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Supported: COMPLETE, SNOOZE, OPEN, RESCHEDULE, DISMISS.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error updating reminder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update reminder.', details: error?.message },
      { status: 500 }
    );
  }
}
