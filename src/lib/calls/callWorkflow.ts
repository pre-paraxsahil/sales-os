import { prisma } from '@/lib/prisma';
import { SaveCallInput } from '@/lib/validations/call';
import { LeadStatus, LeadTemperature } from '@prisma/client';

export interface CallWorkflowResult {
  call: any;
  lead: any;
  followUp: any | null;
  activity: any;
}

export async function executePostCallWorkflow(
  leadId: string,
  input: SaveCallInput
): Promise<CallWorkflowResult> {
  const {
    callType = 'OUTBOUND',
    outcome,
    durationSeconds = null,
    startedAt = null,
    endedAt = null,
    notes = null,
    nextAction = null,
    nextActionAt = null,
    temperature = null,
  } = input;

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current lead
    const currentLead = await tx.lead.findUnique({
      where: { id: leadId },
      include: { contact: true, business: true },
    });

    if (!currentLead) {
      throw new Error(`Lead with ID ${leadId} not found.`);
    }

    // 2. Determine conservative Stage and Temperature updates
    let updatedStatus: LeadStatus = currentLead.status;
    let updatedTemperature: LeadTemperature = currentLead.temperature;

    // Manual override takes precedence if James explicitly chose a temperature
    if (temperature) {
      updatedTemperature = temperature;
    } else {
      // Conservative automatic temperature adjustments based on outcome
      if (outcome === 'INTERESTED' || outcome === 'DEMO_BOOKED') {
        if (currentLead.temperature === 'COLD') {
          updatedTemperature = 'WARM';
        }
      } else if (callType === 'HOT_LEAD' || outcome === 'SCHEDULED_DEMO') {
        updatedTemperature = 'HOT';
      } else if (outcome === 'NOT_INTERESTED') {
        updatedTemperature = 'COLD';
      }
    }

    // Conservative stage progression
    if (outcome === 'DEMO_BOOKED' || outcome === 'SCHEDULED_DEMO') {
      if (currentLead.status === 'NEW' || currentLead.status === 'CONTACTED') {
        updatedStatus = 'QUALIFIED';
      }
    } else if (outcome === 'CONNECTED' || outcome === 'INTERESTED') {
      if (currentLead.status === 'NEW') {
        updatedStatus = 'CONTACTED';
      }
    } else if (outcome === 'NOT_INTERESTED') {
      if (currentLead.status === 'NEW' || currentLead.status === 'CONTACTED') {
        updatedStatus = 'UNQUALIFIED';
      }
    }

    // Parse next action date if provided
    const parsedNextActionAt = nextActionAt ? new Date(nextActionAt) : null;

    // 3. Create Call record (preserving original notes)
    const call = await tx.call.create({
      data: {
        leadId,
        userId: currentLead.userId,
        contactId: currentLead.contactId,
        callType,
        outcome,
        durationSeconds: durationSeconds ? Number(durationSeconds) : null,
        notes: notes ? notes.trim() : null,
        startedAt: startedAt ? new Date(startedAt) : null,
        endedAt: endedAt ? new Date(endedAt) : null,
        nextAction: nextAction ? nextAction.trim() : null,
        nextActionAt: parsedNextActionAt,
        occurredAt: startedAt ? new Date(startedAt) : new Date(),
      },
    });

    // 4. Create Timeline Activity event
    const outcomeLabel = outcome.replace(/_/g, ' ');
    const activity = await tx.activity.create({
      data: {
        userId: currentLead.userId,
        leadId,
        type: 'CALL_LOGGED',
        title: `Call Logged: ${outcomeLabel}`,
        description: notes
          ? `[${callType}] ${notes.trim()}`
          : `Completed ${callType.replace(/_/g, ' ')} call with outcome: ${outcomeLabel}`,
        metadata: JSON.stringify({
          callId: call.id,
          outcome,
          callType,
          durationSeconds,
          nextAction,
          nextActionAt,
        }),
        occurredAt: call.occurredAt || new Date(),
      },
    });

    // 5. If nextActionAt provided, create FollowUp, ScheduleBlock, and Reminder
    let followUp = null;
    if (parsedNextActionAt) {
      const isDemoOutcome = outcome === 'DEMO_BOOKED' || outcome === 'SCHEDULED_DEMO';

      if (isDemoOutcome) {
        // Create Demo record
        const createdDemo = await tx.demo.create({
          data: {
            leadId,
            userId: currentLead.userId,
            contactId: currentLead.contactId,
            status: 'SCHEDULED',
            scheduledAt: parsedNextActionAt,
            durationMinutes: 30,
            notes: nextAction || `Product Demo booked via call on ${new Date().toLocaleDateString()}`,
          },
        });

        // Create ScheduleBlock for Demo
        await tx.scheduleBlock.create({
          data: {
            userId: currentLead.userId,
            leadId,
            title: `Demo: ${currentLead.business?.name || currentLead.contact?.name || currentLead.title}`,
            blockType: 'DEMO',
            startTime: parsedNextActionAt,
            endTime: new Date(parsedNextActionAt.getTime() + 30 * 60000),
            isProtected: true,
            priority: 'CRITICAL',
            notes: nextAction || notes || null,
          },
        });

        // Calculate reminder trigger (5 minutes prior to action time)
        const reminderTime = new Date(Math.max(Date.now(), parsedNextActionAt.getTime() - 5 * 60000));

        // Create Reminder for Demo
        await tx.reminder.create({
          data: {
            userId: currentLead.userId,
            leadId,
            title: `Upcoming Demo: ${currentLead.title}`,
            message: nextAction || `Demo scheduled for ${parsedNextActionAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            level: 'HIGH',
            type: 'DEMO',
            entityId: createdDemo.id,
            entityType: 'DEMO',
            remindAt: reminderTime,
          },
        });
      } else {
        // Create or find FollowUp record
        const existingFollowUp = await tx.followUp.findFirst({
          where: {
            leadId,
            status: 'PENDING',
            scheduledAt: parsedNextActionAt,
          },
        });

        if (!existingFollowUp) {
          followUp = await tx.followUp.create({
            data: {
              leadId,
              userId: currentLead.userId,
              type: nextAction?.toLowerCase().includes('whatsapp') ? 'WHATSAPP' : 'CALL',
              status: 'PENDING',
              scheduledAt: parsedNextActionAt,
              notes: nextAction || `Follow-up required from call logged on ${new Date().toLocaleDateString()}`,
            },
          });
        } else {
          followUp = existingFollowUp;
        }

        // Create ScheduleBlock for Follow-up / Callback
        const blockType = nextAction?.toLowerCase().includes('callback') || outcome === 'NO_ANSWER' || outcome === 'BUSY'
          ? 'CALLBACK'
          : 'FOLLOW_UP';

        await tx.scheduleBlock.create({
          data: {
            userId: currentLead.userId,
            leadId,
            title: `${nextAction || 'Follow-up'}: ${currentLead.title}`,
            blockType,
            startTime: parsedNextActionAt,
            endTime: new Date(parsedNextActionAt.getTime() + 15 * 60000),
            priority: 'HIGH',
            notes: notes || null,
          },
        });

        // Calculate reminder trigger (5 minutes prior to action time)
        const reminderTime = new Date(Math.max(Date.now(), parsedNextActionAt.getTime() - 5 * 60000));

        // Create Reminder for Follow-up
        await tx.reminder.create({
          data: {
            userId: currentLead.userId,
            leadId,
            title: `Action Due: ${nextAction || 'Follow-up with customer'}`,
            message: `Scheduled follow-up for ${currentLead.title} (${currentLead.contact?.phone || currentLead.contact?.name || ''})`,
            level: 'HIGH',
            type: 'FOLLOW_UP',
            entityId: followUp.id,
            entityType: 'FOLLOW_UP',
            remindAt: reminderTime,
          },
        });
      }
    }

    // 7. Synchronize with Customer Memory (Build 05)
    if (nextAction && nextAction.trim()) {
      const existingNextAction = await tx.customerMemory.findFirst({
        where: { leadId, category: 'NEXT_ACTION', key: 'Next Action' },
      });

      if (existingNextAction) {
        await tx.customerMemory.update({
          where: { id: existingNextAction.id },
          data: {
            value: nextAction.trim(),
            verificationState: 'CONFIRMED',
            sourceType: 'CALL',
            sourceActivityId: activity.id,
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.customerMemory.create({
          data: {
            leadId,
            category: 'NEXT_ACTION',
            key: 'Next Action',
            value: nextAction.trim(),
            verificationState: 'CONFIRMED',
            sourceType: 'CALL',
            sourceActivityId: activity.id,
          },
        });
      }
    }

    if (input.memoryKey && input.memoryValue) {
      await tx.customerMemory.create({
        data: {
          leadId,
          category: (input.memoryCategory as any) || 'REQUIREMENT',
          key: input.memoryKey.trim(),
          value: input.memoryValue.trim(),
          verificationState: 'CONFIRMED',
          sourceType: 'CALL',
          sourceActivityId: activity.id,
        },
      });
    }

    // 8. Update Lead
    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        status: updatedStatus,
        temperature: updatedTemperature,
        updatedAt: new Date(),
        ...(parsedNextActionAt && { nextActionDate: parsedNextActionAt }),
      },
      include: { contact: true, business: true },
    });

    return {
      call,
      lead: updatedLead,
      followUp,
      activity,
    };
  });
}
