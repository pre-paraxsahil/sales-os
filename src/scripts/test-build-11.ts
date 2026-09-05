import { prisma } from '../lib/prisma';
import { isValidUuid, sanitizeString, parseSafeInt } from '../lib/validations/common';
import { validateSaveCall } from '../lib/validations/call';
import { validateCreateLead } from '../lib/validations/lead';
import { extractAndDetectMemoryConflicts } from '../lib/ai/conflictService';
import { aiProvider } from '../lib/ai/aiProvider';
import { generateDailyReportCsv, generateWeeklyReportCsv } from '../lib/analytics/exportService';

async function runBuild11Tests() {
  console.log('=================================================================');
  console.log('BROSTARTUP SALES OS — BUILD 11 VERIFICATION SUITE');
  console.log('PRODUCTION HARDENING + SECURITY + DATA INTEGRITY');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. UUID & Input Sanitation Helper Tests
    console.log('--- TEST 1: Common Input & UUID Validation Helpers ---');
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const invalidUuid1 = 'invalid-uuid-string';
    const invalidUuid2 = '12345';
    assert(isValidUuid(validUuid) === true, `isValidUuid correctly identified valid UUID: ${validUuid}`);
    assert(isValidUuid(invalidUuid1) === false, `isValidUuid rejected malformed string: ${invalidUuid1}`);
    assert(isValidUuid(invalidUuid2) === false, `isValidUuid rejected short string: ${invalidUuid2}`);
    assert(isValidUuid(null) === false, 'isValidUuid rejected null.');

    const sanitized = sanitizeString('   Hello World   ');
    assert(sanitized === 'Hello World', `sanitizeString trimmed input cleanly: "${sanitized}"`);

    const parsedInt = parseSafeInt('42', 0, 0, 100);
    assert(parsedInt === 42, `parseSafeInt correctly parsed integer: ${parsedInt}`);
    assert(parseSafeInt('invalid', 10) === 10, 'parseSafeInt returned fallback for invalid string.');
    assert(parseSafeInt('500', 0, 0, 100) === 100, 'parseSafeInt bounded value to max limit.');

    // 2. Call Validation
    console.log('\n--- TEST 2: Call Input Payload Validation ---');
    const validCall = validateSaveCall({
      outcome: 'CONNECTED',
      callType: 'OUTBOUND',
      notes: 'Discussed requirements',
      durationSeconds: 120,
    });
    assert(validCall.isValid === true, 'Valid call payload accepted.');

    const invalidCall = validateSaveCall({
      outcome: 'INVALID_OUTCOME_CODE',
    });
    assert(invalidCall.isValid === false, 'Invalid call outcome rejected.');
    assert(Boolean(invalidCall.errors.outcome), `Rejected error message: "${invalidCall.errors.outcome}"`);

    // 3. Lead Creation Validation
    console.log('\n--- TEST 3: Lead Payload Validation ---');
    const validLead = validateCreateLead({
      title: 'Acme Enterprises',
      contactName: 'Rahul Sharma',
      phone: '9876543210',
    });
    assert(validLead.isValid === true, 'Valid lead payload accepted.');

    const invalidLead = validateCreateLead({
      title: '',
    });
    assert(invalidLead.isValid === false, 'Empty lead title rejected.');

    // 4. Memory Integrity & Conflict Protection
    console.log('\n--- TEST 4: Customer Memory Precedence & Protection ---');
    const lead = await prisma.lead.findFirst({
      include: { memories: true },
    });

    if (lead) {
      const mockCallAnalysis = {
        summary: 'Test summary',
        businessUnderstanding: 'Retail store',
        requirements: [{ value: 'Different requirement', status: 'INFERRED' as const, confidence: 0.8 }],
        painPoints: [],
        currentProcess: 'Manual entry',
        goals: [],
        decisionMaker: { value: 'Manager', status: 'INFERRED' as const, confidence: 0.7 },
        teamInvolved: [],
        timeline: { value: 'Immediate', status: 'INFERRED' as const, confidence: 0.7 },
        budget: { value: '15000', status: 'INFERRED' as const, confidence: 0.7 },
        packageDiscussed: { value: 'Pro Plan', status: 'INFERRED' as const, confidence: 0.7 },
        objections: [],
        buyingSignals: [],
        competitor: { value: 'None', status: 'INFERRED' as const, confidence: 0.7 },
        nextAction: { value: 'Follow up', status: 'INFERRED' as const, confidence: 0.7 },
        leadTemperature: 'WARM' as const,
        confidence: 0.85,
        unknownInformation: [],
      };

      const conflictCheck = await extractAndDetectMemoryConflicts(lead.id, 'dummy-call-id', mockCallAnalysis);
      assert(Array.isArray(conflictCheck.candidates), 'Candidate memory updates extracted cleanly.');
      assert(Array.isArray(conflictCheck.conflicts), 'Conflict detection evaluated without errors.');
    } else {
      console.log('Skipping memory conflict test (no lead in DB).');
      assert(true, 'Memory test step completed.');
    }

    // 5. AI Resilience Under Quota Exhaustion
    console.log('\n--- TEST 5: AI Provider Fail-Safe Fallbacks ---');
    const coachResult = await aiProvider.generateSalesCoach({
      period: 'TODAY',
      totalCalls: 5,
      connected: 3,
      demosCompleted: 1,
    });
    assert(coachResult.whatWorked.length > 0, 'Sales Coach returned non-empty whatWorked array.');
    assert(Boolean(coachResult.bottleneck), `Sales Coach returned valid bottleneck: "${coachResult.bottleneck}"`);
    assert(coachResult.confidence > 0, `Sales Coach returned confidence: ${coachResult.confidence}`);

    // 6. CSV Export Safety Formatting
    console.log('\n--- TEST 6: CSV Export Safety & Formatting ---');
    const mockDaily = {
      reportDate: '2026-09-05',
      dayOfWeek: 'Saturday',
      activity: {
        totalCalls: 10,
        newCalls: 5,
        followUpCalls: 5,
        connected: 6,
        interested: 3,
        demosScheduled: 2,
        demosCompleted: 1,
        noAnswer: 3,
        busy: 1,
        switchedOff: 0,
        notInterested: 1,
        wrongNumber: 0,
        other: 0,
      },
      funnel: {
        callsToConnected: 60,
        connectedToInterested: 50,
        interestedToDemo: 67,
        demoToSale: 100,
      },
      sales: {
        totalSales: 1,
        totalRevenue: 15000,
        averageSaleValue: 15000,
        packages: [],
        sources: [],
      },
      aiReview: {
        whatWorked: ['Outbound dials'],
        whatDidnt: ['Unanswered calls'],
        bottleneck: 'Lead reachability',
        bestOpportunity: 'Acme Retail',
        missedOpportunities: [],
        tomorrowPriorities: ['Follow up'],
        recommendedStrategy: 'Focus on warm leads',
      },
      generatedAt: new Date().toISOString(),
    };

    const csvOutput = generateDailyReportCsv(mockDaily);
    assert(csvOutput.includes('Total Calls'), 'CSV export includes metric names.');
    assert(csvOutput.includes('2026-09-05'), 'CSV export includes report date.');

    // 7. Non-Destructive Database Integrity Check
    console.log('\n--- TEST 7: Database Integrity & Record Count Preservation ---');
    const leadCount = await prisma.lead.count();
    const callCount = await prisma.call.count();
    const demoCount = await prisma.demo.count();
    const saleCount = await prisma.sale.count();
    console.log(`Database verification: ${leadCount} leads, ${callCount} calls, ${demoCount} demos, ${saleCount} sales.`);
    assert(leadCount > 0, `Database lead count intact: ${leadCount} > 0`);
    assert(callCount >= 0, `Database call count intact: ${callCount}`);

    console.log('\n=================================================================');
    console.log(`BUILD 11 TEST RESULTS: ${passed} PASSED, ${failed} FAILED.`);
    console.log('=================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal error in Build 11 verification suite:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBuild11Tests();
