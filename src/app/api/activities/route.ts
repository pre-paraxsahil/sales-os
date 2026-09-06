import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ActivityType } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getDefaultUserId(): Promise<string | undefined> {
  const user = (await prisma.user.findFirst({ where: { role: 'OWNER' } })) || (await prisma.user.findFirst());
  return user?.id;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const type = searchParams.get('type') as ActivityType | null;
    const leadId = searchParams.get('leadId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (type) where.type = type;
    if (leadId) where.leadId = leadId;
    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = new Date(startDate);
      if (endDate) where.occurredAt.lte = new Date(endDate);
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            title: true,
            contact: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, data: activities });
  } catch (error: any) {
    console.error('Error in GET /api/activities:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch activities.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, description, leadId, metadata, occurredAt } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Activity type is required.' },
        { status: 400 }
      );
    }

    const userId = await getDefaultUserId();

    // Clean up activity type to match enum
    const validTypes: string[] = [
      'LEAD_CREATED',
      'CALL_LOGGED',
      'DEMO_SCHEDULED',
      'DEMO_COMPLETED',
      'NOTE_ADDED',
      'TASK_COMPLETED',
      'FOLLOW_UP_SET',
      'WHATSAPP_SENT',
      'SALE_RECORDED',
      'STAGE_CHANGED',
      'MEETING',
      'SAMPLE_SENT',
      'PROPOSAL_SENT',
      'EMAIL_SENT',
      'RESEARCH',
      'CLIENT_VISIT',
      'NEGOTIATION',
      'OTHER_ACTIVITY',
    ];

    let resolvedType: ActivityType = 'OTHER_ACTIVITY';
    const typeUpper = String(type).toUpperCase().replace(/\s+/g, '_');
    if (validTypes.includes(typeUpper)) {
      resolvedType = typeUpper as ActivityType;
    } else if (typeUpper === 'EMAIL') {
      resolvedType = 'EMAIL_SENT';
    } else if (typeUpper === 'PROPOSAL') {
      resolvedType = 'PROPOSAL_SENT';
    } else if (typeUpper === 'SAMPLE') {
      resolvedType = 'SAMPLE_SENT';
    } else if (typeUpper === 'WHATSAPP') {
      resolvedType = 'WHATSAPP_SENT';
    } else if (typeUpper === 'OTHER') {
      resolvedType = 'OTHER_ACTIVITY';
    }

    const cleanTitle =
      title?.trim() ||
      `${resolvedType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} recorded`;

    const timestamp = occurredAt ? new Date(occurredAt) : new Date();

    const activity = await prisma.activity.create({
      data: {
        userId,
        leadId: leadId || null,
        type: resolvedType,
        title: cleanTitle,
        description: description?.trim() || null,
        metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
        occurredAt: timestamp,
      },
      include: {
        lead: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: activity,
      message: 'Activity recorded successfully.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/activities:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record activity.' },
      { status: 500 }
    );
  }
}
