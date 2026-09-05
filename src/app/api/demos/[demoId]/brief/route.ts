import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildBeforeDemoBrief } from '@/lib/ai/contextBuilder';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ demoId: string }> }
) {
  try {
    const { demoId } = await params;

    const demo = await prisma.demo.findUnique({
      where: { id: demoId },
      select: { id: true, leadId: true },
    });

    if (!demo || !demo.leadId) {
      return NextResponse.json(
        { success: false, error: 'Demo not found or missing lead association.' },
        { status: 404 }
      );
    }

    const brief = await buildBeforeDemoBrief(demo.leadId, demoId);

    return NextResponse.json({
      success: true,
      data: brief,
    });
  } catch (error: any) {
    console.error('Error generating before-demo brief:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to generate before-demo brief.',
      },
      { status: 500 }
    );
  }
}
