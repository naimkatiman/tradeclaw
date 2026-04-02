import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'sms-subscribers.json');

export interface SmsSubscriber {
  id: string;
  phone: string;
  pairs: string[];
  minConfidence: number;
  createdAt: string;
  active: boolean;
}

export interface SmsSubscriberStats {
  count: number;
  topPairs: Array<{ pair: string; count: number }>;
}

const SEED_SUBSCRIBERS: SmsSubscriber[] = [
  {
    id: 'sms-seed-1',
    phone: '+14155550101',
    pairs: ['BTCUSD', 'ETHUSD', 'XAUUSD'],
    minConfidence: 75,
    createdAt: '2026-03-28T10:00:00.000Z',
    active: true,
  },
  {
    id: 'sms-seed-2',
    phone: '+442071234567',
    pairs: ['EURUSD', 'GBPUSD', 'USDJPY'],
    minConfidence: 80,
    createdAt: '2026-03-29T14:30:00.000Z',
    active: true,
  },
  {
    id: 'sms-seed-3',
    phone: '+61412345678',
    pairs: ['XAUUSD', 'BTCUSD'],
    minConfidence: 70,
    createdAt: '2026-03-30T08:15:00.000Z',
    active: true,
  },
];

async function load(): Promise<SmsSubscriber[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(FILE, 'utf8');
    const data = JSON.parse(raw) as SmsSubscriber[];
    if (data.length === 0) return SEED_SUBSCRIBERS;
    return data;
  } catch {
    return SEED_SUBSCRIBERS;
  }
}

async function save(subs: SmsSubscriber[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(subs, null, 2));
}

export async function getSmsSubscribers(): Promise<SmsSubscriber[]> {
  return load();
}

export async function getActiveSmsSubscribers(): Promise<SmsSubscriber[]> {
  const subs = await load();
  return subs.filter((s) => s.active);
}

export async function addSmsSubscriber(
  phone: string,
  pairs: string[],
  minConfidence = 70,
): Promise<{ ok: boolean; count: number; subscriber: SmsSubscriber }> {
  const subs = await load();
  const normalizedPhone = phone.replace(/\s+/g, '');
  const existing = subs.find((s) => s.phone === normalizedPhone);
  if (existing) {
    existing.pairs = pairs;
    existing.minConfidence = minConfidence;
    existing.active = true;
    await save(subs);
    const count = subs.filter((s) => s.active).length;
    return { ok: true, count, subscriber: existing };
  }
  const subscriber: SmsSubscriber = {
    id: randomUUID(),
    phone: normalizedPhone,
    pairs,
    minConfidence,
    createdAt: new Date().toISOString(),
    active: true,
  };
  subs.push(subscriber);
  await save(subs);
  const count = subs.filter((s) => s.active).length;
  return { ok: true, count, subscriber };
}

export async function removeSmsSubscriber(phone: string): Promise<boolean> {
  const subs = await load();
  const normalizedPhone = phone.replace(/\s+/g, '');
  const idx = subs.findIndex((s) => s.phone === normalizedPhone);
  if (idx === -1) return false;
  subs[idx].active = false;
  await save(subs);
  return true;
}

export async function getSmsSubscriberCount(): Promise<number> {
  const subs = await load();
  return subs.filter((s) => s.active).length;
}

export async function getSmsStats(): Promise<SmsSubscriberStats> {
  const subs = await load();
  const active = subs.filter((s) => s.active);
  const pairCount = new Map<string, number>();
  for (const s of active) {
    for (const p of s.pairs) {
      pairCount.set(p, (pairCount.get(p) ?? 0) + 1);
    }
  }
  const topPairs = Array.from(pairCount.entries())
    .map(([pair, count]) => ({ pair, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return { count: active.length, topPairs };
}
