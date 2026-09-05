import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, content, isActive } = body;

    const updated = await prisma.whatsAppTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(category !== undefined && { category }),
        ...(content !== undefined && { content: content.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Soft delete by setting isActive to false
    const updated = await prisma.whatsAppTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error archiving template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to archive template.' },
      { status: 500 }
    );
  }
}
