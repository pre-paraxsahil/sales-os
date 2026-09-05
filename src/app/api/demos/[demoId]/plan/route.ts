import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ demoId: string }> }
) {
  try {
    const { demoId } = await params;

    const demoPlan = await prisma.demoPlan.findUnique({
      where: { demoId },
    });

    if (!demoPlan || !demoPlan.planJson) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const plan = JSON.parse(demoPlan.planJson);
    const stepsTracking = demoPlan.stepsTracking ? JSON.parse(demoPlan.stepsTracking) : [];
    const versionHistory = demoPlan.versionHistory ? JSON.parse(demoPlan.versionHistory) : [];

    return NextResponse.json({
      success: true,
      data: {
        id: demoPlan.id,
        demoId: demoPlan.demoId,
        version: demoPlan.version,
        plan,
        objectives: demoPlan.objectives,
        customizedNotes: demoPlan.customizedNotes,
        confidence: demoPlan.confidence,
        model: demoPlan.model,
        stepsTracking,
        versionHistory,
        createdAt: demoPlan.createdAt,
        updatedAt: demoPlan.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching demo plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch demo plan.', details: error?.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ demoId: string }> }
) {
  try {
    const { demoId } = await params;
    const body = await request.json();

    const existingPlan = await prisma.demoPlan.findUnique({
      where: { demoId },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { success: false, error: 'Demo plan not found for this demo.' },
        { status: 404 }
      );
    }

    const { customizedNotes, objectives } = body;

    const updated = await prisma.demoPlan.update({
      where: { demoId },
      data: {
        ...(customizedNotes !== undefined && { customizedNotes: customizedNotes?.trim() || null }),
        ...(objectives !== undefined && { objectives: objectives?.trim() || existingPlan.objectives }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Demo plan updated successfully.',
    });
  } catch (error: any) {
    console.error('Error updating demo plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update demo plan.', details: error?.message },
      { status: 500 }
    );
  }
}
