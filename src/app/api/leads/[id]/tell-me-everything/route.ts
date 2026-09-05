import { NextResponse } from 'next/server';
import { summaryService } from '@/lib/memory/summaryService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const briefing = await summaryService.generateTellMeEverything(leadId);

    return NextResponse.json({
      success: true,
      data: briefing,
    });
  } catch (error: any) {
    console.error('Error generating Tell Me Everything briefing:', error);
    const isNotFound = error?.message?.includes('not found');
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate briefing.' },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
