import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        audiences: {
          take: 10,
          include: {
            lead: {
              include: { contact: true, business: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: campaigns });
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      objective,
      category = 'CUSTOM',
      messageBody,
      cta,
      plannedTiming,
      followUpPlan,
      segmentFilters,
      leadIds = [],
    } = body;

    if (!name || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'Campaign name and message body are required.' },
        { status: 400 }
      );
    }

    // Fetch leads to verify phones
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      include: { contact: true },
    });

    const campaign = await prisma.$transaction(async (tx) => {
      const camp = await tx.campaign.create({
        data: {
          name: name.trim(),
          description: description || null,
          objective: objective || null,
          category,
          messageBody: messageBody.trim(),
          cta: cta || null,
          plannedTiming: plannedTiming || null,
          followUpPlan: followUpPlan || null,
          segmentFilters: segmentFilters ? JSON.stringify(segmentFilters) : null,
          status: 'DRAFT',
          totalRecipients: leads.length,
        },
      });

      if (leads.length > 0) {
        await tx.campaignAudience.createMany({
          data: leads.map((l) => ({
            campaignId: camp.id,
            leadId: l.id,
            phone: l.contact?.phone || 'Unknown',
            status: 'PENDING',
          })),
        });
      }

      return camp;
    });

    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create campaign.' },
      { status: 500 }
    );
  }
}
