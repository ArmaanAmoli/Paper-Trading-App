import { User } from '../Schemas/mongoSchema.js';
import webpush from 'web-push';
import { getEnv } from '../lib/env.js';

const env = getEnv();

webpush.setVapidDetails(
  'mailto:armaanmohanamoli007@gmail.com',
  env.WEB_PUSH_PUBLIC_KEY,
  env.WEB_PUSH_PRIVATE_KEY,
);

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string
): Promise<{ success: boolean }> {
  console.log('push notification called');
  const user = await User.findById(userId).lean();
  if (!user) throw new Error("Can't find user");
  const subscription = user.notificationSubscription;
  if (!subscription) {
    throw new Error('User has no notification subscription');
  }
  // Ensure keys are present
  if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    throw new Error('Invalid subscription keys');
  }
  const payload = JSON.stringify({
    title: title,
    body: body,
    icon: '../../src/assets/Icons/ico.png',
  });
  try {
    await webpush.sendNotification(subscription as any, payload);
    console.log('notification sent');
    return { success: true };
  } catch (error) {
    console.error('Push notification failed: ', error);
    throw error;
  }
}
