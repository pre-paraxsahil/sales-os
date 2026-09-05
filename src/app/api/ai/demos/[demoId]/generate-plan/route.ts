import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getAIConfig,
  getAIProvider,
  buildDemoPlanContext,
} from '@/lib/ai/aiProvider';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ demoId: string }> }
) {
  try {
    const { demoId } = await params;
    const body = await request.json().catch(() => ({}));
    const forceRegenerate = Boolean(body?.forceRegenerate);

    // 1. Verify demo and lead existence
    const demo = await prisma.demo.findUnique({
      where: { id: demoId },
      include: {
        demoPlan: true,
      },
    });

    if (!demo || !demo.leadId) {
      return NextResponse.json(
        { success: false, error: 'Demo not found or not associated with a lead.' },
        { status: 404 }
      );
    }

    const leadId = demo.leadId;

    // 2. Cost Control: Return cached plan if exists and not forceRegenerate
    if (!forceRegenerate && demo.demoPlan?.planJson) {
      try {
        const parsedPlan = JSON.parse(demo.demoPlan.planJson);
        const stepsTracking = demo.demoPlan.stepsTracking
          ? JSON.parse(demo.demoPlan.stepsTracking)
          : [];
        const versionHistory = demo.demoPlan.versionHistory
          ? JSON.parse(demo.demoPlan.versionHistory)
          : [];

        return NextResponse.json({
          success: true,
          data: {
            plan: parsedPlan,
            version: demo.demoPlan.version,
            model: demo.demoPlan.model,
            confidence: demo.demoPlan.confidence,
            stepsTracking,
            versionHistory,
            createdAt: demo.demoPlan.createdAt,
            isCached: true,
          },
        });
      } catch (parseErr) {
        console.warn('Could not parse cached DemoPlan JSON, regenerating.');
      }
    }

    // 3. Check AI configuration
    const config = getAIConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error:
            'OpenAI API key is not configured. Please set OPENAI_API_KEY in your server environment (.env) to enable AI Demo Plan generation.',
          isConfigError: true,
        },
        { status: 503 }
      );
    }

    // 4. Build context
    const context = await buildDemoPlanContext(leadId, demoId);

    // 5. Generate plan using AI Provider
    const provider = getAIProvider();
    const result = await provider.generateDemoPlan(context);

    // 6. Save with versioning
    let savedDemoPlan;
    if (demo.demoPlan) {
      // Archive current version into versionHistory
      let currentHistory: any[] = [];
      if (demo.demoPlan.versionHistory) {
        try {
          currentHistory = JSON.parse(demo.demoPlan.versionHistory);
        } catch {}
      }

      currentHistory.push({
        version: demo.demoPlan.version,
        planJson: demo.demoPlan.planJson,
        model: demo.demoPlan.model,
        confidence: demo.demoPlan.confidence,
        archivedAt: new Date().toISOString(),
      });

      savedDemoPlan = await prisma.demoPlan.update({
        where: { demoId },
        data: {
          version: demo.demoPlan.version + 1,
          objectives: result.plan.demoObjective,
          targetFeatures: result.plan.featureSequence.map((f) => f.feature).join(', '),
          planJson: JSON.stringify(result.plan),
          confidence: result.plan.confidence,
          model: result.model,
          versionHistory: JSON.stringify(currentHistory),
        },
      });
    } else {
      savedDemoPlan = await prisma.demoPlan.create({
        data: {
          demoId,
          version: 1,
          objectives: result.plan.demoObjective,
          targetFeatures: result.plan.featureSequence.map((f) => f.feature).join(', '),
          planJson: JSON.stringify(result.plan),
          confidence: result.plan.confidence,
          model: result.model,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        plan: result.plan,
        version: savedDemoPlan.version,
        model: savedDemoPlan.model,
        confidence: savedDemoPlan.confidence,
        stepsTracking: savedDemoPlan.stepsTracking ? JSON.parse(savedDemoPlan.stepsTracking) : [],
        createdAt: savedDemoPlan.createdAt,
        isCached: false,
      },
      message: `AI Demo Plan (Version ${savedDemoPlan.version}) generated successfully.`,
    });
  } catch (error: any) {
    console.error('Error generating demo plan:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to generate demo plan.',
      },
      { status: 500 }
    );
  }
}
