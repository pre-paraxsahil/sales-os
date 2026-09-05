import { z } from 'zod';

export const aiSalesCoachSchema = z.object({
  whatWorked: z.array(z.string()).default([]),
  whatDidnt: z.array(z.string()).default([]),
  bottleneck: z.string(),
  topOpportunity: z.array(z.string()).default([]),
  missedOpportunities: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  tomorrowPriorities: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.85),
});

export type AISalesCoachResult = z.infer<typeof aiSalesCoachSchema>;
