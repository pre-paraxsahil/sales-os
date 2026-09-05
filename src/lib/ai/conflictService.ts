import { prisma } from '@/lib/prisma';
import {
  CallAnalysisResult,
  CandidateMemoryUpdate,
  MemoryConflict,
  TrustState,
} from './types';
import { MemoryCategory } from '@prisma/client';

/**
 * Extracts candidate memory updates from structured AI call analysis
 * and performs conflict detection against existing CONFIRMED customer memories.
 */
export async function extractAndDetectMemoryConflicts(
  leadId: string,
  callId: string,
  analysis: CallAnalysisResult
): Promise<{
  candidates: CandidateMemoryUpdate[];
  conflicts: MemoryConflict[];
}> {
  // 1. Fetch existing memories for this lead
  const existingMemories = await prisma.customerMemory.findMany({
    where: { leadId },
  });

  const candidates: CandidateMemoryUpdate[] = [];

  // Helper to push candidate
  const addCandidate = (
    category: MemoryCategory,
    key: string,
    value: string,
    status: TrustState,
    confidence: number
  ) => {
    if (!value || status === 'UNKNOWN' || value.toLowerCase().includes('not discussed')) {
      return;
    }

    // Check against existing memory
    const existing = existingMemories.find(
      (m) =>
        m.category === category &&
        (m.key.toLowerCase() === key.toLowerCase() || isSingletonCategory(category))
    );

    let hasConflict = false;
    let existingMemoryId: string | undefined;
    let existingValue: string | undefined;
    let existingState: TrustState | undefined;

    if (existing) {
      existingMemoryId = existing.id;
      existingValue = existing.value;
      existingState = existing.verificationState as TrustState;

      // Conflict rule: If existing fact is CONFIRMED and the new value is different
      if (
        existing.verificationState === 'CONFIRMED' &&
        !isValuesEssentiallySame(existing.value, value)
      ) {
        hasConflict = true;
      }
    }

    candidates.push({
      category,
      key,
      value,
      status,
      confidence,
      sourceCallId: callId,
      hasConflict,
      existingMemoryId,
      existingValue,
      existingState,
    });
  };

  // 2. Extract from Requirements
  analysis.requirements.forEach((req, idx) => {
    if (req.status !== 'UNKNOWN' && req.value) {
      addCandidate('REQUIREMENT', `Requirement ${idx + 1}`, req.value, req.status, req.confidence);
    }
  });

  // 3. Extract from Pain Points
  analysis.painPoints.forEach((pp, idx) => {
    if (pp.status !== 'UNKNOWN' && pp.value) {
      addCandidate('PAIN_POINT', `Pain Point ${idx + 1}`, pp.value, pp.status, pp.confidence);
    }
  });

  // 4. Extract from Current Process
  if (analysis.currentProcess && analysis.currentProcess.trim().length > 3) {
    addCandidate('CURRENT_PROCESS', 'Current Workflow', analysis.currentProcess, 'INFERRED', 0.85);
  }

  // 5. Extract from Goals
  analysis.goals.forEach((g, idx) => {
    if (g.status !== 'UNKNOWN' && g.value) {
      addCandidate('GOAL', `Goal ${idx + 1}`, g.value, g.status, g.confidence);
    }
  });

  // 6. Extract from Decision Maker
  if (analysis.decisionMaker && analysis.decisionMaker.status !== 'UNKNOWN') {
    addCandidate(
      'DECISION_MAKER',
      'Decision Maker Profile',
      analysis.decisionMaker.value,
      analysis.decisionMaker.status,
      analysis.decisionMaker.confidence
    );
  }

  // 7. Extract from Timeline
  if (analysis.timeline && analysis.timeline.status !== 'UNKNOWN') {
    addCandidate(
      'TIMELINE',
      'Implementation Timeline',
      analysis.timeline.value,
      analysis.timeline.status,
      analysis.timeline.confidence
    );
  }

  // 8. Extract from Budget (ONLY if explicitly confirmed or inferred with confidence)
  if (
    analysis.budget &&
    analysis.budget.status !== 'UNKNOWN' &&
    !analysis.budget.value.toLowerCase().includes('not discussed')
  ) {
    addCandidate(
      'BUDGET',
      'Budget Estimate',
      analysis.budget.value,
      analysis.budget.status,
      analysis.budget.confidence
    );
  }

  // 9. Extract from Package Discussed
  if (
    analysis.packageDiscussed &&
    analysis.packageDiscussed.status !== 'UNKNOWN' &&
    !analysis.packageDiscussed.value.toLowerCase().includes('no specific')
  ) {
    addCandidate(
      'PACKAGE',
      'Target Plan Fit',
      analysis.packageDiscussed.value,
      analysis.packageDiscussed.status,
      analysis.packageDiscussed.confidence
    );
  }

  // 10. Extract from Competitor
  if (
    analysis.competitor &&
    analysis.competitor.status !== 'UNKNOWN' &&
    !analysis.competitor.value.toLowerCase().includes('no competitor')
  ) {
    addCandidate(
      'COMPETITOR',
      'Competing Solutions',
      analysis.competitor.value,
      analysis.competitor.status,
      analysis.competitor.confidence
    );
  }

  // 11. Extract Next Action
  if (analysis.nextAction && analysis.nextAction.value) {
    addCandidate(
      'NEXT_ACTION',
      'Recommended Next Step',
      analysis.nextAction.value,
      analysis.nextAction.status,
      analysis.nextAction.confidence
    );
  }

  // 12. Build explicit conflicts list
  const conflicts: MemoryConflict[] = candidates
    .filter((c) => c.hasConflict && c.existingMemoryId && c.existingValue && c.existingState)
    .map((c) => ({
      category: c.category,
      key: c.key,
      existingMemoryId: c.existingMemoryId!,
      existingValue: c.existingValue!,
      existingState: c.existingState!,
      newValue: c.value,
      newState: c.status,
      sourceCallId: c.sourceCallId,
      confidence: c.confidence,
    }));

  return { candidates, conflicts };
}

function isSingletonCategory(category: MemoryCategory): boolean {
  return [
    'TIMELINE',
    'BUDGET',
    'DECISION_MAKER',
    'CURRENT_PROCESS',
    'PACKAGE',
    'NEXT_ACTION',
  ].includes(category);
}

function isValuesEssentiallySame(v1: string, v2: string): boolean {
  const norm1 = v1.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const norm2 = v2.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
}
