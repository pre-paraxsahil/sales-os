import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get('phone')?.trim() || '';

    if (!rawPhone || rawPhone.length < 3) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Clean phone number (digits only for matching)
    const digitsOnly = rawPhone.replace(/\D/g, '');
    const last10Digits = digitsOnly.slice(-10);

    // Search contacts or leads where phone matches
    const matchedContact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: { contains: rawPhone } },
          { phone: { contains: digitsOnly } },
          ...(last10Digits.length >= 7 ? [{ phone: { contains: last10Digits } }] : []),
        ],
      },
      include: {
        business: true,
        leads: {
          where: {
            archivedAt: null,
          },
          orderBy: { updatedAt: 'desc' },
          include: {
            business: true,
            calls: {
              orderBy: { occurredAt: 'desc' },
              take: 1,
            },
            followUps: {
              where: { status: 'PENDING' },
              orderBy: { scheduledAt: 'asc' },
              take: 1,
            },
          },
          take: 1,
        },
      },
    });

    let lead: any = matchedContact?.leads?.[0] || null;

    // If no lead found through contact, search lead title directly (sometimes leads have phone in title or notes)
    if (!lead) {
      lead = await prisma.lead.findFirst({
        where: {
          archivedAt: null,
          OR: [
            { title: { contains: rawPhone, mode: 'insensitive' as const } },
            { contact: { phone: { contains: rawPhone } } },
            ...(last10Digits.length >= 7
              ? [
                  { title: { contains: last10Digits, mode: 'insensitive' as const } },
                  { contact: { phone: { contains: last10Digits } } },
                ]
              : []),
          ],
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          business: true,
          contact: true,
          calls: {
            orderBy: { occurredAt: 'desc' },
            take: 1,
          },
          followUps: {
            where: { status: 'PENDING' },
            orderBy: { scheduledAt: 'asc' },
            take: 1,
          },
        },
      });
    }

    if (!lead) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const lastCall = lead.calls?.[0] || null;
    const nextFollowUp = lead.followUps?.[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        id: lead.id,
        title: lead.title,
        contactName: lead.contact?.name || matchedContact?.name || lead.title,
        contactPhone: lead.contact?.phone || matchedContact?.phone || rawPhone,
        businessName: lead.business?.name || matchedContact?.business?.name || lead.title,
        city: lead.business?.city || matchedContact?.business?.city || '',
        temperature: lead.temperature,
        status: lead.status,
        lastInteraction: lastCall
          ? {
              date: lastCall.occurredAt || lastCall.createdAt,
              outcome: lastCall.outcome,
              notes: lastCall.notes,
            }
          : null,
        nextAction: lead.nextActionDate
          ? {
              date: lead.nextActionDate,
              action: nextFollowUp?.notes || 'Scheduled Action',
            }
          : nextFollowUp
          ? {
              date: nextFollowUp.scheduledAt,
              action: nextFollowUp.notes,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Error looking up lead by phone:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to lookup phone number.', details: error?.message },
      { status: 500 }
    );
  }
}
