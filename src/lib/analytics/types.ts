export type AnalyticsDateRange =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'CUSTOM';

export interface DateRangeBounds {
  start: Date;
  end: Date;
  label: string;
}

export interface ActivityCounts {
  totalCalls: number;
  newCalls: number;
  followUpCalls: number;
  connected: number;
  interested: number;
  demosScheduled: number;
  demosCompleted: number;
  noAnswer: number;
  busy: number;
  switchedOff: number;
  notInterested: number;
  wrongNumber: number;
  other: number;
}

export interface SalesMetrics {
  totalSales: number;
  totalRevenue: number;
  averageSaleValue: number;
  packages: Array<{ packageCode: string; count: number; revenue: number }>;
  sources: Array<{ source: string; count: number; revenue: number }>;
}

export interface PipelineHealth {
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  freshLeads: number;
  demosPending: number;
  followUpsDue: number;
  overdueFollowUps: number;
  pipelineValue: number;
}

export interface FunnelStage {
  id: string;
  name: string;
  count: number;
  percentageOfTop: number;
  conversionFromPrev: number;
  dropOffRate: number;
  dropOffCount: number;
}

export interface FunnelAnalyticsResult {
  stages: FunnelStage[];
  bottleneck: {
    stageId: string;
    stageName: string;
    dropOffRate: number;
    explanation: string;
    recommendation: string;
  } | null;
}

export interface SalesPulseBlock {
  blockTitle: string;
  timeRange: string;
  activity: ActivityCounts;
  connectionRate: number;
  interestRate: number;
  demoConversionRate: number;
}

export interface TwoHourPulseResult {
  currentBlock: SalesPulseBlock;
  previousBlock: SalesPulseBlock | null;
  comparison: {
    connectionRateDelta: number;
    callVolumeDelta: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
  } | null;
  whatsGoingWell: string[];
  whatsWeak: string[];
  nextBlockFocus: string;
  topLeadsForAttention: Array<{
    id: string;
    title: string;
    contactName?: string | null;
    phone?: string | null;
    temperature: string;
    priorityReason: string;
  }>;
}

export interface CallingTimeWindow {
  timeWindow: string; // e.g., '10:00 - 12:00'
  startHour: number;
  endHour: number;
  totalCalls: number;
  connected: number;
  interested: number;
  demos: number;
  sales: number;
  connectionRate: number;
  conversionRate: number;
  sampleSizeAdequate: boolean;
}

export interface CallingIntelligenceResult {
  windows: CallingTimeWindow[];
  bestWindow: {
    timeWindow: string;
    rate: number;
    reason: string;
    sampleSize: number;
  } | null;
  hasEnoughData: boolean;
  summary: string;
}

export interface LeadSourceStat {
  source: string;
  leadsCount: number;
  connectedCalls: number;
  interestedCount: number;
  demosBooked: number;
  salesCount: number;
  revenue: number;
  connectionRate: number;
  closeRate: number;
  sampleSizeAdequate: boolean;
}

export interface LostOpportunityItem {
  id: string;
  leadId: string;
  leadTitle: string;
  contactName?: string | null;
  industry?: string | null;
  stageLost: string;
  reason?: string | null;
  lastInteraction?: string | null;
  lastObjection?: string | null;
  estimatedValue?: number | null;
}

export interface PendingHotOpportunityItem {
  id: string;
  leadTitle: string;
  contactName?: string | null;
  phone?: string | null;
  temperature: string;
  stage: string;
  lastInteractionDate?: Date | null;
  daysSinceLastInteraction: number;
  buyingSignals: string[];
  pendingFollowUpDate?: Date | null;
  recommendedAction: string;
}

export interface DailyReportData {
  id?: string;
  reportDate: string;
  dayOfWeek: string;
  activity: ActivityCounts;
  funnel: {
    callsToConnected: number;
    connectedToInterested: number;
    interestedToDemo: number;
    demoToSale: number;
  };
  sales: SalesMetrics;
  aiReview: {
    whatWorked: string[];
    whatDidnt: string[];
    bottleneck: string;
    bestOpportunity: string;
    missedOpportunities: string[];
    tomorrowPriorities: string[];
    recommendedStrategy: string;
  };
  generatedAt: string;
}

export interface WeeklyReportData {
  id?: string;
  weekStartDate: string;
  weekEndDate: string;
  activity: ActivityCounts;
  conversions: {
    connectionRate: number;
    interestRate: number;
    demoRate: number;
    closeRate: number;
  };
  sales: SalesMetrics;
  bestDay: { dayName: string; calls: number; sales: number; revenue: number } | null;
  weakestDay: { dayName: string; calls: number } | null;
  bestCallingTime: string | null;
  bestLeadSource: string | null;
  weakestFunnelStage: string | null;
  lostOpportunitiesCount: number;
  pendingHotCount: number;
  aiReview?: {
    strategicWins: string[];
    coreBottlenecks: string[];
    nextWeekDirectives: string[];
  };
  hasEnoughData: boolean;
  generatedAt: string;
}

export interface ForecastResult {
  forecastAvailable: boolean;
  reasonIfNotAvailable?: string;
  projectedSalesAmount: number;
  projectedSalesCount: number;
  confidenceScore: number; // 0-100
  basis: {
    achievedAmount: number;
    daysElapsed: number;
    daysRemaining: number;
    dailyRunRate: number;
    pipelineWeightedValue: number;
  };
}
