import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      industry,
      status, // LeadStatus
      temperature, // LeadTemperature
      source,
      minDaysSinceLastContact,
    } = body;

    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (temperature && temperature !== 'ALL') {
      whereClause.temperature = temperature;
    }
    if (source && source !== 'ALL') {
      whereClause.source = source;
    }
    if (industry && industry !== 'ALL') {
      whereClause.business = {
        industry: { contains: industry, mode: 'insensitive' },
      };
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        contact: true,
        business: true,
        calls: {
          orderBy: { occurredAt: 'desc' },
          take: 1,
        },
        whatsAppMsgs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    let recentlyContactedCount = 0;
    let missingPhoneCount = 0;
    const phoneSet = new Set<string>();
    let duplicatePhoneCount = 0;

    const previewList = leads.map((lead) => {
      const phone = lead.contact?.phone?.trim() || '';
      const isMissingPhone = !phone || phone === 'Unknown';

      if (isMissingPhone) {
        missingPhoneCount++;
      } else {
        if (phoneSet.has(phone)) {
          duplicatePhoneCount++;
        } else {
          phoneSet.add(phone);
        }
      }

      // Check last contact
      let lastContactDate: Date | null = null;
      if (lead.calls[0]?.occurredAt) {
        lastContactDate = new Date(lead.calls[0].occurredAt);
      }
      if (lead.whatsAppMsgs[0]?.createdAt) {
        const waDate = new Date(lead.whatsAppMsgs[0].createdAt);
        if (!lastContactDate || waDate > lastContactDate) {
          lastContactDate = waDate;
        }
      }

      const hoursAgo = lastContactDate
        ? Math.round((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60))
        : null;

      const isRecentlyContacted = hoursAgo !== null && hoursAgo < 24;
      if (isRecentlyContacted) {
        recentlyContactedCount++;
      }

      return {
        id: lead.id,
        contactName: lead.contact?.name || lead.title,
        businessName: lead.business?.name || lead.title,
        industry: lead.business?.industry || 'Unknown',
        phone: phone || null,
        status: lead.status,
        temperature: lead.temperature,
        hoursSinceContact: hoursAgo,
        isRecentlyContacted,
        isMissingPhone,
      };
    });

    // Apply minDaysSinceLastContact filter if requested
    let finalPreview = previewList;
    if (minDaysSinceLastContact && Number(minDaysSinceLastContact) > 0) {
      const minHours = Number(minDaysSinceLastContact) * 24;
      finalPreview = previewList.filter(
        (p) => p.hoursSinceContact === null || p.hoursSinceContact >= minHours
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        totalMatched: leads.length,
        eligibleCount: finalPreview.filter((p) => !p.isMissingPhone && !p.isRecentlyContacted).length,
        safetySummary: {
          recentlyContactedCount,
          missingPhoneCount,
          duplicatePhoneCount,
          warning:
            recentlyContactedCount > 0
              ? `${recentlyContactedCount} leads were contacted within the last 24 hours. They will be flagged for review.`
              : null,
        },
        previewLeads: finalPreview.slice(0, 25),
      },
    });
  } catch (error: any) {
    console.error('Campaign audience preview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to preview campaign audience.' },
      { status: 500 }
    );
  }
}
