import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getAllTargetsStatus,
  saveTargetForPeriod,
  calculateSmartTargetSuggestion,
} from '@/lib/targets/targetPlannerService';
import { ensureDatabaseSchema } from '@/lib/db/ensureSchema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const suggestAmount = searchParams.get('suggestAmount');

    const user = userIdParam
      ? await prisma.user.findUnique({ where: { id: userIdParam } })
      : await prisma.user.findFirst();

    const status = await getAllTargetsStatus(new Date(), user?.id);

    // Calculate smart suggestion if requested or from current monthly target
    const monthlyTargetAmount = suggestAmount
      ? parseFloat(suggestAmount)
      : status.monthly?.target?.amount || 200000;

    const suggestion = await calculateSmartTargetSuggestion(monthlyTargetAmount, user?.id);

    return NextResponse.json({
      success: true,
      data: {
        targets: status,
        suggestion,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/targets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch targets.', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const body = await request.json();
    const { period, data, userId: userIdParam } = body;

    if (!period || !['DAILY', 'WEEKLY', 'MONTHLY'].includes(period)) {
      return NextResponse.json(
        { success: false, error: 'Valid period (DAILY, WEEKLY, MONTHLY) is required.' },
        { status: 400 }
      );
    }

    const user = userIdParam
      ? await prisma.user.findUnique({ where: { id: userIdParam } })
      : await prisma.user.findFirst();

    const saved = await saveTargetForPeriod(period, data || {}, new Date(), user?.id);
    const updatedStatus = await getAllTargetsStatus(new Date(), user?.id);

    return NextResponse.json({
      success: true,
      message: `${period} target saved successfully.`,
      data: {
        saved,
        targets: updatedStatus,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/targets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save target.', details: error?.message },
      { status: 500 }
    );
  }
}
