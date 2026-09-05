import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface TimelineEventItem {
  id: string;
  eventType:
    | 'LEAD_CREATED'
    | 'CALL'
    | 'DEMO'
    | 'WHATSAPP'
    | 'NOTE'
    | 'FOLLOW_UP'
    | 'TASK'
    | 'ACTIVITY'
    | 'SALE'
    | 'QUOTATION';
  timestamp: string;
  title: string;
  description: string;
  source: string;
  statusBadge?: string;
  metadata?: Record<string, any>;
  targetId?: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get('type')?.trim().toUpperCase();

    // Fetch lead with all associated interaction models
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        contact: true,
        business: true,
        calls: {
          orderBy: { occurredAt: 'desc' },
          include: { recording: true },
        },
        demos: {
          orderBy: { scheduledAt: 'desc' },
          include: { demoPlan: true },
        },
        whatsAppMsgs: {
          orderBy: { createdAt: 'desc' },
        },
        notesList: {
          orderBy: { createdAt: 'desc' },
        },
        followUps: {
          orderBy: { scheduledAt: 'desc' },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { occurredAt: 'desc' },
        },
        sales: {
          orderBy: { closedAt: 'desc' },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found.' },
        { status: 404 }
      );
    }

    const events: TimelineEventItem[] = [];

    // 1. Lead Created
    events.push({
      id: `lead-created-${lead.id}`,
      eventType: 'LEAD_CREATED',
      timestamp: lead.createdAt.toISOString(),
      title: 'Lead Created',
      description: `Prospect "${lead.title}" created via ${lead.source || 'Direct Outreach'}.`,
      source: 'LEAD',
      statusBadge: lead.status,
      metadata: {
        temperature: lead.temperature,
        source: lead.source,
        contactName: lead.contact?.name,
        businessName: lead.business?.name,
      },
      targetId: lead.id,
    });

    // 2. Real Calls
    for (const call of lead.calls) {
      const outcomeFormatted = call.outcome.replace(/_/g, ' ');
      const durationStr = call.durationSeconds
        ? `${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s`
        : null;

      let callDesc = `Call outcome: ${outcomeFormatted}`;
      if (durationStr) callDesc += ` • Duration: ${durationStr}`;
      if (call.notes) callDesc += `\n${call.notes}`;
      if (call.nextAction) callDesc += `\nNext Action: ${call.nextAction}`;

      events.push({
        id: `call-${call.id}`,
        eventType: 'CALL',
        timestamp: (call.occurredAt || call.createdAt).toISOString(),
        title: `Call: ${call.callType.replace(/_/g, ' ')} (${outcomeFormatted})`,
        description: callDesc,
        source: 'CALL',
        statusBadge: call.outcome,
        metadata: {
          callId: call.id,
          outcome: call.outcome,
          callType: call.callType,
          durationSeconds: call.durationSeconds,
          notes: call.notes,
          nextAction: call.nextAction,
          nextActionAt: call.nextActionAt?.toISOString() || null,
          hasRecording: !!call.recording,
        },
        targetId: call.id,
      });
    }

    // 3. Demos
    for (const demo of lead.demos) {
      let demoDesc = `Demo slot for ${new Date(demo.scheduledAt).toLocaleString()}`;
      if (demo.durationMinutes) demoDesc += ` (${demo.durationMinutes} mins)`;
      if (demo.notes) demoDesc += `\nNotes: ${demo.notes}`;
      if (demo.meetingUrl) demoDesc += `\nMeeting Link: ${demo.meetingUrl}`;

      events.push({
        id: `demo-${demo.id}`,
        eventType: 'DEMO',
        timestamp: (demo.occurredAt || demo.scheduledAt || demo.createdAt).toISOString(),
        title: `Product Demo (${demo.status})`,
        description: demoDesc,
        source: 'DEMO',
        statusBadge: demo.status,
        metadata: {
          demoId: demo.id,
          scheduledAt: demo.scheduledAt.toISOString(),
          status: demo.status,
          notes: demo.notes,
          meetingUrl: demo.meetingUrl,
          objectives: demo.demoPlan?.objectives,
        },
        targetId: demo.id,
      });
    }

    // 4. WhatsApp Messages
    for (const wa of lead.whatsAppMsgs) {
      events.push({
        id: `whatsapp-${wa.id}`,
        eventType: 'WHATSAPP',
        timestamp: (wa.sentAt || wa.createdAt).toISOString(),
        title: `WhatsApp ${wa.direction === 'OUTBOUND' ? 'Sent' : 'Received'} (${wa.phone})`,
        description: wa.content,
        source: 'WHATSAPP',
        statusBadge: wa.status,
        metadata: {
          direction: wa.direction,
          status: wa.status,
          messageType: wa.messageType,
          phone: wa.phone,
        },
        targetId: wa.id,
      });
    }

    // 5. Notes
    for (const note of lead.notesList) {
      events.push({
        id: `note-${note.id}`,
        eventType: 'NOTE',
        timestamp: note.createdAt.toISOString(),
        title: note.title ? `Note: ${note.title}` : 'Sales Note Added',
        description: note.content,
        source: 'NOTE',
        statusBadge: note.category || 'GENERAL',
        metadata: {
          noteId: note.id,
          category: note.category,
        },
        targetId: note.id,
      });
    }

    // 6. Follow-ups
    for (const fu of lead.followUps) {
      events.push({
        id: `followup-${fu.id}`,
        eventType: 'FOLLOW_UP',
        timestamp: (fu.completedAt || fu.scheduledAt || fu.createdAt).toISOString(),
        title: `Follow-up ${fu.status === 'COMPLETED' ? 'Completed' : 'Scheduled'} (${fu.type})`,
        description: fu.notes
          ? `${fu.notes}\nScheduled for: ${new Date(fu.scheduledAt).toLocaleString()}`
          : `Scheduled for: ${new Date(fu.scheduledAt).toLocaleString()}`,
        source: 'FOLLOW_UP',
        statusBadge: fu.status,
        metadata: {
          followUpId: fu.id,
          status: fu.status,
          type: fu.type,
          scheduledAt: fu.scheduledAt.toISOString(),
        },
        targetId: fu.id,
      });
    }

    // 7. Tasks
    for (const task of lead.tasks) {
      events.push({
        id: `task-${task.id}`,
        eventType: 'TASK',
        timestamp: (task.completedAt || task.createdAt).toISOString(),
        title: `Task: ${task.title}`,
        description: task.description
          ? `${task.description}${task.dueDate ? ` • Due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}`
          : `Priority: ${task.priority}${task.dueDate ? ` • Due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}`,
        source: 'TASK',
        statusBadge: task.status,
        metadata: {
          taskId: task.id,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate?.toISOString() || null,
        },
        targetId: task.id,
      });
    }

    // 8. Sales
    for (const sale of lead.sales) {
      events.push({
        id: `sale-${sale.id}`,
        eventType: 'SALE',
        timestamp: (sale.closedAt || sale.createdAt).toISOString(),
        title: `Sale Closed: ₹${Number(sale.amount).toLocaleString()}`,
        description: `Closed revenue deal for ${lead.business?.name || lead.title} (${sale.currency} ${Number(sale.amount).toLocaleString()}).`,
        source: 'SALE',
        statusBadge: sale.status,
        metadata: {
          saleId: sale.id,
          amount: Number(sale.amount),
          currency: sale.currency,
          status: sale.status,
        },
        targetId: sale.id,
      });
    }

    // 9. Quotations
    for (const quot of lead.quotations) {
      events.push({
        id: `quotation-${quot.id}`,
        eventType: 'QUOTATION',
        timestamp: quot.createdAt.toISOString(),
        title: `Quotation: ${quot.quotationNumber || 'Draft'} (${quot.status})`,
        description: `Total Amount: ₹${Number(quot.totalAmount).toLocaleString()} (${quot.currency || 'INR'})`,
        source: 'QUOTATION',
        statusBadge: quot.status,
        metadata: {
          quotationId: quot.id,
          number: quot.quotationNumber,
          totalAmount: Number(quot.totalAmount),
          status: quot.status,
        },
        targetId: quot.id,
      });
    }

    // 10. Dedicated Activities that aren't already captured (like stage changes, custom audit logs)
    for (const act of lead.activities) {
      // Avoid duplicate display for activities that wrap a call already in the list
      if (act.type === 'CALL_LOGGED' && act.metadata) {
        try {
          const meta = JSON.parse(act.metadata);
          if (meta.callId && lead.calls.some((c) => c.id === meta.callId)) {
            continue;
          }
        } catch {}
      }

      events.push({
        id: `activity-${act.id}`,
        eventType: 'ACTIVITY',
        timestamp: (act.occurredAt || act.createdAt).toISOString(),
        title: act.title,
        description: act.description || 'System activity logged.',
        source: 'ACTIVITY',
        statusBadge: act.type,
        metadata: {
          activityId: act.id,
          type: act.type,
        },
        targetId: act.id,
      });
    }

    // Sort newest first
    events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply optional filter
    let filteredEvents = events;
    if (filterType && filterType !== 'ALL') {
      filteredEvents = events.filter((e) => e.eventType === filterType);
    }

    const counts = {
      total: events.length,
      calls: events.filter((e) => e.eventType === 'CALL').length,
      demos: events.filter((e) => e.eventType === 'DEMO').length,
      whatsapp: events.filter((e) => e.eventType === 'WHATSAPP').length,
      notes: events.filter((e) => e.eventType === 'NOTE').length,
      followUps: events.filter((e) => e.eventType === 'FOLLOW_UP').length,
      tasks: events.filter((e) => e.eventType === 'TASK').length,
      sales: events.filter((e) => e.eventType === 'SALE').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        events: filteredEvents,
        counts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching complete timeline:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timeline.', details: error?.message },
      { status: 500 }
    );
  }
}
