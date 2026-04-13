/**
 * Telegram Channel Broadcast — auto-posts signals and outcome replies.
 *
 * Signal flow (like WolfX):
 * 1. broadcastTopSignals() — posts each signal as a separate message,
 *    saves message_id to signal_history for reply threading
 * 2. broadcastOutcomeReply() — when TP/SL hits, replies to the original
 *    signal message with the result
 *
 * Used by:
 * - /api/cron/telegram (periodic signal broadcast)
 * - /api/cron/position-monitor (outcome replies)
 */

import { type TradingSignal } from '../app/lib/signals';
import { readLiveSignals, type LiveSignal } from './signals-live';
import { getTrackedSignals } from './tracked-signals';
import { fetchRegimeMap, filterSignalsByRegime } from './regime-filter';
import { markTelegramPosted } from './signal-history';
import { runRiskPipeline, type RiskReport } from './risk-pipeline';
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
  lastRiskReport?: RiskReport | null;
}

export interface BroadcastResult {
  success: boolean;
  messageId?: number;
  messageIds?: number[];
  error?: string;
  signalCount?: number;
}

export interface OutcomeReplyInput {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  pnlPct: number;
  reason: 'takeProfit' | 'stopLoss' | 'trailingStop';
  tpLevel?: 1 | 2 | 3;
  period?: string;
  originalMessageId: number;
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

function formatDuration(startMs: number, endMs: number): string {
  const diffMs = endMs - startMs;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return remMins > 0 ? `${hrs} hr ${remMins} min` : `${hrs} hr`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return remHrs > 0 ? `${days} day ${remHrs} hr` : `${days} day`;
}

// ---------------------------------------------------------------------------
// Signal entry message (one per signal — like WolfX)
// ---------------------------------------------------------------------------

function formatSignalEntry(signal: TradingSignal): string {
  const dirEmoji = signal.direction === 'BUY' ? '\u{1F4C8}' : '\u{1F4C9}';
  const dirLabel = signal.direction;

  const lines: string[] = [
    `\u{1F4E1} *${e('TradeClaw Signal')}*`,
    '',
    `${dirEmoji} *${e(dirLabel)} ${e(signal.symbol)} \\- ${e(signal.timeframe)}*`,
    `Confidence: ${e(String(signal.confidence))}%`,
    '',
    `\u{1F539}Entry: \\$${e(formatPrice(signal.entry))}`,
    '',
    `\u{1F4B0}TP1 ${e(formatPrice(signal.takeProfit1))}`,
    `\u{1F4B0}TP2 ${e(formatPrice(signal.takeProfit2))}`,
    `\u{1F4B0}TP3 ${e(formatPrice(signal.takeProfit3))}`,
    `\u{1F6AB}SL ${e(formatPrice(signal.stopLoss))}`,
    '',
    `[tradeclaw\\.win](https://tradeclaw.win)`,
    `\u26A0\uFE0F _Not financial advice\\. DYOR\\._`,
  ];

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Outcome reply messages (TP hit / SL hit — replies to original)
// ---------------------------------------------------------------------------

function formatTpHitReply(input: OutcomeReplyInput): string {
  const pnl = Math.abs(input.pnlPct).toFixed(4);
  const lines: string[] = [
    `*${e(`#${input.symbol}`)} Take\\-Profit target ${input.tpLevel ?? ''}* \u2705`,
    `Profit: ${e(pnl)}% \u{1F4C8}`,
  ];
  if (input.period) {
    lines.push(`Period: ${e(input.period)} \u23F0`);
  }
  return lines.join('\n');
}

function formatSlHitReply(input: OutcomeReplyInput): string {
  const loss = Math.abs(input.pnlPct).toFixed(4);
  return [
    `*${e(`#${input.symbol}`)} Stop Target Hit* \u26D4`,
    `Loss: ${e(loss)}% \u{1F4C9}`,
  ].join('\n');
}

function formatTrailingStopReply(input: OutcomeReplyInput): string {
  const pnl = Math.abs(input.pnlPct).toFixed(4);
  const isProfit = input.pnlPct >= 0;
  return [
    `*${e(`#${input.symbol}`)} Closed at trailing stoploss after reaching take profit* \u26A0\uFE0F`,
    isProfit
      ? `Profit: ${e(pnl)}% \u{1F4C8}`
      : `Loss: ${e(pnl)}% \u{1F4C9}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Telegram API calls
// ---------------------------------------------------------------------------

async function sendToChannel(
  botToken: string,
  channelId: string,
  text: string,
  replyToMessageId?: number,
): Promise<BroadcastResult> {
  try {
    const body: Record<string, unknown> = {
      chat_id: channelId,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    };

    if (replyToMessageId) {
      body.reply_to_message_id = replyToMessageId;
      body.allow_sending_without_reply = true;
    }

    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
// LiveSignal → TradingSignal mapper (Python engine → Telegram format)
// ---------------------------------------------------------------------------

function mapLiveToTradingSignal(s: LiveSignal): TradingSignal {
  return {
    id: s.id,
    symbol: s.symbol,
    timeframe: s.timeframe,
    direction: s.signal,
    confidence: s.confidence,
    entry: s.entry,
    stopLoss: s.sl,
    takeProfit1: s.tp1,
    takeProfit2: s.tp2,
    takeProfit3: s.tp3 ?? s.tp2 * 1.5 - s.tp1 * 0.5,
    reasons: s.reasons,
    agreeing_timeframes: s.agreeing_timeframes,
    confluence_score: s.confluence_score,
    indicators: {
      rsi: { value: s.indicators?.rsi ?? 50, signal: (s.indicators?.rsi ?? 50) < 30 ? 'oversold' as const : (s.indicators?.rsi ?? 50) > 70 ? 'overbought' as const : 'neutral' as const },
      macd: { histogram: s.indicators?.macd_histogram ?? 0, signal: (s.indicators?.macd_histogram ?? 0) > 0 ? 'bullish' as const : (s.indicators?.macd_histogram ?? 0) < 0 ? 'bearish' as const : 'neutral' as const },
      ema: { trend: s.indicators?.ema_trend ?? 'sideways' as const, ema20: 0, ema50: 0, ema200: 0 },
      bollingerBands: { position: 'middle' as const, bandwidth: 0 },
      stochastic: { k: s.indicators?.stochastic_k ?? s.indicators?.stoch_k ?? 50, d: 50, signal: (s.indicators?.stochastic_k ?? 50) < 20 ? 'oversold' as const : (s.indicators?.stochastic_k ?? 50) > 80 ? 'overbought' as const : 'neutral' as const },
      support: [],
      resistance: [],
    },
    source: 'real',
    dataQuality: 'real',
    timestamp: s.timestamp,
    status: 'active',
  } as TradingSignal;
}

// ---------------------------------------------------------------------------
// Main broadcast function — one message per signal
// ---------------------------------------------------------------------------

/**
 * Fetch top signals, post EACH as a separate message (like WolfX),
 * and save message_id to signal_history for reply threading.
 */
export async function broadcastTopSignals(
  channelId: string,
  botToken: string,
): Promise<BroadcastResult> {
  // Use the same Python engine source as the dashboard (DB → signals-live.json)
  const regimeMap = await fetchRegimeMap();
  let mapped: TradingSignal[] = [];

  const liveData = await readLiveSignals();
  if (liveData && !liveData.isStale && liveData.signals.length > 0) {
    mapped = liveData.signals
      .filter((s) => s.confidence >= 70)
      .map(mapLiveToTradingSignal);
  } else {
    // Intentionally no license ctx — Telegram broadcasts are public, so only
    // the free classic strategy is emitted.
    const { signals: fallbackSignals } = await getTrackedSignals({ minConfidence: 70 });
    mapped = fallbackSignals;
  }

  const filtered = filterSignalsByRegime(mapped, regimeMap);
  const top = filtered.slice(0, 3);

  if (top.length === 0) {
    const result: BroadcastResult = { success: false, error: 'No signals above threshold to broadcast' };
    const state = readBroadcastState();
    state.lastError = result.error ?? null;
    writeBroadcastState(state);
    return result;
  }

  // ── Risk Pipeline Gate ──────────────────────────────────────
  // Run allocator → circuit breakers → veto → LLM verify
  const riskResult = await runRiskPipeline(
    top.map((s) => ({
      id: s.id,
      symbol: s.symbol,
      direction: s.direction,
      confidence: s.confidence,
      entry: s.entry,
      stopLoss: s.stopLoss,
      takeProfit1: s.takeProfit1,
      takeProfit2: s.takeProfit2,
      takeProfit3: s.takeProfit3,
      timeframe: s.timeframe,
    })),
    regimeMap,
  );

  // Log risk report
  if (riskResult.vetoed.length > 0) {
    console.warn(
      `[telegram-broadcast] Risk pipeline vetoed ${riskResult.vetoed.length} signal(s):`,
      riskResult.vetoed.map((v) => `${v.signal.symbol}: ${v.reason}`).join('; '),
    );
  }
  if (riskResult.report.llmVerification && !riskResult.report.llmVerification.concur) {
    console.warn(
      '[telegram-broadcast] LLM risk concerns:',
      riskResult.report.llmVerification.concerns.join('; '),
    );
  }

  // Only broadcast approved signals
  const approvedIds = new Set(riskResult.approved.map((s) => s.id));
  const approvedSignals = top.filter((s) => approvedIds.has(s.id));

  if (approvedSignals.length === 0) {
    const state = readBroadcastState();
    state.lastError = 'All signals vetoed by risk pipeline';
    state.lastRiskReport = riskResult.report;
    writeBroadcastState(state);
    return { success: false, error: 'All signals vetoed by risk pipeline' };
  }

  const messageIds: number[] = [];
  let lastError: string | undefined;

  // Send each approved signal as a separate message
  for (const signal of approvedSignals) {
    const message = formatSignalEntry(signal);
    const result = await sendToChannel(botToken, channelId, message);

    if (result.success && result.messageId) {
      messageIds.push(result.messageId);

      // Save message_id to signal_history for reply threading
      try {
        await markTelegramPosted(signal.id, result.messageId);
      } catch {
        // Non-critical — reply threading won't work for this signal
      }
    } else {
      lastError = result.error;
    }
  }

  // Persist state + risk report
  const state = readBroadcastState();
  state.lastBroadcastTime = new Date().toISOString();
  state.lastError = lastError ?? null;
  state.lastRiskReport = riskResult.report;
  if (messageIds.length > 0) state.lastMessageId = messageIds[messageIds.length - 1];
  state.broadcastCount += messageIds.length;
  writeBroadcastState(state);

  return {
    success: messageIds.length > 0,
    messageIds,
    messageId: messageIds[messageIds.length - 1],
    signalCount: messageIds.length,
    error: lastError,
  };
}

// ---------------------------------------------------------------------------
// Outcome reply — TP/SL result as reply to original signal message
// ---------------------------------------------------------------------------

/**
 * Send a TP hit, SL hit, or trailing stop message as a reply
 * to the original signal message in Telegram.
 */
export async function broadcastOutcomeReply(
  channelId: string,
  botToken: string,
  input: OutcomeReplyInput,
): Promise<BroadcastResult> {
  let message: string;

  switch (input.reason) {
    case 'takeProfit':
      message = formatTpHitReply(input);
      break;
    case 'stopLoss':
      message = formatSlHitReply(input);
      break;
    case 'trailingStop':
      message = formatTrailingStopReply(input);
      break;
  }

  return sendToChannel(botToken, channelId, message, input.originalMessageId);
}

// ---------------------------------------------------------------------------
// Helper — compute TP level from exit price
// ---------------------------------------------------------------------------

export function detectTpLevel(
  direction: 'BUY' | 'SELL',
  entry: number,
  exitPrice: number,
  tp1: number,
  tp2: number,
  tp3: number,
): { level: 1 | 2 | 3; reason: 'takeProfit' } | null {
  if (direction === 'BUY') {
    if (exitPrice >= tp3) return { level: 3, reason: 'takeProfit' };
    if (exitPrice >= tp2) return { level: 2, reason: 'takeProfit' };
    if (exitPrice >= tp1) return { level: 1, reason: 'takeProfit' };
  } else {
    if (exitPrice <= tp3) return { level: 3, reason: 'takeProfit' };
    if (exitPrice <= tp2) return { level: 2, reason: 'takeProfit' };
    if (exitPrice <= tp1) return { level: 1, reason: 'takeProfit' };
  }
  return null;
}

// Re-export formatDuration for use by position monitor
export { formatDuration };
