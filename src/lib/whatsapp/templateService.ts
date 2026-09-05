import { prisma } from '@/lib/prisma';

export interface TemplateVariables {
  customer_name?: string | null;
  business_name?: string | null;
  industry?: string | null;
  next_action?: string | null;
  demo_date?: string | null;
  plan_name?: string | null;
  [key: string]: string | null | undefined;
}

/**
 * Safely renders template content by substituting variables.
 * Never leaves raw undefined "{{variable}}" tags in the output.
 */
export function interpolateTemplate(content: string, vars: TemplateVariables): string {
  if (!content) return '';

  let result = content;

  const defaultFallbacks: Record<string, string> = {
    customer_name: vars.customer_name?.trim() || 'Sir/Ma\'am',
    business_name: vars.business_name?.trim() || 'your business',
    industry: vars.industry?.trim() || 'your sector',
    next_action: vars.next_action?.trim() || 'our next step',
    demo_date: vars.demo_date?.trim() || 'our upcoming demo',
    plan_name: vars.plan_name?.trim() || 'OneComPro',
  };

  // Replace each {{variable}}
  result = result.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, varName) => {
    const customVal = vars[varName];
    if (customVal && customVal.trim().length > 0) {
      return customVal.trim();
    }
    if (defaultFallbacks[varName]) {
      return defaultFallbacks[varName];
    }
    // If an unknown variable is passed, replace it cleanly rather than leaving brackets
    return '';
  });

  // Clean up any double spaces created by empty replacements
  return result.replace(/ +(?= )/g, '').trim();
}

/**
 * Standard seed templates for Indian B2B sales (OneComPro)
 */
export const DEFAULT_TEMPLATES = [
  {
    name: 'Missed Call Callback',
    category: 'MISSED_CALL',
    content: 'Hi {{customer_name}}, tried calling you briefly regarding {{business_name}}. When would be a good 5 minutes to connect today?',
    variables: '["customer_name", "business_name"]',
  },
  {
    name: 'Customer Busy Quick Note',
    category: 'BUSY',
    content: 'Hi {{customer_name}}, noted you were tied up. Shall I call you back around 4 PM or would tomorrow morning suit {{business_name}} better?',
    variables: '["customer_name", "business_name"]',
  },
  {
    name: 'No Answer - Why I Called',
    category: 'NO_ANSWER',
    content: 'Hi {{customer_name}}, James here from BroStartup. Reaching out regarding online order automation for {{business_name}}. Dropping you a quick ping so you have my direct WhatsApp.',
    variables: '["customer_name", "business_name"]',
  },
  {
    name: 'Demo Confirmation',
    category: 'DEMO_CONFIRMATION',
    content: 'Hi {{customer_name}}, your OneComPro live walkthrough is confirmed for {{demo_date}}. Looking forward to showing how we streamline operations for {{business_name}}!',
    variables: '["customer_name", "demo_date", "business_name"]',
  },
  {
    name: 'Demo 30-min Reminder',
    category: 'DEMO_REMINDER',
    content: 'Hi {{customer_name}}, quick reminder: our OneComPro demo is scheduled in 30 mins ({{demo_date}}). Joining link is ready — see you shortly!',
    variables: '["customer_name", "demo_date"]',
  },
  {
    name: 'Post-Demo Recap & Next Step',
    category: 'POST_DEMO',
    content: 'Hi {{customer_name}}, thank you for your time on today\'s demo! As discussed, OneComPro directly solves order syncing for {{business_name}}. Here is the summary of what we covered.',
    variables: '["customer_name", "business_name"]',
  },
  {
    name: 'Day 1 Follow-up',
    category: 'DAY_1_FOLLOWUP',
    content: 'Hi {{customer_name}}, following up on our discussion yesterday. Did you have a chance to review the workflow we outlined for {{business_name}}?',
    variables: '["customer_name", "business_name"]',
  },
  {
    name: 'Team Discussion Check-in',
    category: 'TEAM_DISCUSSION',
    content: 'Hi {{customer_name}}, hope the internal review with your team went well. Happy to answer any technical questions your staff had regarding {{plan_name}}.',
    variables: '["customer_name", "plan_name"]',
  },
  {
    name: 'Price Objection Re-frame',
    category: 'PRICE_OBJECTION',
    content: 'Hi {{customer_name}}, regarding the pricing we discussed: most {{industry}} businesses recover the monthly OneComPro cost within week 1 purely via reduced order leakage. Can I share a 1-page ROI breakdown?',
    variables: '["customer_name", "industry"]',
  },
  {
    name: 'Gentle Reactivation',
    category: 'REACTIVATION',
    content: 'Hi {{customer_name}}, checking in to see if expanding online operations for {{business_name}} is still a priority for this quarter. We recently rolled out quick WhatsApp catalogue sync.',
    variables: '["customer_name", "business_name"]',
  },
];

/**
 * Ensures default sales templates exist in PostgreSQL.
 */
export async function ensureDefaultTemplatesSeeded(): Promise<void> {
  const count = await prisma.whatsAppTemplate.count();
  if (count === 0) {
    for (const t of DEFAULT_TEMPLATES) {
      await prisma.whatsAppTemplate.create({
        data: {
          name: t.name,
          category: t.category,
          language: 'en',
          content: t.content,
          variables: t.variables,
          isApproved: true,
          isActive: true,
        },
      });
    }
  }
}
