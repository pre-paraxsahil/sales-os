import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { getAIConfig } from './config';
import {
  AIProvider,
  AIProviderResponse,
  CallAnalysisContext,
  CallAnalysisResult,
  DemoPlanContext,
  DemoPlanResult,
  AIProviderDemoPlanResponse,
  WhatsAppGenerationContext,
  AIProviderWhatsAppResponse,
  AIProviderFollowUpDecisionResponse,
} from './types';
import { callAnalysisSchema } from './schemas/callAnalysisSchema';
import { demoPlanSchema } from './schemas/demoPlanSchema';
import {
  aiWhatsAppMessageSchema,
  aiFollowUpDecisionSchema,
  AIWhatsAppMessageResult,
  AIFollowUpDecisionResult,
} from './schemas/whatsappSchema';
import {
  CALL_ANALYSIS_SYSTEM_PROMPT,
  buildCallAnalysisUserPrompt,
} from './prompts/callAnalysisPrompt';
import {
  DEMO_PLAN_SYSTEM_PROMPT,
  buildDemoPlanUserPrompt,
} from './prompts/demoPlanPrompt';
import {
  WHATSAPP_SYSTEM_PROMPT,
  buildWhatsAppMessageUserPrompt,
  buildFollowUpDecisionUserPrompt,
} from './prompts/whatsappPrompt';
import {
  aiSalesCoachSchema,
  AISalesCoachResult,
} from './schemas/coachSchema';
import {
  COACH_SYSTEM_PROMPT,
  buildCoachUserPrompt,
} from './prompts/coachPrompt';
import { interpolateTemplate } from '../whatsapp/templateService';
import { AIProviderCoachResponse } from './types';

export class OpenAIProvider implements AIProvider {
  readonly name = 'OpenAI';
  private openai: OpenAI | null = null;

  private getClient(): OpenAI {
    if (this.openai) {
      return this.openai;
    }

    const config = getAIConfig();
    if (!config.isConfigured || !config.apiKey) {
      throw new Error(
        'OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file to enable AI features.'
      );
    }

    this.openai = new OpenAI({
      apiKey: config.apiKey,
    });

    return this.openai;
  }

  async analyzeCall(context: CallAnalysisContext): Promise<AIProviderResponse> {
    const config = getAIConfig();
    const client = this.getClient();

    const systemPrompt = CALL_ANALYSIS_SYSTEM_PROMPT;
    const userPrompt = buildCallAnalysisUserPrompt(context);

    try {
      const completion = await client.chat.completions.create({
        model: config.model,
        response_format: { type: 'json_object' },
        temperature: 0.2, // Low temperature for factual precision
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('OpenAI returned an empty response.');
      }

      // Parse JSON
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(rawContent);
      } catch (err: any) {
        throw new Error(`Failed to parse AI output as JSON: ${err.message}`);
      }

      // Validate against Zod schema
      const validatedResult = callAnalysisSchema.safeParse(parsedJson);
      if (!validatedResult.success) {
        console.error('AI Call Analysis schema validation errors:', validatedResult.error.format());
        throw new Error(
          `AI output validation failed: ${validatedResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }

      const analysis: CallAnalysisResult = validatedResult.data;

      // Cost & Usage Tracking via UsageRecord model
      const usage = completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined;

      if (usage) {
        try {
          await prisma.usageRecord.create({
            data: {
              metric: 'openai_call_analysis_tokens',
              value: usage.totalTokens,
              metadata: JSON.stringify({
                provider: 'openai',
                model: config.model,
                operation: 'call_analysis',
                leadId: context.lead.id,
                callId: context.targetCall.id,
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens,
              }),
            },
          });
        } catch (usageErr) {
          console.warn('Could not record AI usage in database:', usageErr);
        }
      }

      return {
        analysis,
        model: config.model,
        usage,
        rawResponse: rawContent,
      };
    } catch (error: any) {
      console.error('OpenAI call analysis failed:', error);

      // Distinguish specific OpenAI API errors
      if (error?.status === 401) {
        throw new Error('OpenAI API authentication failed. Please verify your OPENAI_API_KEY.');
      } else if (error?.status === 429) {
        throw new Error('OpenAI rate limit or quota exceeded. Please check your OpenAI account.');
      } else if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED') {
        throw new Error('OpenAI request timed out. Please retry in a few moments.');
      }

      throw error;
    }
  }

  async generateDemoPlan(context: DemoPlanContext): Promise<AIProviderDemoPlanResponse> {
    const config = getAIConfig();
    const client = this.getClient();

    const systemPrompt = DEMO_PLAN_SYSTEM_PROMPT;
    const userPrompt = buildDemoPlanUserPrompt(context);

    try {
      const completion = await client.chat.completions.create({
        model: config.model,
        response_format: { type: 'json_object' },
        temperature: 0.25,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('OpenAI returned an empty response for demo plan.');
      }

      let parsedJson: any;
      try {
        parsedJson = JSON.parse(rawContent);
      } catch (err: any) {
        throw new Error(`Failed to parse Demo Plan AI output as JSON: ${err.message}`);
      }

      // Validate against Zod schema
      const validatedResult = demoPlanSchema.safeParse(parsedJson);
      if (!validatedResult.success) {
        console.error('Demo Plan schema validation errors:', validatedResult.error.format());
        throw new Error(
          `Demo Plan validation failed: ${validatedResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }

      const plan: DemoPlanResult = validatedResult.data;

      // Cost & Usage Tracking via UsageRecord model
      const usage = completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined;

      if (usage) {
        try {
          await prisma.usageRecord.create({
            data: {
              metric: 'openai_demo_plan_tokens',
              value: usage.totalTokens,
              metadata: JSON.stringify({
                provider: 'openai',
                model: config.model,
                operation: 'demo_plan_generation',
                leadId: context.lead.id,
                demoId: context.targetDemo.id,
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens,
              }),
            },
          });
        } catch (usageErr) {
          console.warn('Could not record AI demo plan usage in database:', usageErr);
        }
      }

      return {
        plan,
        model: config.model,
        usage,
        rawResponse: rawContent,
      };
    } catch (error: any) {
      console.error('OpenAI demo plan generation failed:', error);

      if (error?.status === 401) {
        throw new Error('OpenAI API authentication failed. Please verify your OPENAI_API_KEY.');
      } else if (error?.status === 429) {
        throw new Error('OpenAI rate limit or quota exceeded. Please check your OpenAI account.');
      } else if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED') {
        throw new Error('OpenAI request timed out. Please retry in a few moments.');
      }

      throw error;
    }
  }

  async generateWhatsAppMessage(
    context: WhatsAppGenerationContext
  ): Promise<AIProviderWhatsAppResponse> {
    const config = getAIConfig();

    // Check if OpenAI key is configured
    if (!config.isConfigured || !config.apiKey) {
      console.warn('OpenAI not configured; using deterministic verified template generator.');
      const fallback = this.generateDeterministicWhatsApp(context);
      return {
        result: fallback,
        model: 'context-fallback-engine',
        rawResponse: JSON.stringify(fallback),
      };
    }

    try {
      const client = this.getClient();
      const systemPrompt = WHATSAPP_SYSTEM_PROMPT;
      const userPrompt = buildWhatsAppMessageUserPrompt(context);

      const completion = await client.chat.completions.create({
        model: config.model,
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('OpenAI returned empty response for WhatsApp message generation.');
      }

      let parsedJson: any;
      try {
        parsedJson = JSON.parse(rawContent);
      } catch (err: any) {
        throw new Error(`Failed to parse AI output as JSON: ${err.message}`);
      }

      const validatedResult = aiWhatsAppMessageSchema.safeParse(parsedJson);
      if (!validatedResult.success) {
        console.error('WhatsApp message schema validation errors:', validatedResult.error.format());
        throw new Error(
          `AI WhatsApp validation failed: ${validatedResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }

      const result: AIWhatsAppMessageResult = validatedResult.data;

      // Track usage
      const usage = completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined;

      if (usage) {
        try {
          await prisma.usageRecord.create({
            data: {
              metric: 'openai_whatsapp_generation_tokens',
              value: usage.totalTokens,
              metadata: JSON.stringify({
                provider: 'openai',
                model: config.model,
                operation: 'whatsapp_generation',
                leadId: context.lead.id,
                category: result.category,
                tokens: usage.totalTokens,
              }),
            },
          });
        } catch (err) {
          console.warn('Could not record AI usage:', err);
        }
      }

      return {
        result,
        model: config.model,
        usage,
        rawResponse: rawContent,
      };
    } catch (error: any) {
      console.warn('OpenAI WhatsApp generation call encountered error, falling back to deterministic context generator:', error?.message || error);
      const fallback = this.generateDeterministicWhatsApp(context);
      return {
        result: fallback,
        model: 'context-fallback-engine',
        rawResponse: JSON.stringify(fallback),
      };
    }
  }

  async recommendNextAction(
    context: WhatsAppGenerationContext
  ): Promise<AIProviderFollowUpDecisionResponse> {
    const config = getAIConfig();

    if (!config.isConfigured || !config.apiKey) {
      const fallback = this.generateDeterministicFollowUpDecision(context);
      return {
        decision: fallback,
        model: 'rules-decision-engine',
        rawResponse: JSON.stringify(fallback),
      };
    }

    try {
      const client = this.getClient();
      const systemPrompt = WHATSAPP_SYSTEM_PROMPT;
      const userPrompt = buildFollowUpDecisionUserPrompt(context);

      const completion = await client.chat.completions.create({
        model: config.model,
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('OpenAI returned empty response for follow-up decision.');
      }

      const parsedJson = JSON.parse(rawContent);
      const validatedResult = aiFollowUpDecisionSchema.safeParse(parsedJson);
      if (!validatedResult.success) {
        console.error('Follow-up decision schema validation errors:', validatedResult.error.format());
        throw new Error(
          `AI decision validation failed: ${validatedResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }

      return {
        decision: validatedResult.data,
        model: config.model,
        rawResponse: rawContent,
      };
    } catch (error: any) {
      console.warn('OpenAI decision engine encountered error, falling back to deterministic rules engine:', error?.message || error);
      const fallback = this.generateDeterministicFollowUpDecision(context);
      return {
        decision: fallback,
        model: 'rules-decision-engine',
        rawResponse: JSON.stringify(fallback),
      };
    }
  }

  /**
   * Deterministic fallback using confirmed facts only.
   * Prevents system failure when OpenAI quota is exhausted or offline.
   */
  private generateDeterministicWhatsApp(context: WhatsAppGenerationContext): AIWhatsAppMessageResult {
    const name = context.contact?.name || 'Sir/Ma\'am';
    const biz = context.business?.name || context.lead.title;
    const req = context.memories.find((m) => m.category === 'REQUIREMENT')?.value;
    const obj = context.memories.find((m) => m.category === 'OBJECTION')?.value;
    const lastCall = context.recentCalls[0];
    const lastDemo = context.recentDemos[0];

    const category = context.requestedCategory || (
      lastCall?.outcome === 'NO_ANSWER' || lastCall?.outcome === 'SWITCHED_OFF'
        ? 'NO_ANSWER'
        : lastCall?.outcome === 'BUSY'
        ? 'BUSY'
        : lastDemo?.status === 'COMPLETED'
        ? 'POST_DEMO'
        : obj
        ? 'PRICE_OBJECTION'
        : 'DAY_1_FOLLOWUP'
    );

    let hook = `Hi ${name}, James here from BroStartup.`;
    let contextPart = `Following up regarding ${biz}.`;
    let valuePart = req ? `OneComPro simplifies ${req} directly.` : 'Our platform helps automate operations with zero friction.';
    let cta = 'When would be a good 5 mins to connect today?';
    let objective = 'Establish communication and schedule quick discussion';
    const personalizationUsed: string[] = [name, biz];
    if (req) personalizationUsed.push(`Requirement: ${req}`);

    if (category === 'NO_ANSWER' || category === 'MISSED_CALL') {
      hook = `Hi ${name}, tried reaching your number briefly just now.`;
      contextPart = `Reaching out regarding order automation for ${biz}.`;
      valuePart = 'Leaving my direct WhatsApp here so you have my contact.';
      cta = 'Let me know if 4 PM or tomorrow morning suits you better.';
      objective = 'Callback arrangement after missed call';
    } else if (category === 'BUSY') {
      hook = `Hi ${name}, noted you were occupied when I called.`;
      contextPart = `Quick note on streamlining operations for ${biz}.`;
      valuePart = 'We can run through the quick 5-min workflow whenever you are free.';
      cta = 'Should I buzz you around 4:30 PM today?';
      objective = 'Reschedule call at a convenient time';
    } else if (category === 'POST_DEMO') {
      hook = `Hi ${name}, thank you for your time on today's demo!`;
      contextPart = `As we walked through for ${biz}${req ? `, solving ${req}` : ''} will save hours of manual entry.`;
      valuePart = 'I have noted your custom workflow requirements.';
      cta = 'Shall we proceed with setting up your trial account this week?';
      objective = 'Move to onboarding / decision after demo';
    } else if (category === 'PRICE_OBJECTION') {
      hook = `Hi ${name}, had a quick thought on the investment we discussed for ${biz}.`;
      contextPart = 'Most store owners recover the monthly cost within the first 10 days by preventing order drops.';
      valuePart = 'Happy to share a quick 1-page ROI calculation.';
      cta = 'Could I send that across over WhatsApp?';
      objective = 'Address price sensitivity with concrete ROI';
    }

    const message = `${hook} ${contextPart} ${valuePart} ${cta}`;

    return {
      message,
      category,
      objective,
      hook,
      cta,
      personalizationUsed,
      recommendedTiming: 'Send during business hours (10:30 AM - 6:00 PM)',
      reasoning: 'Generated from confirmed customer facts and recent interaction history.',
      confidence: 0.85,
    };
  }

  private generateDeterministicFollowUpDecision(context: WhatsAppGenerationContext): AIFollowUpDecisionResult {
    const { frequencyProtection, lead, recentCalls, recentDemos } = context;

    // High risk checks
    if (lead.status === 'LOST' || lead.status === 'UNQUALIFIED') {
      return {
        recommendedAction: 'STOP TEMPORARILY',
        suggestedCategory: 'LOST_LEAD',
        reasoning: `Lead status is ${lead.status}. Continued outreach risks brand fatigue.`,
        urgency: 'LOW',
        recommendedTiming: 'No immediate follow-up',
        frequencyWarning: frequencyProtection.warning,
        keyContextConsidered: ['Lead status marked UNQUALIFIED/LOST'],
      };
    }

    if (frequencyProtection.hoursSinceLastContact !== null && frequencyProtection.hoursSinceLastContact < 4) {
      return {
        recommendedAction: 'WAIT',
        suggestedCategory: 'DAY_1_FOLLOWUP',
        reasoning: `Customer was contacted only ${frequencyProtection.hoursSinceLastContact}h ago. Allow time for them to respond.`,
        urgency: 'LOW',
        recommendedTiming: 'Wait at least 4-6 hours or until next morning',
        frequencyWarning: frequencyProtection.warning,
        keyContextConsidered: [`Contacted ${frequencyProtection.hoursSinceLastContact}h ago`],
      };
    }

    if (frequencyProtection.unansweredCount >= 2) {
      return {
        recommendedAction: 'CHANGE ANGLE',
        suggestedCategory: 'SPECIAL_OFFER',
        reasoning: `${frequencyProtection.unansweredCount} unanswered messages exist. A standard follow-up is being ignored; change the value hook or offer a case study.`,
        urgency: 'MEDIUM',
        recommendedTiming: 'In 24-48 hours',
        frequencyWarning: frequencyProtection.warning,
        keyContextConsidered: [`${frequencyProtection.unansweredCount} consecutive unanswered follow-ups`],
      };
    }

    if (frequencyProtection.hasScheduledFollowUp) {
      return {
        recommendedAction: 'FOLLOW UP LATER',
        suggestedCategory: 'CALLBACK',
        reasoning: 'A planned follow-up is already in the calendar. Stick to the scheduled time.',
        urgency: 'LOW',
        recommendedTiming: frequencyProtection.scheduledFollowUpDate || 'At scheduled time',
        frequencyWarning: frequencyProtection.warning,
        keyContextConsidered: ['Upcoming scheduled follow-up exists'],
      };
    }

    const lastCall = recentCalls[0];
    const lastDemo = recentDemos[0];

    if (lastCall?.outcome === 'CONNECTED' || lastCall?.outcome === 'INTERESTED' || lead.temperature === 'HOT') {
      return {
        recommendedAction: 'SEND WHATSAPP',
        suggestedCategory: lastDemo?.status === 'COMPLETED' ? 'POST_DEMO' : 'DEMO_CONFIRMATION',
        reasoning: 'Warm prospect with active engagement. Strike while intent is high.',
        urgency: 'HIGH',
        recommendedTiming: 'Within the next 2 hours',
        frequencyWarning: null,
        keyContextConsidered: ['Hot temperature', 'Positive call outcome'],
      };
    }

    if (lastCall?.outcome === 'NO_ANSWER' || lastCall?.outcome === 'BUSY') {
      return {
        recommendedAction: 'SEND WHATSAPP',
        suggestedCategory: lastCall.outcome === 'BUSY' ? 'BUSY' : 'MISSED_CALL',
        reasoning: 'Call went unanswered or busy. Send a polite WhatsApp note with callback options.',
        urgency: 'MEDIUM',
        recommendedTiming: 'Send within 30 minutes of missed call',
        frequencyWarning: null,
        keyContextConsidered: [`Last call outcome: ${lastCall.outcome}`],
      };
    }

    return {
      recommendedAction: 'SEND WHATSAPP',
      suggestedCategory: 'DAY_1_FOLLOWUP',
      reasoning: 'Regular pipeline progression. Keep the conversation alive with a low-friction question.',
      urgency: 'MEDIUM',
      recommendedTiming: 'Today during business hours',
      frequencyWarning: null,
      keyContextConsidered: ['Standard pipeline follow-up'],
    };
  }

  async generateSalesCoach(context: string | object): Promise<AIProviderCoachResponse & AISalesCoachResult> {
    const config = getAIConfig();
    const contextJson = typeof context === 'string' ? context : JSON.stringify(context);
    try {
      const openai = this.getClient();
      const response = await openai.chat.completions.create({
        model: config.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: COACH_SYSTEM_PROMPT },
          { role: 'user', content: buildCoachUserPrompt(contextJson) },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);
      const validated = aiSalesCoachSchema.parse(parsed);

      return {
        ...validated,
        result: validated,
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        rawResponse: content,
      };
    } catch (error: any) {
      console.warn(
        'OpenAI Coach generation failed or quota reached, using deterministic coach generator:',
        error?.message
      );
      const deterministic = this.generateDeterministicSalesCoach(contextJson);
      return {
        ...deterministic,
        result: deterministic,
        model: 'deterministic-coach-engine',
      };
    }
  }

  private generateDeterministicSalesCoach(contextJson: string): AISalesCoachResult {
    let parsed: any = {};
    try {
      parsed = JSON.parse(contextJson);
    } catch {
      parsed = {};
    }

    const calls = parsed.totalCalls || 0;
    const connected = parsed.connected || 0;
    const interested = parsed.interested || 0;
    const demos = parsed.demosCompleted || parsed.demosScheduled || 0;
    const isRecovery = parsed.targetMode === 'RECOVERY';

    const whatWorked: string[] = [];
    const whatDidnt: string[] = [];
    let bottleneck = 'Not enough activity recorded yet to identify primary pipeline bottleneck.';
    const topOpportunity: string[] = [];
    const missedOpportunities: string[] = [];
    const recommendations: string[] = [];
    const tomorrowPriorities: string[] = [];

    if (calls > 0) {
      const connRate = Math.round((connected / calls) * 100);
      if (connRate >= 40) {
        whatWorked.push(`High call connection rate (${connRate}%) across active dialing windows.`);
      } else {
        whatDidnt.push(`Low connection rate (${connRate}%). High proportion of calls went to voicemail or busy.`);
        recommendations.push('Shift fresh cold calls to the 10:40 AM - 12:30 PM peak responsiveness window.');
      }
    } else {
      whatDidnt.push('Zero call touchpoints recorded during this period.');
      recommendations.push('Initiate high-tempo outbound calls in the morning calling window.');
    }

    if (connected > 0) {
      const intRate = Math.round((interested / connected) * 100);
      if (intRate >= 30) {
        whatWorked.push(`Strong pitch resonance (${intRate}% of connected calls converted to interest).`);
      } else {
        whatDidnt.push(`Friction at value pitch (${intRate}% interest rate on connected calls).`);
        recommendations.push('Focus opener on inventory drops & billing delays instead of generic software features.');
      }
    }

    if (demos > 0) {
      whatWorked.push(`Conducted ${demos} product walkthrough(s) targeting verified requirements.`);
    }

    if (isRecovery) {
      bottleneck = 'Target pace is currently behind monthly plan. High-probability deals need faster closing velocity.';
      recommendations.push('Offer onboarding support incentives to close deals pending decision this week.');
      tomorrowPriorities.push('Dial all hot leads in CLOSING or NEGOTIATION stage before 12:00 PM.');
    } else if (connected > 0 && interested === 0) {
      bottleneck = 'Drop-off between Call Connected and Expressed Interest. Opening hook requires tighter ROI proof.';
      tomorrowPriorities.push('Test new 15-second opening hook focusing on inventory mismatch cost.');
    } else if (interested > 0 && demos === 0) {
      bottleneck = 'Drop-off between Interest and Demo Scheduled. Ask for the demo earlier in the call.';
      tomorrowPriorities.push('Lock in specific demo times for all interested prospects.');
    } else {
      bottleneck = 'Maintain consistent calling volume to feed qualified prospects into demo slots.';
      tomorrowPriorities.push('Execute morning fresh calling block (10:40 AM – 12:30 PM) without distraction.');
    }

    if (parsed.topLeads && Array.isArray(parsed.topLeads) && parsed.topLeads.length > 0) {
      parsed.topLeads.slice(0, 3).forEach((l: any) => {
        topOpportunity.push(`${l.title || l.businessName || 'Lead'} — ${l.reason || 'High intent'}`);
      });
    } else {
      topOpportunity.push('Review newly added qualified leads for immediate discovery outreach.');
    }

    if (parsed.overdueCount && parsed.overdueCount > 0) {
      missedOpportunities.push(`${parsed.overdueCount} overdue follow-up callbacks pending resolution.`);
      tomorrowPriorities.unshift('Clear all overdue follow-ups in the first 30 minutes of the workday.');
    }

    if (tomorrowPriorities.length < 3) {
      tomorrowPriorities.push('Follow up on all product demos conducted in the last 48 hours.');
    }

    return {
      whatWorked: whatWorked.length > 0 ? whatWorked : ['Maintained consistent CRM tracking for sales activities.'],
      whatDidnt: whatDidnt.length > 0 ? whatDidnt : ['No major friction logged in this active period.'],
      bottleneck,
      topOpportunity,
      missedOpportunities: missedOpportunities.length > 0 ? missedOpportunities : ['No critical missed opportunities identified.'],
      recommendations: recommendations.length > 0 ? recommendations : ['Maintain disciplined time block adherence.'],
      tomorrowPriorities: tomorrowPriorities.slice(0, 3),
      confidence: 0.85,
    };
  }
}


