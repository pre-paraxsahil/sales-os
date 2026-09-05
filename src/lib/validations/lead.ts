export interface CreateLeadInput {
  businessName?: string;
  contactName: string;
  phone: string;
  email?: string;
  industry?: string;
  location?: string; // mapped to city/state
  source?: string;
  notes?: string;
}

export interface UpdateLeadInput {
  title?: string;
  status?: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'PROPOSAL_SENT' | 'NEGOTIATION' | 'WON' | 'LOST';
  temperature?: 'COLD' | 'WARM' | 'HOT';
  scoreValue?: number;
  estimatedValue?: number;
  nextActionDate?: string | null;
  notes?: string;
}

export function validateCreateLead(input: any): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.phone || typeof input.phone !== 'string' || input.phone.trim().length === 0) {
    errors.phone = 'Phone number is required.';
  } else {
    // Basic phone validation (at least 7 digits, allowed +, -, spaces)
    const cleanPhone = input.phone.replace(/[\s\-\(\)]/g, '');
    if (cleanPhone.length < 7) {
      errors.phone = 'Please provide a valid phone number (minimum 7 digits).';
    }
  }

  if (!input.contactName && !input.businessName) {
    errors.contactName = 'Either Contact Name or Business Name must be provided.';
  }

  if (input.email && typeof input.email === 'string' && input.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
