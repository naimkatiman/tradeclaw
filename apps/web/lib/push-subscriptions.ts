import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'push-subscriptions.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionPrefs {
  pairs: string[];
  thresholds: Record<string, number>;
  directions: Record<string, 'BUY' | 'SELL' | 'both'>;
  masterEnabled: boolean;
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  prefs: PushSubscriptionPrefs;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_PREFS: PushSubscriptionPrefs = {
  pairs: ['BTCUSD', 'ETHUSD', 'XAUUSD'],
  thresholds: {},
  directions: {},
  masterEnabled: true,
};

const SEED_SUBSCRIPTIONS: PushSubscriptionRecord[] = [
  {
    id: 'seed-push-1',
    endpoint: 'https://fcm.googleapis.com/fcm/send/seed-alice-001',
    keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REqnSs', auth: 'tBHItJI5svbpC7htLOoLuw' },
    prefs: { pairs: ['BTCUSD', 'ETHUSD', 'XAUUSD'], thresholds: { BTCUSD: 75, ETHUSD: 70 }, directions: { BTCUSD: 'both', ETHUSD: 'BUY' }, masterEnabled: true },
    createdAt: '2026-03-20T08:00:00.000Z',
  },
  {
    id: 'seed-push-2',
    endpoint: 'https://fcm.googleapis.com/fcm/send/seed-bob-002',
    keys: { p256dh: 'BMnfk1JuR7tGNbCkOMKACPJR3KqP4hYDkZz2e_2BLqKFz3SXHGPyjAG0X8tGNLAaRjrk4J6E-lKF_3VHWZJrY3c', auth: 'aX1z9KlRbHqD3xMvN2oTwA' },
    prefs: { pairs: ['EURUSD', 'GBPUSD', 'USDJPY'], thresholds: { EURUSD: 80 }, directions: { EURUSD: 'SELL' }, masterEnabled: true },
    createdAt: '2026-03-22T14:30:00.000Z',
  },
  {
    id: 'seed-push-3',
    endpoint: 'https://fcm.googleapis.com/fcm/send/seed-carol-003',
    keys: { p256dh: 'BGkL7IYhdy0GwJnEY4QFGt6NJ1jWRs3RKgCbMYpehxDR7wyp3FQXwQ3OIh7iGV6Cn3Ls4VFuRbYcMHJ3nLsB8Js', auth: 'kR4oF2hPxQz7bWvLnM5eSA' },
    prefs: { pairs: ['XAUUSD', 'XAGUSD', 'BTCUSD'], thresholds: { XAUUSD: 65, BTCUSD: 70 }, directions: { XAUUSD: 'BUY', BTCUSD: 'both' }, masterEnabled: false },
    createdAt: '2026-03-25T10:15:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

async function load(): Promise<PushSubscriptionRecord[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(FILE, 'utf8');
    const data = JSON.parse(raw) as PushSubscriptionRecord[];
    if (data.length === 0) return SEED_SUBSCRIPTIONS;
    return data;
  } catch {
    return SEED_SUBSCRIPTIONS;
  }
}

async function save(subs: PushSubscriptionRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(subs, null, 2));
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function savePushSubscription(
  endpoint: string,
  keys: PushSubscriptionKeys,
  prefs?: Partial<PushSubscriptionPrefs>,
): Promise<PushSubscriptionRecord> {
  const subs = await load();
  const existing = subs.find((s) => s.endpoint === endpoint);

  if (existing) {
    existing.keys = keys;
    existing.prefs = { ...existing.prefs, ...prefs };
    await save(subs);
    return existing;
  }

  const record: PushSubscriptionRecord = {
    id: randomUUID(),
    endpoint,
    keys,
    prefs: { ...DEFAULT_PREFS, ...prefs },
    createdAt: new Date().toISOString(),
  };
  subs.push(record);
  await save(subs);
  return record;
}

export async function getPushSubscription(endpoint: string): Promise<PushSubscriptionRecord | null> {
  const subs = await load();
  return subs.find((s) => s.endpoint === endpoint) ?? null;
}

export async function deletePushSubscription(endpoint: string): Promise<boolean> {
  const subs = await load();
  const idx = subs.findIndex((s) => s.endpoint === endpoint);
  if (idx === -1) return false;
  subs.splice(idx, 1);
  await save(subs);
  return true;
}

export async function getAllSubscriptions(): Promise<PushSubscriptionRecord[]> {
  return load();
}

export async function updateSubscriptionPrefs(
  endpoint: string,
  prefs: Partial<PushSubscriptionPrefs>,
): Promise<PushSubscriptionRecord | null> {
  const subs = await load();
  const sub = subs.find((s) => s.endpoint === endpoint);
  if (!sub) return null;
  sub.prefs = { ...sub.prefs, ...prefs };
  await save(subs);
  return sub;
}

export async function seedSubscriptions(): Promise<PushSubscriptionRecord[]> {
  await save(SEED_SUBSCRIPTIONS);
  return SEED_SUBSCRIPTIONS;
}
