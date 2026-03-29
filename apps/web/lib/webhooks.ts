import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebhookDelivery {
  timestamp: string;
  statusCode: number | null;
  success: boolean;
  attempt: number;
  responseTime: number; // ms
  error: string | null;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret?: string;
  pairs: string[] | 'all';
  minConfidence: number; // 0–100
  enabled: boolean;
  createdAt: string;
  lastDelivery?: string;
  deliveryCount: number;
  failCount: number; // consecutive failures
  deliveryLog: WebhookDelivery[];
}

export interface WebhookPayload {
  event: 'signal.new' | 'signal.test';
  timestamp: string;
  signal: {
    id: string;
    symbol: string;
    timeframe: string;
    direction: 'BUY' | 'SELL';
    confidence: number;
    entry: number;
    stopLoss: number;
    takeProfit: number[];
    indicators: {
      rsi: number;
      macd: string;
      ema: string;
    };
  };
}

// ---------------------------------------------------------------------------
// File storage
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const WEBHOOKS_FILE = path.join(DATA_DIR, 'webhooks.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readWebhooks(): WebhookConfig[] {
  ensureDataDir();
  if (!fs.existsSync(WEBHOOKS_FILE)) return [];
  try {
    const raw = fs.readFileSync(WEBHOOKS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Migrate old entries that lack new fields
    return (parsed as WebhookConfig[]).map((w) => ({
      ...w,
      pairs: w.pairs ?? ('all' as const),
      minConfidence: w.minConfidence ?? 0,
      deliveryCount: w.deliveryCount ?? 0,
      failCount: w.failCount ?? 0,
    }));
  } catch {
    return [];
  }
}

function writeWebhooks(webhooks: WebhookConfig[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify(webhooks, null, 2), 'utf-8');
  } catch {
    // Silently fail on read-only FS (e.g. Vercel)
  }
}

// ---------------------------------------------------------------------------
<<<<<<< HEAD
=======
// URL safety validation (SSRF prevention)
// ---------------------------------------------------------------------------

function isUnsafeUrl(url: string): boolean {
  // Reject non-https protocols
  if (!/^https:\/\//i.test(url)) return true;

  // Reject dangerous protocol prefixes that could be embedded
  if (/^(file|ftp|data):\/\//i.test(url)) return true;

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return true; // Unparseable URL is unsafe
  }

  // Reject IPv6 loopback
  if (hostname === '[::1]' || hostname === '::1') return true;

  // Reject IPv6 private (fc00::/7)
  if (/^\[?f[cd]/i.test(hostname)) return true;

  // Check for IPv4 private/internal ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 127) return true;                         // 127.0.0.0/8
    if (a === 10) return true;                          // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
    if (a === 192 && b === 168) return true;            // 192.168.0.0/16
    if (a === 169 && b === 254) return true;            // 169.254.0.0/16
  }

  // Reject localhost by name
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;

  return false;
}

// ---------------------------------------------------------------------------
>>>>>>> origin/main
// CRUD
// ---------------------------------------------------------------------------

export function addWebhook(opts: {
  url: string;
  name?: string;
  secret?: string;
  pairs?: string[] | 'all';
  minConfidence?: number;
}): WebhookConfig {
<<<<<<< HEAD
=======
  if (!opts.url || opts.url.length > 2048) throw new Error('URL must be between 1 and 2048 characters');
  if (opts.name && opts.name.length > 100) throw new Error('Name must be 100 characters or fewer');
  if (isUnsafeUrl(opts.url)) throw new Error('URL is not allowed: must be HTTPS and not target internal/private addresses');
>>>>>>> origin/main
  const webhooks = readWebhooks();
  const wh: WebhookConfig = {
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: opts.name ?? '',
    url: opts.url,
    secret: opts.secret,
    pairs: opts.pairs ?? 'all',
    minConfidence: opts.minConfidence ?? 0,
    enabled: true,
    createdAt: new Date().toISOString(),
    deliveryCount: 0,
    failCount: 0,
    deliveryLog: [],
  };
  webhooks.push(wh);
  writeWebhooks(webhooks);
  return wh;
}

export function removeWebhook(id: string): boolean {
  const webhooks = readWebhooks();
  const idx = webhooks.findIndex((w) => w.id === id);
  if (idx === -1) return false;
  webhooks.splice(idx, 1);
  writeWebhooks(webhooks);
  return true;
}

export function updateWebhook(
  id: string,
  patch: Partial<Pick<WebhookConfig, 'name' | 'url' | 'secret' | 'enabled' | 'pairs' | 'minConfidence'>>
): WebhookConfig | null {
<<<<<<< HEAD
=======
  if (patch.url !== undefined) {
    if (!patch.url || patch.url.length > 2048) throw new Error('URL must be between 1 and 2048 characters');
    if (isUnsafeUrl(patch.url)) throw new Error('URL is not allowed: must be HTTPS and not target internal/private addresses');
  }
  if (patch.name !== undefined && patch.name.length > 100) throw new Error('Name must be 100 characters or fewer');
>>>>>>> origin/main
  const webhooks = readWebhooks();
  const wh = webhooks.find((w) => w.id === id);
  if (!wh) return null;
  Object.assign(wh, patch);
  writeWebhooks(webhooks);
  return wh;
}

export function getWebhookDeliveries(id: string): WebhookDelivery[] | null {
  const wh = readWebhooks().find((w) => w.id === id);
  return wh ? wh.deliveryLog : null;
}

function appendDeliveryLog(id: string, entry: WebhookDelivery): void {
  const webhooks = readWebhooks();
  const wh = webhooks.find((w) => w.id === id);
  if (!wh) return;
  wh.deliveryLog.unshift(entry); // newest first
  if (wh.deliveryLog.length > 50) {
    wh.deliveryLog = wh.deliveryLog.slice(0, 50);
  }
  wh.deliveryCount = (wh.deliveryCount ?? 0) + 1;
  wh.lastDelivery = entry.timestamp;
  if (entry.success) {
    wh.failCount = 0;
  } else {
    wh.failCount = (wh.failCount ?? 0) + 1;
  }
  writeWebhooks(webhooks);
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per-process — 5s per webhook)
// ---------------------------------------------------------------------------

const lastDeliveredAt = new Map<string, number>();
const RATE_LIMIT_MS = 5000;

function isRateLimited(id: string): boolean {
  const last = lastDeliveredAt.get(id);
  return last !== undefined && Date.now() - last < RATE_LIMIT_MS;
}

function markDelivered(id: string): void {
  lastDeliveredAt.set(id, Date.now());
}

// ---------------------------------------------------------------------------
// Delivery helpers
// ---------------------------------------------------------------------------

function buildHmacSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  return `sha256=${hmac.digest('hex')}`;
}

function isDiscordWebhook(url: string): boolean {
  return url.includes('discord.com/api/webhooks');
}

function isSlackWebhook(url: string): boolean {
  return url.includes('hooks.slack.com');
}

function buildDiscordPayload(payload: WebhookPayload): object {
  const { signal } = payload;
  const isBuy = signal.direction === 'BUY';
  const color = isBuy ? 0x10b981 : 0xef4444;

  return {
    embeds: [
      {
        title: `${isBuy ? '▲' : '▼'} ${signal.symbol} ${signal.direction} — ${signal.confidence}% confidence`,
        color,
        fields: [
          { name: 'Entry', value: String(signal.entry), inline: true },
          { name: 'Stop Loss', value: String(signal.stopLoss), inline: true },
          { name: 'Take Profit', value: signal.takeProfit.join(' / '), inline: true },
          { name: 'Timeframe', value: signal.timeframe, inline: true },
          { name: 'RSI', value: String(signal.indicators.rsi), inline: true },
          { name: 'MACD', value: signal.indicators.macd, inline: true },
          { name: 'EMA', value: signal.indicators.ema, inline: true },
        ],
        footer: { text: 'TradeClaw Signal Alert' },
        timestamp: payload.timestamp,
      },
    ],
  };
}

function buildSlackPayload(payload: WebhookPayload): object {
  const { signal } = payload;
  const isBuy = signal.direction === 'BUY';

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${isBuy ? '▲' : '▼'} ${signal.symbol} ${signal.direction} (${signal.confidence}%)`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Entry:* ${signal.entry}` },
          { type: 'mrkdwn', text: `*Stop Loss:* ${signal.stopLoss}` },
          { type: 'mrkdwn', text: `*Take Profit:* ${signal.takeProfit.join(' / ')}` },
          { type: 'mrkdwn', text: `*Timeframe:* ${signal.timeframe}` },
          { type: 'mrkdwn', text: `*RSI:* ${signal.indicators.rsi}` },
          { type: 'mrkdwn', text: `*MACD:* ${signal.indicators.macd}` },
        ],
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: 'TradeClaw Signal Alert' }],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Test payload
// ---------------------------------------------------------------------------

export const TEST_PAYLOAD: WebhookPayload = {
  event: 'signal.test',
  timestamp: new Date().toISOString(),
  signal: {
    id: 'XAUUSD-H1-BUY-1711500000',
    symbol: 'XAUUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 78,
    entry: 2180.5,
    stopLoss: 2175.0,
    takeProfit: [2190.0, 2195.0],
    indicators: { rsi: 32, macd: 'bullish', ema: 'golden_cross' },
  },
};

// ---------------------------------------------------------------------------
// Core delivery
// ---------------------------------------------------------------------------

export async function deliverWebhook(
  wh: WebhookConfig,
  payload: WebhookPayload,
  respectRateLimit = false
): Promise<{ success: boolean; statusCode: number | null; error: string | null }> {
  if (respectRateLimit && isRateLimited(wh.id)) {
    return { success: false, statusCode: null, error: 'Rate limited (5s cooldown)' };
  }

<<<<<<< HEAD
=======
  if (isUnsafeUrl(wh.url)) {
    return { success: false, statusCode: null, error: 'URL is not allowed: must be HTTPS and not target internal/private addresses' };
  }

>>>>>>> origin/main
  const delays = [1000, 4000, 16000];
  const maxAttempts = 3;
  const startTime = Date.now();

  let body: string;
  if (isDiscordWebhook(wh.url)) {
    body = JSON.stringify(buildDiscordPayload(payload));
  } else if (isSlackWebhook(wh.url)) {
    body = JSON.stringify(buildSlackPayload(payload));
  } else {
    body = JSON.stringify(payload);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'TradeClaw/1.0',
  };
  if (wh.secret) {
    headers['X-TradeClaw-Signature'] = buildHmacSignature(body, wh.secret);
  }

  let lastStatusCode: number | null = null;
  let lastError: string | null = null;
  let finalAttempt = 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    finalAttempt = attempt;
    if (attempt > 1) {
      await new Promise((r) => setTimeout(r, delays[attempt - 2]));
    }

    try {
      const res = await fetch(wh.url, { method: 'POST', headers, body });
      lastStatusCode = res.status;
      const success = res.status >= 200 && res.status < 300;

      if (success) {
        markDelivered(wh.id);
        appendDeliveryLog(wh.id, {
          timestamp: new Date().toISOString(),
          statusCode: res.status,
          success: true,
          attempt,
          responseTime: Date.now() - startTime,
          error: null,
        });
        return { success: true, statusCode: res.status, error: null };
      }

      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastStatusCode = null;
      lastError = err instanceof Error ? err.message : 'Network error';
    }
  }

  // All attempts failed — log once with final attempt count
  appendDeliveryLog(wh.id, {
    timestamp: new Date().toISOString(),
    statusCode: lastStatusCode,
    success: false,
    attempt: finalAttempt,
    responseTime: Date.now() - startTime,
    error: lastError,
  });
  return { success: false, statusCode: lastStatusCode, error: lastError };
}

// ---------------------------------------------------------------------------
// Fan-out dispatch
// ---------------------------------------------------------------------------

export async function dispatchToAll(payload: WebhookPayload): Promise<void> {
  const { signal } = payload;
  const webhooks = readWebhooks().filter((w) => {
    if (!w.enabled) return false;
    if (w.minConfidence > 0 && signal.confidence < w.minConfidence) return false;
    if (w.pairs !== 'all' && !w.pairs.includes(signal.symbol)) return false;
    return true;
  });
  await Promise.allSettled(webhooks.map((wh) => deliverWebhook(wh, payload, true)));
}
