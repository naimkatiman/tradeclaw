import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type ApiKeyTier = 'free' | 'pro' | 'elite';

export interface ApiKey {
  id: string;
  key: string; // tc_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (32 hex chars)
  name: string;
  email: string;
  description: string;
  scopes: ('signals' | 'leaderboard' | 'screener')[];
  createdAt: number;
  lastUsedAt: number | null;
  requestCount: number;
  rateLimit: number; // requests per hour; 0 = unlimited
  status: 'active' | 'revoked';
  // kept for backward-compat with existing [id]/route.ts toggle handler
  active: boolean;
  tier: ApiKeyTier;
}

export interface RateLimitEntry {
  count: number;
  windowStart: number; // ms epoch of window start
}

export interface UsageStats {
  requestsThisHour: number;
  requestsToday: number;
  rateLimit: number;
  resetAt: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const KEYS_FILE = path.join(DATA_DIR, 'api-keys.json');
const USAGE_FILE = path.join(DATA_DIR, 'api-key-usage.json');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Tier-aligned rate limits per ROADMAP 3.6
// Elite gets 0 (unlimited) — checkRateLimit skips enforcement when limit <= 0.
export const TIER_RATE_LIMITS: Record<ApiKeyTier, number> = {
  free: 10,
  pro: 100,
  elite: 0,
};

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch { /* read-only env */ }
}

function generateKeyString(): string {
  // 16 bytes = 32 hex chars
  const rand = crypto.randomBytes(16).toString('hex');
  return `tc_live_${rand}`;
}

function seedKeys(): ApiKey[] {
  const now = Date.now();
  return [
    {
      id: 'demo-key-1',
      key: generateKeyString(),
      name: 'Demo Key — Signals only',
      email: 'demo@tradeclaw.win',
      description: 'Read-only access to trading signals endpoint.',
      scopes: ['signals'],
      createdAt: now - 14 * DAY_MS,
      lastUsedAt: now - 2 * DAY_MS,
      requestCount: 340,
      rateLimit: TIER_RATE_LIMITS['free'],
      status: 'revoked',
      active: false,
      tier: 'free',
    },
    {
      id: 'demo-key-2',
      key: generateKeyString(),
      name: 'Demo Key — Signals + Leaderboard',
      email: 'demo@tradeclaw.win',
      description: 'Signals and leaderboard access for a bot.',
      scopes: ['signals', 'leaderboard'],
      createdAt: now - 7 * DAY_MS,
      lastUsedAt: now - DAY_MS,
      requestCount: 892,
      rateLimit: TIER_RATE_LIMITS['free'],
      status: 'revoked',
      active: false,
      tier: 'free',
    },
    {
      id: 'demo-key-3',
      key: generateKeyString(),
      name: 'Demo Key — Full access',
      email: 'demo@tradeclaw.win',
      description: 'Full scope access: signals, leaderboard, screener.',
      scopes: ['signals', 'leaderboard', 'screener'],
      createdAt: now - 3 * DAY_MS,
      lastUsedAt: now - 3600000,
      requestCount: 1247,
      rateLimit: TIER_RATE_LIMITS['free'],
      status: 'revoked',
      active: false,
      tier: 'free',
    },
  ];
}

export function readKeys(): ApiKey[] {
  ensureDir();
  if (fs.existsSync(KEYS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8')) as ApiKey[];
    } catch { /* corrupt */ }
  }
  const seed = seedKeys();
  try { fs.writeFileSync(KEYS_FILE, JSON.stringify(seed, null, 2)); } catch { /* read-only */ }
  return seed;
}

function writeKeys(keys: ApiKey[]) {
  ensureDir();
  try { fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2)); } catch { /* read-only */ }
}

export function createKey(opts: {
  name: string;
  email: string;
  description?: string;
  scopes?: ('signals' | 'leaderboard' | 'screener')[];
  tier?: ApiKeyTier;
}): ApiKey {
  const keys = readKeys();
  const newKey: ApiKey = {
    id: crypto.randomBytes(8).toString('hex'),
    key: generateKeyString(),
    name: opts.name.trim().slice(0, 80) || 'My API Key',
    email: opts.email.trim().toLowerCase(),
    description: (opts.description ?? '').trim().slice(0, 200),
    scopes: opts.scopes ?? ['signals', 'leaderboard', 'screener'],
    createdAt: Date.now(),
    lastUsedAt: null,
    requestCount: 0,
    rateLimit: TIER_RATE_LIMITS[opts.tier ?? 'free'],
    status: 'active',
    active: true,
    tier: opts.tier ?? 'free',
  };
  keys.push(newKey);
  writeKeys(keys);
  return newKey;
}

export function deleteKey(id: string): boolean {
  const keys = readKeys();
  const idx = keys.findIndex((k) => k.id === id);
  if (idx === -1) return false;
  keys.splice(idx, 1);
  writeKeys(keys);
  return true;
}

export function toggleKey(id: string): ApiKey | null {
  const keys = readKeys();
  const key = keys.find((k) => k.id === id);
  if (!key) return null;
  key.active = !key.active;
  key.status = key.active ? 'active' : 'revoked';
  writeKeys(keys);
  return key;
}

export function revokeKey(id: string): ApiKey | null {
  const keys = readKeys();
  const key = keys.find((k) => k.id === id);
  if (!key) return null;
  key.status = 'revoked';
  key.active = false;
  writeKeys(keys);
  return key;
}

export function getKeyByString(keyStr: string): ApiKey | null {
  const keys = readKeys();
  return keys.find((k) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(k.key), Buffer.from(keyStr));
    } catch {
      return false;
    }
  }) ?? null;
}

export function listKeysByEmail(email: string): ApiKey[] {
  const keys = readKeys();
  return keys.filter((k) => k.email === email.trim().toLowerCase());
}

export function validateKey(keyStr: string): ApiKey | null {
  const keys = readKeys();
  const key = keys.find((k) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(k.key), Buffer.from(keyStr)) && k.status === 'active';
    } catch {
      return false;
    }
  });
  if (!key) return null;
  // Update usage
  key.lastUsedAt = Date.now();
  key.requestCount++;
  writeKeys(keys);
  return key;
}

// ─── Rate Limiting (hourly) ───────────────────────────────────────────────────

function readUsage(): Record<string, RateLimitEntry> {
  ensureDir();
  if (fs.existsSync(USAGE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8')) as Record<string, RateLimitEntry>;
    } catch { /* */ }
  }
  return {};
}

function writeUsage(data: Record<string, RateLimitEntry>) {
  ensureDir();
  try { fs.writeFileSync(USAGE_FILE, JSON.stringify(data)); } catch { /* read-only */ }
}

export function checkRateLimit(keyId: string, hourlyLimit: number): { allowed: boolean; remaining: number; resetAt: number } {
  // Elite / unlimited tier: skip enforcement entirely
  if (hourlyLimit <= 0) {
    return { allowed: true, remaining: -1, resetAt: Date.now() + HOUR_MS };
  }

  const now = Date.now();
  const usage = readUsage();
  const entry = usage[keyId];

  if (!entry || now - entry.windowStart > HOUR_MS) {
    // New hourly window
    usage[keyId] = { count: 1, windowStart: now };
    writeUsage(usage);
    return { allowed: true, remaining: hourlyLimit - 1, resetAt: now + HOUR_MS };
  }

  if (entry.count >= hourlyLimit) {
    return { allowed: false, remaining: 0, resetAt: entry.windowStart + HOUR_MS };
  }

  entry.count++;
  writeUsage(usage);
  return { allowed: true, remaining: hourlyLimit - entry.count, resetAt: entry.windowStart + HOUR_MS };
}

export function getUsageStats(keyId: string, hourlyLimit: number): UsageStats {
  const now = Date.now();
  const usage = readUsage();
  const hourEntry = usage[keyId];

  const requestsThisHour = hourEntry && now - hourEntry.windowStart <= HOUR_MS
    ? hourEntry.count
    : 0;

  // Approximate today's requests from the key's total (no per-day tracking; use requestCount as total)
  const keys = readKeys();
  const key = keys.find((k) => k.id === keyId);
  const requestsToday = key
    ? hourlyLimit <= 0
      ? key.requestCount
      : Math.min(key.requestCount, hourlyLimit * 24)
    : 0;

  const resetAt = hourEntry ? hourEntry.windowStart + HOUR_MS : now + HOUR_MS;

  return { requestsThisHour, requestsToday, rateLimit: hourlyLimit, resetAt };
}
