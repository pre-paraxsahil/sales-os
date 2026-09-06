import { prisma } from '@/lib/prisma';
import {
  KNOWLEDGE_VERSION,
  KNOWLEDGE_SOURCE,
  seedOneComProProductKnowledge,
  ONECOMPRO_OBJECTIONS_DATA,
  ONECOMPRO_INDUSTRIES_DATA,
} from './productKnowledgeSeed';

export interface PlanKnowledgeOutput {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  annualPrice: number;
  monthlyPriceFormatted: string;
  annualPriceFormatted: string;
  currency: string;
  limits: Array<{ key: string; value: string; unit: string | null }>;
  features: string[];
}

export interface FeatureCapabilityResult {
  status: 'YES' | 'PLAN_RESTRICTED' | 'ADD_ON' | 'COMING_SOON' | 'UNKNOWN';
  featureName: string;
  simpleAnswer: string;
  relevantPlan: string;
  whyItMatters: string;
  whatToSayToCustomer: string;
  whatNotToPromise: string;
  source: string;
  version: string;
}

export interface IndustryPlaybook {
  code: string;
  name: string;
  description: string;
  pitchPriorities: string[];
  recommendedPlan: string;
}

export interface ObjectionBattlecard {
  key: string;
  title: string;
  counterSummary: string;
  fullPitch: string;
  whatNotToPromise: string;
}

/**
 * Ensures knowledge base is initialized in DB.
 */
async function ensureKnowledgeBase() {
  const planCount = await prisma.plan.count();
  if (planCount === 0) {
    await seedOneComProProductKnowledge(prisma);
  }
}

/**
 * Retrieves all plans and dynamically loaded prices & limits from PostgreSQL.
 * NEVER hardcodes pricing in frontend or prompt templates.
 */
export async function getPlanAwareKnowledge(): Promise<PlanKnowledgeOutput[]> {
  await ensureKnowledgeBase();

  const plans = await prisma.plan.findMany({
    where: { availability: 'AVAILABLE' },
    include: {
      prices: true,
      limits: true,
      features: {
        where: { isIncluded: true },
        include: { feature: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return plans.map((p) => {
    const monthlyPriceRecord = p.prices.find((pr) => pr.billingCycle === 'MONTHLY');
    const annualPriceRecord = p.prices.find((pr) => pr.billingCycle === 'ANNUALLY');

    const monthlyPrice = Number(monthlyPriceRecord?.price || 0);
    const annualPrice = Number(annualPriceRecord?.price || 0);
    const currency = monthlyPriceRecord?.currency || 'INR';

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      monthlyPrice,
      annualPrice,
      monthlyPriceFormatted: `₹${monthlyPrice.toLocaleString('en-IN')}/mo`,
      annualPriceFormatted: `₹${annualPrice.toLocaleString('en-IN')}/yr`,
      currency,
      limits: p.limits.map((l) => ({
        key: l.key,
        value: l.value,
        unit: l.unit,
      })),
      features: p.features.map((f) => f.feature.name),
    };
  });
}

/**
 * Evaluates whether OneComPro can fulfill a specific requirement or feature request.
 * Returns YES | PLAN_RESTRICTED | ADD_ON | COMING_SOON | UNKNOWN.
 * Strictly avoids hallucinating capabilities.
 */
export async function checkFeatureCapability(query: string): Promise<FeatureCapabilityResult> {
  await ensureKnowledgeBase();
  const q = query.toLowerCase().trim();

  // 1. Check verified features in DB
  const allFeatures = await prisma.feature.findMany({
    include: {
      planFeatures: {
        include: { plan: true },
      },
      capabilities: true,
    },
  });

  // Match against feature names, descriptions, or capabilities
  const matchedFeature = allFeatures.find((f) => {
    const fName = f.name.toLowerCase();
    const fCode = f.code.toLowerCase().replace(/_/g, ' ');
    const fDesc = f.description?.toLowerCase() || '';
    const capNames = f.capabilities.map((c) => c.capabilityName.toLowerCase());

    const nameMatch = fName.includes(q) || q.includes(fName);
    const codeMatch = q.includes(fCode);
    const descMatch = fDesc.length > 0 && (fDesc.includes(q) || q.includes(fDesc));
    const capMatch = capNames.some((c) => c.includes(q) || q.includes(c));

    // Token overlap check for key phrases
    const queryTokens = q.split(/\s+/).filter((w) => w.length > 3);
    const hasSignificantTokenMatch = queryTokens.length > 0 && queryTokens.every((tok) => 
      fName.includes(tok) || fCode.includes(tok) || fDesc.includes(tok) || capNames.some(c => c.includes(tok))
    );

    return nameMatch || codeMatch || descMatch || capMatch || hasSignificantTokenMatch;
  });

  if (matchedFeature) {
    const includedPlanCodes = matchedFeature.planFeatures
      .filter((pf) => pf.isIncluded)
      .map((pf) => pf.plan.code);

    const isStarter = includedPlanCodes.includes('STARTER');
    const isGrowth = includedPlanCodes.includes('GROWTH');
    const isEnterprise = includedPlanCodes.includes('ENTERPRISE');

    let status: 'YES' | 'PLAN_RESTRICTED' = 'YES';
    let relevantPlan = 'Starter, Growth, & Enterprise Plans';

    if (!isStarter && (isGrowth || isEnterprise)) {
      status = 'PLAN_RESTRICTED';
      relevantPlan = isGrowth ? 'Growth Plan (₹7,999/mo) & Enterprise' : 'Enterprise Plan (₹19,999/mo)';
    }

    return {
      status,
      featureName: matchedFeature.name,
      simpleAnswer: `Yes, OneComPro provides native ${matchedFeature.name.toLowerCase()}.`,
      relevantPlan,
      whyItMatters: matchedFeature.description || 'Eliminates disconnected tools and automates operations.',
      whatToSayToCustomer: `OneComPro natively supports ${matchedFeature.name.toLowerCase()} directly in the platform on the ${relevantPlan}. You do not need third-party plugins.`,
      whatNotToPromise: `Do not promise custom unreleased sub-features without checking the exact capability list. Available capabilities: ${matchedFeature.capabilities
        .map((c) => c.capabilityName)
        .slice(0, 3)
        .join(', ')}.`,
      source: KNOWLEDGE_SOURCE,
      version: KNOWLEDGE_VERSION,
    };
  }

  // 2. Check Add-ons in DB
  const allAddons = await prisma.addon.findMany({
    include: { prices: true },
  });

  const matchedAddon = allAddons.find((a) => {
    const aName = a.name.toLowerCase();
    const aCode = a.code.toLowerCase().replace(/_/g, ' ');
    const aDesc = a.description?.toLowerCase() || '';

    const directMatch = aName.includes(q) || q.includes(aName) || aDesc.includes(q);
    const tallyMatch = (q.includes('tally') || q.includes('busy') || q.includes('erp connector')) && a.code.includes('TALLY');
    const appMatch = (q.includes('native app') || q.includes('branded app') || q.includes('ios app') || q.includes('play store app')) && a.code.includes('NATIVE_APP');
    const migrationMatch = (q.includes('turnkey migration') || q.includes('migration package')) && a.code.includes('MIGRATION');
    const mvMatch = (q.includes('multi-vendor') || q.includes('multivendor expansion')) && a.code.includes('MULTIVENDOR');

    return directMatch || tallyMatch || appMatch || migrationMatch || mvMatch;
  });

  if (matchedAddon) {
    const price = matchedAddon.prices[0];
    const priceFormatted = price ? `₹${Number(price.price).toLocaleString('en-IN')}` : 'Contact Sales';

    return {
      status: 'ADD_ON',
      featureName: matchedAddon.name,
      simpleAnswer: `Yes, available as an official OneComPro add-on module (${priceFormatted}).`,
      relevantPlan: `Available on Growth & Enterprise (${priceFormatted})`,
      whyItMatters: matchedAddon.description || 'Turnkey add-on capability fully integrated with the core OS.',
      whatToSayToCustomer: `OneComPro supports ${matchedAddon.name} via our turnkey add-on module for ${priceFormatted}, backed by our engineering team.`,
      whatNotToPromise: 'Do not promise custom code delivery without scoping addon requirements with solutions team.',
      source: KNOWLEDGE_SOURCE,
      version: KNOWLEDGE_VERSION,
    };
  }

  // 3. Known specific commerce capabilities checks
  if (q.includes('shopify') && (q.includes('sync') || q.includes('inventory') || q.includes('migrate'))) {
    return {
      status: 'YES',
      featureName: 'Shopify Inventory Sync & Data Migration',
      simpleAnswer: 'Yes, OneComPro supports multi-channel inventory sync with Shopify and automated catalog migration.',
      relevantPlan: 'Growth Plan (₹7,999/mo) & Enterprise',
      whyItMatters: 'Keeps physical store stock and Shopify stock synchronized in under 3 seconds to avoid overselling.',
      whatToSayToCustomer:
        'OneComPro connects directly with your Shopify store or allows seamless migration of your entire catalog, customer list, and order history.',
      whatNotToPromise: 'Do not promise sub-second sync during major flash sales without Enterprise SLA.',
      source: KNOWLEDGE_SOURCE,
      version: KNOWLEDGE_VERSION,
    };
  }

  if (q.includes('whatsapp') && (q.includes('order') || q.includes('cart') || q.includes('alert'))) {
    return {
      status: 'YES',
      featureName: 'WhatsApp Automation Suite',
      simpleAnswer: 'Yes, official WhatsApp Business API with automated order confirmations, cart recovery, and tracking.',
      relevantPlan: 'Growth Plan (₹7,999/mo) & Enterprise',
      whyItMatters: 'Recovers 35%+ of abandoned carts automatically without manual calling.',
      whatToSayToCustomer:
        'OneComPro includes automated WhatsApp alerts for order confirmations, shipping tracking, and 1-click cart recovery sequences built into the Growth plan.',
      whatNotToPromise: 'Do not promise free unlimited WhatsApp marketing broadcasts (Meta message charges apply per conversation).',
      source: KNOWLEDGE_SOURCE,
      version: KNOWLEDGE_VERSION,
    };
  }

  if (q.includes('pos') || q.includes('billing') || q.includes('barcode') || q.includes('offline')) {
    return {
      status: 'YES',
      featureName: 'Retail Point-of-Sale (POS)',
      simpleAnswer: 'Yes, integrated cloud POS with fast barcode scanning, split payments, and offline support.',
      relevantPlan: 'Starter, Growth, and Enterprise Plans',
      whyItMatters: 'Retail staff can bill walk-in customers while live online inventory deducts automatically.',
      whatToSayToCustomer:
        'OneComPro comes with an integrated retail POS that works on standard laptops/tablets with barcode scanners and thermal receipt printers.',
      whatNotToPromise: 'Do not promise proprietary hardware (clients use standard USB/Bluetooth barcode scanners and thermal printers).',
      source: KNOWLEDGE_SOURCE,
      version: KNOWLEDGE_VERSION,
    };
  }

  // 4. UNKNOWN / Unverified Capability Guardrail
  return {
    status: 'UNKNOWN',
    featureName: query,
    simpleAnswer: 'This capability is not confirmed in current OneComPro product documentation.',
    relevantPlan: 'Pending Technical Verification',
    whyItMatters: 'Strict product accuracy prevents over-promising on sales calls.',
    whatToSayToCustomer: 'Need to verify with technical team.',
    whatNotToPromise:
      'STRICT BOUNDARY: Do NOT claim OneComPro supports this feature. Tell the client: "Let me check with our solutions architecture team on the exact implementation and confirm on our walkthrough."',
    source: KNOWLEDGE_SOURCE,
    version: KNOWLEDGE_VERSION,
  };
}

/**
 * Returns the industry-tailored sales playbook.
 */
export function getIndustryPlaybook(industryCodeOrName?: string | null): IndustryPlaybook {
  const norm = (industryCodeOrName || '').toUpperCase().trim();

  const found = ONECOMPRO_INDUSTRIES_DATA.find(
    (i) =>
      i.code === norm ||
      i.name.toUpperCase().includes(norm) ||
      norm.includes(i.code) ||
      norm.includes(i.name.toUpperCase())
  );

  if (found) {
    return found;
  }

  // Default D2C / Omnichannel playbook
  return ONECOMPRO_INDUSTRIES_DATA[4];
}

/**
 * Resolves classic sales objections with verified OneComPro counter-pitches.
 */
export function resolveObjection(objectionKey: string): ObjectionBattlecard {
  const normKey = objectionKey.toUpperCase().trim();
  const matched = ONECOMPRO_OBJECTIONS_DATA.find(
    (o) =>
      o.key === normKey ||
      o.title.toUpperCase().includes(normKey) ||
      normKey.includes(o.key)
  );

  if (matched) {
    return matched;
  }

  return {
    key: 'GENERAL_VALUE',
    title: 'General Value & Return on Investment',
    counterSummary: 'Demonstrate cost reduction across multiple software subscriptions and reduced order leakage.',
    fullPitch:
      'OneComPro delivers a single unified commerce platform that eliminates tool fragmentation, prevents stock mismatches, and recovers revenue through automated WhatsApp customer journeys.',
    whatNotToPromise: 'Do not offer ad-hoc price drops without annual commitment.',
  };
}

/**
 * Returns knowledge metadata.
 */
export function getKnowledgeMetadata() {
  return {
    version: KNOWLEDGE_VERSION,
    source: KNOWLEDGE_SOURCE,
    lastVerified: '2026-09-06',
    platform: 'OneComPro Commerce OS',
  };
}
