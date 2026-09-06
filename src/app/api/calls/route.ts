import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateSaveCall } from '@/lib/validations/call';
import { executePostCallWorkflow } from '@/lib/calls/callWorkflow';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const outcome = searchParams.get('outcome')?.trim().toUpperCase();

    const where: any = {};
    if (outcome && outcome !== 'ALL') {
      where.outcome = outcome;
    }

    const calls = await prisma.call.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: Math.min(limit, 200),
      include: {
        lead: {
          select: {
            id: true,
            title: true,
            temperature: true,
            status: true,
            business: { select: { name: true, city: true } },
            contact: { select: { name: true, phone: true } },
          },
        },
        contact: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: calls,
      count: calls.length,
    });
  } catch (error: any) {
    console.error('Error fetching calls:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calls.', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let targetLeadId = body.leadId;

    // If no leadId provided, find by phone or auto-create lead
    if (!targetLeadId) {
      const phone = body.phone?.trim();
      const contactName = body.contactName?.trim() || (phone ? `Prospect (${phone})` : 'New Prospect');
      const businessName = body.businessName?.trim() || null;
      const city = body.city?.trim() || null;

      if (!phone && !contactName) {
        return NextResponse.json(
          { success: false, error: 'Phone number or existing Lead ID is required.' },
          { status: 400 }
        );
      }

      // Check if phone matches an existing contact
      let matchedLead = null;
      if (phone) {
        const digits = phone.replace(/\D/g, '');
        const last10 = digits.slice(-10);
        const contact = await prisma.contact.findFirst({
          where: {
            OR: [
              { phone: { contains: phone } },
              ...(last10.length >= 7 ? [{ phone: { contains: last10 } }] : []),
            ],
          },
          include: { leads: { take: 1, orderBy: { updatedAt: 'desc' } } },
        });

        if (contact?.leads?.[0]) {
          matchedLead = contact.leads[0];
        }
      }

      if (matchedLead) {
        targetLeadId = matchedLead.id;
      } else {
        // Auto-create lead
        let user = await prisma.user.findFirst({ where: { role: 'OWNER' } });
        if (!user) {
          user = await prisma.user.create({
            data: { email: 'founder@brostartup.com', name: 'BroStartup Founder', role: 'OWNER' },
          });
        }

        let business = null;
        if (businessName || city) {
          business = await prisma.business.create({
            data: {
              name: businessName || contactName,
              city: city,
            },
          });
        }

        const contact = await prisma.contact.create({
          data: {
            name: contactName,
            phone: phone || null,
            businessId: business?.id || null,
            isPrimary: true,
          },
        });

        const newLead = await prisma.lead.create({
          data: {
            userId: user.id,
            businessId: business?.id || null,
            contactId: contact.id,
            title: businessName ? `${businessName} - ${contactName}` : contactName,
            source: body.callType || 'Phone Call',
            status: 'CONTACTED',
            temperature: body.temperature || 'COLD',
          },
        });

        targetLeadId = newLead.id;
      }
    }

    // Validation
    const validation = validateSaveCall({ ...body, leadId: targetLeadId });
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: 'Validation failed.', errors: validation.errors },
        { status: 400 }
      );
    }

    // Execute post-call workflow
    const result = await executePostCallWorkflow(targetLeadId, {
      ...body,
      leadId: targetLeadId,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Call saved ✓',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error logging call:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Could not save call',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
