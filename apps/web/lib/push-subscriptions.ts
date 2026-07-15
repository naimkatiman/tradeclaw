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

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

async function load(): Promise<PushSubscriptionRecord[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(FILE, 'utf8');
    const data = JSON.parse(raw) as PushSubscriptionRecord[];
    return data;
  } catch {
    return [];
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
