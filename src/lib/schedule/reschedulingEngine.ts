import { ScheduleConflict } from './types';

export interface ScheduleItem {
  id: string;
  title: string;
  type: string; // DEMO, CALL, FOLLOW_UP, BLOCK, LUNCH
  startTime: Date;
  endTime: Date;
  isProtected?: boolean;
  priority?: string;
  leadId?: string | null;
}

/**
 * Detects overlapping commitments across scheduled demos, calls, follow-ups, and protected blocks.
 */
export function detectScheduleConflicts(items: ScheduleItem[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // Sort items by startTime
  const sorted = [...items].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const itemA = sorted[i];
      const itemB = sorted[j];

      // If itemB starts after itemA ends, no further overlaps for itemA
      if (itemB.startTime.getTime() >= itemA.endTime.getTime()) {
        break;
      }

      // Overlap detected
      const overlapStart = new Date(Math.max(itemA.startTime.getTime(), itemB.startTime.getTime()));
      const overlapEnd = new Date(Math.min(itemA.endTime.getTime(), itemB.endTime.getTime()));

      const minutesOverlap = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));

      if (minutesOverlap > 0) {
        conflicts.push({
          id: `conflict-${itemA.id}-${itemB.id}`,
          title: `Conflict: "${itemA.title}" overlaps with "${itemB.title}"`,
          type: itemA.type,
          startTime: overlapStart,
          endTime: overlapEnd,
          conflictsWithId: itemB.id,
          conflictsWithTitle: itemB.title,
          conflictsWithType: itemB.type,
          reason: `${minutesOverlap} minutes overlap between ${itemA.type} and ${itemB.type}.`,
        });
      }
    }
  }

  return conflicts;
}

export interface RearrangeResult {
  updatedBlocks: ScheduleItem[];
  movedItems: Array<{ id: string; title: string; oldTime: string; newTime: string }>;
  conflictsRemaining: ScheduleConflict[];
}

/**
 * Intelligently rearranges flexible/low-priority schedule blocks around a new commitment (e.g. booked demo).
 * Lunch and existing protected items are strictly shielded from being moved.
 */
export function dynamicallyRearrangeSchedule(
  newCommitment: ScheduleItem,
  existingBlocks: ScheduleItem[]
): RearrangeResult {
  const movedItems: Array<{ id: string; title: string; oldTime: string; newTime: string }> = [];
  const updatedBlocks: ScheduleItem[] = [];

  const commStart = newCommitment.startTime.getTime();
  const commEnd = newCommitment.endTime.getTime();

  for (const block of existingBlocks) {
    const bStart = block.startTime.getTime();
    const bEnd = block.endTime.getTime();

    // If completely outside new commitment, keep unchanged
    if (bEnd <= commStart || bStart >= commEnd) {
      updatedBlocks.push(block);
      continue;
    }

    // Overlaps with new commitment
    if (block.isProtected || block.type === 'LUNCH' || block.priority === 'CRITICAL') {
      // Cannot move protected item! Keep it and let conflict detector report it
      updatedBlocks.push(block);
      continue;
    }

    // Flexible block can be trimmed or shifted
    // Case 1: Block starts before commitment -> trim its end to commitment start
    if (bStart < commStart && bEnd > commStart && bEnd <= commEnd) {
      const oldTime = `${block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${block.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const newEndTime = new Date(commStart);
      const newTime = `${block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${newEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      updatedBlocks.push({
        ...block,
        endTime: newEndTime,
      });

      movedItems.push({
        id: block.id,
        title: block.title,
        oldTime,
        newTime,
      });
    }
    // Case 2: Block starts during commitment and ends after -> shift start to commitment end
    else if (bStart >= commStart && bStart < commEnd && bEnd > commEnd) {
      const oldTime = `${block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${block.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const newStartTime = new Date(commEnd);
      const newTime = `${newStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${block.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      updatedBlocks.push({
        ...block,
        startTime: newStartTime,
      });

      movedItems.push({
        id: block.id,
        title: block.title,
        oldTime,
        newTime,
      });
    }
    // Case 3: Block is completely submerged inside commitment -> shift it to after commitment
    else if (bStart >= commStart && bEnd <= commEnd) {
      const durationMs = bEnd - bStart;
      const oldTime = `${block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${block.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const newStartTime = new Date(commEnd);
      const newEndTime = new Date(commEnd + durationMs);
      const newTime = `${newStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${newEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      updatedBlocks.push({
        ...block,
        startTime: newStartTime,
        endTime: newEndTime,
      });

      movedItems.push({
        id: block.id,
        title: block.title,
        oldTime,
        newTime,
      });
    }
    // Case 4: Block spans across the commitment (starts before AND ends after)
    // Trim the first part to commStart, and resume after commEnd
    else if (bStart < commStart && bEnd > commEnd) {
      const oldTime = `${block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${block.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const trimmedEndTime = new Date(commStart);
      const newTime = `${block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${trimmedEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      updatedBlocks.push({
        ...block,
        endTime: trimmedEndTime,
      });

      updatedBlocks.push({
        ...block,
        id: `${block.id}-post`,
        startTime: new Date(commEnd),
        endTime: new Date(bEnd),
      });

      movedItems.push({
        id: block.id,
        title: block.title,
        oldTime,
        newTime,
      });
    }
  }

  // Include the new commitment in the schedule
  updatedBlocks.push(newCommitment);

  // Check if any conflicts remain
  const conflictsRemaining = detectScheduleConflicts(updatedBlocks);

  return {
    updatedBlocks: updatedBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    movedItems,
    conflictsRemaining,
  };
}
