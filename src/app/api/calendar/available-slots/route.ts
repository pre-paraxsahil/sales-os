import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findFreeTimeSlots } from '@/lib/calendar/slotFinderEngine';

import { getTodayDateString } from '@/lib/time/salesTimeEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateString = searchParams.get('dateString') || getTodayDateString();
    const durationMinutes = parseInt(searchParams.get('durationMinutes') || '30', 10);
    const bufferMinutes = parseInt(searchParams.get('bufferMinutes') || '0', 10);

    const user = (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());
    const userId = user?.id;

    const result = await findFreeTimeSlots({
      dateString,
      durationMinutes,
      bufferMinutes,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in GET /api/calendar/available-slots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search available slots.', details: error?.message },
      { status: 500 }
    );
  }
}
