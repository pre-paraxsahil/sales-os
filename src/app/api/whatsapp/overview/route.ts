import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultTemplatesSeeded } from '@/lib/whatsapp/templateService';

export async function GET() {
  try {
    await ensureDefaultTemplatesSeeded();

    const now = new Date();

    // 1. Pending WhatsApp Follow-ups
    const pendingFollowUps = await prisma.followUp.findMany({
      where: {
        type: 'WHATSAPP',
        status: 'PENDING',
      },
      include: {
        lead: {
          include: { contact: true, business: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 15,
    });

    // 2. Recent Messages across leads
    const recentMessages = await prisma.whatsAppMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        lead: {
          include: { contact: true, business: true },
        },
      },
    });

    // 3. Hot / Warm Leads needing attention (no message sent in last 2 days)
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const leadsNeedingOutreach = await prisma.lead.findMany({
      where: {
        temperature: { in: ['HOT', 'WARM'] },
        status: { notIn: ['WON', 'LOST', 'UNQUALIFIED'] },
        whatsAppMsgs: {
          none: {
            createdAt: { gte: twoDaysAgo },
          },
        },
      },
      include: {
        contact: true,
        business: true,
        calls: { orderBy: { occurredAt: 'desc' }, take: 1 },
      },
      take: 10,
    });

    // 4. Stats
    const [totalSent, totalDelivered, totalReplies, totalTemplates, totalCampaigns] = await Promise.all([
      prisma.whatsAppMessage.count({ where: { direction: 'OUTBOUND' } }),
      prisma.whatsAppMessage.count({ where: { status: 'DELIVERED' } }),
      prisma.whatsAppMessage.count({ where: { responseStatus: 'REPLIED' } }),
      prisma.whatsAppTemplate.count({ where: { isActive: true } }),
      prisma.campaign.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalSent,
          totalDelivered,
          totalReplies,
          totalTemplates,
          totalCampaigns,
        },
        pendingFollowUps: pendingFollowUps.map((f) => ({
          id: f.id,
          leadId: f.leadId,
          contactName: f.lead?.contact?.name || f.lead?.title || 'Unknown',
          businessName: f.lead?.business?.name || null,
          phone: f.lead?.contact?.phone || null,
          scheduledAt: f.scheduledAt.toISOString(),
          notes: f.notes,
          temperature: f.lead?.temperature || 'WARM',
          stage: f.lead?.status || 'CONTACTED',
        })),
        recentMessages: recentMessages.map((m) => ({
          id: m.id,
          leadId: m.leadId,
          contactName: m.lead?.contact?.name || m.lead?.title || 'Unknown',
          businessName: m.lead?.business?.name || null,
          phone: m.phone,
          direction: m.direction,
          category: m.category || 'GENERAL',
          content: m.content,
          status: m.status,
          responseStatus: m.responseStatus,
          sentAt: m.sentAt ? m.sentAt.toISOString() : m.createdAt.toISOString(),
        })),
        leadsNeedingOutreach: leadsNeedingOutreach.map((l) => ({
          id: l.id,
          contactName: l.contact?.name || l.title,
          businessName: l.business?.name || null,
          phone: l.contact?.phone || null,
          temperature: l.temperature,
          stage: l.status,
          lastCallOutcome: l.calls[0]?.outcome || null,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching WhatsApp overview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch WhatsApp overview.' },
      { status: 500 }
    );
  }
}
