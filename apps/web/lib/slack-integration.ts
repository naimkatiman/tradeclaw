import fs from 'fs';
import path from 'path';
import type { WebhookPayload } from './webhooks';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlackDelivery {
  timestamp: string;
  statusCode: number | null;
  success: boolean;
  attempt: number;
  responseTime: number;
  error: string | null;
}

export interface SlackIntegration {
  id: string;
  name: string;
  webhookUrl: string;
  channel: string;
  pairs: string[] | 'all';
  minConfidence: number;
  direction: 'ALL' | 'BUY' | 'SELL';
  enabled: boolean;
  createdAt: string;
  lastDelivery?: string;
  deliveryCount: number;
  failCount: number;
  deliveryLog: SlackDelivery[];
}

// ---------------------------------------------------------------------------
// File storage
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const SLACK_FILE = path.join(DATA_DIR, 'slack-integrations.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readSlackIntegrations(): SlackIntegration[] {
  ensureDataDir();
  if (!fs.existsSync(SLACK_FILE)) return [];
  try {
    const raw = fs.readFileSync(SLACK_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as SlackIntegration[]).map((s) => ({
      ...s,
      pairs: s.pairs ?? ('all' as const),
      minConfidence: s.minConfidence ?? 0,
      direction: s.direction ?? 'ALL',
      deliveryCount: s.deliveryCount ?? 0,
      failCount: s.failCount ?? 0,
      deliveryLog: s.deliveryLog ?? [],
    }));
  } catch {
    return [];
  }
}

function writeSlackIntegrations(integrations: SlackIntegration[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(SLACK_FILE, JSON.stringify(integrations, null, 2), 'utf-8');
  } catch {
    // Silently fail on read-only FS (e.g. Vercel)
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function addSlackIntegration(opts: {
  webhookUrl: string;
  name?: string;
  channel?: string;
  pairs?: string[] | 'all';
  minConfidence?: number;
  direction?: 'ALL' | 'BUY' | 'SELL';
}): SlackIntegration {
  const integrations = readSlackIntegrations();
  const si: SlackIntegration = {
    id: `slack_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: opts.name ?? '',
    webhookUrl: opts.webhookUrl,
    channel: opts.channel ?? '',
    pairs: opts.pairs ?? 'all',
    minConfidence: opts.minConfidence ?? 0,
    direction: opts.direction ?? 'ALL',
    enabled: true,
    createdAt: new Date().toISOString(),
    deliveryCount: 0,
    failCount: 0,
    deliveryLog: [],
  };
  integrations.push(si);
  writeSlackIntegrations(integrations);
  return si;
}

export function removeSlackIntegration(id: string): boolean {
  const integrations = readSlackIntegrations();
  const idx = integrations.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  integrations.splice(idx, 1);
  writeSlackIntegrations(integrations);
  return true;
}

export function updateSlackIntegration(
  id: string,
  patch: Partial<Pick<SlackIntegration, 'name' | 'webhookUrl' | 'channel' | 'enabled' | 'pairs' | 'minConfidence' | 'direction'>>
): SlackIntegration | null {
  const integrations = readSlackIntegrations();
  const si = integrations.find((s) => s.id === id);
  if (!si) return null;
  Object.assign(si, patch);
  writeSlackIntegrations(integrations);
  return si;
}

export function getSlackDeliveries(id: string): SlackDelivery[] | null {
  const si = readSlackIntegrations().find((s) => s.id === id);
  return si ? si.deliveryLog : null;
}

function appendDeliveryLog(id: string, entry: SlackDelivery): void {
  const integrations = readSlackIntegrations();
  const si = integrations.find((s) => s.id === id);
  if (!si) return;
  si.deliveryLog.unshift(entry);
  if (si.deliveryLog.length > 50) {
    si.deliveryLog = si.deliveryLog.slice(0, 50);
  }
  si.deliveryCount = (si.deliveryCount ?? 0) + 1;
  si.lastDelivery = entry.timestamp;
  if (entry.success) {
    si.failCount = 0;
  } else {
    si.failCount = (si.failCount ?? 0) + 1;
  }
  writeSlackIntegrations(integrations);
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per-process — 5s per integration)
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
// Block Kit formatting
// ---------------------------------------------------------------------------

export function formatSlackBlocks(payload: WebhookPayload): object[] {
  const { signal } = payload;
  const isBuy = signal.direction === 'BUY';
  const arrow = isBuy ? ':chart_with_upwards_trend:' : ':chart_with_downwards_trend:';
  const badge = isBuy ? ':large_green_circle: BUY' : ':red_circle: SELL';

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${isBuy ? '▲' : '▼'} ${signal.symbol} ${signal.direction} — ${signal.confidence}% confidence`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Direction:* ${badge}` },
        { type: 'mrkdwn', text: `*Confidence:* ${signal.confidence}%` },
        { type: 'mrkdwn', text: `*Entry:* $${signal.entry}` },
        { type: 'mrkdwn', text: `*Stop Loss:* $${signal.stopLoss}` },
        { type: 'mrkdwn', text: `*Take Profit:* ${signal.takeProfit.map((t) => `$${t}`).join(' / ')}` },
        { type: 'mrkdwn', text: `*Timeframe:* ${signal.timeframe}` },
      ],
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*RSI:* ${signal.indicators.rsi}` },
        { type: 'mrkdwn', text: `*MACD:* ${signal.indicators.macd}` },
        { type: 'mrkdwn', text: `*EMA:* ${signal.indicators.ema}` },
      ],
    },
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `${arrow} *TradeClaw Signal Alert* — ${new Date(payload.timestamp).toUTCString()}` },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Send signal to Slack
// ---------------------------------------------------------------------------

export async function sendSlackSignal(
  integration: SlackIntegration,
  payload: WebhookPayload,
  respectRateLimit = false
): Promise<{ success: boolean; statusCode: number | null; error: string | null }> {
  if (respectRateLimit && isRateLimited(integration.id)) {
    return { success: false, statusCode: null, error: 'Rate limited (5s cooldown)' };
  }

  const delays = [1000, 4000, 16000];
  const maxAttempts = 3;
  const startTime = Date.now();
  const body = JSON.stringify({ blocks: formatSlackBlocks(payload) });

  let lastStatusCode: number | null = null;
  let lastError: string | null = null;
  let finalAttempt = 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    finalAttempt = attempt;
    if (attempt > 1) {
      await new Promise((r) => setTimeout(r, delays[attempt - 2]));
    }

    try {
      const res = await fetch(integration.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'TradeClaw/1.0' },
        body,
      });
      lastStatusCode = res.status;
      const success = res.status >= 200 && res.status < 300;

      if (success) {
        markDelivered(integration.id);
        appendDeliveryLog(integration.id, {
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

  appendDeliveryLog(integration.id, {
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
// Broadcast to all matching integrations
// ---------------------------------------------------------------------------

export async function broadcastToSlack(payload: WebhookPayload): Promise<void> {
  const { signal } = payload;
  const integrations = readSlackIntegrations().filter((s) => {
    if (!s.enabled) return false;
    if (s.minConfidence > 0 && signal.confidence < s.minConfidence) return false;
    if (s.pairs !== 'all' && !s.pairs.includes(signal.symbol)) return false;
    if (s.direction !== 'ALL' && s.direction !== signal.direction) return false;
    return true;
  });
  await Promise.allSettled(integrations.map((s) => sendSlackSignal(s, payload, true)));
}

// ---------------------------------------------------------------------------
// Test payload
// ---------------------------------------------------------------------------

export const TEST_SLACK_PAYLOAD: WebhookPayload = {
  event: 'signal.test',
  timestamp: new Date().toISOString(),
  signal: {
    id: 'XAUUSD-H1-BUY-TEST',
    symbol: 'XAUUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 82,
    entry: 2185.5,
    stopLoss: 2178.0,
    takeProfit: [2195.0, 2205.0],
    indicators: { rsi: 35, macd: 'bullish', ema: 'golden_cross' },
  },
};
