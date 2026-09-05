import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MemoryCategory, VerificationState } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const body = await request.json();

    const call = await prisma.call.findUnique({
      where: { id: callId },
      select: { id: true, leadId: true, userId: true },
    });

    if (!call || !call.leadId) {
      return NextResponse.json(
        { success: false, error: 'Call not found or not associated with a lead.' },
        { status: 404 }
      );
    }

    const leadId = call.leadId;
    const items = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No memory items provided to apply.' },
        { status: 400 }
      );
    }

    const appliedMemories = [];

    // Apply each memory update in a clean sequence
    for (const item of items) {
      const category = (item.category || 'GENERAL_CONTEXT') as MemoryCategory;
      const key = String(item.key || 'Fact').trim();
      const value = String(item.value || '').trim();
      const verificationState = (item.verificationState || 'CONFIRMED') as VerificationState;
      const confidence = typeof item.confidence === 'number' ? item.confidence : 0.85;

      if (!value) continue;

      if (item.overwriteMemoryId) {
        // Resolve conflict by updating existing confirmed fact with James's explicit consent
        const updated = await prisma.customerMemory.update({
          where: { id: item.overwriteMemoryId },
          data: {
            value,
            verificationState,
            sourceType: 'CALL',
            sourceActivityId: callId,
            confidence,
          },
        });
        appliedMemories.push(updated);
      } else {
        // Create new memory fact
        const created = await prisma.customerMemory.create({
          data: {
            leadId,
            category,
            key,
            value,
            verificationState,
            sourceType: 'CALL',
            sourceActivityId: callId,
            confidence,
          },
        });
        appliedMemories.push(created);
      }
    }

    // Log Activity
    await prisma.activity.create({
      data: {
        userId: call.userId,
        leadId,
        type: 'NOTE_ADDED',
        title: `AI Intelligence Applied to Customer Memory`,
        description: `Applied ${appliedMemories.length} customer fact(s) from Call ID ${callId.slice(0, 8)}.`,
      },
    });

    return NextResponse.json({
      success: true,
      data: appliedMemories,
      message: `Successfully applied ${appliedMemories.length} customer memory item(s).`,
    });
  } catch (error: any) {
    console.error('Error applying AI memory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply memory items.', details: error?.message },
      { status: 500 }
    );
  }
}
