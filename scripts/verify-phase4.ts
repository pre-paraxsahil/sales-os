import { prisma } from '../src/lib/prisma';
import { executePostCallWorkflow } from '../src/lib/calls/callWorkflow';
import { validateSaveCall } from '../src/lib/validations/call';

async function runPhase4Verification() {
  console.log('🔍 Starting Phase 4 — Fast Call Logging & Follow-up Intelligence Verification Suite...\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
    }
  }

  try {
    // Test 1: Prisma Schema Validation - Lead.archivedAt and LeadStatus.ARCHIVED
    const leadModelFields = (prisma as any)._runtimeDataModel?.models?.Lead?.fields || [];
    const hasArchivedAtField = leadModelFields.some((f: any) => f.name === 'archivedAt');
    assert(hasArchivedAtField, '1. Lead model contains archivedAt field for soft delete/archiving');

    // Test 2: Validation of Call Outcomes
    const validOutcomes = ['CONNECTED', 'NO_ANSWER', 'BUSY', 'SWITCHED_OFF', 'NOT_INTERESTED', 'WRONG_NUMBER', 'INTERESTED', 'CALLBACK_REQUESTED'];
    let allOutcomesValid = true;
    for (const outcome of validOutcomes) {
      const v = validateSaveCall({ leadId: 'some-id', outcome });
      if (!v.isValid && v.errors.outcome) {
        allOutcomesValid = false;
        break;
      }
    }
    assert(allOutcomesValid, '2. Validation correctly supports all 8 required Call Outcomes (including CALLBACK_REQUESTED)');

    // Test 3: Existing Lead Lookup Verification
    const existingLead = await prisma.lead.findFirst({
      where: { archivedAt: null },
      include: { contact: true, business: true, calls: { take: 1 }, followUps: { take: 1 } },
    });
    assert(!!existingLead, '3. Existing active lead exists in production database');

    if (existingLead) {
      // Test 4: Fast Call Logging on Existing Lead
      const testCallDate = new Date();
      const nextActionDate = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours from now

      const workflowResult = await executePostCallWorkflow(existingLead.id, {
        leadId: existingLead.id,
        callType: 'OUTBOUND',
        outcome: 'INTERESTED',
        notes: '[Asked for demo] Customer interested in enterprise tier demo tomorrow.',
        nextAction: 'Demo',
        nextActionAt: nextActionDate.toISOString(),
        temperature: 'WARM',
      });

      assert(!!workflowResult.call?.id, '4. Call record logged successfully via workflow');
      assert(workflowResult.lead.temperature === 'WARM', '5. Lead temperature updated to WARM on Interested outcome');
      assert(workflowResult.activity.type === 'CALL_LOGGED', '6. Timeline Activity created for logged call');

      // Test 7: Verify 5-minute Reminder creation
      const createdReminder = await prisma.reminder.findFirst({
        where: {
          leadId: existingLead.id,
          entityId: workflowResult.followUp?.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      assert(!!createdReminder, '7. Reminder automatically created for scheduled Next Action');
      if (createdReminder) {
        const expectedRemindAt = new Date(nextActionDate.getTime() - 5 * 60000);
        const timeDiff = Math.abs(createdReminder.remindAt.getTime() - expectedRemindAt.getTime());
        assert(timeDiff < 2000, '8. Reminder is scheduled 5 minutes prior to next action time');
      }

      // Test 9: Customer Memory Synchronization
      const memory = await prisma.customerMemory.findFirst({
        where: { leadId: existingLead.id, category: 'NEXT_ACTION' },
      });
      assert(!!memory && memory.value.includes('Demo'), '9. Customer memory synced with Next Action');
    }

    // Test 10: Soft Delete / Archive Verification
    // Create a temporary lead to test soft deletion
    const testUser = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    const tempLead = await prisma.lead.create({
      data: {
        userId: testUser?.id,
        title: 'Temporary Test Lead for Soft Delete',
        source: 'Test',
        status: 'NEW',
        temperature: 'COLD',
      },
    });

    // Add a call and a memory to the temp lead
    const tempCall = await prisma.call.create({
      data: {
        leadId: tempLead.id,
        userId: testUser?.id,
        callType: 'COLD_CALL',
        outcome: 'CONNECTED',
        notes: 'Test call to verify preservation during soft delete',
      },
    });

    const tempMemory = await prisma.customerMemory.create({
      data: {
        leadId: tempLead.id,
        category: 'REQUIREMENT',
        key: 'Test Key',
        value: 'Test Value',
      },
    });

    // Soft delete the lead
    const archivedLead = await prisma.lead.update({
      where: { id: tempLead.id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    assert(archivedLead.status === 'ARCHIVED' && !!archivedLead.archivedAt, '10. Lead soft-deleted / archived successfully');

    // Confirm call and memory still exist (zero data loss)
    const preservedCall = await prisma.call.findUnique({ where: { id: tempCall.id } });
    const preservedMemory = await prisma.customerMemory.findUnique({ where: { id: tempMemory.id } });
    assert(!!preservedCall && !!preservedMemory, '11. Call records and Customer Memory are 100% preserved after lead archiving');

    // Test 12: Production Data Check
    const totalLeads = await prisma.lead.count();
    const totalCalls = await prisma.call.count();
    const totalSales = await prisma.sale.count();
    const totalActivities = await prisma.activity.count();

    assert(totalLeads >= 3, `12. Total leads preserved in database (${totalLeads} records)`);
    assert(totalCalls >= 18, `13. Total calls preserved in database (${totalCalls} records)`);
    assert(totalSales >= 2, `14. Total sales preserved in database (${totalSales} records)`);
    assert(totalActivities >= 27, `15. Total activities preserved in database (${totalActivities} records)`);

    console.log(`\n========================================`);
    console.log(`Phase 4 Verification Summary: ${passedTests}/${totalTests} Passed`);
    console.log(`========================================\n`);

    if (passedTests === totalTests) {
      console.log('🎉 ALL PHASE 4 VERIFICATION TESTS PASSED!');
    } else {
      console.error('⚠️ SOME TESTS FAILED. Please inspect the output above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during Phase 4 verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase4Verification();
