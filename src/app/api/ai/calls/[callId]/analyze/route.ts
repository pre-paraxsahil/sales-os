import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getAIConfig,
  getAIProvider,
  buildCallAnalysisContext,
  extractAndDetectMemoryConflicts,
} from '@/lib/ai/aiProvider';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const body = await request.json().catch(() => ({}));
    const forceReanalyze = Boolean(body?.forceReanalyze);

    // 1. Verify call exists and get lead relationship
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        transcripts: true,
      },
    });

    if (!call || !call.leadId) {
      return NextResponse.json(
        { success: false, error: 'Call not found or not associated with a lead.' },
        { status: 404 }
      );
    }

    const leadId = call.leadId;

    // 2. Cost Control: Check if existing analysis already exists
    if (!forceReanalyze) {
      const existingAnalysis = await prisma.aIAnalysis.findFirst({
        where: {
          callId,
          analysisType: 'CALL_ANALYSIS',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingAnalysis) {
        try {
          const parsedResult = JSON.parse(existingAnalysis.result);
          const { candidates, conflicts } = await extractAndDetectMemoryConflicts(
            leadId,
            callId,
            parsedResult
          );

          return NextResponse.json({
            success: true,
            data: {
              analysis: parsedResult,
              candidates,
              conflicts,
              model: existingAnalysis.model,
              createdAt: existingAnalysis.createdAt,
              isCached: true,
            },
          });
        } catch (parseErr) {
          console.warn('Could not parse cached AIAnalysis, re-running analysis.');
        }
      }
    }

    // 3. Check if call has notes or transcript to analyze
    const hasNotes = Boolean(call.notes && call.notes.trim().length > 0);
    const hasTranscript = Boolean(call.transcripts && call.transcripts.length > 0);

    if (!hasNotes && !hasTranscript) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This call does not have any notes or transcript to analyze. Please add notes to the call before analyzing.',
        },
        { status: 400 }
      );
    }

    // 4. Verify AI configuration (OpenAI API key)
    const config = getAIConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error:
            'OpenAI API key is not configured. Please set OPENAI_API_KEY in your server environment (.env) to enable AI Call Analysis.',
          isConfigError: true,
        },
        { status: 503 }
      );
    }

    // 5. Retrieve compact, relevant context
    const context = await buildCallAnalysisContext(leadId, callId);

    // 6. Execute AI Provider call
    const provider = getAIProvider();
    const providerResponse = await provider.analyzeCall(context);

    // 7. Extract candidate memory updates & detect conflicts with confirmed memory
    const { candidates, conflicts } = await extractAndDetectMemoryConflicts(
      leadId,
      callId,
      providerResponse.analysis
    );

    // 8. Persist AI Analysis in PostgreSQL (without modifying the original call note!)
    const savedRecord = await prisma.aIAnalysis.create({
      data: {
        leadId,
        callId,
        analysisType: 'CALL_ANALYSIS',
        model: providerResponse.model,
        result: JSON.stringify(providerResponse.analysis),
        confidenceState: 'INFERRED',
        confidence: providerResponse.analysis.confidence,
        status: 'COMPLETED',
        inputSummary: call.notes ? call.notes.slice(0, 500) : 'Analyzed from call transcript',
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: savedRecord.id,
          analysis: providerResponse.analysis,
          candidates,
          conflicts,
          model: providerResponse.model,
          usage: providerResponse.usage,
          createdAt: savedRecord.createdAt,
          isCached: false,
        },
        message: 'Call analyzed successfully by AI.',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in call analysis route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to complete AI call analysis.',
        details: error?.details || undefined,
      },
      { status: 500 }
    );
  }
}
