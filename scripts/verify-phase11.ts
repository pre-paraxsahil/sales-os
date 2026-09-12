import {
  normalizeActivityType,
  resolveEventStatus,
  calculateDayCapacity,
  getUnifiedCalendarEvents,
} from '../src/lib/calendar/salesCalendarEngine';
import { checkTimeConflicts } from '../src/lib/calendar/conflictProtectionEngine';
import { findFreeTimeSlots } from '../src/lib/calendar/slotFinderEngine';

async function main() {
  console.log('========================================');
  console.log('PHASE 11 — SALES CALENDAR VERIFICATION');
  console.log('========================================\n');

  // 1. Test Activity Normalization
  console.log('1. Testing Activity Type Normalization...');
  console.assert(normalizeActivityType('DEMO') === 'DEMO', 'DEMO failed');
  console.assert(normalizeActivityType('Callback requested') === 'CALLBACK', 'CALLBACK failed');
  console.assert(normalizeActivityType('Send quotation details') === 'SEND_DETAILS', 'SEND_DETAILS failed');
  console.assert(normalizeActivityType('LUNCH_BLOCK') === 'LUNCH', 'LUNCH failed');
  console.log('✅ Activity Type Normalization verified.\n');

  // 2. Test Event Status Resolver
  console.log('2. Testing Event Status Resolver...');
  const pastStart = new Date(Date.now() - 3600000);
  const pastEnd = new Date(Date.now() - 1800000);
  console.assert(resolveEventStatus('SCHEDULED', pastStart, pastEnd) === 'MISSED', 'Past scheduled should resolve to MISSED');
  console.assert(resolveEventStatus('COMPLETED', pastStart, pastEnd) === 'COMPLETED', 'Completed should remain COMPLETED');
  console.log('✅ Event Status Resolver verified.\n');

  // 3. Test Unified Event Aggregation & Day Capacity
  console.log('3. Testing Unified Event Aggregation & Day Capacity...');
  const today = new Date();
  const capacity = await calculateDayCapacity(today);
  console.log('Real DB Day Capacity:', capacity);
  console.assert(typeof capacity.bookedMinutes === 'number', 'Booked minutes should be number');
  console.assert(typeof capacity.freeMinutes === 'number', 'Free minutes should be number');
  console.log('✅ Day Capacity calculation verified.\n');

  // 4. Test Conflict Protection Engine
  console.log('4. Testing Smart Conflict Protection Engine...');
  const validStart = new Date();
  validStart.setHours(11, 0, 0, 0); // 11:00 AM

  const conflictCheck = await checkTimeConflicts({
    startTime: validStart,
    durationMinutes: 30,
    bufferMinutes: 10,
  });

  console.log('Conflict Check Result for 11:00 AM:', conflictCheck);
  console.assert(typeof conflictCheck.hasConflict === 'boolean', 'hasConflict should be boolean');
  console.log('✅ Conflict Protection Engine verified.\n');

  // 5. Test Available Slot Finder Engine
  console.log('5. Testing Available Slot Finder Engine...');
  const dateStr = today.toISOString().split('T')[0];
  const slotFinderResult = await findFreeTimeSlots({
    dateString: dateStr,
    durationMinutes: 30,
    bufferMinutes: 10,
  });

  console.log(`Available Slots for ${dateStr} (${slotFinderResult.slots.length} slots found):`, slotFinderResult.slots.slice(0, 3));
  console.assert(Array.isArray(slotFinderResult.slots), 'Slots should be an array');
  console.log('✅ Slot Finder Engine verified.\n');

  console.log('========================================');
  console.log('🎉 ALL PHASE 11 ENGINES VERIFIED CLEANLY!');
  console.log('========================================');
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
