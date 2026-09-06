import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToSubscription } from '@/lib/push/webPushService';

export async function GET(request: Request) {
  return handleCronJob(request);
}

export async function POST(request: Request) {
  return handleCronJob(request);
}

async function handleCronJob(request: Request) {
  // Authorization Protection
  const cronSecret = process.env.CRON_SECRET || 'salesos_cron_secret_key_2026';
  const authHeader = request.headers.get('authorization');
  const querySecret = new URL(request.url).searchParams.get('secret');

  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    querySecret === cronSecret;

  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized. Secret key missing or invalid.' },
      { status: 401 }
    );
  }

  const now = new Date();
  let processedRemindersCount = 0;
  let notificationsSentCount = 0;

  try {
    // 1. Fetch active push subscriptions (not revoked)
    const activeSubscriptions = await prisma.pushSubscription.findMany({
      where: { revokedAt: null },
    });

    // 2. Fetch due Reminders that have not been sent yet
    const dueReminders = await prisma.reminder.findMany({
      where: {
        remindAt: { lte: now },
        isSent: false,
      },
      include: {
        lead: {
          select: { id: true, title: true },
        },
      },
      take: 50,
    });

    for (const reminder of dueReminders) {
      processedRemindersCount++;

      // Construct notification title and body
      const title = `Sales OS: ${reminder.title}`;
      let body = reminder.message || 'Scheduled sales task due now.';
      if (reminder.lead?.title) {
        body = `${body} (${reminder.lead.title})`;
      }

      const clickUrl = reminder.clickUrl || (reminder.leadId ? `/leads/${reminder.leadId}` : '/today');

      // Dispatch Web Push to all active subscriptions if present
      if (activeSubscriptions.length > 0) {
        for (const sub of activeSubscriptions) {
          const pushResult = await sendPushToSubscription(
            sub.id,
            sub.endpoint,
            sub.p256dh,
            sub.auth,
            {
              title,
              body,
              url: clickUrl,
              tag: `reminder-${reminder.id}`,
            }
          );
          if (pushResult.success) {
            notificationsSentCount++;
          }
        }
      }

      // Mark reminder as sent (Idempotency guarantee)
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          isSent: true,
          status: 'SENT',
          sentAt: now,
        },
      });

      // Create in-app Notification record (Fallback & multi-surface alert)
      await prisma.notification.create({
        data: {
          userId: reminder.userId,
          title,
          body,
          link: clickUrl,
          isRead: false,
        },
      });
    }

    // Mark pending reminders older than 15 minutes without completion as MISSED
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    await prisma.reminder.updateMany({
      where: {
        completedAt: null,
        status: { in: ['PENDING', 'SENT'] },
        remindAt: { lt: fifteenMinutesAgo },
      },
      data: {
        status: 'MISSED',
      },
    }).catch(() => null);

    // 3. Auto-generate reminders for overdue FollowUps if no reminder exists
    const overdueFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now },
      },
      include: {
        lead: { select: { id: true, title: true } },
      },
      take: 20,
    });

    for (const followUp of overdueFollowUps) {
      // Check if a reminder was already created for this followUp
      const existingReminder = await prisma.reminder.findFirst({
        where: {
          entityId: followUp.id,
          entityType: 'FOLLOW_UP',
        },
      });

      if (!existingReminder) {
        const title = `Follow-Up Overdue`;
        const body = `Follow up with ${followUp.lead?.title || 'Lead'} is due now.`;
        const clickUrl = followUp.leadId ? `/leads/${followUp.leadId}` : '/schedule';

        const newReminder = await prisma.reminder.create({
          data: {
            userId: followUp.userId,
            leadId: followUp.leadId,
            title,
            message: body,
            remindAt: now,
            entityId: followUp.id,
            entityType: 'FOLLOW_UP',
            clickUrl,
            isSent: false,
          },
        });

        // Dispatch push for new overdue follow-up reminder
        for (const sub of activeSubscriptions) {
          const pushResult = await sendPushToSubscription(
            sub.id,
            sub.endpoint,
            sub.p256dh,
            sub.auth,
            {
              title: `Sales OS: ${title}`,
              body,
              url: clickUrl,
              tag: `followup-${followUp.id}`,
            }
          );
          if (pushResult.success) {
            notificationsSentCount++;
          }
        }

        await prisma.reminder.update({
          where: { id: newReminder.id },
          data: { isSent: true, sentAt: now },
        });

        processedRemindersCount++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      processedRemindersCount,
      notificationsSentCount,
      activeSubscriptionsCount: activeSubscriptions.length,
    });
  } catch (error) {
    console.error('Error processing notification cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error processing cron job' },
      { status: 500 }
    );
  }
}
