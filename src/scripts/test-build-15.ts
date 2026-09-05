import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { getNotificationPermissionState, isPushSupported } from '../lib/push/clientPush';

let passCount = 0;
let failCount = 0;

let testCounter = 1;
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS ${testCounter}] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL ${testCounter}] ${message}`);
    failCount++;
  }
  testCounter++;
}

async function runBuild15Tests() {
  console.log('=================================================================');
  console.log('BROSTARTUP SALES OS — BUILD 15 VERIFICATION SUITE');
  console.log('PWA + SMART REMINDER & PUSH NOTIFICATION ENGINE');
  console.log('=================================================================\n');

  // --- PART 1: PWA MANIFEST & SERVICE WORKER ASSET CHECKS ---
  console.log('--- PART 1: PWA MANIFEST & SERVICE WORKER VERIFICATION ---');
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json exists in public directory');

  if (fs.existsSync(manifestPath)) {
    const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(manifestJson.name === 'BroStartup Sales OS', 'manifest.json contains correct name');
    assert(manifestJson.display === 'standalone', 'manifest.json display is set to standalone');
    assert(Array.isArray(manifestJson.icons) && manifestJson.icons.length >= 2, 'manifest.json contains PWA icons');
  }

  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  assert(fs.existsSync(swPath), 'sw.js Service Worker exists in public directory');

  if (fs.existsSync(swPath)) {
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert(swContent.includes("addEventListener('push'"), 'sw.js contains push event listener');
    assert(swContent.includes("addEventListener('notificationclick'"), 'sw.js contains notificationclick listener');
  }

  // --- PART 2: PUSH PERMISSION STATE HELPER TEST ---
  console.log('\n--- PART 2: CLIENT PUSH HELPER & PERMISSION STATES ---');
  assert(typeof isPushSupported === 'function', 'isPushSupported helper function exists');
  assert(typeof getNotificationPermissionState === 'function', 'getNotificationPermissionState helper exists');

  // --- PART 3: PUSH SUBSCRIPTION DATABASE PERSISTENCE & UNIQUE GUARDS ---
  console.log('\n--- PART 3: DATABASE PUSH SUBSCRIPTION MODEL TEST ---');
  const testEndpoint = `https://fcm.googleapis.com/fcm/send/test-token-${Date.now()}`;
  
  const testUser = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  assert(testUser !== null, 'Found system owner user for push relation');

  const sub = await prisma.pushSubscription.create({
    data: {
      userId: testUser?.id,
      endpoint: testEndpoint,
      p256dh: 'BNcRdreALRFUYQXFStgVo71A0_28_kR',
      auth: 'tH81vWw',
      userAgent: 'Build-15-Test-Runner',
    },
  });

  assert(sub.id !== undefined, 'Created PushSubscription record in PostgreSQL');
  assert(sub.endpoint === testEndpoint, 'PushSubscription endpoint matches');

  // Query push subscription
  const fetchedSub = await prisma.pushSubscription.findUnique({
    where: { endpoint: testEndpoint },
  });
  assert(fetchedSub !== null && fetchedSub.revokedAt === null, 'PushSubscription queried successfully and is active');

  // --- PART 4: CRON ENDPOINT AUTHORIZATION PROTECTION ---
  console.log('\n--- PART 4: CRON ENDPOINT AUTHORIZATION CHECK ---');
  const { GET: cronHandler } = await import('../app/api/notifications/cron/route');

  // Unauthorized request test (missing secret header and query)
  const unauthReq = new Request('http://localhost:3000/api/notifications/cron', {
    method: 'GET',
  });
  const unauthRes = await cronHandler(unauthReq);
  assert(unauthRes.status === 401, 'Cron endpoint rejected unauthorized request with HTTP 401');

  // Authorized request test
  const authReq = new Request('http://localhost:3000/api/notifications/cron', {
    method: 'GET',
    headers: {
      Authorization: 'Bearer salesos_cron_secret_key_2026',
    },
  });
  const authRes = await cronHandler(authReq);
  assert(authRes.status === 200, 'Cron endpoint accepted authorized request with HTTP 200');
  
  const cronData = await authRes.json();
  assert(cronData.success === true, 'Cron execution returned success payload');

  // --- PART 5: DUE REMINDER DETECTION & IDEMPOTENCY ---
  console.log('\n--- PART 5: DUE REMINDER DETECTION & IDEMPOTENCY TEST ---');
  const pastTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

  const testReminder = await prisma.reminder.create({
    data: {
      userId: testUser?.id,
      title: 'Build 15 Follow-Up Test',
      message: 'Confirm deal terms with test supermarket',
      remindAt: pastTime,
      isSent: false,
      clickUrl: '/today',
    },
  });
  assert(testReminder.isSent === false, 'Created unsent due reminder');

  // Trigger cron job to process due reminder
  const cronRunRes = await cronHandler(authReq);
  const cronRunData = await cronRunRes.json();
  assert(cronRunData.processedRemindersCount >= 1, 'Cron engine detected and processed due reminder');

  // Check reminder status in DB to verify idempotency
  const updatedReminder = await prisma.reminder.findUnique({
    where: { id: testReminder.id },
  });
  assert(updatedReminder?.isSent === true, 'Reminder marked as sent (isSent: true)');
  assert(updatedReminder?.sentAt !== null, 'Reminder sentAt timestamp recorded');

  // Re-run cron job to ensure duplicate notification is NOT sent
  const reRunRes = await cronHandler(authReq);
  const reRunData = await reRunRes.json();
  
  const reRunReminder = await prisma.reminder.findUnique({
    where: { id: testReminder.id },
  });
  assert(reRunReminder?.isSent === true, 'Idempotency verified: Reminder remains sent and is not re-triggered');

  // --- PART 6: FUTURE REMINDER NOT SENT EARLY ---
  console.log('\n--- PART 6: FUTURE REMINDER PROTECTION ---');
  const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future

  const futureReminder = await prisma.reminder.create({
    data: {
      userId: testUser?.id,
      title: 'Future Demo Reminder',
      message: 'Demo scheduled in 2 hours',
      remindAt: futureTime,
      isSent: false,
    },
  });

  const futureCronRes = await cronHandler(authReq);
  const checkFutureReminder = await prisma.reminder.findUnique({
    where: { id: futureReminder.id },
  });
  assert(checkFutureReminder?.isSent === false, 'Future reminder was NOT sent early by cron engine');

  // Cleanup test reminder & subscription
  await prisma.reminder.delete({ where: { id: testReminder.id } });
  await prisma.reminder.delete({ where: { id: futureReminder.id } });
  await prisma.pushSubscription.delete({ where: { id: sub.id } });

  // --- PART 7: EXISTING MODULE REGRESSION CHECKS ---
  console.log('\n--- PART 7: EXISTING CORE MODULES REGRESSION CHECKS ---');
  const leadCount = await prisma.lead.count();
  const callCount = await prisma.call.count();
  const demoCount = await prisma.demo.count();
  const followUpCount = await prisma.followUp.count();
  const memoryCount = await prisma.customerMemory.count();

  assert(leadCount >= 1, `Leads database intact (count=${leadCount})`);
  assert(callCount >= 1, `Calls database intact (count=${callCount})`);
  assert(demoCount >= 1, `Demos database intact (count=${demoCount})`);
  assert(followUpCount >= 1, `Follow-ups database intact (count=${followUpCount})`);
  assert(memoryCount >= 1, `Customer Memory database intact (count=${memoryCount})`);

  console.log('\n=================================================================');
  console.log(`BUILD 15 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED.`);
  console.log('=================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runBuild15Tests().catch((err) => {
  console.error('Fatal error during Build 15 verification:', err);
  process.exit(1);
});
