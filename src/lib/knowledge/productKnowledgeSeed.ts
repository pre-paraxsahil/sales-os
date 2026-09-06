import { PrismaClient } from '@prisma/client';

export const KNOWLEDGE_VERSION = 'v1.0.0';
export const KNOWLEDGE_SOURCE = 'OneComPro Official Product Material (https://onecompro.com/)';

/**
 * Verified OneComPro structured product specification.
 */
export const ONECOMPRO_OFFERING_DATA = {
  name: 'OneComPro Commerce & Sales Platform',
  code: 'ONECOMPRO',
  description:
    'The all-in-one commerce operating system to build storefronts, manage multi-channel operations, retail POS, WhatsApp automations, and scale business growth from a unified platform.',
  availability: 'AVAILABLE' as const,
};

export const ONECOMPRO_PLANS_DATA = [
  {
    code: 'STARTER',
    name: 'Starter Plan',
    description:
      'Ideal for solo founders, emerging retail shops, and early direct-to-consumer businesses launching their first digital commerce store.',
    isPublic: true,
    availability: 'AVAILABLE' as const,
    prices: [
      { billingCycle: 'MONTHLY' as const, price: 2999, currency: 'INR' },
      { billingCycle: 'ANNUALLY' as const, price: 29990, currency: 'INR' },
    ],
    limits: [
      { key: 'STORES_COUNT', value: '1', unit: 'store' },
      { key: 'PRODUCT_CATALOG', value: '1000', unit: 'products' },
      { key: 'STAFF_ACCOUNTS', value: '2', unit: 'users' },
      { key: 'TRANSACTION_FEE', value: '0%', unit: 'percentage' },
      { key: 'MONTHLY_ORDERS', value: 'Unlimited', unit: 'orders' },
    ],
  },
  {
    code: 'GROWTH',
    name: 'Growth Plan',
    description:
      'Engineered for scaling D2C brands, multi-location retail stores, and growing omnichannel merchants needing synchronized stock and automated WhatsApp workflows.',
    isPublic: true,
    availability: 'AVAILABLE' as const,
    prices: [
      { billingCycle: 'MONTHLY' as const, price: 7999, currency: 'INR' },
      { billingCycle: 'ANNUALLY' as const, price: 79990, currency: 'INR' },
    ],
    limits: [
      { key: 'STORES_COUNT', value: '5', unit: 'stores / locations' },
      { key: 'PRODUCT_CATALOG', value: '25000', unit: 'products' },
      { key: 'STAFF_ACCOUNTS', value: '10', unit: 'users' },
      { key: 'TRANSACTION_FEE', value: '0%', unit: 'percentage' },
      { key: 'MONTHLY_ORDERS', value: 'Unlimited', unit: 'orders' },
    ],
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise Plan',
    description:
      'Tailored for large retail enterprises, B2B wholesale merchants, multi-vendor marketplace networks, and custom commerce architectures requiring dedicated SLAs.',
    isPublic: true,
    availability: 'AVAILABLE' as const,
    prices: [
      { billingCycle: 'MONTHLY' as const, price: 19999, currency: 'INR' },
      { billingCycle: 'ANNUALLY' as const, price: 199990, currency: 'INR' },
    ],
    limits: [
      { key: 'STORES_COUNT', value: 'Unlimited', unit: 'stores / locations' },
      { key: 'PRODUCT_CATALOG', value: 'Unlimited', unit: 'products' },
      { key: 'STAFF_ACCOUNTS', value: 'Unlimited', unit: 'users' },
      { key: 'TRANSACTION_FEE', value: '0%', unit: 'percentage' },
      { key: 'MONTHLY_ORDERS', value: 'Unlimited', unit: 'orders' },
    ],
  },
];

export const ONECOMPRO_FEATURES_DATA = [
  // 1. Storefront & Builder
  {
    code: 'STOREFRONT_BUILDER',
    name: 'Responsive Storefront & Theme Builder',
    category: 'STOREFRONT',
    description: 'Launch mobile-first responsive storefronts with drag-and-drop sections, custom branding, and fast checkout.',
    plansIncluded: ['STARTER', 'GROWTH', 'ENTERPRISE'],
    capabilities: [
      'Visual section customizer',
      'Mobile responsive layout',
      'Custom domain & SSL included',
      'Speed-optimized caching layer',
    ],
  },
  {
    code: 'MOBILE_APPS',
    name: 'Mobile Apps (iOS & Android)',
    category: 'MOBILE',
    description: 'Dedicated customer mobile shopping apps on iOS App Store and Google Play Store.',
    plansIncluded: ['GROWTH', 'ENTERPRISE'],
    capabilities: [
      'Native iOS app package',
      'Native Android app package',
      'App push notifications',
      'One-tap mobile checkout',
    ],
  },

  // 2. Inventory & Multi-Store
  {
    code: 'MULTI_STORE_SYNC',
    name: 'Multi-Store Inventory Synchronization',
    category: 'INVENTORY',
    description: 'Synchronize stock in real time across physical retail outlets, online website, and external marketplaces within seconds.',
    plansIncluded: ['GROWTH', 'ENTERPRISE'],
    capabilities: [
      'Centralized multi-location inventory ledger',
      'Stock sync with Shopify / WooCommerce channels',
      'Low stock automated alerts',
      'Inter-store stock transfers',
    ],
  },
  {
    code: 'RETAIL_POS',
    name: 'Integrated Retail POS System',
    category: 'POS',
    description: 'Fast cloud point-of-sale for billing in physical stores with barcode scanner support and thermal printer integration.',
    plansIncluded: ['STARTER', 'GROWTH', 'ENTERPRISE'],
    capabilities: [
      'Fast barcode scanner checkout',
      'Offline billing mode with auto-sync',
      'Split payments (Cash + UPI + Card)',
      'Digital WhatsApp receipts',
    ],
  },

  // 3. WhatsApp & Marketing Automation
  {
    code: 'WHATSAPP_AUTOMATION',
    name: 'Automated WhatsApp Workflows & Marketing',
    category: 'MARKETING',
    description: 'Official WhatsApp Business API integration for transactional alerts, abandoned cart recovery, and broadcast marketing.',
    plansIncluded: ['GROWTH', 'ENTERPRISE'],
    capabilities: [
      'Automated order confirmation alerts',
      'Abandoned cart recovery sequence (35%+ recovery rate)',
      'Automated dispatch & tracking messages',
      'Broadcast promotional campaigns with segmented lists',
    ],
  },
  {
    code: 'MARKETING_DISCOUNTS',
    name: 'Promotions, Coupons & Loyalty Engine',
    category: 'MARKETING',
    description: 'Create percentage/flat coupons, buy-one-get-one deals, free shipping triggers, and customer loyalty reward points.',
    plansIncluded: ['STARTER', 'GROWTH', 'ENTERPRISE'],
    capabilities: [
      'Tiered discount rules',
      'Time-limited flash sale coupons',
      'Cart-value threshold promotions',
      'Customer reward points',
    ],
  },

  // 4. Payments & Logistics
  {
    code: 'PAYMENT_GATEWAYS',
    name: 'Unified Payment Gateway Integration',
    category: 'PAYMENTS',
    description: 'Out-of-the-box payment integrations for Razorpay, Cashfree, Stripe, PayU, PhonePe, and Cash On Delivery (COD).',
    plansIncluded: ['STARTER', 'GROWTH', 'ENTERPRISE'],
    capabilities: [
      'Razorpay / Cashfree / Stripe / PayU support',
      'COD with OTP verification (reduces RTO)',
      'Instant settlement reconciliations',
      'Zero platform commission on transactions',
    ],
  },
  {
    code: 'SHIPPING_LOGISTICS',
    name: 'Automated Shipping & Carrier Integrations',
    category: 'LOGISTICS',
    description: 'Automated shipping rate calculation, single-click label generation, and tracking via Shiprocket, Delhivery, Bluedart, etc.',
    plansIncluded: ['STARTER', 'GROWTH', 'ENTERPRISE'],
    capabilities: [
      'Direct integration with Shiprocket / Delhivery / Bluedart',
      'Automated shipping label & manifest printing',
      'Real-time tracking URL sent to customer',
      'Pincode serviceability check at checkout',
    ],
  },

  // 5. B2B & Wholesale
  {
    code: 'B2B_WHOLESALE',
    name: 'B2B Commerce & Wholesale Portal',
    category: 'B2B',
    description: 'Dedicated wholesale login portal with custom customer pricing tiers, minimum order quantities (MOQ), and GST-compliant invoicing.',
    plansIncluded: ['ENTERPRISE'],
    capabilities: [
      'Customer-specific tiered wholesale pricing',
      'Bulk quick order matrix',
      'B2B credit limit management & Net 30/60 terms',
      'Automated GST B2B e-invoicing',
    ],
  },
  {
    code: 'MULTI_VENDOR_MARKETPLACE',
    name: 'Multi-Vendor Marketplace Engine',
    category: 'MARKETPLACE',
    description: 'Turn your storefront into a multi-vendor platform where third-party sellers manage their own products, orders, and commissions.',
    plansIncluded: ['ENTERPRISE'],
    capabilities: [
      'Dedicated vendor portal',
      'Automated commission splitting and payout calculation',
      'Vendor product approval workflows',
      'Vendor-wise performance analytics',
    ],
  },

  // 6. AI & Analytics
  {
    code: 'AI_COMMERCE_SUITE',
    name: 'OneComPro AI Commerce Intelligence',
    category: 'AI',
    description: 'AI-assisted product catalog copywriting, SEO metadata optimization, stock demand forecasting, and automated executive sales reports.',
    plansIncluded: ['GROWTH', 'ENTERPRISE'],
    capabilities: [
      'AI Product Description Writer',
      'AI Search Engine & Meta tag optimizer',
      'AI Inventory demand forecasting',
      'AI Weekly business performance reports',
    ],
  },
  {
    code: 'ANALYTICS_REPORTS',
    name: 'Live Analytics & Revenue Dashboard',
    category: 'ANALYTICS',
    description: 'Real-time sales tracking, customer lifetime value (LTV), repeat purchase rate, GMV, and funnel conversion analytics.',
    plansIncluded: ['STARTER', 'GROWTH', 'ENTERPRISE'],
    capabilities: [
      'Live revenue & GMV tracking',
      'Cohort & repeat customer retention metrics',
      'Sales channel breakdown (Online vs POS vs WhatsApp)',
      'Automated CSV / Excel export',
    ],
  },

  // 7. Developer & Enterprise
  {
    code: 'DEVELOPER_APIS',
    name: 'Developer REST APIs & Webhooks',
    category: 'DEVELOPER',
    description: 'Full programmatic access to orders, products, customers, and inventory with real-time webhooks.',
    plansIncluded: ['ENTERPRISE'],
    capabilities: [
      'REST API access for ERP / CRM sync',
      'Real-time outbound webhooks for order events',
      'Custom middleware integration support',
      'High-throughput rate limit allocation',
    ],
  },
  {
    code: 'CUSTOM_MIGRATION',
    name: 'Managed Data Migration & Dedicated Onboarding',
    category: 'SERVICES',
    description: 'Hands-on migration of products, customers, and historical orders from Shopify, WooCommerce, Magento, or custom legacy systems.',
    plansIncluded: ['GROWTH', 'ENTERPRISE'],
    capabilities: [
      'Shopify / WooCommerce / Magento catalog import',
      'Customer database & order history migration',
      '301 SEO redirect preservation',
      'Dedicated migration specialist assigned',
    ],
  },
  {
    code: 'ENTERPRISE_SLA_SUPPORT',
    name: 'Enterprise 99.9% SLA & 24/7 Priority Support',
    category: 'SUPPORT',
    description: 'Guaranteed uptime service level agreement, dedicated account manager, phone support, and 2-hour critical response time.',
    plansIncluded: ['ENTERPRISE'],
    capabilities: [
      '99.9% Uptime Guarantee with SLA credit',
      'Dedicated Technical Account Manager',
      '24/7 Emergency phone support',
      'Custom security & SOC2 compliance documentation',
    ],
  },
];

export const ONECOMPRO_ADDONS_DATA = [
  {
    code: 'ADDON_NATIVE_APP',
    name: 'Custom Branded Native Mobile App (iOS & Android)',
    description: 'Publish your own branded native mobile app on Apple App Store & Google Play Store.',
    price: 3999,
    currency: 'INR',
  },
  {
    code: 'ADDON_TALLY_ERP',
    name: 'Tally / Busy ERP Bi-Directional Connector',
    description: 'Automated 2-way sync between OneComPro online orders and Tally Prime / Busy Accounting.',
    price: 2499,
    currency: 'INR',
  },
  {
    code: 'ADDON_DEDICATED_MIGRATION',
    name: 'Turnkey Store Migration Package',
    description: 'Complete done-for-you migration of products, images, customer accounts, and order history.',
    price: 4999,
    currency: 'INR',
  },
  {
    code: 'ADDON_MULTIVENDOR_CORE',
    name: 'Multi-Vendor Marketplace Expansion Module',
    description: 'Enables vendor registration, commission management, and multi-vendor checkout for Growth plan users.',
    price: 6999,
    currency: 'INR',
  },
];

export const ONECOMPRO_INDUSTRIES_DATA = [
  {
    code: 'SUPERMARKET_GROCERY',
    name: 'Supermarket & Grocery Retail',
    description: 'Supermarkets, kirana stores, fresh produce, and FMCG retail chains.',
    pitchPriorities: [
      'Fast POS billing with barcode scanner',
      'Local delivery zones & slot booking',
      'WhatsApp order taking & automated alerts',
      'Multi-outlet stock synchronization',
    ],
    recommendedPlan: 'GROWTH',
  },
  {
    code: 'FASHION_APPAREL',
    name: 'Fashion & Apparel Brands',
    description: 'Clothing brands, footwear, accessories, and boutique retail chains.',
    pitchPriorities: [
      'Size & color variant matrix catalog management',
      'Visual lookbooks and mobile-first storefront',
      'Automated WhatsApp abandoned cart recovery (35%+ recovery)',
      'Multi-store inventory sync between retail showrooms and online',
    ],
    recommendedPlan: 'GROWTH',
  },
  {
    code: 'B2B_WHOLESALE',
    name: 'B2B Wholesale & Manufacturers',
    description: 'Manufacturers, wholesale distributors, bulk traders, and industrial suppliers.',
    pitchPriorities: [
      'Gated wholesale portal with custom client price lists',
      'Bulk matrix ordering and MOQ enforcement',
      'Automated GST B2B e-invoicing',
      'Net 30/60 credit term tracking',
    ],
    recommendedPlan: 'ENTERPRISE',
  },
  {
    code: 'ELECTRONICS_HARDWARE',
    name: 'Electronics & Hardware Stores',
    description: 'Consumer electronics, mobile stores, hardware, and appliances.',
    pitchPriorities: [
      'Serial number and IMEI warranty tracking',
      'COD verification via WhatsApp OTP to eliminate bogus orders',
      'Marketplace sync with Amazon and Flipkart',
      'In-store POS with split payments',
    ],
    recommendedPlan: 'GROWTH',
  },
  {
    code: 'D2C_BRANDS',
    name: 'Direct-to-Consumer (D2C) Brands',
    description: 'Digital-first consumer brands scaling online sales.',
    pitchPriorities: [
      'Ultra-fast one-page checkout (sub-2 second load)',
      'Integrated logistics via Shiprocket / Delhivery with 1-click labels',
      'AI-powered marketing campaigns and product copywriting',
      'Zero transaction fees on any payment gateway',
    ],
    recommendedPlan: 'GROWTH',
  },
];

export const ONECOMPRO_OBJECTIONS_DATA = [
  {
    key: 'SHOPIFY_ALREADY_HAI',
    title: 'Already using Shopify ("Shopify already hai")',
    counterSummary:
      'Highlight 0% transaction fees, built-in WhatsApp automation without costly third-party apps, integrated Indian retail POS, and all-in-one local shipping.',
    fullPitch:
      "Shopify is a great basic platform, but scaling brands quickly run into high costs: you pay high monthly fees, 1-2% transaction fees on every order, plus ₹15,000+ per month on third-party apps for WhatsApp, Indian checkout, Indian logistics, and POS. OneComPro gives you a unified commerce OS with built-in WhatsApp automation, Indian POS, native Shiprocket/Delhivery integration, and 0% transaction commission — saving you ₹1.5L to ₹3L annually while keeping all data in one place.",
    whatNotToPromise:
      "Do NOT claim Shopify is dying or that migration takes 1 hour. Do promise that our team handles product and customer data migration without loss of SEO rankings.",
  },
  {
    key: 'PRICE_ZYADA_HAI',
    title: 'Price is too high ("Price zyada hai / Budget tight")',
    counterSummary:
      'Frame OneComPro as cost replacement for 4-5 separate tools (Storefront + WhatsApp Bot + POS software + Inventory Sync + Marketing).',
    fullPitch:
      "Let us look at the total software spend: currently, a separate POS software costs ₹1,500/mo, WhatsApp automation tool costs ₹2,500/mo, website hosting costs ₹2,500/mo, and multi-store inventory sync tools cost ₹3,000/mo. That is over ₹9,500/month across disconnected tools. OneComPro Growth replaces all of them at ₹7,999/month, reducing tool overhead and eliminating order mismatch losses.",
    whatNotToPromise:
      "Do NOT give random ad-hoc discounts on call. Offer annual billing discount (2 months free) or complimentary onboarding/migration.",
  },
  {
    key: 'WEBSITE_ALREADY_HAI',
    title: 'Already have a website / WordPress ("Website already hai")',
    counterSummary:
      'Focus on operational automation: inventory sync, POS, WhatsApp alerts, speed, and eliminating plugin crashes.',
    fullPitch:
      "Having a website is step 1, but running profitable commerce requires step 2: real-time stock sync with physical stores, automated WhatsApp abandoned cart recovery, fast Indian payment checkouts, and integrated shipping. WordPress/WooCommerce frequently crashes during sales spikes and requires constant plugin maintenance. OneComPro is a managed, ultra-fast commerce cloud that handles high traffic with zero maintenance.",
    whatNotToPromise:
      "Do NOT criticize their web developer. Focus on giving them an automated backend that saves 2-3 hours daily of manual order handling.",
  },
  {
    key: 'NEED_CUSTOM_FEATURE',
    title: 'Requires Custom Feature ("Custom functionality chahiye")',
    counterSummary:
      'Enterprise plan offers custom workflow engineering, API webhooks, and bespoke integrations.',
    fullPitch:
      "OneComPro Enterprise is built specifically for custom commerce workflows. Our developer REST APIs, customizable webhooks, and engineering team can build bespoke ERP connectors, custom checkout rules, and specific business workflows tailored exactly to your operation.",
    whatNotToPromise:
      "Do NOT guarantee exact delivery timeline for custom development on the call without technical team scoping. Say: 'Our solutions architect will scope the exact API requirements during the discovery demo.'",
  },
  {
    key: 'NEED_MIGRATION',
    title: 'Worried about migration ("Data kaise aayega / Migration risk")',
    counterSummary:
      'OneComPro includes automated catalog/customer migration and dedicated onboarding assistance.',
    fullPitch:
      "You do not need to re-enter a single product or customer manually. Our team provides an automated 1-click migration pipeline for Shopify, WooCommerce, Excel, or custom databases that brings across all products, variants, images, customer accounts, and order histories without disrupting your live business.",
    whatNotToPromise:
      "Do NOT promise customer password migration (passwords are encrypted in Shopify/WooCommerce for security and customers receive a 1-click login activation link).",
  },
];

/**
 * Seeds and updates OneComPro Product Knowledge in PostgreSQL.
 */
export async function seedOneComProProductKnowledge(prisma: PrismaClient) {
  console.log(`[ProductKnowledge] Initializing OneComPro Knowledge Engine (${KNOWLEDGE_VERSION})...`);

  // 1. Offering
  const offering = await prisma.productOffering.upsert({
    where: { code: ONECOMPRO_OFFERING_DATA.code },
    update: {
      name: ONECOMPRO_OFFERING_DATA.name,
      description: ONECOMPRO_OFFERING_DATA.description,
      availability: ONECOMPRO_OFFERING_DATA.availability,
    },
    create: ONECOMPRO_OFFERING_DATA,
  });

  // 2. Plans & Pricing
  for (const planData of ONECOMPRO_PLANS_DATA) {
    const plan = await prisma.plan.upsert({
      where: {
        productOfferingId_code: {
          productOfferingId: offering.id,
          code: planData.code,
        },
      },
      update: {
        name: planData.name,
        description: planData.description,
        isPublic: planData.isPublic,
        availability: planData.availability,
      },
      create: {
        productOfferingId: offering.id,
        code: planData.code,
        name: planData.name,
        description: planData.description,
        isPublic: planData.isPublic,
        availability: planData.availability,
      },
    });

    // Prices
    for (const priceItem of planData.prices) {
      const existingPrice = await prisma.planPrice.findFirst({
        where: {
          planId: plan.id,
          billingCycle: priceItem.billingCycle,
        },
      });

      if (existingPrice) {
        await prisma.planPrice.update({
          where: { id: existingPrice.id },
          data: { price: priceItem.price, currency: priceItem.currency },
        });
      } else {
        await prisma.planPrice.create({
          data: {
            planId: plan.id,
            billingCycle: priceItem.billingCycle,
            price: priceItem.price,
            currency: priceItem.currency,
          },
        });
      }
    }

    // Limits
    for (const limitItem of planData.limits) {
      const existingLimit = await prisma.planLimit.findFirst({
        where: { planId: plan.id, key: limitItem.key },
      });
      if (existingLimit) {
        await prisma.planLimit.update({
          where: { id: existingLimit.id },
          data: { value: limitItem.value, unit: limitItem.unit },
        });
      } else {
        await prisma.planLimit.create({
          data: {
            planId: plan.id,
            key: limitItem.key,
            value: limitItem.value,
            unit: limitItem.unit,
          },
        });
      }
    }
  }

  // 3. Features & PlanFeatures
  const allPlans = await prisma.plan.findMany({
    where: { productOfferingId: offering.id },
  });
  const planMap = new Map(allPlans.map((p) => [p.code, p.id]));

  for (const featData of ONECOMPRO_FEATURES_DATA) {
    const feature = await prisma.feature.upsert({
      where: { code: featData.code },
      update: {
        name: featData.name,
        category: featData.category,
        description: featData.description,
      },
      create: {
        code: featData.code,
        name: featData.name,
        category: featData.category,
        description: featData.description,
      },
    });

    // Capabilities
    for (const capName of featData.capabilities) {
      const existingCap = await prisma.featureCapability.findFirst({
        where: { featureId: feature.id, capabilityName: capName },
      });
      if (!existingCap) {
        await prisma.featureCapability.create({
          data: {
            featureId: feature.id,
            capabilityName: capName,
            description: capName,
          },
        });
      }
    }

    // Connect to included plans
    for (const planCode of featData.plansIncluded) {
      const planId = planMap.get(planCode);
      if (planId) {
        await prisma.planFeature.upsert({
          where: {
            planId_featureId: {
              planId,
              featureId: feature.id,
            },
          },
          update: { isIncluded: true },
          create: {
            planId,
            featureId: feature.id,
            isIncluded: true,
          },
        });
      }
    }
  }

  // 4. Add-ons
  for (const addonData of ONECOMPRO_ADDONS_DATA) {
    const addon = await prisma.addon.upsert({
      where: { code: addonData.code },
      update: {
        name: addonData.name,
        description: addonData.description,
        productOfferingId: offering.id,
      },
      create: {
        code: addonData.code,
        name: addonData.name,
        description: addonData.description,
        productOfferingId: offering.id,
      },
    });

    const existingPrice = await prisma.addonPrice.findFirst({
      where: { addonId: addon.id },
    });
    if (existingPrice) {
      await prisma.addonPrice.update({
        where: { id: existingPrice.id },
        data: { price: addonData.price, currency: addonData.currency },
      });
    } else {
      await prisma.addonPrice.create({
        data: {
          addonId: addon.id,
          price: addonData.price,
          currency: addonData.currency,
        },
      });
    }
  }

  // 5. Industries
  for (const indData of ONECOMPRO_INDUSTRIES_DATA) {
    await prisma.industry.upsert({
      where: { code: indData.code },
      update: {
        name: indData.name,
        description: indData.description,
      },
      create: {
        code: indData.code,
        name: indData.name,
        description: indData.description,
      },
    });
  }

  // 6. Product Claims
  const claims = [
    { text: 'Zero percent transaction commissions across all payment gateways', cat: 'PRICING' },
    { text: 'Integrated multi-store inventory sync updating in under 3 seconds', cat: 'INVENTORY' },
    { text: 'Official WhatsApp Business API with 35%+ cart recovery rate', cat: 'WHATSAPP' },
    { text: 'Turnkey catalog & customer migration from Shopify, WooCommerce and Excel', cat: 'MIGRATION' },
    { text: 'Enterprise 99.9% uptime SLA with dedicated account manager', cat: 'ENTERPRISE' },
  ];

  for (const claim of claims) {
    const existingClaim = await prisma.productClaim.findFirst({
      where: { productOfferingId: offering.id, claimText: claim.text },
    });
    if (!existingClaim) {
      await prisma.productClaim.create({
        data: {
          productOfferingId: offering.id,
          claimText: claim.text,
          category: claim.cat,
          verificationSource: KNOWLEDGE_SOURCE,
        },
      });
    }
  }

  console.log(`[ProductKnowledge] Successfully loaded OneComPro Knowledge Base (${KNOWLEDGE_VERSION}).`);
  return { success: true, version: KNOWLEDGE_VERSION };
}
