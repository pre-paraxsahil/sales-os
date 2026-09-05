import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const SubscribeSchema = z.object({
  endpoint: z.string().url('Valid subscription endpoint URL required'),
  p256dh: z.string().min(10, 'p256dh key required'),
  auth: z.string().min(5, 'auth secret required'),
  userAgent: z.string().optional(),
});

const UnsubscribeSchema = z.object({
  endpoint: z.string().url('Valid subscription endpoint URL required'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = SubscribeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { endpoint, p256dh, auth, userAgent } = validation.data;

    // Find default owner user if present
    const user = await prisma.user.findFirst({
      where: { role: 'OWNER' },
    });

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh,
        auth,
        userAgent: userAgent || null,
        revokedAt: null,
        updatedAt: new Date(),
      },
      create: {
        userId: user?.id || null,
        endpoint,
        p256dh,
        auth,
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const validation = UnsubscribeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { endpoint } = validation.data;

    await prisma.pushSubscription.updateMany({
      where: { endpoint },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking push subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
