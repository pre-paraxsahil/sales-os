import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildWhatsAppContext } from '@/lib/ai/contextBuilder';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();

    const {
      content,
      direction = 'OUTBOUND',
      messageType = 'TEXT',
      category,
      metadata,
      nextFollowUpDate,
      nextFollowUpNotes,
    } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message content is required.' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true, business: true },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const phone = lead.contact?.phone || 'Unknown';
    const userId = lead.userId;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create WhatsApp message
      const msg = await tx.whatsAppMessage.create({
        data: {
          leadId,
          phone,
          direction,
          messageType,
          category: category || 'GENERAL',
          content: content.trim(),
          status: 'SENT',
          responseStatus: direction === 'INBOUND' ? 'REPLIED' : 'NO_RESPONSE',
          metadata: metadata ? JSON.stringify(metadata) : null,
          sentAt: new Date(),
        },
      });

      // 2. Log Activity
      await tx.activity.create({
        data: {
          userId,
          leadId,
          type: direction === 'INBOUND' ? 'NOTE_ADDED' : 'WHATSAPP_SENT',
          title: `WhatsApp Message (${direction}) - ${category || 'General'}`,
          description: content.substring(0, 140),
          metadata: JSON.stringify({
            messageId: msg.id,
            category: category || 'GENERAL',
            phone,
          }),
        },
      });

      // 3. Complete any overdue/pending WhatsApp follow-ups for this lead
      await tx.followUp.updateMany({
        where: {
          leadId,
          type: 'WHATSAPP',
          status: 'PENDING',
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          notes: `Follow-up concluded via WhatsApp message (${category || 'GENERAL'})`,
        },
      });

      // 4. Optionally schedule next follow-up
      if (nextFollowUpDate) {
        await tx.followUp.create({
          data: {
            userId,
            leadId,
            type: 'WHATSAPP',
            status: 'PENDING',
            scheduledAt: new Date(nextFollowUpDate),
            notes: nextFollowUpNotes || `Follow-up after ${category || 'message'}`,
          },
        });
      }

      return msg;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error logging WhatsApp message:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to log WhatsApp message.' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true, business: true },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const messages = await prisma.whatsAppMessage.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });

    // Build context for frequency protection
    const context = await buildWhatsAppContext(leadId);

    return NextResponse.json({
      success: true,
      data: {
        lead: {
          id: lead.id,
          name: lead.contact?.name || lead.title,
          phone: lead.contact?.phone || null,
          businessName: lead.business?.name || null,
          status: lead.status,
          temperature: lead.temperature,
        },
        frequencyProtection: context.frequencyProtection,
        messages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching WhatsApp messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch WhatsApp messages.' },
      { status: 500 }
    );
  }
}
