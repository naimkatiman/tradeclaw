/**
 * Telegram Channel Broadcast — auto-posts top signals to a configured channel.
 *
 * Used by the cron endpoint (/api/cron/telegram) and the manual broadcast
 * button on the /telegram settings page.
 */

import { getSignals, type TradingSignal } from '../app/lib/signals';
import * as fs from 'fs';
import * as path from 'path';

const TELEGRAM_API = 'https://api.telegram.org';
const STATE_FILE = path.join(process.cwd(), '..', '..', 'data', 'telegram-broadcast-state.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BroadcastState {
  lastBroadcastTime: string | null;
  lastMessageId: number | null;
  lastError: string | null;
  broadcastCount: number;
}

export interface BroadcastResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------

export function readBroadcastState(): BroadcastState {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STATE_FILE)) {
      return { lastBroadcastTime: null, lastMessageId: null, lastError: null, broadcastCount: 0 };
    }
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw) as BroadcastState;
  } catch {
    return { lastBroadcastTime: null, lastMessageId: null, lastError: null, broadcastCount: 0 };
  }
}

export function writeBroadcastState(state: BroadcastState): void {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    // Silently fail — state is non-critical
  }
}

// ---------------------------------------------------------------------------
// MarkdownV2 helpers
// ---------------------------------------------------------------------------

function e(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

// ---------------------------------------------------------------------------
// Message formatter
// ---------------------------------------------------------------------------

function formatSignalBlock(signal: TradingSignal, index: number): string {
  const emoji = signal.direction === 'BUY' ? '\u{1F7E2}' : '\u{1F534}';
  const dirLabel = signal.direction;

  const lines: string[] = [
    `${index > 0 ? '\n' : ''}${emoji} *${e(`${dirLabel} ${signal.symbol}`)}* \\| ${e(String(signal.confidence))}% confidence`,
    `\u{1F4B0} Entry: \\$${e(formatPrice(signal.entry))}`,
    `\u{1F3AF} TP: \\$${e(formatPrice(signal.takeProfit1))} / \\$${e(formatPrice(signal.takeProfit2))} / \\$${e(formatPrice(signal.takeProfit3))}`,
    `\u{1F6D1} SL: \\$${e(formatPrice(signal.stopLoss))}`,
  ];

  // Indicator details
  const parts: string[] = [];
  if (signal.indicators.rsi) {
    parts.push(`RSI ${e(signal.indicators.rsi.value.toFixed(1))}`);
  }
  if (signal.indicators.macd) {
    const bias = signal.indicators.macd.signal === 'bullish' ? '\u2705' : signal.indicators.macd.signal === 'bearish' ? '\u26A0\uFE0F' : '\u2796';
    parts.push(`MACD ${bias}`);
  }
  if (parts.length > 0) {
    lines.push(`\u{1F4CA} ${parts.join(' \\| ')}`);
  }

  return lines.join('\n');
}

function buildBroadcastMessage(signals: TradingSignal[]): string {
  const header = `\u{1F4E1} *${e('TradeClaw Signal Broadcast')}*\n${e('\u2501'.repeat(20))}`;

  const blocks = signals.map((sig, i) => formatSignalBlock(sig, i));

  const footer = [
    '',
    e('\u2501'.repeat(20)),
    `\u{1F916} _TradeClaw_ \\| [GitHub](https://github.com/naimkatiman/tradeclaw) \\| _Auto\\-broadcast every 4h_`,
    `\u26A0\uFE0F _Not financial advice\\. DYOR\\._`,
  ].join('\n');

  return [header, ...blocks, footer].join('\n');
}

// ---------------------------------------------------------------------------
// Telegram API call
// ---------------------------------------------------------------------------

async function sendToChannel(
  botToken: string,
  channelId: string,
  text: string,
): Promise<BroadcastResult> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    });

    const data = (await res.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };

    if (!data.ok) return { success: false, error: data.description };
    return { success: true, messageId: data.result?.message_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ---------------------------------------------------------------------------
// Main broadcast function
// ---------------------------------------------------------------------------

/**
 * Fetch top 3 signals from the signal engine, format them as a rich
 * MarkdownV2 message, and post to the configured Telegram channel.
 */
export async function broadcastTopSignals(
  channelId: string,
  botToken: string,
): Promise<BroadcastResult> {
  // Fetch top signals (confidence >= 60, sorted desc by confidence)
  const { signals } = await getSignals({ minConfidence: 60 });
  const top = signals.slice(0, 3);

  if (top.length === 0) {
    const result: BroadcastResult = { success: false, error: 'No signals above threshold to broadcast' };
    const state = readBroadcastState();
    state.lastError = result.error ?? null;
    writeBroadcastState(state);
    return result;
  }

  const message = buildBroadcastMessage(top);
  const result = await sendToChannel(botToken, channelId, message);

  // Persist state
  const state = readBroadcastState();
  state.lastBroadcastTime = new Date().toISOString();
  state.lastError = result.error ?? null;
  if (result.messageId) state.lastMessageId = result.messageId;
  if (result.success) state.broadcastCount += 1;
  writeBroadcastState(state);

  return result;
}
