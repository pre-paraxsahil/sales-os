import { z } from 'zod';

export const productAvailabilityStateEnum = z.enum([
  'AVAILABLE',
  'PLAN_RESTRICTED',
  'COMING_SOON',
  'UNKNOWN',
]);

export const signalLevelEnum = z.enum(['STRONG', 'MEDIUM', 'WEAK']);

export const demoFeatureStepSchema = z.object({
  feature: z.string().min(1, 'Feature name required'),
  whyRelevant: z.string().default(''),
  whatToShow: z.string().min(1, 'whatToShow guideline required'),
  whatToSay: z.string().min(1, 'whatToSay talking point required'),
  askQuestion: z.string().min(1, 'askQuestion required to engage customer'),
  whyItMatters: z.string().min(1, 'whyItMatters operational rationale required'),
  expectedCustomerValue: z.string().default(''),
  productStatus: productAvailabilityStateEnum.default('AVAILABLE'),
  planRequirement: z.string().optional(),
});

export const demoStorySchema = z.object({
  currentProblem: z.string().default(''),
  customerBuyingProcess: z.string().default(''),
  storeImprovement: z.string().default(''),
  businessBenefit: z.string().default(''),
  whyNow: z.string().default(''),
});

export const demoBuyingSignalSchema = z.object({
  signal: z.string(),
  level: signalLevelEnum.default('MEDIUM'),
  recommendedAction: z.string().default(''),
});

export const demoObjectionHandlingSchema = z.object({
  objection: z.string(),
  response: z.string(),
  whyItWorks: z.string().default(''),
});

export const demoPlanSchema = z.object({
  demoObjective: z.string().min(1, 'Demo objective required'),
  opening: z.string().min(1, 'Opening statement required'),
  requirementConfirmation: z.array(z.string()).default([]),
  discoveryQuestions: z.array(z.string()).default([]),
  painConfirmation: z.array(z.string()).default([]),
  story: demoStorySchema.default({
    currentProblem: '',
    customerBuyingProcess: '',
    storeImprovement: '',
    businessBenefit: '',
    whyNow: '',
  }),
  featureSequence: z.array(demoFeatureStepSchema).min(1, 'At least 1 feature step required'),
  realisticExamples: z.array(z.string()).default([]),
  talkingPoints: z.array(z.string()).default([]),
  buyingSignalsToWatch: z.array(demoBuyingSignalSchema).default([]),
  objectionHandling: z.array(demoObjectionHandlingSchema).default([]),
  closingTransition: z.string().min(1, 'Closing transition required'),
  nextStep: z.string().min(1, 'Next step recommendation required'),
  avoid: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.85),
});

export type DemoPlanSchemaType = z.infer<typeof demoPlanSchema>;
