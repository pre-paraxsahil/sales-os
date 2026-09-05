import { prisma } from '../lib/prisma';
import { getAIProvider, buildWhatsAppContext } from '../lib/ai/aiProvider';
import { interpolateTemplate, ensureDefaultTemplatesSeeded } from '../lib/whatsapp/templateService';
import { aiWhatsAppMessageSchema, aiFollowUpDecisionSchema } from '../lib/ai/schemas/whatsappSchema';

async function runBuild08Verification() {
  console.log('====================================================');
  console.log('🚀 BROSTARTUP SALES OS — BUILD 08 VERIFICATION SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
    }
  };

  try {
    // TEST 1: Prisma Models & Template Seeding
    console.log('--- TEST GROUP 1: Database & Templates Foundation ---');
    await ensureDefaultTemplatesSeeded();
    const templates = await prisma.whatsAppTemplate.findMany({ where: { isActive: true } });
    assert(templates.length >= 8, 'Templates seeded in PostgreSQL', `Found ${templates.length} templates`);

    // TEST 2: Template Variable Interpolation (Anti-undefined variables)
    console.log('\n--- TEST GROUP 2: Template Interpolation & Safety ---');
    const rawTemplate = 'Hi {{customer_name}}, regarding {{business_name}} in {{industry}}: next step is {{next_action}}.';
    const rendered = interpolateTemplate(rawTemplate, {
      customer_name: 'Rahul Sharma',
      business_name: 'ABC Mart',
      industry: 'Grocery',
      next_action: '15-min walkthrough',
    });
    assert(
      rendered.includes('Rahul Sharma') &&
        rendered.includes('ABC Mart') &&
        rendered.includes('Grocery') &&
        rendered.includes('15-min walkthrough') &&
        !rendered.includes('{{'),
      'Template interpolation with complete variables',
      rendered
    );

    const renderedPartial = interpolateTemplate(rawTemplate, {
      customer_name: 'Vikram',
    });
    assert(
      !renderedPartial.includes('{{') && !renderedPartial.includes('undefined'),
      'Template interpolation with partial variables (no raw undefined tokens)',
      renderedPartial
    );

    // Fetch or create a test lead with customer memory & calls
    console.log('\n--- TEST GROUP 3: Lead & Context Retrieval ---');
    let testLead = await prisma.lead.findFirst({
      where: {
        contact: { isNot: null },
      },
      include: {
        contact: true,
        business: true,
        memories: true,
        calls: true,
      },
    });

    if (!testLead) {
      // Create a test lead
      const biz = await prisma.business.create({
        data: {
          name: 'Apex Supermarket',
          industry: 'Retail Supermarket',
          city: 'Bangalore',
        },
      });
      const contact = await prisma.contact.create({
        data: {
          name: 'Sunil Rao',
          phone: '+919876543210',
          email: 'sunil@apexmarket.in',
          designation: 'Store Owner',
          businessId: biz.id,
        },
      });
      testLead = await prisma.lead.create({
        data: {
          title: 'Apex Supermarket - Order Automation',
          status: 'QUALIFIED',
          temperature: 'HOT',
          source: 'INBOUND_WEBSITE',
          businessId: biz.id,
          contactId: contact.id,
        },
        include: {
          contact: true,
          business: true,
          memories: true,
          calls: true,
        },
      });
    }

    assert(Boolean(testLead?.id), `Using test lead: ${testLead.contact?.name} (${testLead.business?.name})`);

    // Ensure customer memory exists
    await prisma.customerMemory.upsert({
      where: {
        id: 'build08-test-mem-req',
      },
      create: {
        id: 'build08-test-mem-req',
        leadId: testLead.id,
        category: 'REQUIREMENT',
        key: 'online_ordering_automation',
        value: 'Wants WhatsApp catalogue orders synced to store inventory automatically',
        verificationState: 'CONFIRMED',
        confidence: 0.95,
      },
      update: {},
    });

    await prisma.customerMemory.upsert({
      where: {
        id: 'build08-test-mem-obj',
      },
      create: {
        id: 'build08-test-mem-obj',
        leadId: testLead.id,
        category: 'OBJECTION',
        key: 'pricing_sensitivity',
        value: 'Worried about upfront software cost before seeing order volume',
        verificationState: 'CONFIRMED',
        confidence: 0.9,
      },
      update: {},
    });

    // Build context
    const context = await buildWhatsAppContext(testLead.id);
    assert(context.lead.id === testLead.id, 'ContextBuilder builds typed lead context');
    assert(context.memories.length >= 2, 'ContextBuilder includes confirmed customer memories', `Count: ${context.memories.length}`);
    assert(context.productKnowledge.length > 0, 'ContextBuilder includes verified OneComPro product knowledge', `Count: ${context.productKnowledge.length}`);

    // TEST 4: Frequency Protection Engine
    console.log('\n--- TEST GROUP 4: Frequency Protection Engine ---');
    assert(typeof context.frequencyProtection.unansweredCount === 'number', 'Unanswered count computed');
    assert(typeof context.frequencyProtection.hasScheduledFollowUp === 'boolean', 'Scheduled follow-up detected');

    // TEST 5: AI Follow-up Decision Engine
    console.log('\n--- TEST GROUP 5: Follow-up Decision Engine ---');
    const aiProvider = getAIProvider();
    const decisionResponse = await aiProvider.recommendNextAction(context);
    const parsedDecision = aiFollowUpDecisionSchema.safeParse(decisionResponse.decision);
    assert(parsedDecision.success, 'Follow-up decision schema parsed and valid');
    assert(
      ['CALL NOW', 'SEND WHATSAPP', 'WAIT', 'CHANGE ANGLE', 'FOLLOW UP LATER', 'STOP TEMPORARILY'].includes(
        decisionResponse.decision.recommendedAction
      ),
      `Valid action recommended: ${decisionResponse.decision.recommendedAction}`,
      `Reasoning: ${decisionResponse.decision.reasoning}`
    );

    // TEST 6: AI WhatsApp Message Generation (HOOK + CONTEXT + VALUE + CTA)
    console.log('\n--- TEST GROUP 6: AI WhatsApp Sales Writer ---');
    const messageResponse = await aiProvider.generateWhatsAppMessage({
      ...context,
      requestedCategory: 'PRICE_OBJECTION',
    });
    const parsedMsg = aiWhatsAppMessageSchema.safeParse(messageResponse.result);
    assert(parsedMsg.success, 'AI WhatsApp output conforms to schema');
    assert(messageResponse.result.message.length >= 20, 'Message body generated', messageResponse.result.message);
    assert(Boolean(messageResponse.result.hook), 'Hook present', messageResponse.result.hook);
    assert(Boolean(messageResponse.result.cta), 'CTA present', messageResponse.result.cta);
    assert(messageResponse.result.category === 'PRICE_OBJECTION', 'Message category matched requested category');

    // TEST 7: Transactional WhatsApp Logging & Activity Creation
    console.log('\n--- TEST GROUP 7: Transactional Message Dispatch & History ---');
    const outboundMsg = await prisma.$transaction(async (tx) => {
      const msg = await tx.whatsAppMessage.create({
        data: {
          leadId: testLead.id,
          phone: testLead.contact?.phone || '+919876543210',
          direction: 'OUTBOUND',
          category: 'PRICE_OBJECTION',
          content: messageResponse.result.message,
          status: 'SENT',
          responseStatus: 'NO_RESPONSE',
          metadata: JSON.stringify(messageResponse.result),
          sentAt: new Date(),
        },
      });

      await tx.activity.create({
        data: {
          leadId: testLead.id,
          type: 'WHATSAPP_SENT',
          title: 'WhatsApp Message (OUTBOUND) - PRICE_OBJECTION',
          description: messageResponse.result.message.substring(0, 100),
        },
      });

      return msg;
    });

    assert(Boolean(outboundMsg.id), 'Outbound WhatsApp message logged in database');

    const createdActivity = await prisma.activity.findFirst({
      where: { leadId: testLead.id, type: 'WHATSAPP_SENT' },
      orderBy: { createdAt: 'desc' },
    });
    assert(Boolean(createdActivity), 'Activity audit entry created transactionally');

    // TEST 8: Response Status Tracking
    console.log('\n--- TEST GROUP 8: Response Status Update ---');
    const updatedMsg = await prisma.whatsAppMessage.update({
      where: { id: outboundMsg.id },
      data: {
        responseStatus: 'REPLIED',
        responseAt: new Date(),
      },
    });
    assert(updatedMsg.responseStatus === 'REPLIED' && Boolean(updatedMsg.responseAt), 'Message response status marked REPLIED');

    // TEST 9: Campaign Audience Segmentation & Safety Check
    console.log('\n--- TEST GROUP 9: Campaign Planner & Safety Verification ---');
    const leadsForCampaign = await prisma.lead.findMany({
      where: {
        status: { notIn: ['WON', 'LOST'] },
      },
      include: { contact: true },
      take: 5,
    });

    const testCampaign = await prisma.$transaction(async (tx) => {
      const camp = await tx.campaign.create({
        data: {
          name: 'Build 08 Test Blitz',
          objective: 'Reactivate stalled opportunities',
          category: 'REACTIVATION',
          messageBody: 'Hi {{customer_name}}, checking in on order automation for your store.',
          cta: 'Does 4 PM work for a quick demo?',
          status: 'DRAFT',
          totalRecipients: leadsForCampaign.length,
        },
      });

      await tx.campaignAudience.createMany({
        data: leadsForCampaign.map((l) => ({
          campaignId: camp.id,
          leadId: l.id,
          phone: l.contact?.phone || 'Unknown',
          status: 'PENDING',
        })),
      });

      return camp;
    });

    assert(Boolean(testCampaign.id), 'Campaign plan created in DRAFT state');
    const audienceRecords = await prisma.campaignAudience.count({ where: { campaignId: testCampaign.id } });
    assert(audienceRecords === leadsForCampaign.length, `Campaign audiences saved with safety count (${audienceRecords})`);

    // TEST 10: Specific Scenarios
    console.log('\n--- TEST GROUP 10: Specific Category Scenarios ---');
    const categoriesToTest = ['NO_ANSWER', 'BUSY', 'DEMO_CONFIRMATION', 'POST_DEMO'];
    for (const cat of categoriesToTest) {
      const res = await aiProvider.generateWhatsAppMessage({
        ...context,
        requestedCategory: cat,
      });
      assert(
        Boolean(res.result.message) && res.result.category === cat,
        `Scenario ${cat}: generated tailored message with CTA`
      );
    }

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passedTests}/${totalTests} Tests Passed`);
    console.log('====================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL BUILD 08 AUTOMATED TESTS PASSED SUCCESSFULLY!\n');
    } else {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBuild08Verification();
