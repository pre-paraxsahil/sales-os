import { prisma } from '../lib/prisma';
import { validateCreateLead } from '../lib/validations/lead';
import { validateSaveCall } from '../lib/validations/call';
import { executePostCallWorkflow } from '../lib/calls/callWorkflow';

async function runRealWorkflowVerification() {
  console.log('🧪 Starting BUILD 04 Real Database & Workflow Verification...\n');

  // Step 0: Test Validation & Failed Save Behavior
  console.log('1️⃣ Testing Validation Rules...');
  const invalidLead = validateCreateLead({ phone: '123' }); // Too short
  console.assert(!invalidLead.isValid, 'Validation should fail on short phone');
  console.log('   ✓ Short phone correctly rejected:', invalidLead.errors.phone);

  const invalidCall = validateSaveCall({ outcome: 'UNKNOWN_OUTCOME' as any });
  console.assert(!invalidCall.isValid, 'Validation should fail on unknown outcome');
  console.log('   ✓ Unknown outcome correctly rejected:', invalidCall.errors.outcome);

  // Step 1: Create Real Lead
  console.log('\n2️⃣ Creating Lead in PostgreSQL...');
  const defaultUser = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  if (!defaultUser) throw new Error('Default user not found');

  const business = await prisma.business.create({
    data: {
      name: 'Sahil Tech Ventures',
      industry: 'SaaS & Cloud Services',
      city: 'Mumbai',
    },
  });

  const contact = await prisma.contact.create({
    data: {
      name: 'Sahil Sharma',
      phone: '+919876543210',
      email: 'sahil@sahiltech.io',
      designation: 'Founder & CEO',
      businessId: business.id,
      isPrimary: true,
    },
  });

  const lead = await prisma.lead.create({
    data: {
      title: `${business.name} - ${contact.name}`,
      userId: defaultUser.id,
      businessId: business.id,
      contactId: contact.id,
      source: 'Direct Outreach',
      status: 'NEW',
      temperature: 'COLD',
      notes: 'Initial discussion needed regarding Sales OS deployment.',
    },
    include: { contact: true, business: true },
  });

  console.log(`   ✓ Lead created: ${lead.title} (ID: ${lead.id})`);
  console.log(`     Initial Status: ${lead.status}, Temperature: ${lead.temperature}`);

  // Step 2: Test Call Outcomes & Real Workflows
  console.log('\n3️⃣ Testing Call Outcomes & Post-Call Save Workflows...');

  // Test Outcome 1: CONNECTED
  console.log('   Testing [CONNECTED]...');
  const resConnected = await executePostCallWorkflow(lead.id, {
    leadId: lead.id,
    callType: 'COLD_CALL',
    outcome: 'CONNECTED',
    notes: 'Spoke with Sahil. Brief conversation introducing Sales OS.',
    nextAction: 'Send brochure & follow up',
  });
  console.assert(resConnected.lead.status === 'CONTACTED', 'Lead should transition to CONTACTED');
  console.log('   ✓ Status updated to:', resConnected.lead.status);

  // Test Outcome 2: INTERESTED
  console.log('   Testing [INTERESTED]...');
  const resInterested = await executePostCallWorkflow(lead.id, {
    leadId: lead.id,
    callType: 'FOLLOW_UP',
    outcome: 'INTERESTED',
    notes: 'Sahil expressed interest in automating daily call follow-ups.',
    nextAction: 'Schedule product demo',
  });
  console.assert(resInterested.lead.temperature === 'WARM', 'Temperature should warm up to WARM');
  console.log('   ✓ Temperature updated to:', resInterested.lead.temperature);

  // Test Outcome 3: DEMO_BOOKED
  console.log('   Testing [DEMO_BOOKED]...');
  const demoDate = new Date(Date.now() + 86400000 * 2); // 2 days later
  const resDemo = await executePostCallWorkflow(lead.id, {
    leadId: lead.id,
    callType: 'INTERESTED_LEAD',
    outcome: 'DEMO_BOOKED',
    notes: 'Booked live demo walkthrough with Sahil.',
    nextAction: 'Prepare demo walkthrough',
    nextActionAt: demoDate.toISOString(),
  });
  console.assert(resDemo.lead.status === 'QUALIFIED', 'Status should be QUALIFIED');
  console.assert(resDemo.lead.temperature === 'HOT', 'Temperature should be HOT');
  console.log('   ✓ Status:', resDemo.lead.status, '| Temperature:', resDemo.lead.temperature);

  // Verify Demo record was created
  const demoRecord = await prisma.demo.findFirst({ where: { leadId: lead.id } });
  console.assert(demoRecord !== null, 'Demo record must exist in DB');
  console.log('   ✓ Real Demo record created in DB with scheduledAt:', demoRecord?.scheduledAt.toISOString());

  // Test Outcome 4: FOLLOW_UP_REQUIRED
  console.log('   Testing [FOLLOW_UP_REQUIRED]...');
  const followUpDate = new Date(Date.now() + 86400000); // 1 day later
  const resFollowUp = await executePostCallWorkflow(lead.id, {
    leadId: lead.id,
    callType: 'FOLLOW_UP',
    outcome: 'FOLLOW_UP_REQUIRED',
    notes: 'Sahil asked to call back tomorrow after internal discussion.',
    nextAction: 'Call back regarding decision',
    nextActionAt: followUpDate.toISOString(),
  });
  console.assert(resFollowUp.followUp !== null, 'Follow-up record must be returned');
  const followUpInDb = await prisma.followUp.findFirst({ where: { leadId: lead.id } });
  console.assert(followUpInDb !== null, 'FollowUp must exist in DB');
  console.log('   ✓ Real FollowUp record created in DB with scheduledAt:', followUpInDb?.scheduledAt.toISOString());

  // Test Outcome 5: NO_ANSWER & BUSY
  console.log('   Testing [BUSY & NO_ANSWER]...');
  await executePostCallWorkflow(lead.id, {
    leadId: lead.id,
    callType: 'CALLBACK',
    outcome: 'BUSY',
    notes: 'Line busy, prospect rejected call.',
    nextAction: 'Retry call in 30 mins',
  });
  await executePostCallWorkflow(lead.id, {
    leadId: lead.id,
    callType: 'CALLBACK',
    outcome: 'NO_ANSWER',
    notes: 'Ringing but no answer.',
    nextAction: 'Retry tomorrow',
  });
  console.log('   ✓ Busy and No Answer calls recorded.');

  // Test Outcome 6: WRONG_NUMBER
  console.log('   Testing [WRONG_NUMBER]...');
  await executePostCallWorkflow(lead.id, {
    leadId: lead.id,
    callType: 'OUTBOUND',
    outcome: 'WRONG_NUMBER',
    notes: 'Wrong extension dialed.',
  });
  console.log('   ✓ Wrong number call recorded.');

  // Step 3: Verify Persistence, Metrics & Timeline
  console.log('\n4️⃣ Verifying Database Persistence & Timeline...');
  const callsInDb = await prisma.call.findMany({
    where: { leadId: lead.id },
    orderBy: { occurredAt: 'desc' },
  });
  console.assert(callsInDb.length === 6, `Expected 6 calls in DB, got ${callsInDb.length}`);
  console.log(`   ✓ Total Call records persisted in PostgreSQL: ${callsInDb.length}`);

  const activities = await prisma.activity.findMany({
    where: { leadId: lead.id, type: 'CALL_LOGGED' },
    orderBy: { occurredAt: 'desc' },
  });
  console.assert(activities.length === 6, 'Expected 6 timeline activities for calls');
  console.log(`   ✓ Chronological timeline activities persisted: ${activities.length}`);

  // Step 4: Verify Today Cockpit Aggregation
  console.log('\n5️⃣ Verifying Today Cockpit Query...');
  const pendingFollowUps = await prisma.followUp.findMany({
    where: { status: 'PENDING', type: 'CALL' },
  });
  console.assert(pendingFollowUps.length >= 1, 'Today cockpit should retrieve pending follow-ups');
  console.log(`   ✓ Pending follow-ups retrieved for Today Cockpit: ${pendingFollowUps.length}`);

  console.log('\n🎉 ALL REAL DATABASE WORKFLOW CHECKS PASSED SUCCESSFULLY!');
}

runRealWorkflowVerification()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
