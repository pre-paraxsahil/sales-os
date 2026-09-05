import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MemoryCategory, VerificationState } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ demoId: string }> }
) {
  try {
    const { demoId } = await params;
    const body = await request.json();

    const demo = await prisma.demo.findUnique({
      where: { id: demoId },
      include: { lead: true },
    });

    if (!demo || !demo.leadId || !demo.lead) {
      return NextResponse.json(
        { success: false, error: 'Demo not found or missing lead association.' },
        { status: 404 }
      );
    }

    const leadId = demo.leadId;
    const lead = demo.lead;
    const userId = demo.userId || lead.userId;

    const {
      outcome = 'INTERESTED',
      notes,
      nextAction,
      nextActionAt,
      objections,
      buyingSignals,
      memoryCandidates = [],
    } = body;

    const completedDate = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Demo record
      const updatedDemo = await tx.demo.update({
        where: { id: demoId },
        data: {
          status: 'COMPLETED',
          outcome,
          notes: notes ? `${demo.notes ? `${demo.notes}\n\n[Post-Demo]: ` : ''}${notes}` : demo.notes,
          nextAction: nextAction?.trim() || null,
          nextActionAt: nextActionAt ? new Date(nextActionAt) : null,
          completedAt: completedDate,
          occurredAt: demo.occurredAt || completedDate,
        },
      });

      // 2. Determine lead status and temperature
      let newLeadStatus = lead.status;
      let newTemperature = lead.temperature;

      if (outcome === 'WON') {
        newLeadStatus = 'WON';
        newTemperature = 'HOT';
      } else if (outcome === 'LOST' || outcome === 'NOT_INTERESTED') {
        newLeadStatus = 'LOST';
        newTemperature = 'COLD';
      } else if (outcome === 'PRICING_DISCUSSION') {
        newLeadStatus = 'PROPOSAL_SENT';
        newTemperature = 'HOT';
      } else if (outcome === 'INTERESTED') {
        newLeadStatus = 'QUALIFIED';
        newTemperature = 'HOT';
      }

      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: newLeadStatus,
          temperature: newTemperature,
          ...(nextActionAt && { nextActionDate: new Date(nextActionAt) }),
        },
      });

      // 3. Create Activity record
      const activity = await tx.activity.create({
        data: {
          userId,
          leadId,
          type: 'DEMO_COMPLETED',
          title: `Demo Completed — Outcome: ${outcome.replace(/_/g, ' ')}`,
          description: notes || `Product demonstration completed with outcome ${outcome}.`,
          metadata: JSON.stringify({
            demoId,
            outcome,
            nextAction,
            nextActionAt,
            objections,
            buyingSignals,
          }),
          occurredAt: completedDate,
        },
      });

      // 4. Create FollowUp if next action date specified
      let createdFollowUp = null;
      if (nextAction && nextActionAt) {
        createdFollowUp = await tx.followUp.create({
          data: {
            userId,
            leadId,
            type: 'CALL',
            status: 'PENDING',
            scheduledAt: new Date(nextActionAt),
            notes: `Post-Demo Next Step: ${nextAction}`,
          },
        });
      }

      // 5. Apply Customer Memory Candidates
      const appliedMemories = [];
      if (Array.isArray(memoryCandidates) && memoryCandidates.length > 0) {
        for (const item of memoryCandidates) {
          const cat = (item.category || 'GENERAL_CONTEXT') as MemoryCategory;
          const key = String(item.key || 'Fact').trim();
          const value = String(item.value || '').trim();
          const state = (item.verificationState || 'CONFIRMED') as VerificationState;
          const confidence = typeof item.confidence === 'number' ? item.confidence : 0.9;

          if (!value) continue;

          if (item.overwriteMemoryId) {
            const updated = await tx.customerMemory.update({
              where: { id: item.overwriteMemoryId },
              data: {
                value,
                verificationState: state,
                sourceType: 'DEMO',
                sourceActivityId: demoId,
                confidence,
              },
            });
            appliedMemories.push(updated);
          } else {
            const created = await tx.customerMemory.create({
              data: {
                leadId,
                category: cat,
                key,
                value,
                verificationState: state,
                sourceType: 'DEMO',
                sourceActivityId: demoId,
                confidence,
              },
            });
            appliedMemories.push(created);
          }
        }
      }

      return {
        demo: updatedDemo,
        activity,
        followUp: createdFollowUp,
        memoriesCount: appliedMemories.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Demo completed and sales workflow synchronized successfully.',
    });
  } catch (error: any) {
    console.error('Error completing demo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete demo.', details: error?.message },
      { status: 500 }
    );
  }
}
