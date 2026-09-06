import { NextRequest, NextResponse } from 'next/server';
import { checkFeatureCapability, getKnowledgeMetadata } from '@/lib/knowledge/productKnowledgeService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body?.query?.toString().trim();

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query string is required (e.g. "Can OneComPro sync multi-store inventory?")' },
        { status: 400 }
      );
    }

    const capabilityResult = await checkFeatureCapability(query);
    const metadata = getKnowledgeMetadata();

    return NextResponse.json({
      success: true,
      data: {
        ...capabilityResult,
        metadata,
      },
    });
  } catch (error: any) {
    console.error('Error evaluating feature capability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to evaluate capability.', details: error?.message },
      { status: 500 }
    );
  }
}
