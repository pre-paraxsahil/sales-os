import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OpportunityStage, ActivityType } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/sales - List sales with lead & opportunity metadata
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');

    const where: any = {};
    if (leadId) {
      where.leadId = leadId;
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            title: true,
            status: true,
            contact: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        closedAt: 'desc',
      },
    });

    const totalRevenue = sales.reduce((acc, sale) => acc + Number(sale.amount), 0);

    return NextResponse.json({
      success: true,
      data: sales,
      summary: {
        totalSalesCount: sales.length,
        totalRevenue,
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}

// POST /api/sales - Record a new sale
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, amount, currency = 'INR', notes, closedAt } = body;

    if (!amount || isNaN(Number(amount))) {
      return NextResponse.json(
        { success: false, error: 'Amount is required and must be a valid number' },
        { status: 400 }
      );
    }

    const saleAmount = Number(amount);
    const saleDate = closedAt ? new Date(closedAt) : new Date();

    let leadTitle = 'Direct Sale';
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, title: true },
      });
      if (lead) {
        leadTitle = lead.title;
        // Update lead status to WON
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            status: 'WON',
            updatedAt: new Date(),
          },
        });

        // Update opportunities to CLOSED_WON if present
        await prisma.opportunity.updateMany({
          where: { leadId },
          data: { stage: OpportunityStage.CLOSED_WON },
        });
      }
    }

    const sale = await prisma.sale.create({
      data: {
        leadId: leadId || null,
        amount: saleAmount,
        currency,
        status: 'COMPLETED',
        closedAt: saleDate,
      },
      include: {
        lead: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Record activity
    await prisma.activity.create({
      data: {
        leadId: leadId || null,
        type: ActivityType.SALE_RECORDED,
        title: `Sale Recorded: ₹${saleAmount.toLocaleString('en-IN')}`,
        description: notes || `Recorded sale for ${leadTitle}`,
        metadata: JSON.stringify({ saleId: sale.id, amount: saleAmount, currency }),
        occurredAt: saleDate,
      },
    });

    return NextResponse.json({
      success: true,
      data: sale,
      message: 'Sale recorded successfully',
    });
  } catch (error: any) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record sale' },
      { status: 500 }
    );
  }
}
