// AI Provider and Call Analysis Domain Types
import { AISalesCoachResult } from './schemas/coachSchema';

export interface AIProviderCoachResponse {
  result: AISalesCoachResult;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  rawResponse?: string;
}

export type TrustState = 'CONFIRMED' | 'INFERRED' | 'UNKNOWN' | 'REJECTED';

export interface FactItem {
  value: string;
  status: TrustState;
  confidence: number;
  source?: string;
}

export interface CallAnalysisResult {
  summary: string;
  businessUnderstanding: string;
  requirements: FactItem[];
  painPoints: FactItem[];
  currentProcess: string;
  goals: FactItem[];
  decisionMaker: FactItem;
  teamInvolved: string[];
  timeline: FactItem;
  budget: FactItem;
  packageDiscussed: FactItem;
  objections: FactItem[];
  buyingSignals: FactItem[];
  competitor: FactItem;
  nextAction: FactItem;
  leadTemperature: 'COLD' | 'WARM' | 'HOT';
  confidence: number;
  unknownInformation: string[];
}

export interface CandidateMemoryUpdate {
  category: string;
  key: string;
  value: string;
  status: TrustState;
  confidence: number;
  sourceCallId: string;
  hasConflict: boolean;
  existingMemoryId?: string;
  existingValue?: string;
  existingState?: TrustState;
}

export interface MemoryConflict {
  category: string;
  key: string;
  existingMemoryId: string;
  existingValue: string;
  existingState: TrustState;
  newValue: string;
  newState: TrustState;
  sourceCallId: string;
  confidence: number;
}

export interface CallAnalysisContext {
  lead: {
    id: string;
    title: string;
    source: string | null;
    status: string;
    temperature: string;
    notes: string | null;
  };
  business: {
    name: string;
    industry: string | null;
    city: string | null;
  } | null;
  contact: {
    name: string;
    phone: string | null;
    email: string | null;
    designation: string | null;
  } | null;
  targetCall: {
    id: string;
    callType: string;
    outcome: string;
    durationSeconds: number | null;
    notes: string | null;
    nextAction: string | null;
    occurredAt: string;
    transcriptText?: string;
  };
  existingMemories: Array<{
    category: string;
    key: string;
    value: string;
    verificationState: string;
    confidence: number | null;
  }>;
  recentCallsSummary: Array<{
    outcome: string;
    notes: string | null;
    occurredAt: string;
  }>;
  productKnowledge: Array<{
    planName: string;
    planCode: string;
    priceFormatted: string;
    billingCycle: string;
    features: string[];
  }>;
}

export interface AIProviderResponse {
  analysis: CallAnalysisResult;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  rawResponse?: string;
}

export interface AIProvider {
  readonly name: string;
  analyzeCall(context: CallAnalysisContext): Promise<AIProviderResponse>;
  generateDemoPlan(context: DemoPlanContext): Promise<AIProviderDemoPlanResponse>;
  generateWhatsAppMessage(context: WhatsAppGenerationContext): Promise<AIProviderWhatsAppResponse>;
  recommendNextAction(context: WhatsAppGenerationContext): Promise<AIProviderFollowUpDecisionResponse>;
  generateSalesCoach(context: string | object): Promise<AIProviderCoachResponse & AISalesCoachResult>;
}

// ==========================================
// DEMO ENGINE TYPES (BUILD 07)
// ==========================================

export type ProductAvailabilityState =
  | 'AVAILABLE'
  | 'PLAN_RESTRICTED'
  | 'COMING_SOON'
  | 'UNKNOWN';

export type SignalLevel = 'STRONG' | 'MEDIUM' | 'WEAK';

export interface DemoFeatureStep {
  feature: string;
  whyRelevant: string;
  whatToShow: string;
  whatToSay: string;
  askQuestion: string;
  whyItMatters: string;
  expectedCustomerValue: string;
  productStatus: ProductAvailabilityState;
  planRequirement?: string;
}

export interface DemoStory {
  currentProblem: string;
  customerBuyingProcess: string;
  storeImprovement: string;
  businessBenefit: string;
  whyNow: string;
}

export interface DemoBuyingSignal {
  signal: string;
  level: SignalLevel;
  recommendedAction: string;
}

export interface DemoObjectionHandling {
  objection: string;
  response: string;
  whyItWorks: string;
}

export interface DemoPlanResult {
  demoObjective: string;
  opening: string;
  requirementConfirmation: string[];
  discoveryQuestions: string[];
  painConfirmation: string[];
  story: DemoStory;
  featureSequence: DemoFeatureStep[];
  realisticExamples: string[];
  talkingPoints: string[];
  buyingSignalsToWatch: DemoBuyingSignal[];
  objectionHandling: DemoObjectionHandling[];
  closingTransition: string;
  nextStep: string;
  avoid: string[];
  confidence: number;
}

export interface BeforeDemoBrief {
  customer: {
    name: string;
    business: string;
    industry: string;
    temperature: string;
    stage: string;
  };
  whatWeKnow: {
    requirements: string[];
    painPoints: string[];
    goals: string[];
    currentSystem: string;
    orderingProcess: string;
    decisionMaker: string;
    timeline: string;
  };
  salesContext: {
    previousObjections: string[];
    buyingSignals: string[];
    packageDiscussed: string;
    pricingDiscussed: string;
    lastInteraction: string;
    previousPromises: string[];
  };
  demoObjective: string;
  keyRisk: string;
  unknown: string[];
}

export interface LiveDemoStepRecord {
  stepNumber?: number;
  feature: string;
  featureId?: string;
  status?: 'PENDING' | 'DISCUSSED' | 'SKIPPED';
  startedAt?: string;
  completedAt?: string;
  discussed?: boolean;
  skipped?: boolean;
  notes?: string[];
  note?: string;
}

export interface DemoPlanContext {
  lead: {
    id: string;
    title: string;
    source: string | null;
    status: string;
    temperature: string;
    notes: string | null;
  };
  business: {
    name: string;
    industry: string | null;
    city: string | null;
  } | null;
  contact: {
    name: string;
    phone: string | null;
    email: string | null;
    designation: string | null;
  } | null;
  targetDemo: {
    id: string;
    status: string;
    scheduledAt: string;
    durationMinutes: number | null;
    meetingUrl: string | null;
    notes: string | null;
  };
  existingMemories: Array<{
    category: string;
    key: string;
    value: string;
    verificationState: string;
    confidence: number | null;
  }>;
  recentCalls: Array<{
    outcome: string;
    notes: string | null;
    occurredAt: string;
  }>;
  callAnalysisSummaries: string[];
  productKnowledge: Array<{
    planName: string;
    planCode: string;
    priceFormatted: string;
    billingCycle: string;
    features: string[];
  }>;
}

export interface AIProviderDemoPlanResponse {
  plan: DemoPlanResult;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  rawResponse?: string;
}

// ==========================================
// WHATSAPP & FOLLOW-UP ENGINE TYPES (BUILD 08)
// ==========================================

export interface FrequencyProtectionInfo {
  hoursSinceLastContact: number | null;
  unansweredCount: number;
  hasScheduledFollowUp: boolean;
  scheduledFollowUpDate: string | null;
  warning: string | null;
  isHighRiskOfSpam: boolean;
}

export interface WhatsAppGenerationContext {
  lead: {
    id: string;
    title: string;
    source: string | null;
    status: string;
    temperature: string;
    notes: string | null;
  };
  business: {
    name: string;
    industry: string | null;
    city: string | null;
  } | null;
  contact: {
    name: string;
    phone: string | null;
    email: string | null;
    designation: string | null;
  } | null;
  memories: Array<{
    category: string;
    key: string;
    value: string;
    verificationState: string;
  }>;
  recentCalls: Array<{
    id: string;
    outcome: string;
    notes: string | null;
    nextAction: string | null;
    occurredAt: string;
  }>;
  recentDemos: Array<{
    id: string;
    status: string;
    scheduledAt: string;
    notes: string | null;
  }>;
  recentWhatsAppMessages: Array<{
    id: string;
    direction: string;
    category: string | null;
    content: string;
    status: string;
    responseStatus: string | null;
    sentAt: string | null;
  }>;
  frequencyProtection: FrequencyProtectionInfo;
  productKnowledge: Array<{
    planName: string;
    planCode: string;
    priceFormatted: string;
    billingCycle: string;
    features: string[];
  }>;
  requestedCategory?: string;
  customObjective?: string;
}

export interface AIProviderWhatsAppResponse {
  result: import('./schemas/whatsappSchema').AIWhatsAppMessageResult;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  rawResponse?: string;
}

export interface AIProviderFollowUpDecisionResponse {
  decision: import('./schemas/whatsappSchema').AIFollowUpDecisionResult;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  rawResponse?: string;
}

export interface AIProviderCoachResponse {
  result: import('./schemas/coachSchema').AISalesCoachResult;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  rawResponse?: string;
}



