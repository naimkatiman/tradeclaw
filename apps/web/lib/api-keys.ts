import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ApiKey {
  id: string;
  key: string; // tc_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
  name: string;
  createdAt: number;
  lastUsedAt: number | null;
  requestCount: number;
  dailyLimit: number; // requests per day
  tier: 'free' | 'pro';
  active: boolean;
  allowedEndpoints: string[]; // ['*'] = all
  ipAllowlist: string[]; // empty = all IPs
}

export interface RateLimitEntry {
  count: number;
  windowStart: number; // ms epoch of window start
}

const DATA_DIR = path.join(process.cwd(), 'data');
const KEYS_FILE = path.join(DATA_DIR, 'api-keys.json');
const RATE_FILE = path.join(DATA_DIR, 'api-rate-limits.json');

const FREE_DAILY_LIMIT = 1000;

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch { /* read-only */ }
}

function generateKeyString(): string {
  const rand = crypto.randomBytes(24).toString('hex');
  return `tc_live_${rand}`;
}

function seedKeys(): ApiKey[] {
  return [
    {
      id: 'demo-key-1',
      key: 'tc_live_demo_00000000000000000000000000000001',
      name: 'Demo Key (read-only)',
      createdAt: Date.now() - 7 * 86400000,
      lastUsedAt: Date.now() - 3600000,
      requestCount: 142,
      dailyLimit: FREE_DAILY_LIMIT,
      tier: 'free',
      active: true,
      allowedEndpoints: ['/api/signals', '/api/leaderboard', '/api/prices'],
      ipAllowlist: [],
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

export function createKey(name: string): ApiKey {
  const keys = readKeys();
  const newKey: ApiKey = {
    id: crypto.randomBytes(8).toString('hex'),
    key: generateKeyString(),
    name: name.trim().slice(0, 80) || 'My API Key',
    createdAt: Date.now(),
    lastUsedAt: null,
    requestCount: 0,
    dailyLimit: FREE_DAILY_LIMIT,
    tier: 'free',
    active: true,
    allowedEndpoints: ['*'],
    ipAllowlist: [],
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
  writeKeys(keys);
  return key;
}

export function validateKey(keyStr: string): ApiKey | null {
  const keys = readKeys();
  const key = keys.find((k) => k.key === keyStr && k.active);
  if (!key) return null;
  // Update usage
  key.lastUsedAt = Date.now();
  key.requestCount++;
  writeKeys(keys);
  return key;
}

// Rate limiting
function readRateLimits(): Record<string, RateLimitEntry> {
  ensureDir();
  if (fs.existsSync(RATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(RATE_FILE, 'utf-8')) as Record<string, RateLimitEntry>;
    } catch { /* */ }
  }
  return {};
}

function writeRateLimits(data: Record<string, RateLimitEntry>) {
  ensureDir();
  try { fs.writeFileSync(RATE_FILE, JSON.stringify(data)); } catch { /* read-only */ }
}

export function checkRateLimit(keyId: string, dailyLimit: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000;
  const limits = readRateLimits();
  const entry = limits[keyId];

  if (!entry || now - entry.windowStart > windowMs) {
    // New window
    limits[keyId] = { count: 1, windowStart: now };
    writeRateLimits(limits);
    return { allowed: true, remaining: dailyLimit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= dailyLimit) {
    return { allowed: false, remaining: 0, resetAt: entry.windowStart + windowMs };
  }

  entry.count++;
  writeRateLimits(limits);
  return { allowed: true, remaining: dailyLimit - entry.count, resetAt: entry.windowStart + windowMs };
}
