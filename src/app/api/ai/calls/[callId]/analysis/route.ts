import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractAndDetectMemoryConflicts } from '@/lib/ai/aiProvider';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;

    const call = await prisma.call.findUnique({
      where: { id: callId },
      select: { id: true, leadId: true },
    });

    if (!call || !call.leadId) {
      return NextResponse.json(
        { success: false, error: 'Call not found.' },
        { status: 404 }
      );
    }

    const record = await prisma.aIAnalysis.findFirst({
      where: {
        callId,
        analysisType: 'CALL_ANALYSIS',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const analysis = JSON.parse(record.result);
    const { candidates, conflicts } = await extractAndDetectMemoryConflicts(
      call.leadId,
      callId,
      analysis
    );

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        analysis,
        candidates,
        conflicts,
        model: record.model,
        confidence: record.confidence,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching call AI analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AI analysis.', details: error?.message },
      { status: 500 }
    );
  }
}
