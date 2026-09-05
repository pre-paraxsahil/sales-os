import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({ success: true, demos });
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
    const { leadId, title, scheduledAt, durationMinutes, notes } = body;

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: "leadId is required." },
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

    const demoScheduledAt = scheduledAt ? new Date(scheduledAt) : new Date();
    const leadContactName = lead.contact?.name;
    const leadBizName = lead.business?.name;
    const demoTitle = title || `Product Demo with ${leadContactName || leadBizName || lead.title}`;

    // Create demo & activity in transaction
    const newDemo = await prisma.$transaction(async (tx) => {
      const created = await tx.demo.create({
        data: {
          leadId,
          contactId: lead.contactId,
          userId: lead.userId,
          scheduledAt: demoScheduledAt,
          durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 30,
          status: "SCHEDULED",
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

      // Update lead status to QUALIFIED if appropriate
      if (lead.status === "NEW" || lead.status === "CONTACTED") {
        await tx.lead.update({
          where: { id: leadId },
          data: {
            status: "QUALIFIED",
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
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, demo: newDemo }, { status: 201 });
  } catch (error: any) {
    console.error("Error scheduling demo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to schedule demo.", details: error?.message },
      { status: 500 }
    );
  }
}
