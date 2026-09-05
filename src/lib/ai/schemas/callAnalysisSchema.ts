import { z } from 'zod';

export const trustStateEnum = z.enum(['CONFIRMED', 'INFERRED', 'UNKNOWN', 'REJECTED']);

export const factItemSchema = z.object({
  value: z.string().default(''),
  status: trustStateEnum.default('UNKNOWN'),
  confidence: z.number().min(0).max(1).default(0.5),
  source: z.string().optional(),
});

export const leadTemperatureEnum = z.enum(['COLD', 'WARM', 'HOT']);

export const callAnalysisSchema = z.object({
  summary: z.string().min(1, 'Summary cannot be empty'),
  businessUnderstanding: z.string().default(''),
  requirements: z.array(factItemSchema).default([]),
  painPoints: z.array(factItemSchema).default([]),
  currentProcess: z.string().default(''),
  goals: z.array(factItemSchema).default([]),
  decisionMaker: factItemSchema.default({
    value: 'Unknown / Not identified',
    status: 'UNKNOWN',
    confidence: 0,
  }),
  teamInvolved: z.array(z.string()).default([]),
  timeline: factItemSchema.default({
    value: 'Timeline not specified',
    status: 'UNKNOWN',
    confidence: 0,
  }),
  budget: factItemSchema.default({
    value: 'Budget was not discussed',
    status: 'UNKNOWN',
    confidence: 0,
  }),
  packageDiscussed: factItemSchema.default({
    value: 'No specific package discussed',
    status: 'UNKNOWN',
    confidence: 0,
  }),
  objections: z.array(factItemSchema).default([]),
  buyingSignals: z.array(factItemSchema).default([]),
  competitor: factItemSchema.default({
    value: 'No competitor mentioned',
    status: 'UNKNOWN',
    confidence: 0,
  }),
  nextAction: factItemSchema.default({
    value: 'Follow up call required',
    status: 'INFERRED',
    confidence: 0.7,
  }),
  leadTemperature: leadTemperatureEnum.default('WARM'),
  confidence: z.number().min(0).max(1).default(0.8),
  unknownInformation: z.array(z.string()).default([]),
});

export type CallAnalysisSchemaType = z.infer<typeof callAnalysisSchema>;
