import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const existing = await prisma.followUp.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Follow-up not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const fu = await tx.followUp.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Also complete any associated reminder
      await tx.reminder.updateMany({
        where: {
          entityId: id,
          entityType: 'FOLLOW_UP',
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          isRead: true,
        },
      });

      if (fu.leadId) {
        await tx.activity.create({
          data: {
            userId: fu.userId,
            leadId: fu.leadId,
            type: 'TASK_COMPLETED',
            title: 'Follow-up Completed',
            description: `Follow-up (${fu.type}) marked done`,
          },
        });
      }

      return fu;
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Follow-up marked as completed',
    });
  } catch (error: any) {
    console.error('Error completing follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete follow-up', details: error?.message },
      { status: 500 }
    );
  }
}
