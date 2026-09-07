import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCreateLead } from '@/lib/validations/lead';
import { Prisma } from '@prisma/client';
import { ensureDatabaseSchema } from '@/lib/db/ensureSchema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const filter = searchParams.get('filter')?.trim().toUpperCase() || 'ALL';
    const sort = searchParams.get('sort')?.trim() || 'created_date';

    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Build Prisma Where Clause
    const where: Prisma.LeadWhereInput = {};

    if (!includeArchived && filter !== 'ARCHIVED') {
      where.archivedAt = null;
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
        { contact: { phone: { contains: search, mode: 'insensitive' } } },
        { contact: { email: { contains: search, mode: 'insensitive' } } },
        { business: { name: { contains: search, mode: 'insensitive' } } },
        { business: { city: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Category filter
    switch (filter) {
      case 'HOT':
        where.temperature = 'HOT';
        break;
      case 'WARM':
        where.temperature = 'WARM';
        break;
      case 'COLD':
        where.temperature = 'COLD';
        break;
      case 'FOLLOW_UP':
        where.OR = [
          ...(where.OR || []),
          { nextActionDate: { not: null } },
          { followUps: { some: { status: 'PENDING' } } },
        ];
        break;
      case 'DEMO':
        where.demos = { some: {} };
        break;
      case 'CLOSING':
        where.status = { in: ['PROPOSAL_SENT', 'NEGOTIATION'] };
        break;
      case 'WON':
        where.status = 'WON';
        break;
      case 'LOST':
        where.status = 'LOST';
        break;
      case 'ARCHIVED':
        where.archivedAt = { not: null };
        break;
      default:
        break;
    }

    // Sort order
    let orderBy: Prisma.LeadOrderByWithRelationInput[] = [];

    switch (sort) {
      case 'priority':
        orderBy = [
          { temperature: 'desc' },
          { scoreValue: 'desc' },
          { createdAt: 'desc' },
        ];
        break;
      case 'score':
        orderBy = [{ scoreValue: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'last_contact':
        orderBy = [{ updatedAt: 'desc' }];
        break;
      case 'next_action':
        orderBy = [{ nextActionDate: 'asc' }, { createdAt: 'desc' }];
        break;
      case 'created_date':
      default:
        orderBy = [{ createdAt: 'desc' }];
        break;
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy,
      include: {
        business: true,
        contact: true,
        calls: {
          orderBy: { occurredAt: 'desc' },
          take: 1,
          select: {
            id: true,
            outcome: true,
            occurredAt: true,
            callType: true,
            notes: true,
            nextAction: true,
            nextActionAt: true,
          },
        },
        _count: {
          select: {
            calls: true,
            demos: true,
            tasks: true,
            followUps: true,
            notesList: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: leads,
      count: leads.length,
    });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads.', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validation
    const validation = validateCreateLead(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const {
      businessName,
      contactName,
      phone,
      email,
      industry,
      location,
      city,
      source,
      notes,
    } = body;

    const resolvedCity = city?.trim() || location?.trim() || null;

    // Database Transaction for Atomic Creation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get or create default user
      let user = await tx.user.findFirst({
        where: { role: 'OWNER' },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            email: 'founder@brostartup.com',
            name: 'BroStartup Founder',
            role: 'OWNER',
          },
        });
      }

      // 2. Create Business if name provided
      let business = null;
      if (businessName && businessName.trim().length > 0) {
        business = await tx.business.create({
          data: {
            name: businessName.trim(),
            industry: industry?.trim() || null,
            city: resolvedCity,
          },
        });
      } else if (resolvedCity) {
        business = await tx.business.create({
          data: {
            name: contactName?.trim() || `Prospect (${phone.trim()})`,
            city: resolvedCity,
          },
        });
      }

      // 3. Create Contact
      const contact = await tx.contact.create({
        data: {
          name: contactName?.trim() || businessName?.trim() || 'Primary Contact',
          phone: phone.trim(),
          email: email?.trim() || null,
          businessId: business?.id || null,
          isPrimary: true,
        },
      });

      // 4. Create Lead
      const title = business
        ? `${business.name} - ${contact.name}`
        : `${contact.name} (${phone.trim()})`;

      const lead = await tx.lead.create({
        data: {
          title,
          userId: user.id,
          businessId: business?.id || null,
          contactId: contact.id,
          source: source?.trim() || 'Direct Outreach',
          status: 'NEW',
          temperature: 'COLD',
          notes: notes?.trim() || null,
        },
        include: {
          business: true,
          contact: true,
        },
      });

      // 5. Audit Activity Entry
      await tx.activity.create({
        data: {
          userId: user.id,
          leadId: lead.id,
          type: 'LEAD_CREATED',
          title: 'Lead Created',
          description: `New lead created for ${lead.title} via ${lead.source}`,
        },
      });

      return lead;
    });

    return NextResponse.json(
      { success: true, data: result, message: 'Lead created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lead.', details: error?.message },
      { status: 500 }
    );
  }
}
