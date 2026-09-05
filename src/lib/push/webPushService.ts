import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export function initVapidKeys() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:sales@brostartup.com';

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  } catch (error) {
    console.error('Failed to set VAPID details:', error);
    return false;
  }
}

export async function sendPushToSubscription(
  subscriptionId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushNotificationPayload
) {
  const isVapidReady = initVapidKeys();
  if (!isVapidReady) {
    return {
      success: false,
      reason: 'VAPID credentials not configured or invalid',
      isExpired: false,
    };
  }

  const pushSubscription = {
    endpoint,
    keys: {
      p256dh,
      auth,
    },
  };

  try {
    const response = await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );

    // Update lastUsedAt timestamp on successful push
    await prisma.pushSubscription.update({
      where: { id: subscriptionId },
      data: { lastUsedAt: new Date() },
    }).catch(() => null);

    return {
      success: true,
      statusCode: response.statusCode,
      isExpired: false,
    };
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.status;

    // HTTP 404 or 410 indicates subscription has expired or been revoked by the push service
    if (statusCode === 404 || statusCode === 410) {
      console.warn(`Push subscription ${subscriptionId} expired (${statusCode}), revoking record.`);
      await prisma.pushSubscription.update({
        where: { id: subscriptionId },
        data: { revokedAt: new Date() },
      }).catch(() => null);

      return {
        success: false,
        statusCode,
        isExpired: true,
        reason: 'Subscription expired or revoked',
      };
    }

    console.error(`Push notification delivery failed for ${subscriptionId}:`, error?.message || error);
    return {
      success: false,
      statusCode,
      isExpired: false,
      reason: error?.message || 'Delivery error',
    };
  }
}
