import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const updateData: Record<string, any> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.startTime !== undefined) updateData.startTime = new Date(body.startTime);
    if (body.endTime !== undefined) updateData.endTime = new Date(body.endTime);
    if (body.blockType !== undefined) updateData.blockType = body.blockType;
    if (body.isProtected !== undefined) updateData.isProtected = body.isProtected;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const updated = await prisma.scheduleBlock.update({
      where: { id },
      data: updateData,
      include: {
        lead: { include: { contact: true, business: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating schedule block:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update schedule block.', details: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.scheduleBlock.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Block deleted.' });
  } catch (error: any) {
    console.error('Error deleting schedule block:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete schedule block.', details: error?.message },
      { status: 500 }
    );
  }
}
