import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: leadId, messageId } = await params;
    const body = await request.json();

    const { responseStatus, notes } = body;

    const existing = await prisma.whatsAppMessage.findUnique({
      where: { id: messageId },
    });

    if (!existing || existing.leadId !== leadId) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp message record not found.' },
        { status: 404 }
      );
    }

    const updated = await prisma.whatsAppMessage.update({
      where: { id: messageId },
      data: {
        responseStatus: responseStatus || existing.responseStatus,
        responseAt: responseStatus === 'REPLIED' ? new Date() : existing.responseAt,
      },
    });

    if (responseStatus === 'REPLIED') {
      await prisma.activity.create({
        data: {
          leadId,
          type: 'NOTE_ADDED',
          title: 'Prospect Replied on WhatsApp',
          description: notes || `Customer responded to previous WhatsApp message (${existing.category || 'GENERAL'}).`,
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating message response status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update WhatsApp message response.' },
      { status: 500 }
    );
  }
}
