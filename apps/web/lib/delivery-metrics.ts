import 'server-only';

/**
 * In-process delivery counters for alert channels and the Telegram Pro broadcast.
 *
 * Per-instance and non-durable: counters live in module memory, reset on
 * restart, and do not aggregate across multiple instances. Enough to spot
 * rate-limit blocks and delivery failures on a single self-hosted node before
 * users report missing signals. For durable history, back this with a DB log.
 *
 * recordDelivery() is called at each send site; snapshotDeliveries() is read by
 * /api/metrics and exposed as tradeclaw_webhook_delivery_total{channel,status}.
 */

export type DeliveryChannel = 'telegram' | 'discord' | 'email' | 'webhook' | 'telegram_pro_broadcast';
export type DeliveryStatus = 'success' | 'failed';

export interface DeliverySample {
  labels: { channel: string; status: string };
  value: number;
}

const counters = new Map<string, number>();

export function recordDelivery(channel: DeliveryChannel, status: DeliveryStatus): void {
  const key = `${channel}::${status}`;
  counters.set(key, (counters.get(key) ?? 0) + 1);
}

export function snapshotDeliveries(): DeliverySample[] {
  const samples: DeliverySample[] = [];
  for (const [key, value] of counters) {
    const [channel, status] = key.split('::');
    samples.push({ labels: { channel, status }, value });
  }
  return samples;
}
