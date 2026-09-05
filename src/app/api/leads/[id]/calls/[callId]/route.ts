import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; callId: string }> }
) {
  try {
    const { id: leadId, callId } = await params;

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        contact: true,
        recording: true,
        transcripts: true,
      },
    });

    if (!call || call.leadId !== leadId) {
      return NextResponse.json(
        { success: false, error: 'Call not found for this lead.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: call,
    });
  } catch (error: any) {
    console.error('Error fetching call detail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call detail.', details: error?.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; callId: string }> }
) {
  try {
    const { id: leadId, callId } = await params;
    const body = await request.json();

    const existingCall = await prisma.call.findUnique({
      where: { id: callId },
    });

    if (!existingCall || existingCall.leadId !== leadId) {
      return NextResponse.json(
        { success: false, error: 'Call not found for this lead.' },
        { status: 404 }
      );
    }

    const { notes, nextAction, nextActionAt, outcome } = body;

    const updatedCall = await prisma.call.update({
      where: { id: callId },
      data: {
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(nextAction !== undefined && { nextAction: nextAction?.trim() || null }),
        ...(nextActionAt !== undefined && {
          nextActionAt: nextActionAt ? new Date(nextActionAt) : null,
        }),
        ...(outcome !== undefined && { outcome }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCall,
      message: 'Call updated successfully.',
    });
  } catch (error: any) {
    console.error('Error updating call:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update call.', details: error?.message },
      { status: 500 }
    );
  }
}
