import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'email-subscribers.json');

export interface EmailSubscriber {
  email: string;
  pairs: string[];
  minConfidence: number;
  createdAt: string;
  active: boolean;
  token: string;
}

export interface SubscriberStats {
  count: number;
  topPairs: Array<{ pair: string; count: number }>;
}

function toToken(email: string): string {
  return Buffer.from(email.toLowerCase().trim()).toString('base64');
}

const SEED_SUBSCRIBERS: EmailSubscriber[] = [
  { email: 'alice@example.com', pairs: ['BTCUSD', 'ETHUSD', 'XAUUSD'], minConfidence: 70, createdAt: '2026-03-10T08:00:00.000Z', active: true, token: toToken('alice@example.com') },
  { email: 'bob@trader.io', pairs: ['BTCUSD', 'EURUSD', 'GBPUSD', 'USDJPY'], minConfidence: 80, createdAt: '2026-03-12T14:30:00.000Z', active: true, token: toToken('bob@trader.io') },
  { email: 'carol@signals.dev', pairs: ['XAUUSD', 'XAGUSD', 'BTCUSD'], minConfidence: 65, createdAt: '2026-03-15T10:15:00.000Z', active: true, token: toToken('carol@signals.dev') },
  { email: 'diana@forexlab.com', pairs: ['EURUSD', 'GBPUSD', 'USDJPY'], minConfidence: 75, createdAt: '2026-03-18T09:45:00.000Z', active: true, token: toToken('diana@forexlab.com') },
  { email: 'evan@cryptoalerts.net', pairs: ['BTCUSD', 'ETHUSD', 'SOLUSD'], minConfidence: 60, createdAt: '2026-03-20T16:20:00.000Z', active: true, token: toToken('evan@cryptoalerts.net') },
  { email: 'fatima@goldtrader.com', pairs: ['XAUUSD', 'XAGUSD'], minConfidence: 50, createdAt: '2026-03-22T11:00:00.000Z', active: true, token: toToken('fatima@goldtrader.com') },
  { email: 'george@swingfx.io', pairs: ['EURUSD', 'GBPUSD', 'ADAUSD', 'BNBUSD'], minConfidence: 70, createdAt: '2026-03-25T07:30:00.000Z', active: true, token: toToken('george@swingfx.io') },
  { email: 'hana@defiwatch.xyz', pairs: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD'], minConfidence: 55, createdAt: '2026-03-28T13:45:00.000Z', active: true, token: toToken('hana@defiwatch.xyz') },
];

async function load(): Promise<EmailSubscriber[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(FILE, 'utf8');
    const data = JSON.parse(raw) as EmailSubscriber[];
    if (data.length === 0) return SEED_SUBSCRIBERS;
    return data;
  } catch {
    return SEED_SUBSCRIBERS;
  }
}

async function save(subs: EmailSubscriber[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(subs, null, 2));
}

export async function getSubscribers(): Promise<EmailSubscriber[]> {
  return load();
}

export async function getActiveSubscribers(): Promise<EmailSubscriber[]> {
  const subs = await load();
  return subs.filter((s) => s.active);
}

export async function addSubscriber(
  email: string,
  pairs: string[],
  minConfidence = 70,
): Promise<{ ok: boolean; count: number; subscriber: EmailSubscriber }> {
  const subs = await load();
  const existing = subs.find((s) => s.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    existing.pairs = pairs;
    existing.minConfidence = minConfidence;
    existing.active = true;
    existing.token = toToken(email);
    await save(subs);
    const count = subs.filter((s) => s.active).length;
    return { ok: true, count, subscriber: existing };
  }
  const subscriber: EmailSubscriber = {
    email: email.toLowerCase().trim(),
    pairs,
    minConfidence,
    createdAt: new Date().toISOString(),
    active: true,
    token: toToken(email),
  };
  subs.push(subscriber);
  await save(subs);
  const count = subs.filter((s) => s.active).length;
  return { ok: true, count, subscriber };
}

export async function removeSubscriber(email: string): Promise<boolean> {
  const subs = await load();
  const idx = subs.findIndex((s) => s.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) return false;
  subs.splice(idx, 1);
  await save(subs);
  return true;
}

export async function removeSubscriberByToken(token: string): Promise<boolean> {
  const subs = await load();
  const idx = subs.findIndex((s) => s.token === token);
  if (idx === -1) return false;
  subs.splice(idx, 1);
  await save(subs);
  return true;
}

export async function getSubscriberCount(): Promise<number> {
  const subs = await load();
  return subs.filter((s) => s.active).length;
}

export async function getStats(): Promise<SubscriberStats> {
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
