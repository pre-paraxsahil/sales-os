import { CallAnalysisContext } from '../types';

export const CALL_ANALYSIS_SYSTEM_PROMPT = `You are a precision sales intelligence assistant for "BroStartup Sales OS" — a single-user personal sales operating system used by the founder/sales lead (James).

Your task is to analyze sales phone call notes and interaction history to extract factual customer intelligence, detect buying signals and objections, and recommend next actions.

CRITICAL TRUST RULES & CONSTRAINTS:
1. USE ONLY SUPPLIED CONTEXT. Never invent, hallucinate, or extrapolate customer facts that are not evidenced by the notes, transcript, or customer memory.
2. STRICT STATUS DISTINCTION:
   - "CONFIRMED": Explicitly stated as a definite fact by the customer in notes or transcript.
   - "INFERRED": Logical deduction based on context (e.g. they manage 3 stores, so multi-store inventory is likely relevant), but not explicitly confirmed.
   - "UNKNOWN": Not stated or not discussed during the call.
   - "REJECTED": Explicitly denied or declined by the customer.
3. BUDGET POLICY: ONLY extract budget if explicitly discussed or stated with numeric/range details. If budget was NOT discussed, you MUST set:
   value: "Budget was not discussed"
   status: "UNKNOWN"
   confidence: 0
   NEVER invent or assume a budget number.
4. COMPETITOR POLICY: ONLY extract a competitor if explicitly named or referenced by the customer. If none mentioned, you MUST set:
   value: "No competitor mentioned"
   status: "UNKNOWN"
   confidence: 0
5. PRODUCT KNOWLEDGE INTEGRATION:
   - Any plan recommendation or package discussed MUST be based exclusively on the supplied Product Knowledge context.
   - Respect availability ("AVAILABLE", "COMING_SOON", "PLAN_RESTRICTED").
   - NEVER invent features, limits, or plan pricing.
6. MISSING INFORMATION: Actively identify critical missing pieces of sales qualification (e.g. Decision Maker, Budget, Launch Timeline) and list them in "unknownInformation".
7. LEAD TEMPERATURE RECOMMENDATION:
   - "HOT": High buying intent, urgent timeline, budget aligned or demo requested.
   - "WARM": Clear interest, good problem fit, but evaluating or needs follow-up.
   - "COLD": Low engagement, objections, unresponsive, or wrong timing.
8. RETURN STRICT JSON: Output must be a single valid JSON object with NO markdown ticks, NO commentary, matching the required schema structure.`;

export function buildCallAnalysisUserPrompt(context: CallAnalysisContext): string {
  return `Please analyze the following sales call in the context of this lead and return a structured JSON analysis.

=== 1. LEAD & BUSINESS PROFILE ===
Lead Title: ${context.lead.title}
Source: ${context.lead.source || 'Direct / Organic'}
Current Stage: ${context.lead.status}
Current Temperature: ${context.lead.temperature}
Lead Notes: ${context.lead.notes || 'None'}
Business: ${context.business ? `${context.business.name} (${context.business.industry || 'Industry unspecified'}, ${context.business.city || 'Location unspecified'})` : 'Individual lead'}
Contact: ${context.contact ? `${context.contact.name}${context.contact.designation ? ` (${context.contact.designation})` : ''} - Phone: ${context.contact.phone || 'N/A'}` : 'N/A'}

=== 2. CONFIRMED & EXISTING CUSTOMER MEMORY ===
${context.existingMemories.length > 0
  ? context.existingMemories
      .map((m) => `- [${m.category}] [${m.verificationState}] ${m.key}: ${m.value}`)
      .join('\n')
  : 'No prior customer memory recorded.'}

=== 3. RECENT CALL HISTORY SUMMARY ===
${context.recentCallsSummary.length > 0
  ? context.recentCallsSummary
      .map((c) => `- Outcome: ${c.outcome} (${c.occurredAt}): ${c.notes || 'No notes'}`)
      .join('\n')
  : 'First recorded call with this customer.'}

=== 4. TARGET CALL TO ANALYZE ===
Call ID: ${context.targetCall.id}
Call Type: ${context.targetCall.callType}
Call Outcome: ${context.targetCall.outcome}
Duration: ${context.targetCall.durationSeconds ? `${context.targetCall.durationSeconds} seconds` : 'Duration not logged'}
Occurred At: ${context.targetCall.occurredAt}
Original Call Notes:
"${context.targetCall.notes || 'No call notes logged.'}"
Next Action recorded: ${context.targetCall.nextAction || 'None recorded'}
${context.targetCall.transcriptText ? `Transcript:\n${context.targetCall.transcriptText}` : ''}

=== 5. RETRIEVED PRODUCT KNOWLEDGE (ONECOMPRO) ===
${context.productKnowledge.length > 0
  ? context.productKnowledge
      .map((p) => `- Plan: ${p.planName} (${p.planCode}) | Price: ${p.priceFormatted}/${p.billingCycle.toLowerCase()} | Key Features: ${p.features.join(', ')}`)
      .join('\n')
  : 'Product knowledge not queried or zero active plans found in DB.'}

Analyze this call now. Extract requirements, pain points, business understanding, buying signals, objections, budget, timeline, package fit, competitor, next action, and missing information. Return pure JSON.`;
}
