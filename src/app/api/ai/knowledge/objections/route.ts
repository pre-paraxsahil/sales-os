import { NextRequest, NextResponse } from 'next/server';
import { resolveObjection, getKnowledgeMetadata } from '@/lib/knowledge/productKnowledgeService';
import { ONECOMPRO_OBJECTIONS_DATA } from '@/lib/knowledge/productKnowledgeSeed';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (key) {
      const objection = resolveObjection(key);
      return NextResponse.json({ success: true, data: objection });
    }

    return NextResponse.json({
      success: true,
      data: {
        objections: ONECOMPRO_OBJECTIONS_DATA,
        metadata: getKnowledgeMetadata(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching objection battlecards:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch objection battlecards.', details: error?.message },
      { status: 500 }
    );
  }
}
