import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MemoryCategory, MemorySourceType, VerificationState } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const { searchParams } = new URL(request.url);

    const categoryParam = searchParams.get('category')?.trim().toUpperCase();
    const stateParam = searchParams.get('state')?.trim().toUpperCase() || searchParams.get('status')?.trim().toUpperCase();
    const searchQuery = searchParams.get('q')?.trim();

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, title: true },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found.' },
        { status: 404 }
      );
    }

    // Build where clause
    const where: any = { leadId };

    if (categoryParam && Object.values(MemoryCategory).includes(categoryParam as MemoryCategory)) {
      where.category = categoryParam as MemoryCategory;
    }

    if (stateParam && Object.values(VerificationState).includes(stateParam as VerificationState)) {
      where.verificationState = stateParam as VerificationState;
    }

    if (searchQuery) {
      where.OR = [
        { key: { contains: searchQuery, mode: 'insensitive' } },
        { value: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const memories = await prisma.customerMemory.findMany({
      where,
      orderBy: [
        { updatedAt: 'desc' },
      ],
    });

    // Compute category counts
    const counts = {
      total: memories.length,
      confirmed: memories.filter((m) => m.verificationState === 'CONFIRMED').length,
      inferred: memories.filter((m) => m.verificationState === 'INFERRED').length,
      unknown: memories.filter((m) => m.verificationState === 'UNKNOWN').length,
      rejected: memories.filter((m) => m.verificationState === 'REJECTED').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        memories,
        counts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching customer memory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer memory.', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();

    const {
      category = 'GENERAL_CONTEXT',
      key,
      value,
      verificationState = 'CONFIRMED',
      sourceType = 'MANUAL',
      confidence = null,
      sourceActivityId = null,
    } = body;

    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Memory key/topic is required.' },
        { status: 400 }
      );
    }

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Memory value/fact is required.' },
        { status: 400 }
      );
    }

    // Validate enum values
    const safeCategory = Object.values(MemoryCategory).includes(category)
      ? (category as MemoryCategory)
      : MemoryCategory.GENERAL_CONTEXT;

    const safeState = Object.values(VerificationState).includes(verificationState)
      ? (verificationState as VerificationState)
      : VerificationState.CONFIRMED;

    const safeSource = Object.values(MemorySourceType).includes(sourceType)
      ? (sourceType as MemorySourceType)
      : MemorySourceType.MANUAL;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, userId: true },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found.' },
        { status: 404 }
      );
    }

    // Execute transaction to create memory and audit activity
    const result = await prisma.$transaction(async (tx) => {
      const memory = await tx.customerMemory.create({
        data: {
          leadId,
          category: safeCategory,
          key: key.trim(),
          value: value.trim(),
          verificationState: safeState,
          sourceType: safeSource,
          confidence: confidence ? Number(confidence) : null,
          sourceActivityId: sourceActivityId || null,
        },
      });

      const activity = await tx.activity.create({
        data: {
          leadId,
          userId: lead.userId,
          type: 'NOTE_ADDED',
          title: `Memory Fact Logged: ${key.trim()}`,
          description: `[${safeCategory}] ${value.trim()} (${safeState})`,
          metadata: JSON.stringify({
            memoryId: memory.id,
            category: safeCategory,
            verificationState: safeState,
            sourceType: safeSource,
          }),
        },
      });

      return { memory, activity };
    });

    return NextResponse.json(
      {
        success: true,
        data: result.memory,
        message: 'Customer memory fact recorded successfully.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error recording customer memory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record customer memory.', details: error?.message },
      { status: 500 }
    );
  }
}
