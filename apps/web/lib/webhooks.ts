import crypto from 'crypto';
import { query, queryOne, execute } from './db-pool';

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
  userId: string;
  name: string;
  url: string;
  secret?: string;
  pairs: string[] | 'all';
  minConfidence: number; // 0–100
  enabled: boolean;
  createdAt: string;
  lastDelivery?: string;
  deliveryCount: number;
  failCount: number; // consecutive failures since last success
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
// Row → Record mapping
// ---------------------------------------------------------------------------

interface WebhookRow {
  id: string;
  user_id: string;
  name: string;
  url: string;
  secret: string | null;
  pairs: unknown; // JSONB — either "all" string or string[]
  min_confidence: number;
  enabled: boolean;
  delivery_count: number;
  fail_count: number;
  last_delivery_at: string | null;
  created_at: string;
}

function toConfig(row: WebhookRow): WebhookConfig {
  const pairs = row.pairs === 'all'
    ? ('all' as const)
    : Array.isArray(row.pairs) ? row.pairs.filter((p): p is string => typeof p === 'string') : ('all' as const);
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    url: row.url,
    secret: row.secret ?? undefined,
    pairs,
    minConfidence: row.min_confidence,
    enabled: row.enabled,
    createdAt: new Date(row.created_at).toISOString(),
    lastDelivery: row.last_delivery_at ? new Date(row.last_delivery_at).toISOString() : undefined,
    deliveryCount: row.delivery_count,
    failCount: row.fail_count,
  };
}

// ---------------------------------------------------------------------------
// URL safety validation (SSRF prevention)
// ---------------------------------------------------------------------------

function isUnsafeUrl(url: string): boolean {
  if (!/^https:\/\//i.test(url)) return true;
  if (/^(file|ftp|data):\/\//i.test(url)) return true;

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return true;
  }

  if (hostname === '[::1]' || hostname === '::1') return true;
  if (/^\[?f[cd]/i.test(hostname)) return true;

  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// CRUD (user-scoped)
// ---------------------------------------------------------------------------

const SELECT_COLS = `id, user_id, name, url, secret, pairs, min_confidence,
                     enabled, delivery_count, fail_count, last_delivery_at, created_at`;

export async function readWebhooks(userId: string): Promise<WebhookConfig[]> {
  const rows = await query<WebhookRow>(
    `SELECT ${SELECT_COLS} FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map(toConfig);
}

/**
 * Internal: enabled rows across all users. Used only by the dispatch path,
 * which is protected by CRON_SECRET and fans a single signal out to every
 * registered subscriber — that cross-user semantic is intentional.
 */
export async function readAllEnabledForDispatch(): Promise<WebhookConfig[]> {
  const rows = await query<WebhookRow>(
    `SELECT ${SELECT_COLS} FROM webhooks WHERE enabled = TRUE`,
  );
  return rows.map(toConfig);
}

export async function addWebhook(opts: {
  userId: string;
  url: string;
  name?: string;
  secret?: string;
  pairs?: string[] | 'all';
  minConfidence?: number;
}): Promise<WebhookConfig> {
  if (!opts.url || opts.url.length > 2048) throw new Error('URL must be between 1 and 2048 characters');
  if (opts.name && opts.name.length > 100) throw new Error('Name must be 100 characters or fewer');
  if (isUnsafeUrl(opts.url)) throw new Error('URL is not allowed: must be HTTPS and not target internal/private addresses');

  const id = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const pairsJson = JSON.stringify(opts.pairs ?? 'all');
  const row = await queryOne<WebhookRow>(
    `INSERT INTO webhooks (id, user_id, name, url, secret, pairs, min_confidence)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     RETURNING ${SELECT_COLS}`,
    [id, opts.userId, opts.name ?? '', opts.url, opts.secret ?? null, pairsJson, opts.minConfidence ?? 0],
  );
  if (!row) throw new Error('addWebhook: insert returned no row');
  return toConfig(row);
}

export async function removeWebhook(opts: { userId: string; id: string }): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM webhooks WHERE id = $1 AND user_id = $2 RETURNING id`,
    [opts.id, opts.userId],
  );
  return rows.length > 0;
}

type WebhookPatch = Partial<Pick<WebhookConfig, 'name' | 'url' | 'secret' | 'enabled' | 'pairs' | 'minConfidence'>>;

export async function updateWebhook(
  opts: { userId: string; id: string },
  patch: WebhookPatch,
): Promise<WebhookConfig | null> {
  if (patch.url !== undefined) {
    if (!patch.url || patch.url.length > 2048) throw new Error('URL must be between 1 and 2048 characters');
    if (isUnsafeUrl(patch.url)) throw new Error('URL is not allowed: must be HTTPS and not target internal/private addresses');
  }
  if (patch.name !== undefined && patch.name.length > 100) throw new Error('Name must be 100 characters or fewer');

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (patch.name !== undefined) { sets.push(`name = $${i++}`); params.push(patch.name); }
  if (patch.url !== undefined) { sets.push(`url = $${i++}`); params.push(patch.url); }
  if (patch.secret !== undefined) { sets.push(`secret = $${i++}`); params.push(patch.secret ?? null); }
  if (patch.enabled !== undefined) { sets.push(`enabled = $${i++}`); params.push(patch.enabled); }
  if (patch.pairs !== undefined) { sets.push(`pairs = $${i++}::jsonb`); params.push(JSON.stringify(patch.pairs)); }
  if (patch.minConfidence !== undefined) { sets.push(`min_confidence = $${i++}`); params.push(patch.minConfidence); }

  if (sets.length === 0) {
    // No-op patch: just return the current row (or null).
    const row = await queryOne<WebhookRow>(
      `SELECT ${SELECT_COLS} FROM webhooks WHERE id = $1 AND user_id = $2`,
      [opts.id, opts.userId],
    );
    return row ? toConfig(row) : null;
  }

  params.push(opts.id, opts.userId);
  const row = await queryOne<WebhookRow>(
    `UPDATE webhooks SET ${sets.join(', ')}
     WHERE id = $${i++} AND user_id = $${i++}
     RETURNING ${SELECT_COLS}`,
    params,
  );
  return row ? toConfig(row) : null;
}

export async function getWebhookDeliveries(opts: { userId: string; id: string }): Promise<WebhookDelivery[] | null> {
  // Ownership check first — fail with null (becomes 404) if the row isn't theirs.
  const owner = await queryOne<{ id: string }>(
    `SELECT id FROM webhooks WHERE id = $1 AND user_id = $2`,
    [opts.id, opts.userId],
  );
  if (!owner) return null;

  const rows = await query<{
    timestamp: string;
    status_code: number | null;
    success: boolean;
    attempt: number;
    response_time_ms: number;
    error: string | null;
  }>(
    `SELECT timestamp, status_code, success, attempt, response_time_ms, error
     FROM webhook_deliveries
     WHERE webhook_id = $1
     ORDER BY timestamp DESC
     LIMIT 50`,
    [opts.id],
  );
  return rows.map((r) => ({
    timestamp: new Date(r.timestamp).toISOString(),
    statusCode: r.status_code,
    success: r.success,
    attempt: r.attempt,
    responseTime: r.response_time_ms,
    error: r.error,
  }));
}

/** Fetch by id with ownership check. Used by test/deliver routes. */
export async function getWebhookForUser(opts: { userId: string; id: string }): Promise<WebhookConfig | null> {
  const row = await queryOne<WebhookRow>(
    `SELECT ${SELECT_COLS} FROM webhooks WHERE id = $1 AND user_id = $2`,
    [opts.id, opts.userId],
  );
  return row ? toConfig(row) : null;
}

async function appendDeliveryLog(id: string, entry: WebhookDelivery): Promise<void> {
  await execute(
    `INSERT INTO webhook_deliveries
       (webhook_id, timestamp, status_code, success, attempt, response_time_ms, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, entry.timestamp, entry.statusCode, entry.success, entry.attempt, entry.responseTime, entry.error],
  );

  if (entry.success) {
    await execute(
      `UPDATE webhooks
         SET delivery_count = delivery_count + 1,
             fail_count     = 0,
             last_delivery_at = $2
       WHERE id = $1`,
      [id, entry.timestamp],
    );
  } else {
    await execute(
      `UPDATE webhooks
         SET delivery_count = delivery_count + 1,
             fail_count     = fail_count + 1,
             last_delivery_at = $2
       WHERE id = $1`,
      [id, entry.timestamp],
    );
  }

  // Trim log to most recent 50 per webhook.
  await execute(
    `DELETE FROM webhook_deliveries
     WHERE webhook_id = $1
       AND id NOT IN (
         SELECT id FROM webhook_deliveries
         WHERE webhook_id = $1
         ORDER BY timestamp DESC
         LIMIT 50
       )`,
    [id],
  );
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
        text: { type: 'plain_text', text: `${isBuy ? '▲' : '▼'} ${signal.symbol} ${signal.direction} (${signal.confidence}%)` },
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
  respectRateLimit = false,
): Promise<{ success: boolean; statusCode: number | null; error: string | null }> {
  if (respectRateLimit && isRateLimited(wh.id)) {
    return { success: false, statusCode: null, error: 'Rate limited (5s cooldown)' };
  }

  if (isUnsafeUrl(wh.url)) {
    return { success: false, statusCode: null, error: 'URL is not allowed: must be HTTPS and not target internal/private addresses' };
  }

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
        await appendDeliveryLog(wh.id, {
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

  await appendDeliveryLog(wh.id, {
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
// Fan-out dispatch (cross-user — internal only)
// ---------------------------------------------------------------------------

export async function dispatchToAll(payload: WebhookPayload): Promise<void> {
  const { signal } = payload;
  const webhooks = (await readAllEnabledForDispatch()).filter((w) => {
    if (w.minConfidence > 0 && signal.confidence < w.minConfidence) return false;
    if (w.pairs !== 'all' && !w.pairs.includes(signal.symbol)) return false;
    return true;
  });
  await Promise.allSettled(webhooks.map((wh) => deliverWebhook(wh, payload, true)));
}
