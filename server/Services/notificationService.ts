import { User } from '../Schemas/mongoSchema.js';
import webpush from 'web-push';
import { getEnv } from '../lib/env.js';

const env = getEnv();

webpush.setVapidDetails(
  'mailto:armaanmohanamoli007@gmail.com',
  env.WEB_PUSH_PUBLIC_KEY,
  env.WEB_PUSH_PRIVATE_KEY,
);

interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: PushSubscriptionKeys;
}

/**
 * Send a push notification to the user's saved subscription.
 *
 * This function NEVER rejects: callers fire it with `void`, and a rejected
 * promise here used to escape as an unhandled rejection that crashed the
 * whole Node process. Delivery problems are logged and reported through the
 * returned `{ success }` flag instead.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
): Promise<{ success: boolean }> {
  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      console.warn(`Push notification skipped: user ${userId} not found`);
      return { success: false };
    }

    const subscription = user.notificationSubscription;
    if (!subscription || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      console.warn(`Push notification skipped: user ${userId} has no valid subscription`);
      return { success: false };
    }

    const payload = JSON.stringify({
      title: title,
      body: body,
      icon: '../../src/assets/Icons/ico.png',
    });

    const pushSubscription: PushSubscription = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime ?? null,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    await webpush.sendNotification(pushSubscription, payload);
    console.log('notification sent');
    return { success: true };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;

    if (statusCode === 404 || statusCode === 410) {
      // The subscription is gone (unsubscribed or expired — e.g. the user
      // cleared site data or the browser dropped it). Remove it so we stop
      // pushing to a dead endpoint; the browser re-subscribes on next visit.
      console.warn(
        `Push subscription unsubscribed or expired for user ${userId}; clearing stored subscription`,
      );
      await User.updateOne({ _id: userId }, { $set: { notificationSubscription: null } });
      return { success: false };
    }

    console.error('Push notification failed: ', error);
    return { success: false };
  }
}
