import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ demoId: string }> }
) {
  try {
    const { demoId } = await params;
    const body = await request.json();

    const { stepsTracking } = body;

    if (!Array.isArray(stepsTracking)) {
      return NextResponse.json(
        { success: false, error: 'stepsTracking must be an array.' },
        { status: 400 }
      );
    }

    const demoPlan = await prisma.demoPlan.findUnique({
      where: { demoId },
    });

    if (!demoPlan) {
      return NextResponse.json(
        { success: false, error: 'Demo plan not found for this demo.' },
        { status: 404 }
      );
    }

    const updated = await prisma.demoPlan.update({
      where: { demoId },
      data: {
        stepsTracking: JSON.stringify(stepsTracking),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        demoId,
        stepsTracking,
        updatedAt: updated.updatedAt,
      },
      message: 'Demo steps progress saved.',
    });
  } catch (error: any) {
    console.error('Error saving demo steps:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save demo steps.', details: error?.message },
      { status: 500 }
    );
  }
}
