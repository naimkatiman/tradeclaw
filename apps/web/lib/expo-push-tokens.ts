import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'expo-push-tokens.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExpoPushTokenRecord {
  id: string;
  token: string;
  platform?: string;
  deviceName?: string;
  pairs: string[];
  minConfidence: number;
  directions: ('BUY' | 'SELL' | 'both')[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const SEED_TOKENS: ExpoPushTokenRecord[] = [
  {
    id: 'seed-expo-1',
    token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    platform: 'ios',
    pairs: ['BTCUSD', 'ETHUSD', 'XAUUSD'],
    minConfidence: 80,
    directions: ['BUY', 'SELL'],
    enabled: true,
    createdAt: '2026-03-20T08:00:00.000Z',
    updatedAt: '2026-03-20T08:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

async function load(): Promise<ExpoPushTokenRecord[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(FILE, 'utf8');
    const data = JSON.parse(raw) as ExpoPushTokenRecord[];
    if (data.length === 0) return SEED_TOKENS;
    return data;
  } catch {
    return SEED_TOKENS;
  }
}

async function save(tokens: ExpoPushTokenRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(tokens, null, 2));
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function saveExpoPushToken(
  token: string,
  meta?: Partial<Omit<ExpoPushTokenRecord, 'id' | 'token' | 'createdAt' | 'updatedAt'>>,
): Promise<ExpoPushTokenRecord> {
  const tokens = await load();
  const existing = tokens.find((t) => t.token === token);

  if (existing) {
    existing.platform = meta?.platform ?? existing.platform;
    existing.deviceName = meta?.deviceName ?? existing.deviceName;
    existing.pairs = meta?.pairs ?? existing.pairs;
    existing.minConfidence = meta?.minConfidence ?? existing.minConfidence;
    existing.directions = meta?.directions ?? existing.directions;
    existing.enabled = meta?.enabled ?? existing.enabled;
    existing.updatedAt = new Date().toISOString();
    await save(tokens);
    return existing;
  }

  const record: ExpoPushTokenRecord = {
    id: randomUUID(),
    token,
    platform: meta?.platform,
    deviceName: meta?.deviceName,
    pairs: meta?.pairs ?? ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD'],
    minConfidence: meta?.minConfidence ?? 80,
    directions: meta?.directions ?? ['BUY', 'SELL'],
    enabled: meta?.enabled ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tokens.push(record);
  await save(tokens);
  return record;
}

export async function deleteExpoPushToken(token: string): Promise<boolean> {
  const tokens = await load();
  const idx = tokens.findIndex((t) => t.token === token);
  if (idx === -1) return false;
  tokens.splice(idx, 1);
  await save(tokens);
  return true;
}

export async function getAllExpoTokens(): Promise<ExpoPushTokenRecord[]> {
  const tokens = await load();
  return tokens.filter((t) => t.enabled);
}

export async function getExpoTokenStats(): Promise<{ total: number; enabled: number }> {
  const tokens = await load();
  return { total: tokens.length, enabled: tokens.filter((t) => t.enabled).length };
}
