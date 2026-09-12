import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkTimeConflicts } from '@/lib/calendar/conflictProtectionEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { startTime, durationMinutes = 30, bufferMinutes = 10, excludeEntityId } = body;

    if (!startTime) {
      return NextResponse.json(
        { success: false, error: 'Start time is required.' },
        { status: 400 }
      );
    }

    const user = (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());
    const userId = user?.id;

    const start = new Date(startTime);
    const result = await checkTimeConflicts({
      startTime: start,
      durationMinutes: Number(durationMinutes),
      bufferMinutes: Number(bufferMinutes),
      excludeEntityId,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in POST /api/calendar/check-conflict:', error);
    return NextResponse.json(
      { success: false, error: 'Conflict check failed.', details: error?.message },
      { status: 500 }
    );
  }
}
