import { NextResponse } from 'next/server';
import { getPlanAwareKnowledge, getKnowledgeMetadata } from '@/lib/knowledge/productKnowledgeService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plans = await getPlanAwareKnowledge();
    const metadata = getKnowledgeMetadata();

    return NextResponse.json({
      success: true,
      data: {
        plans,
        metadata,
      },
    });
  } catch (error: any) {
    console.error('Error fetching plan-aware knowledge:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plan-aware product knowledge.', details: error?.message },
      { status: 500 }
    );
  }
}
