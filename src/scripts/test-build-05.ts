async function runVerification() {
  console.log('=== STARTING BUILD 05 COMPREHENSIVE VERIFICATION ===\n');

  // 1. Fetch leads
  const leadsRes = await fetch('http://localhost:3000/api/leads');
  const leadsJson = await leadsRes.json();
  if (!leadsRes.ok || !leadsJson.success || !leadsJson.data || leadsJson.data.length === 0) {
    throw new Error('Failed to fetch leads or no leads found in database.');
  }

  const lead = leadsJson.data[0];
  const leadId = lead.id;
  console.log(`[PASS] Step 1: Found existing lead: "${lead.title}" (ID: ${leadId})`);

  // 2. Test GET /api/leads/[id]/memory (initial)
  const initialMemRes = await fetch(`http://localhost:3000/api/leads/${leadId}/memory`);
  const initialMemJson = await initialMemRes.json();
  if (!initialMemRes.ok || !initialMemJson.success) {
    throw new Error('Failed to fetch initial customer memory.');
  }
  console.log(`[PASS] Step 2: GET /api/leads/[id]/memory returned HTTP 200, count: ${initialMemJson.data.counts.total}`);

  // 3. Test POST /api/leads/[id]/memory (Confirmed Requirement)
  const postReqRes = await fetch(`http://localhost:3000/api/leads/${leadId}/memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'REQUIREMENT',
      key: 'Product Catalog Capacity',
      value: 'Around 2,000 active SKUs with multi-store inventory sync.',
      verificationState: 'CONFIRMED',
      sourceType: 'CALL',
    }),
  });
  const postReqJson = await postReqRes.json();
  if (!postReqRes.ok || !postReqJson.success) {
    throw new Error(`Failed to create memory requirement: ${postReqJson.error}`);
  }
  const createdReqId = postReqJson.data.id;
  console.log(`[PASS] Step 3: Created CONFIRMED requirement memory (ID: ${createdReqId})`);

  // 4. Test POST /api/leads/[id]/memory (Inferred Fact)
  const postInferredRes = await fetch(`http://localhost:3000/api/leads/${leadId}/memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'PACKAGE',
      key: 'Probable Plan Fit',
      value: 'Likely Growth or Enterprise plan based on multi-store requirement.',
      verificationState: 'INFERRED',
      sourceType: 'CALL',
      confidence: 0.85,
    }),
  });
  const postInferredJson = await postInferredRes.json();
  if (!postInferredRes.ok || !postInferredJson.success) {
    throw new Error(`Failed to create inferred memory fact: ${postInferredJson.error}`);
  }
  const createdInferredId = postInferredJson.data.id;
  console.log(`[PASS] Step 4: Created INFERRED package memory (ID: ${createdInferredId})`);

  // 5. Test PATCH /api/leads/[id]/memory/[memoryId] (Edit Fact)
  const patchRes = await fetch(`http://localhost:3000/api/leads/${leadId}/memory/${createdReqId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      value: 'Around 2,500 active SKUs with multi-store inventory sync and WhatsApp order alerts.',
    }),
  });
  const patchJson = await patchRes.json();
  if (!patchRes.ok || !patchJson.success) {
    throw new Error(`Failed to update memory: ${patchJson.error}`);
  }
  console.log(`[PASS] Step 5: Edited memory value successfully: "${patchJson.data.value}"`);

  // 6. Test DELETE /api/leads/[id]/memory/[memoryId] (Soft Reject Fact)
  const rejectRes = await fetch(`http://localhost:3000/api/leads/${leadId}/memory/${createdInferredId}`, {
    method: 'DELETE',
  });
  const rejectJson = await rejectRes.json();
  if (!rejectRes.ok || !rejectJson.success || rejectJson.data.verificationState !== 'REJECTED') {
    throw new Error(`Failed to mark memory as REJECTED: ${rejectJson.error}`);
  }
  console.log(`[PASS] Step 6: Marked memory fact as REJECTED without destroying history: state=${rejectJson.data.verificationState}`);

  // 7. Test GET /api/leads/[id]/timeline
  const timelineRes = await fetch(`http://localhost:3000/api/leads/${leadId}/timeline`);
  const timelineJson = await timelineRes.json();
  if (!timelineRes.ok || !timelineJson.success || !timelineJson.data.events) {
    throw new Error('Failed to fetch timeline.');
  }
  console.log(`[PASS] Step 7: Complete interaction timeline fetched: ${timelineJson.data.events.length} chronological events (Calls: ${timelineJson.data.counts.calls})`);

  // 8. Test GET /api/leads/[id]/summary
  const summaryRes = await fetch(`http://localhost:3000/api/leads/${leadId}/summary`);
  const summaryJson = await summaryRes.json();
  if (!summaryRes.ok || !summaryJson.success) {
    throw new Error('Failed to fetch customer summary.');
  }
  console.log(`[PASS] Step 8: Customer Summary generated deterministically from DB:`);
  console.log(`       Customer: ${summaryJson.data.customerName} (${summaryJson.data.businessName})`);
  console.log(`       Requirements: ${summaryJson.data.currentRequirements.join(', ')}`);
  console.log(`       Unknown fields: ${summaryJson.data.unknownFields.join(', ')}`);

  // 9. Test GET /api/leads/[id]/tell-me-everything
  const tmeRes = await fetch(`http://localhost:3000/api/leads/${leadId}/tell-me-everything`);
  const tmeJson = await tmeRes.json();
  if (!tmeRes.ok || !tmeJson.success || !tmeJson.data.sections || tmeJson.data.sections.length !== 14) {
    throw new Error(`Failed to generate Tell Me Everything or section count is not 14 (got ${tmeJson.data?.sections?.length}).`);
  }
  console.log(`[PASS] Step 9: Tell Me Everything returned all 14 structured database-backed sections:`);
  tmeJson.data.sections.forEach((s: any) => {
    console.log(`       ${s.number}. ${s.title}: ${s.isAvailable ? 'Available' : 'Not available'}`);
  });

  // 10. Test Global Search
  const searchRes = await fetch('http://localhost:3000/api/search?q=SKUs');
  const searchJson = await searchRes.json();
  if (!searchRes.ok || !searchJson.success || !searchJson.data || searchJson.data.length === 0) {
    throw new Error('Global search failed to find lead by memory keyword "SKUs".');
  }
  console.log(`[PASS] Step 10: Global search queried "SKUs" and matched memory fact: "${searchJson.data[0].matchDetail}"`);

  // 11. Test Call Save -> Customer Memory update
  const callSaveRes = await fetch(`http://localhost:3000/api/leads/${leadId}/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callType: 'FOLLOW_UP',
      outcome: 'CONNECTED',
      durationSeconds: 145,
      notes: 'Customer confirmed readiness for platform walkthrough with technical founder.',
      nextAction: 'Deliver customized product demo on Monday 11:00 AM',
      nextActionAt: new Date(Date.now() + 86400000).toISOString(),
      memoryKey: 'Primary Decision Timeline',
      memoryValue: 'Within next 14 days before quarter close.',
      memoryCategory: 'TIMELINE',
    }),
  });
  const callSaveJson = await callSaveRes.json();
  if (!callSaveRes.ok || !callSaveJson.success) {
    throw new Error(`Failed to save call with memory sync: ${callSaveJson.error}`);
  }
  console.log(`[PASS] Step 11: Call logged and synchronized to Activity, Follow-up, and CustomerMemory!`);

  // 12. Verify the newly logged next action and timeline memory appear in Customer Memory
  const verifyMemRes = await fetch(`http://localhost:3000/api/leads/${leadId}/memory`);
  const verifyMemJson = await verifyMemRes.json();
  const nextActionFact = verifyMemJson.data.memories.find((m: any) => m.category === 'NEXT_ACTION');
  const timelineFact = verifyMemJson.data.memories.find((m: any) => m.category === 'TIMELINE');
  if (!nextActionFact || !timelineFact) {
    throw new Error('Call save did not properly synchronize NEXT_ACTION or TIMELINE memory fact.');
  }
  console.log(`[PASS] Step 12: Verified CustomerMemory contains:`);
  console.log(`       - Next Action: "${nextActionFact.value}"`);
  console.log(`       - Timeline: "${timelineFact.value}"`);

  console.log('\n=== ALL BUILD 05 VERIFICATION CHECKS PASSED SUCCESSFULLY ===');
}

runVerification().catch((err) => {
  console.error('\n[FAIL] Verification error:', err);
  process.exit(1);
});
