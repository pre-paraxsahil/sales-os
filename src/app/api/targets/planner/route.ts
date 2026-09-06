import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateNextDayPlan,
  generateNextWeekPlan,
} from '@/lib/targets/targetPlannerService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || searchParams.get('type') || 'DAY';
    const dateParam = searchParams.get('date');
    const userIdParam = searchParams.get('userId');

    const user = userIdParam
      ? await prisma.user.findUnique({ where: { id: userIdParam } })
      : await prisma.user.findFirst();

    const refDate = dateParam ? new Date(dateParam) : new Date();

    if (mode.toUpperCase().includes('WEEK')) {
      const weekPlan = await generateNextWeekPlan(user?.id);
      return NextResponse.json({ success: true, data: weekPlan });
    }

    const dayPlan = await generateNextDayPlan(refDate, user?.id);
    return NextResponse.json({ success: true, data: dayPlan });
  } catch (error: any) {
    console.error('Error in GET /api/targets/planner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate plan.', details: error?.message },
      { status: 500 }
    );
  }
}
