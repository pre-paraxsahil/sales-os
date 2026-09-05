import { z } from 'zod';

export const WHATSAPP_CATEGORIES = [
  'NEW_ENQUIRY',
  'MISSED_CALL',
  'BUSY',
  'NO_ANSWER',
  'WHY_I_CALLED',
  'CALLBACK',
  'DEMO_CONFIRMATION',
  'DEMO_REMINDER',
  'DEMO_LINK',
  'POST_DEMO',
  'DAY_1_FOLLOWUP',
  'DAY_2_FOLLOWUP',
  'NO_RESPONSE',
  'TEAM_DISCUSSION',
  'DECISION_PENDING',
  'PRICE_OBJECTION',
  'CLOSING',
  'SPECIAL_OFFER',
  'REACTIVATION',
  'LOST_LEAD',
  'FUTURE_REQUIREMENT',
  'CUSTOM',
] as const;

export type WhatsAppCategoryType = (typeof WHATSAPP_CATEGORIES)[number];

export const FOLLOW_UP_ACTIONS = [
  'CALL NOW',
  'SEND WHATSAPP',
  'WAIT',
  'CHANGE ANGLE',
  'FOLLOW UP LATER',
  'STOP TEMPORARILY',
] as const;

export type FollowUpActionType = (typeof FOLLOW_UP_ACTIONS)[number];

export const aiWhatsAppMessageSchema = z.object({
  message: z.string().min(5, 'Message body must be at least 5 characters'),
  category: z.string(),
  objective: z.string(),
  hook: z.string(),
  cta: z.string(),
  personalizationUsed: z.array(z.string()).default([]),
  recommendedTiming: z.string(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
});

export type AIWhatsAppMessageResult = z.infer<typeof aiWhatsAppMessageSchema>;

export const aiFollowUpDecisionSchema = z.object({
  recommendedAction: z.enum(FOLLOW_UP_ACTIONS),
  suggestedCategory: z.string(),
  reasoning: z.string(),
  urgency: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  recommendedTiming: z.string(),
  frequencyWarning: z.string().nullable().optional(),
  keyContextConsidered: z.array(z.string()).default([]),
});

export type AIFollowUpDecisionResult = z.infer<typeof aiFollowUpDecisionSchema>;

export const aiCampaignDraftSchema = z.object({
  name: z.string(),
  objective: z.string(),
  category: z.string(),
  hook: z.string(),
  message: z.string(),
  cta: z.string(),
  followUpStrategy: z.string(),
  recommendedTiming: z.string(),
});

export type AICampaignDraftResult = z.infer<typeof aiCampaignDraftSchema>;
