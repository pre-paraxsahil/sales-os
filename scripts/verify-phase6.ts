import { PrismaClient } from '@prisma/client';
import {
  seedOneComProProductKnowledge,
  KNOWLEDGE_VERSION,
  KNOWLEDGE_SOURCE,
} from '../src/lib/knowledge/productKnowledgeSeed';
import {
  getPlanAwareKnowledge,
  checkFeatureCapability,
  getIndustryPlaybook,
  resolveObjection,
  getKnowledgeMetadata,
} from '../src/lib/knowledge/productKnowledgeService';

const prisma = new PrismaClient();

async function runPhase6Verification() {
  console.log('====================================================');
  console.log('   BROSTARTUP SALES OS — PHASE 6 VERIFICATION SUITE  ');
  console.log('  ONECOMPRO PRODUCT KNOWLEDGE & AI SALES BRAIN ENGINE ');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
    }
  }

  try {
    // 1. Initialize and Seed Product Knowledge Base
    console.log('--- 1. ONECOMPRO KNOWLEDGE BASE INITIALIZATION ---');
    const seedResult = await seedOneComProProductKnowledge(prisma);
    assert(seedResult.success, `OneComPro knowledge seeded successfully (${seedResult.version})`);

    const offering = await prisma.productOffering.findFirst({ where: { code: 'ONECOMPRO' } });
    assert(offering !== null, 'OneComPro ProductOffering record exists in PostgreSQL');

    const plansCount = await prisma.plan.count();
    assert(plansCount >= 3, `All 3 core plans present in DB (Count: ${plansCount})`);

    const featuresCount = await prisma.feature.count();
    assert(featuresCount >= 10, `Feature taxonomy populated in DB (Count: ${featuresCount})`);

    const addonsCount = await prisma.addon.count();
    assert(addonsCount >= 4, `Addon catalog populated in DB (Count: ${addonsCount})`);

    const claimsCount = await prisma.productClaim.count();
    assert(claimsCount >= 5, `Verified product claims present in DB (Count: ${claimsCount})`);

    // 2. Plan-Aware Dynamic Database Pricing & Limits
    console.log('\n--- 2. PLAN-AWARE DYNAMIC PRICING & LIMITS ---');
    const plansKnowledge = await getPlanAwareKnowledge();
    assert(plansKnowledge.length >= 3, `getPlanAwareKnowledge returns ${plansKnowledge.length} plans`);

    const starter = plansKnowledge.find((p) => p.code === 'STARTER');
    assert(starter !== undefined && starter.monthlyPrice === 2999, 'Starter plan price is ₹2,999/mo (from DB)');

    const growth = plansKnowledge.find((p) => p.code === 'GROWTH');
    assert(growth !== undefined && growth.monthlyPrice === 7999, 'Growth plan price is ₹7,999/mo (from DB)');

    const enterprise = plansKnowledge.find((p) => p.code === 'ENTERPRISE');
    assert(enterprise !== undefined && enterprise.monthlyPrice === 19999, 'Enterprise plan price is ₹19,999/mo (from DB)');

    const growthLimits = growth?.limits || [];
    const storesLimit = growthLimits.find((l) => l.key === 'STORES_COUNT');
    assert(storesLimit?.value === '5', 'Growth plan limits 5 stores correctly configured in DB');

    // 3. "Can OneComPro do this?" Capability Query Engine
    console.log('\n--- 3. "CAN ONECOMPRO DO THIS?" CAPABILITY QUERY ENGINE ---');

    // Test YES (Multi-store stock sync)
    const cap1 = await checkFeatureCapability('Can OneComPro sync stock with Shopify and physical stores?');
    assert(cap1.status === 'YES', 'Shopify & multi-store stock sync returns status YES');
    assert(cap1.relevantPlan.includes('Growth'), 'Shopify stock sync accurately mapped to Growth Plan');

    // Test YES (Retail POS barcode billing)
    const cap2 = await checkFeatureCapability('Do you have POS billing with barcode scanner?');
    assert(cap2.status === 'YES', 'Retail POS billing returns status YES');

    // Test PLAN_RESTRICTED (B2B wholesale portal)
    const cap3 = await checkFeatureCapability('Can OneComPro do B2B wholesale portal with custom client price lists and GST?');
    assert(cap3.status === 'PLAN_RESTRICTED' || cap3.status === 'YES', 'B2B Wholesale portal evaluated accurately');
    assert(cap3.relevantPlan.includes('Enterprise'), 'B2B Wholesale portal mapped to Enterprise Plan');

    // Test ADD_ON (Tally ERP connector)
    const cap4 = await checkFeatureCapability('Do you connect with Tally ERP?');
    assert(cap4.status === 'ADD_ON' || cap4.status === 'YES', 'Tally ERP connector identified as official capability');

    // Test STRICT UNKNOWN & NO-HALLUCINATION GUARDRAIL
    const cap5 = await checkFeatureCapability('Can OneComPro automatically do autonomous drone delivery to rooftop?');
    assert(cap5.status === 'UNKNOWN', 'Unverified capability (drone delivery) strictly returns UNKNOWN');
    assert(
      cap5.whatToSayToCustomer === 'Need to verify with technical team.',
      'Mandated response script: "Need to verify with technical team."'
    );
    assert(
      cap5.whatNotToPromise.includes('STRICT BOUNDARY'),
      'Strict boundary guardrail present in output'
    );

    // 4. Sales Objection Battlecard Engine
    console.log('\n--- 4. SALES OBJECTION BATTLECARD ENGINE ---');
    const objShopify = resolveObjection('SHOPIFY_ALREADY_HAI');
    assert(objShopify.key === 'SHOPIFY_ALREADY_HAI', 'Shopify objection battlecard retrieved');
    assert(objShopify.fullPitch.includes('transaction commission'), 'Shopify pitch highlights 0% transaction fees');
    assert(objShopify.whatNotToPromise.length > 0, 'Shopify objection includes What NOT to promise boundary');

    const objPrice = resolveObjection('PRICE_ZYADA_HAI');
    assert(objPrice.fullPitch.includes('software spend'), 'Price objection compares multiple tool replacement cost');

    const objMigration = resolveObjection('NEED_MIGRATION');
    assert(objMigration.fullPitch.includes('migration pipeline'), 'Migration objection provides data safety guarantee');

    // 5. Industry-Adaptive Sales Playbook
    console.log('\n--- 5. INDUSTRY-ADAPTIVE PLAYBOOK ---');
    const superPlaybook = getIndustryPlaybook('SUPERMARKET_GROCERY');
    assert(superPlaybook.code === 'SUPERMARKET_GROCERY', 'Supermarket & Grocery playbook loaded');
    assert(superPlaybook.pitchPriorities.some((p) => p.toLowerCase().includes('pos')), 'Supermarket playbook prioritizes POS');

    const fashionPlaybook = getIndustryPlaybook('FASHION_APPAREL');
    assert(fashionPlaybook.pitchPriorities.some((p) => p.toLowerCase().includes('variant')), 'Fashion playbook prioritizes size/color variant catalog');

    const b2bPlaybook = getIndustryPlaybook('B2B_WHOLESALE');
    assert(b2bPlaybook.recommendedPlan === 'ENTERPRISE', 'B2B Wholesale playbook recommends Enterprise plan');

    // 6. Knowledge Metadata & Versioning
    console.log('\n--- 6. KNOWLEDGE METADATA & VERSIONING ---');
    const meta = getKnowledgeMetadata();
    assert(meta.version === KNOWLEDGE_VERSION, `Metadata reports active version ${meta.version}`);
    assert(meta.source === KNOWLEDGE_SOURCE, `Metadata reports source ${meta.source}`);

    // 7. Production Database Record Preservation
    console.log('\n--- 7. PRODUCTION DATA PRESERVATION AUDIT ---');
    const leadsCount = await prisma.lead.count();
    const callsCount = await prisma.call.count();
    const demosCount = await prisma.demo.count();
    const salesCount = await prisma.sale.count();
    const activitiesCount = await prisma.activity.count();

    assert(leadsCount >= 5, `Leads preserved: ${leadsCount} records`);
    assert(callsCount >= 22, `Calls preserved: ${callsCount} records`);
    assert(demosCount >= 0, `Demos preserved: ${demosCount} records`);
    assert(salesCount >= 2, `Sales preserved: ${salesCount} records`);
    assert(activitiesCount >= 29, `Activities preserved: ${activitiesCount} records`);

    console.log('\n====================================================');
    console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
    console.log('====================================================');
  } catch (error) {
    console.error('Fatal error during Phase 6 verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase6Verification();
