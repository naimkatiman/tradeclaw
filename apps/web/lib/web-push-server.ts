import 'server-only';

import webpush, { type PushSubscription as WebPushSubscription } from 'web-push';

import {
  deletePushSubscription,
  getAllSubscriptions,
  type PushSubscriptionRecord,
} from './push-subscriptions';

let configured = false;

function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isWebPushConfigured(): boolean {
  return configure();
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export interface SendResultSummary {
  sent: number;
  removed: number;
  failed: number;
}

function toWebPushSubscription(record: PushSubscriptionRecord): WebPushSubscription {
  return {
    endpoint: record.endpoint,
    keys: { p256dh: record.keys.p256dh, auth: record.keys.auth },
  };
}

async function sendOne(record: PushSubscriptionRecord, payload: PushPayload): Promise<{
  ok: boolean;
  removed: boolean;
}> {
  try {
    await webpush.sendNotification(toWebPushSubscription(record), JSON.stringify(payload));
    return { ok: true, removed: false };
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    // 404 / 410 = subscription is dead. Drop it so the store stays clean.
    if (status === 404 || status === 410) {
      await deletePushSubscription(record.endpoint);
      return { ok: false, removed: true };
    }
    console.warn('[web-push] send failed', { endpoint: record.endpoint, status, err });
    return { ok: false, removed: false };
  }
}

export async function sendPush(
  record: PushSubscriptionRecord,
  payload: PushPayload,
): Promise<SendResultSummary> {
  if (!configure()) return { sent: 0, removed: 0, failed: 1 };
  const r = await sendOne(record, payload);
  return {
    sent: r.ok ? 1 : 0,
    removed: r.removed ? 1 : 0,
    failed: r.ok ? 0 : r.removed ? 0 : 1,
  };
}

export async function sendPushToAll(payload: PushPayload): Promise<SendResultSummary> {
  if (!configure()) return { sent: 0, removed: 0, failed: 0 };
  const subs = await getAllSubscriptions();
  const results = await Promise.all(subs.map((s) => sendOne(s, payload)));
  return {
    sent: results.filter((r) => r.ok).length,
    removed: results.filter((r) => r.removed).length,
    failed: results.filter((r) => !r.ok && !r.removed).length,
  };
}
