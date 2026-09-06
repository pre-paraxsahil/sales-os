import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");
    const status = searchParams.get("status");

    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;

    const demos = await prisma.demo.findMany({
      where,
      include: {
        demoPlan: true,
        contact: true,
        lead: {
          include: {
            contact: true,
            business: true,
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
    });

    return NextResponse.json({ success: true, demos, data: demos });
  } catch (error: any) {
    console.error("Error fetching demos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch demos.", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, title, scheduledAt, durationMinutes = 30, notes, meetingUrl } = body;

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: "leadId is required." },
        { status: 400 }
      );
    }

    if (!scheduledAt) {
      return NextResponse.json(
        { success: false, error: "scheduledAt is required." },
        { status: 400 }
      );
    }

    const demoScheduledAt = new Date(scheduledAt);
    if (isNaN(demoScheduledAt.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid scheduledAt date format." },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true, business: true },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found." },
        { status: 404 }
      );
    }

    const duration = durationMinutes ? parseInt(String(durationMinutes), 10) : 30;
    const endTime = new Date(demoScheduledAt.getTime() + duration * 60000);
    const leadContactName = lead.contact?.name;
    const leadBizName = lead.business?.name;
    const demoTitle = title || `Product Demo: ${leadBizName || leadContactName || lead.title}`;

    // Create demo, scheduleBlock, reminder & activity in transaction
    const newDemo = await prisma.$transaction(async (tx) => {
      const created = await tx.demo.create({
        data: {
          leadId,
          contactId: lead.contactId,
          userId: lead.userId,
          scheduledAt: demoScheduledAt,
          durationMinutes: duration,
          status: "SCHEDULED",
          meetingUrl: meetingUrl?.trim() || null,
          notes: notes ? `${demoTitle}\n${notes}` : demoTitle,
        },
        include: {
          demoPlan: true,
          lead: {
            include: {
              contact: true,
              business: true,
            },
          },
        },
      });

      // ScheduleBlock for Schedule Calendar synchronization
      await tx.scheduleBlock.create({
        data: {
          userId: lead.userId,
          leadId,
          title: demoTitle,
          blockType: "DEMO",
          startTime: demoScheduledAt,
          endTime,
          isProtected: true,
          priority: "CRITICAL",
          notes: notes?.trim() || null,
        },
      });

      // Reminder for push alerts and Today notifications
      await tx.reminder.create({
        data: {
          userId: lead.userId,
          leadId,
          title: `Upcoming Demo: ${lead.title}`,
          message: notes?.trim() || `Product demo scheduled for ${demoScheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          level: "HIGH",
          type: "DEMO",
          entityId: created.id,
          entityType: "DEMO",
          remindAt: demoScheduledAt,
        },
      });

      // Update lead status to QUALIFIED if appropriate
      if (lead.status === "NEW" || lead.status === "CONTACTED") {
        await tx.lead.update({
          where: { id: leadId },
          data: {
            status: "QUALIFIED",
            nextActionDate: demoScheduledAt,
          },
        });
      } else {
        await tx.lead.update({
          where: { id: leadId },
          data: {
            nextActionDate: demoScheduledAt,
          },
        });
      }

      // Log activity
      await tx.activity.create({
        data: {
          leadId,
          userId: lead.userId,
          type: "DEMO_SCHEDULED",
          title: `Demo Scheduled: ${demoTitle}`,
          description: `Scheduled for ${demoScheduledAt.toLocaleString()}`,
          occurredAt: new Date(),
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, demo: newDemo, data: newDemo }, { status: 201 });
  } catch (error: any) {
    console.error("Error scheduling demo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to schedule demo.", details: error?.message },
      { status: 500 }
    );
  }
}
