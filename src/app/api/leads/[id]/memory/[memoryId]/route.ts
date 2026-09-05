import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MemoryCategory, MemorySourceType, VerificationState } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memoryId: string }> }
) {
  try {
    const { id: leadId, memoryId } = await params;
    const body = await request.json();

    const existingMemory = await prisma.customerMemory.findUnique({
      where: { id: memoryId },
      include: {
        lead: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!existingMemory || existingMemory.leadId !== leadId) {
      return NextResponse.json(
        { success: false, error: 'Customer memory item not found.' },
        { status: 404 }
      );
    }

    const {
      key,
      value,
      category,
      verificationState,
      sourceType,
      confidence,
    } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (key && typeof key === 'string') updateData.key = key.trim();
    if (value && typeof value === 'string') updateData.value = value.trim();

    if (category && Object.values(MemoryCategory).includes(category)) {
      updateData.category = category as MemoryCategory;
    }

    if (verificationState && Object.values(VerificationState).includes(verificationState)) {
      updateData.verificationState = verificationState as VerificationState;
    }

    if (sourceType && Object.values(MemorySourceType).includes(sourceType)) {
      updateData.sourceType = sourceType as MemorySourceType;
    }

    if (confidence !== undefined) {
      updateData.confidence = confidence !== null ? Number(confidence) : null;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.customerMemory.update({
        where: { id: memoryId },
        data: updateData,
      });

      // If state changed to REJECTED, log audit activity
      if (updateData.verificationState === 'REJECTED' && existingMemory.verificationState !== 'REJECTED') {
        await tx.activity.create({
          data: {
            leadId,
            userId: existingMemory.lead.userId,
            type: 'NOTE_ADDED',
            title: `Memory Rejected: ${updated.key}`,
            description: `Flagged as incorrect: "${updated.value}" was marked REJECTED by user.`,
            metadata: JSON.stringify({
              memoryId: updated.id,
              previousState: existingMemory.verificationState,
              newState: 'REJECTED',
            }),
          },
        });
      } else {
        await tx.activity.create({
          data: {
            leadId,
            userId: existingMemory.lead.userId,
            type: 'NOTE_ADDED',
            title: `Memory Updated: ${updated.key}`,
            description: `Updated fact to: "${updated.value}" (${updated.verificationState})`,
            metadata: JSON.stringify({
              memoryId: updated.id,
              category: updated.category,
              verificationState: updated.verificationState,
            }),
          },
        });
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Memory updated successfully.',
    });
  } catch (error: any) {
    console.error('Error updating customer memory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer memory.', details: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memoryId: string }> }
) {
  try {
    const { id: leadId, memoryId } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    const existingMemory = await prisma.customerMemory.findUnique({
      where: { id: memoryId },
      include: {
        lead: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!existingMemory || existingMemory.leadId !== leadId) {
      return NextResponse.json(
        { success: false, error: 'Customer memory item not found.' },
        { status: 404 }
      );
    }

    if (hardDelete) {
      await prisma.customerMemory.delete({
        where: { id: memoryId },
      });
      return NextResponse.json({
        success: true,
        message: 'Memory item deleted permanently.',
      });
    }

    // Default: Soft reject to protect historical truth
    const rejected = await prisma.$transaction(async (tx) => {
      const updated = await tx.customerMemory.update({
        where: { id: memoryId },
        data: {
          verificationState: 'REJECTED',
          updatedAt: new Date(),
        },
      });

      await tx.activity.create({
        data: {
          leadId,
          userId: existingMemory.lead.userId,
          type: 'NOTE_ADDED',
          title: `Memory Marked Rejected: ${updated.key}`,
          description: `Memory fact "${updated.key}: ${updated.value}" marked as REJECTED to preserve audit trail.`,
          metadata: JSON.stringify({
            memoryId: updated.id,
            action: 'REJECT_MEMORY',
          }),
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: rejected,
      message: 'Memory marked as rejected and historical record preserved.',
    });
  } catch (error: any) {
    console.error('Error deleting/rejecting customer memory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete customer memory.', details: error?.message },
      { status: 500 }
    );
  }
}
