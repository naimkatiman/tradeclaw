import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssetCategory =
  | 'crypto'
  | 'forex'
  | 'stock'
  | 'index'
  | 'commodity'
  | 'other';

export const ASSET_CATEGORIES: AssetCategory[] = [
  'crypto',
  'forex',
  'stock',
  'index',
  'commodity',
  'other',
];

export interface NotifySubscriber {
  email: string;
  subscribedAt: string;
}

export interface AssetRequest {
  id: string;
  symbol: string;
  displayName: string;
  category: AssetCategory;
  votes: number;
  createdAt: string;
  notifySubscribers: NotifySubscriber[];
}

export interface AssetRequestsData {
  requests: AssetRequest[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const ASSET_REQUESTS_FILE = path.join(DATA_DIR, 'asset-requests.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readData(): AssetRequestsData {
  ensureDataDir();
  if (!fs.existsSync(ASSET_REQUESTS_FILE)) {
    const seed: AssetRequestsData = { requests: [] };
    fs.writeFileSync(ASSET_REQUESTS_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
  const raw = fs.readFileSync(ASSET_REQUESTS_FILE, 'utf-8');
  return JSON.parse(raw) as AssetRequestsData;
}

function writeData(data: AssetRequestsData): void {
  ensureDataDir();
  fs.writeFileSync(ASSET_REQUESTS_FILE, JSON.stringify(data, null, 2));
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function slugifyId(symbol: string): string {
  return normalizeSymbol(symbol).toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAssetRequests(): AssetRequest[] {
  const data = readData();
  return [...data.requests].sort((a, b) => b.votes - a.votes);
}

export function voteForRequest(id: string): AssetRequest | null {
  const data = readData();
  const req = data.requests.find((r) => r.id === id);
  if (!req) return null;
  req.votes += 1;
  writeData(data);
  return req;
}

export interface NotifyResult {
  request: AssetRequest;
  alreadySubscribed: boolean;
}

export function subscribeToNotify(
  id: string,
  email: string,
): NotifyResult | null {
  const normalizedEmail = email.trim().toLowerCase();
  const data = readData();
  const req = data.requests.find((r) => r.id === id);
  if (!req) return null;

  const already = req.notifySubscribers.some(
    (s) => s.email === normalizedEmail,
  );

  if (already) {
    return { request: req, alreadySubscribed: true };
  }

  req.notifySubscribers.push({
    email: normalizedEmail,
    subscribedAt: new Date().toISOString(),
  });
  // Implicit +1 vote for new subscribers only (no double-count).
  req.votes += 1;
  writeData(data);
  return { request: req, alreadySubscribed: false };
}

export interface ProposeInput {
  symbol: string;
  displayName: string;
  category: AssetCategory;
}

export interface ProposeResult {
  request: AssetRequest;
  isNew: boolean;
}

export function proposeRequest(input: ProposeInput): ProposeResult {
  const data = readData();
  const normalizedSymbol = normalizeSymbol(input.symbol);
  const id = slugifyId(input.symbol);

  const existing = data.requests.find(
    (r) => r.id === id || r.symbol === normalizedSymbol,
  );
  if (existing) {
    return { request: existing, isNew: false };
  }

  const request: AssetRequest = {
    id,
    symbol: normalizedSymbol,
    displayName: input.displayName.trim().slice(0, 80),
    category: input.category,
    votes: 1,
    createdAt: new Date().toISOString(),
    notifySubscribers: [],
  };
  data.requests.push(request);
  writeData(data);
  return { request, isNew: true };
}

// ---------------------------------------------------------------------------
// Per-IP throttles (in-memory)
// ---------------------------------------------------------------------------

interface Throttle {
  windowMs: number;
  max: number;
  store: Map<string, { count: number; resetAt: number }>;
}

function createThrottle(windowMs: number, max: number): Throttle {
  return { windowMs, max, store: new Map() };
}

function hitThrottle(t: Throttle, key: string): boolean {
  const now = Date.now();
  const entry = t.store.get(key);
  if (!entry || now > entry.resetAt) {
    t.store.set(key, { count: 1, resetAt: now + t.windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > t.max;
}

// Vote: up to 30 per IP per 10 minutes (separate from global middleware cap).
const voteThrottle = createThrottle(10 * 60_000, 30);
// Notify: up to 10 per IP per 10 minutes.
const notifyThrottle = createThrottle(10 * 60_000, 10);
// Propose: 1 per IP per hour.
const proposeThrottle = createThrottle(60 * 60_000, 1);

export function isVoteRateLimited(ip: string): boolean {
  return hitThrottle(voteThrottle, ip);
}

export function isNotifyRateLimited(ip: string): boolean {
  return hitThrottle(notifyThrottle, ip);
}

export function isProposeRateLimited(ip: string): boolean {
  return hitThrottle(proposeThrottle, ip);
}
