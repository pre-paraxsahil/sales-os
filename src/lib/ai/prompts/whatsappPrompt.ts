import { WhatsAppGenerationContext } from '../types';

export const WHATSAPP_SYSTEM_PROMPT = `You are the WhatsApp Sales Engine for BroStartup Sales OS, an executive sales copilot for James selling OneComPro.

Your task is to craft high-converting, extremely natural, and concise WhatsApp sales messages, or determine the best next sales action for a lead.

Core Rules & Guidelines:
1. MESSAGE STRUCTURE:
   Every generated message must conceptually follow:
   - HOOK: Short, personalized opening catching attention.
   - CONTEXT: Natural reference to a real prior discussion, interaction, or specific business situation.
   - VALUE: Immediate relevance or quick insight addressing their actual requirement or pain point.
   - CTA: Crisp, low-friction next step (e.g. "Does 4 PM work?", "Can I share a 1-min video?").

2. BREVITY & TONE:
   - WhatsApp messages MUST be concise (usually 2 to 4 sentences max).
   - Use natural Indian B2B business English or courteous professional tone.
   - Avoid generic corporate fluff, robotic marketing copy, or long paragraphs.
   - Never sound aggressive, desperate, or pushy.

3. ZERO HALLUCINATION & FACT INTEGRITY:
   - Never invent discounts, special pricing, unconfirmed features, previous conversations, or promises not present in context.
   - Only reference verified facts from Customer Memory, Call Analysis, or active Product Knowledge.
   - If an objection or requirement is unconfirmed or unknown, do not pretend it is confirmed.

4. PRODUCT KNOWLEDGE:
   - If pricing or features are mentioned, ensure they strictly match OneComPro's verified plans.
   - If a feature is COMING_SOON or PLAN_RESTRICTED, state it accurately or avoid claiming it is ready.

5. OUTPUT FORMAT:
   Return valid JSON strictly matching the requested schema.
`;

export function buildWhatsAppMessageUserPrompt(context: WhatsAppGenerationContext): string {
  const {
    lead,
    business,
    contact,
    memories,
    recentCalls,
    recentDemos,
    recentWhatsAppMessages,
    frequencyProtection,
    productKnowledge,
    requestedCategory,
    customObjective,
  } = context;

  return `Generate a personalized WhatsApp message for this lead based on the verified context below:

CUSTOMER OVERVIEW:
- Contact Name: ${contact?.name || 'Sir/Ma\'am'}
- Business Name: ${business?.name || lead.title}
- Industry: ${business?.industry || 'General Business'}
- Current Stage: ${lead.status}
- Temperature: ${lead.temperature}
- Source: ${lead.source || 'Direct'}

CUSTOMER MEMORY (CONFIRMED/INFERRED FACTS):
${
  memories && memories.length > 0
    ? memories.map((m) => `- [${m.category}] ${m.key}: ${m.value} (${m.verificationState})`).join('\n')
    : 'No explicit customer memory entries recorded yet.'
}

RECENT CALL HISTORY:
${
  recentCalls && recentCalls.length > 0
    ? recentCalls.map((c) => `- Outcome: ${c.outcome} | Note: ${c.notes || 'None'} | Next Action: ${c.nextAction || 'None'} | When: ${c.occurredAt}`).join('\n')
    : 'No recent calls recorded.'
}

RECENT DEMO HISTORY:
${
  recentDemos && recentDemos.length > 0
    ? recentDemos.map((d) => `- Status: ${d.status} | Scheduled: ${d.scheduledAt} | Note: ${d.notes || 'None'}`).join('\n')
    : 'No demos scheduled or completed.'
}

RECENT WHATSAPP MESSAGES:
${
  recentWhatsAppMessages && recentWhatsAppMessages.length > 0
    ? recentWhatsAppMessages.map((w) => `- [${w.direction}] (${w.category || 'GENERAL'}) "${w.content}" | Status: ${w.status} | Sent: ${w.sentAt}`).join('\n')
    : 'No previous WhatsApp messages sent.'
}

FREQUENCY PROTECTION STATUS:
- Hours since last contact: ${frequencyProtection.hoursSinceLastContact !== null ? `${frequencyProtection.hoursSinceLastContact} hrs` : 'Never contacted'}
- Unanswered WhatsApp messages: ${frequencyProtection.unansweredCount}
- Scheduled future follow-up: ${frequencyProtection.hasScheduledFollowUp ? frequencyProtection.scheduledFollowUpDate : 'None'}
- Warning: ${frequencyProtection.warning || 'None'}

REQUESTED MESSAGE CATEGORY: ${requestedCategory || 'AUTOMATIC_RECOMMENDED'}
CUSTOM OBJECTIVE: ${customObjective || 'Advance lead to next sales milestone naturally'}

VERIFIED PRODUCT KNOWLEDGE (OneComPro):
${
  productKnowledge && productKnowledge.length > 0
    ? productKnowledge.map((p) => `- ${p.planName} (${p.planCode}): ${p.priceFormatted}/${p.billingCycle} | Key Features: ${p.features.slice(0, 4).join(', ')}`).join('\n')
    : 'Standard OneComPro capabilities.'
}

TASK:
Produce a JSON response with:
{
  "message": "<the concise WhatsApp text with HOOK + CONTEXT + VALUE + CTA>",
  "category": "<the category matching context, e.g. MISSED_CALL, POST_DEMO, PRICE_OBJECTION, etc.>",
  "objective": "<short sales objective>",
  "hook": "<the opening hook sentence>",
  "cta": "<the closing call to action>",
  "personalizationUsed": ["<list of confirmed facts referenced>"],
  "recommendedTiming": "<e.g. Immediately, Today 4:00 PM, Tomorrow morning>",
  "reasoning": "<why this angle and message fits the lead state>",
  "confidence": <number between 0.5 and 1.0>
}
`;
}

export function buildFollowUpDecisionUserPrompt(context: WhatsAppGenerationContext): string {
  const {
    lead,
    business,
    contact,
    memories,
    recentCalls,
    recentDemos,
    recentWhatsAppMessages,
    frequencyProtection,
  } = context;

  return `Analyze this sales lead and decide: "WHAT SHOULD I DO WITH THIS LEAD?"

Possible Actions:
- CALL NOW (High urgency, hot lead, active buying signal, requested callback)
- SEND WHATSAPP (Follow-up needed, post-demo recap, missed call callback, quotation sharing)
- WAIT (Contacted very recently, customer asked for time, demo scheduled soon)
- FOLLOW UP LATER (Scheduled follow-up date exists, not urgent today)
- CHANGE ANGLE (Multiple unanswered follow-ups, price hesitation, team discussion needed)
- STOP TEMPORARILY (Not interested, too many unanswered attempts, high spam risk)

LEAD CONTEXT:
- Name: ${contact?.name || 'Contact'} (${business?.name || lead.title})
- Stage: ${lead.status} | Temperature: ${lead.temperature}
- Hours since last contact: ${frequencyProtection.hoursSinceLastContact !== null ? `${frequencyProtection.hoursSinceLastContact}h` : 'None'}
- Unanswered messages: ${frequencyProtection.unansweredCount}
- Active follow-up scheduled: ${frequencyProtection.hasScheduledFollowUp ? frequencyProtection.scheduledFollowUpDate : 'No'}
- Frequency warning: ${frequencyProtection.warning || 'None'}

LAST INTERACTIONS:
- Last Call: ${recentCalls[0] ? `${recentCalls[0].outcome} - ${recentCalls[0].notes || 'No note'}` : 'None'}
- Last Demo: ${recentDemos[0] ? `${recentDemos[0].status} - ${recentDemos[0].notes || 'No note'}` : 'None'}
- Last WhatsApp: ${recentWhatsAppMessages[0] ? `[${recentWhatsAppMessages[0].direction}] ${recentWhatsAppMessages[0].content}` : 'None'}

CONFIRMED MEMORIES:
${
  memories && memories.length > 0
    ? memories.slice(0, 8).map((m) => `- ${m.key}: ${m.value}`).join('\n')
    : 'None'
}

Return JSON matching:
{
  "recommendedAction": "CALL NOW" | "SEND WHATSAPP" | "WAIT" | "FOLLOW UP LATER" | "CHANGE ANGLE" | "STOP TEMPORARILY",
  "suggestedCategory": "<e.g. MISSED_CALL, POST_DEMO, DECISION_PENDING, etc.>",
  "reasoning": "<clear 1-2 sentence explanation of why this action is recommended>",
  "urgency": "HIGH" | "MEDIUM" | "LOW",
  "recommendedTiming": "<timing guidance, e.g. Today between 3-5 PM, Wait 48 hours>",
  "frequencyWarning": "<warning string or null>",
  "keyContextConsidered": ["<list of context points factored in>"]
}
`;
}
