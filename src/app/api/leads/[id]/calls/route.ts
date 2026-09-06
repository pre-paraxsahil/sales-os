import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateSaveCall } from '@/lib/validations/call';
import { executePostCallWorkflow } from '@/lib/calls/callWorkflow';
import { isValidUuid } from '@/lib/validations/common';
import { CallOutcome } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;

    if (!isValidUuid(leadId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Lead ID format' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const outcomeFilter = searchParams.get('outcome')?.trim().toUpperCase();

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

    // Fetch all calls for metrics calculation
    const allCalls = await prisma.call.findMany({
      where: { leadId },
      orderBy: { occurredAt: 'desc' },
      include: {
        contact: { select: { id: true, name: true, phone: true } },
      },
    });

    // Compute real aggregated counts from database records
    const metrics = {
      totalCalls: allCalls.length,
      connected: allCalls.filter((c) => c.outcome === 'CONNECTED').length,
      interested: allCalls.filter((c) => c.outcome === 'INTERESTED').length,
      demosBooked: allCalls.filter(
        (c) => c.outcome === 'DEMO_BOOKED' || c.outcome === 'SCHEDULED_DEMO'
      ).length,
      followUps: allCalls.filter((c) => c.outcome === 'FOLLOW_UP_REQUIRED').length,
      noAnswers: allCalls.filter(
        (c) => c.outcome === 'NO_ANSWER' || c.outcome === 'SWITCHED_OFF'
      ).length,
      notInterested: allCalls.filter((c) => c.outcome === 'NOT_INTERESTED').length,
    };

    // Filter calls if specific outcome is requested
    let filteredCalls = allCalls;
    if (outcomeFilter && outcomeFilter !== 'ALL') {
      if (outcomeFilter === 'DEMO_BOOKED') {
        filteredCalls = allCalls.filter(
          (c) => c.outcome === 'DEMO_BOOKED' || c.outcome === 'SCHEDULED_DEMO'
        );
      } else if (outcomeFilter === 'NO_ANSWER') {
        filteredCalls = allCalls.filter(
          (c) => c.outcome === 'NO_ANSWER' || c.outcome === 'SWITCHED_OFF'
        );
      } else {
        filteredCalls = allCalls.filter((c) => c.outcome === outcomeFilter);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        calls: filteredCalls,
        metrics,
      },
    });
  } catch (error: any) {
    console.error('Error fetching lead calls:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calls.', details: error?.message },
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

    if (!isValidUuid(leadId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Lead ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 1. Validation
    const validation = validateSaveCall(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: 'Validation failed.', errors: validation.errors },
        { status: 400 }
      );
    }

    // 2. Execute post-call workflow in transaction
    const result = await executePostCallWorkflow(leadId, {
      ...body,
      leadId,
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
    const isNotFound = error?.message?.includes('not found');
    return NextResponse.json(
      {
        success: false,
        error: isNotFound ? error.message : 'Could not save call',
        details: error?.message,
      },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
