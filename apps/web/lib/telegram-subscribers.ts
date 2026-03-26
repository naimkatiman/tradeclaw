import fs from 'fs';
import path from 'path';

export interface TelegramSubscriber {
  chatId: string;
  username?: string;
  firstName?: string;
  /** Trading pair symbols like ['XAUUSD'] or the string 'all' for everything */
  subscribedPairs: string[] | 'all';
  minConfidence: number; // 0-100
  createdAt: string; // ISO 8601
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'telegram-subscribers.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readSubscribers(): TelegramSubscriber[] {
  ensureDataDir();
  if (!fs.existsSync(SUBSCRIBERS_FILE)) return [];

  try {
    const raw = fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as TelegramSubscriber[];
  } catch {
    return [];
  }
}

function writeSubscribers(subs: TelegramSubscriber[]): void {
  ensureDataDir();
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subs, null, 2), 'utf-8');
}

export function addSubscriber(
  chatId: string,
  opts?: { username?: string; firstName?: string }
): TelegramSubscriber {
  const subs = readSubscribers();
  const existing = subs.find((s) => s.chatId === chatId);

  if (existing) {
    // Re-activate: reset to default preferences
    existing.subscribedPairs = 'all';
    existing.minConfidence = 70;
    writeSubscribers(subs);
    return existing;
  }

  const sub: TelegramSubscriber = {
    chatId,
    username: opts?.username,
    firstName: opts?.firstName,
    subscribedPairs: 'all',
    minConfidence: 70,
    createdAt: new Date().toISOString(),
  };

  subs.push(sub);
  writeSubscribers(subs);
  return sub;
}

export function removeSubscriber(chatId: string): boolean {
  const subs = readSubscribers();
  const idx = subs.findIndex((s) => s.chatId === chatId);
  if (idx === -1) return false;

  subs.splice(idx, 1);
  writeSubscribers(subs);
  return true;
}

export function getSubscriber(chatId: string): TelegramSubscriber | null {
  return readSubscribers().find((s) => s.chatId === chatId) ?? null;
}

export function updateSubscriberPairs(
  chatId: string,
  pairs: string[] | 'all'
): TelegramSubscriber | null {
  const subs = readSubscribers();
  const sub = subs.find((s) => s.chatId === chatId);
  if (!sub) return null;

  sub.subscribedPairs = pairs;
  writeSubscribers(subs);
  return sub;
}

export function updateSubscriberConfidence(
  chatId: string,
  minConfidence: number
): TelegramSubscriber | null {
  const subs = readSubscribers();
  const sub = subs.find((s) => s.chatId === chatId);
  if (!sub) return null;

  sub.minConfidence = Math.max(0, Math.min(100, minConfidence));
  writeSubscribers(subs);
  return sub;
}
