import { NextResponse } from 'next/server';
import { summaryService } from '@/lib/memory/summaryService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const summary = await summaryService.generateCustomerSummary(leadId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Error generating customer summary:', error);
    const isNotFound = error?.message?.includes('not found');
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate customer summary.' },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
