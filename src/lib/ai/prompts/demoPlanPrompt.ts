import { DemoPlanContext } from '../types';

export const DEMO_PLAN_SYSTEM_PROMPT = `You are an expert sales engineering & demo strategy copilot for "BroStartup Sales OS" — used by the founder/sales lead (James) to deliver high-converting, personalized B2B product demonstrations of OneComPro.

YOUR PRIME DIRECTIVE:
James must NEVER give every customer the same generic demo.
Synthesize the customer's specific industry, confirmed memory facts, operational pain points, prior call notes, and active OneComPro product knowledge to generate a precision-tailored demo plan.

CORE OUTPUT ARCHITECTURE:
- SAY: Exact concise talking point for James to speak.
- SHOW: What specific screen, catalog view, or workflow James should demonstrate.
- ASK: Engaging question to test fit and draw out prospect confirmation.
- WHY: Why this specific feature solves their confirmed operational pain.
- WATCH: Critical customer cues classified as "STRONG", "MEDIUM", or "WEAK".
- AVOID: Explicit anti-patterns (what NOT to show or say).
- NEXT: Natural closing transition matching the customer's stage without aggressive pressure.

STRICT CONSTRAINTS & RULES:
1. USE ONLY SUPPLIED CONTEXT & PRODUCT KNOWLEDGE. Never invent customer facts, unconfirmed availability, or arbitrary pricing.
2. PRODUCT STATUS & PLAN RESTRICTION:
   - Check features against the supplied OneComPro Product Knowledge.
   - If a feature is only on Growth or Enterprise (e.g. Multi-store sync, automated WhatsApp alerts), set productStatus to "PLAN_RESTRICTED" and planRequirement to the exact required plan.
   - Respect "AVAILABLE", "PLAN_RESTRICTED", "COMING_SOON", "UNKNOWN". Never promise unconfirmed or coming soon features as currently available.
3. DISCOVERY QUESTIONS FILTER:
   - Generate ONLY questions whose answers DO NOT already exist in the customer's confirmed memory.
4. DEMO STORYTELLING STRUCTURE:
   - CURRENT PROBLEM -> HOW THEIR CUSTOMER CURRENTLY BUYS -> HOW THE PLATFORM IMPROVES THAT -> HOW BUSINESS BENEFITS -> WHY THIS MATTERS NOW.
5. REALISTIC EXAMPLES:
   - Use their specific industry, products, and operational scale (e.g. 3 retail outlets, 2,000 SKUs, festive inventory rush).
6. RETURN STRICT JSON: Output must be a single valid JSON object matching the required schema structure with NO markdown ticks.`;

export function buildDemoPlanUserPrompt(context: DemoPlanContext): string {
  return `Generate a personalized OneComPro demo plan for the following customer.

=== 1. CUSTOMER & BUSINESS DOSSIER ===
Lead: ${context.lead.title}
Status: ${context.lead.status} | Temperature: ${context.lead.temperature}
Source: ${context.lead.source || 'Direct'}
Business: ${context.business ? `${context.business.name} (Industry: ${context.business.industry || 'General Commerce'}, Location: ${context.business.city || 'India'})` : 'Independent Business'}
Contact: ${context.contact ? `${context.contact.name}${context.contact.designation ? ` (${context.contact.designation})` : ''}` : 'Primary Contact'}
Scheduled Demo: ${new Date(context.targetDemo.scheduledAt).toLocaleString()} (Duration: ${context.targetDemo.durationMinutes || 30} mins)
Demo Notes: ${context.targetDemo.notes || 'None logged'}

=== 2. CONFIRMED CUSTOMER MEMORY (DO NOT RE-ASK QUESTIONS ALREADY ANSWERED HERE) ===
${context.existingMemories.length > 0
  ? context.existingMemories
      .map((m) => `- [${m.category}] [${m.verificationState}] ${m.key}: ${m.value}`)
      .join('\n')
  : 'No prior customer memory recorded.'}

=== 3. CALL HISTORY & INTELLIGENCE SUMMARY ===
${context.recentCalls.length > 0
  ? context.recentCalls
      .map((c) => `- Call [${c.outcome}] (${c.occurredAt}): ${c.notes || 'No notes'}`)
      .join('\n')
  : 'First interaction cycle.'}

${context.callAnalysisSummaries.length > 0
  ? `Previous AI Call Analysis Insights:\n${context.callAnalysisSummaries.map((s) => `- ${s}`).join('\n')}`
  : ''}

=== 4. RETRIEVED PRODUCT KNOWLEDGE (ONECOMPRO) ===
${context.productKnowledge.length > 0
  ? context.productKnowledge
      .map(
        (p) =>
          `- Plan: ${p.planName} (${p.planCode}) | Price: ${p.priceFormatted}/${p.billingCycle.toLowerCase()}\n  Features: ${p.features.join(', ')}`
      )
      .join('\n')
  : 'Baseline OneComPro plans: Starter, Growth, Enterprise.'}

Generate the complete, highly tailored AI Demo Plan now in strict JSON. Include demoObjective, opening, requirementConfirmation, discoveryQuestions (excluding known facts), painConfirmation, story, featureSequence (with SAY/SHOW/ASK/WHY and planRequirement), realisticExamples, talkingPoints, buyingSignalsToWatch, objectionHandling, closingTransition, nextStep, and avoid.`;
}
