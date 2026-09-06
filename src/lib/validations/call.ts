import { CallType, CallOutcome, LeadTemperature } from '@prisma/client';

export interface SaveCallInput {
  leadId: string;
  callType?: CallType;
  outcome: CallOutcome;
  durationSeconds?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
  notes?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  temperature?: LeadTemperature | null;
  memoryKey?: string | null;
  memoryValue?: string | null;
  memoryCategory?: string | null;
}

const VALID_CALL_TYPES: CallType[] = [
  'OUTBOUND',
  'INBOUND',
  'FOLLOW_UP',
  'DISCOVERY',
  'NEW_ENQUIRY',
  'COLD_CALL',
  'INTERESTED_LEAD',
  'HOT_LEAD',
  'CLOSING_CALL',
  'CALLBACK',
];

const VALID_CALL_OUTCOMES: CallOutcome[] = [
  'CONNECTED',
  'INTERESTED',
  'DEMO_BOOKED',
  'FOLLOW_UP_REQUIRED',
  'CALLBACK_REQUESTED',
  'NO_ANSWER',
  'BUSY',
  'SWITCHED_OFF',
  'NOT_INTERESTED',
  'WRONG_NUMBER',
  'OTHER',
  'VOICEMAIL',
  'SCHEDULED_DEMO',
];

export function validateSaveCall(input: any): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.outcome || !VALID_CALL_OUTCOMES.includes(input.outcome)) {
    errors.outcome = `Invalid or missing call outcome. Valid outcomes: ${VALID_CALL_OUTCOMES.join(', ')}`;
  }

  if (input.callType && !VALID_CALL_TYPES.includes(input.callType)) {
    errors.callType = `Invalid call type. Valid types: ${VALID_CALL_TYPES.join(', ')}`;
  }

  if (input.notes && typeof input.notes === 'string' && input.notes.length > 2000) {
    errors.notes = 'Notes cannot exceed 2000 characters.';
  }

  if (input.nextActionAt) {
    const d = new Date(input.nextActionAt);
    if (isNaN(d.getTime())) {
      errors.nextActionAt = 'Invalid next action date/time format.';
    }
  }

  if (input.durationSeconds !== undefined && input.durationSeconds !== null) {
    const dur = Number(input.durationSeconds);
    if (isNaN(dur) || dur < 0) {
      errors.durationSeconds = 'Duration must be a positive number of seconds.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
