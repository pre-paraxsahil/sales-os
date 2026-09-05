import { NextResponse } from 'next/server';
import { getAIProvider, buildWhatsAppContext } from '@/lib/ai/aiProvider';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, category, customObjective } = body;

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'leadId is required.' },
        { status: 400 }
      );
    }

    // 1. Build compact context + Frequency Protection analysis
    const context = await buildWhatsAppContext(leadId, {
      requestedCategory: category,
      customObjective,
    });

    const aiProvider = getAIProvider();

    // 2. Run Follow-up Decision Engine and Message Generation in parallel
    const [decisionResponse, messageResponse] = await Promise.all([
      aiProvider.recommendNextAction(context),
      aiProvider.generateWhatsAppMessage(context),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        recommendation: decisionResponse.decision,
        messageResult: messageResponse.result,
        frequencyProtection: context.frequencyProtection,
        model: messageResponse.model,
        customerOverview: {
          name: context.contact?.name || 'Contact',
          phone: context.contact?.phone || null,
          businessName: context.business?.name || context.lead.title,
          industry: context.business?.industry || null,
          stage: context.lead.status,
          temperature: context.lead.temperature,
        },
      },
    });
  } catch (error: any) {
    console.error('AI WhatsApp generation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'AI message generation failed. You can write or edit manually.',
      },
      { status: 500 }
    );
  }
}
