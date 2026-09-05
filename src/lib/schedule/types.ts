export type EnergyLevel = 'HIGH' | 'NORMAL' | 'LOW';

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ActionType =
  | 'CALL'
  | 'DEMO'
  | 'FOLLOW_UP'
  | 'WHATSAPP'
  | 'CLOSING'
  | 'LUNCH'
  | 'PLANNING'
  | 'ADMIN'
  | 'REST'
  | 'RECOVERY';

export interface WorkHoursConfig {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  workingDays: number[]; // 1=Mon, ..., 6=Sat, 0=Sun
  lunch: {
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    isProtected: boolean;
  };
  reminderThresholds: {
    demoMinutesBefore: number; // default 20
    overdueCheckMinutes: number;
  };
}

export interface PriorityScoreResult {
  score: number;
  level: PriorityLevel;
  reason: string;
  factors: {
    temperature: number;
    stage: number;
    urgency: number;
    dealValue: number;
    buyingSignals: number;
    objections: number;
  };
}

export interface NextBestActionOutput {
  actionType: ActionType;
  title: string;
  leadId?: string | null;
  leadName?: string | null;
  businessName?: string | null;
  phone?: string | null;
  reason: string;
  objective: string;
  priority: PriorityLevel;
  estimatedMinutes: number;
  nextStep: string;
  blockContext?: string;
  badge?: string;
}

export interface TargetPaceResult {
  mode: 'RECOVERY' | 'ON_TRACK' | 'AHEAD';
  targetAmount: number;
  achievedAmount: number;
  progressPercent: number;
  remainingAmount: number;
  targetSales: number;
  achievedSales: number;
  remainingSales: number;
  daysRemaining: number;
  daysInMonth: number;
  pipelineValue: number;
  statusLabel: string;
  statusDescription: string;
  recommendedFocus: string[];
}

export interface ScheduleConflict {
  id: string;
  title: string;
  type: string;
  startTime: Date;
  endTime: Date;
  conflictsWithId: string;
  conflictsWithTitle: string;
  conflictsWithType: string;
  reason: string;
}

export interface DefaultBlockDefinition {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  title: string;
  blockType:
    | 'CALLING'
    | 'FOLLOW_UP'
    | 'DEMO'
    | 'CLOSING'
    | 'CALLBACK'
    | 'ADMIN'
    | 'PLANNING'
    | 'REPORT'
    | 'BREAK'
    | 'LUNCH'
    | 'CUSTOM';
  isProtected: boolean;
  goal: string;
  primaryAction: string;
}
