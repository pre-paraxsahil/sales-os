import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidUuid } from '@/lib/validations/common';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isValidUuid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Lead ID format' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        business: true,
        contact: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        activities: {
          orderBy: { occurredAt: 'desc' },
          take: 50,
        },
        calls: {
          orderBy: { occurredAt: 'desc' },
          include: {
            contact: true,
            recording: true,
          },
        },
        demos: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            demoPlan: true,
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        followUps: {
          orderBy: { scheduledAt: 'desc' },
        },
        notesList: {
          orderBy: { createdAt: 'desc' },
        },
        whatsAppMsgs: {
          orderBy: { createdAt: 'desc' },
        },
        memories: {
          orderBy: { createdAt: 'desc' },
        },
        quotations: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error: any) {
    console.error('Error fetching lead details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lead details.', details: error?.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isValidUuid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Lead ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const existingLead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!existingLead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    const {
      title,
      status,
      temperature,
      scoreValue,
      estimatedValue,
      nextActionDate,
      notes,
    } = body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Lead
      const updatedLead = await tx.lead.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(status !== undefined && { status }),
          ...(temperature !== undefined && { temperature }),
          ...(scoreValue !== undefined && { scoreValue: Number(scoreValue) }),
          ...(estimatedValue !== undefined && { estimatedValue: Number(estimatedValue) }),
          ...(nextActionDate !== undefined && {
            nextActionDate: nextActionDate ? new Date(nextActionDate) : null,
          }),
          ...(notes !== undefined && { notes }),
        },
        include: {
          business: true,
          contact: true,
        },
      });

      // 2. Audit Activity if status changed
      if (status && status !== existingLead.status) {
        await tx.activity.create({
          data: {
            userId: existingLead.userId,
            leadId: id,
            type: 'STAGE_CHANGED',
            title: `Status updated to ${status}`,
            description: `Lead status changed from ${existingLead.status} to ${status}`,
          },
        });
      }

      return updatedLead;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Lead updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lead.', details: error?.message },
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

    if (!isValidUuid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Lead ID format' },
        { status: 400 }
      );
    }

    const existingLead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!existingLead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Perform safe soft-delete/archive in transaction
    const result = await prisma.$transaction(async (tx) => {
      const archivedLead = await tx.lead.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Audit Activity
      await tx.activity.create({
        data: {
          userId: existingLead.userId,
          leadId: id,
          type: 'STAGE_CHANGED',
          title: 'Lead Archived',
          description: `Lead "${existingLead.title}" was safely archived/deleted. Historical calls and records preserved.`,
        },
      });

      return archivedLead;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Lead archived successfully. All history preserved.',
    });
  } catch (error: any) {
    console.error('Error archiving lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete/archive lead.', details: error?.message },
      { status: 500 }
    );
  }
}

