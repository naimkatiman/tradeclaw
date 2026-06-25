import type { TradingSignal } from '@tradeclaw/signals';
import type { ExpoPushTokenRecord } from './expo-push-tokens';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
}

export interface SendResult {
  sent: number;
  failed: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Message builder
// ---------------------------------------------------------------------------

export function buildSignalMessages(
  signal: TradingSignal,
  tokens: ExpoPushTokenRecord[],
): ExpoPushMessage[] {
  const messages: ExpoPushMessage[] = [];

  for (const token of tokens) {
    if (!token.enabled) continue;
    if (signal.confidence < token.minConfidence) continue;
    if (!token.pairs.includes(signal.symbol)) continue;

    const wantsBuy = token.directions.includes('BUY') || token.directions.includes('both');
    const wantsSell = token.directions.includes('SELL') || token.directions.includes('both');
    if (signal.direction === 'BUY' && !wantsBuy) continue;
    if (signal.direction === 'SELL' && !wantsSell) continue;

    const emoji = signal.direction === 'BUY' ? '🟢' : '🔴';
    const title = `${emoji} ${signal.symbol} ${signal.direction} — ${signal.confidence}% confidence`;
    const body = `Entry ${signal.entry} · TP1 ${signal.takeProfit1} · SL ${signal.stopLoss} · ${signal.timeframe}`;

    messages.push({
      to: token.token,
      title,
      body,
      data: {
        symbol: signal.symbol,
        direction: signal.direction,
        confidence: signal.confidence,
        entry: signal.entry,
        tp1: signal.takeProfit1,
        sl: signal.stopLoss,
        timeframe: signal.timeframe,
        signalId: signal.id,
      },
      sound: 'default',
      priority: 'high',
    });
  }

  return messages;
}

// ---------------------------------------------------------------------------
// Sender
// ---------------------------------------------------------------------------

export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[],
): Promise<SendResult> {
  if (messages.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }

  const result: SendResult = { sent: 0, failed: 0, errors: [] };

  // Expo accepts up to 100 messages per request
  const BATCH_SIZE = 100;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const data = (await res.json()) as {
        data?: Array<{
          status: 'ok' | 'error';
          id?: string;
          message?: string;
        }>;
        errors?: Array<{ message: string }>;
      };

      const items = data.data ?? [];
      for (const item of items) {
        if (item.status === 'ok') {
          result.sent += 1;
        } else {
          result.failed += 1;
          if (item.message) result.errors.push(item.message);
        }
      }

      if (data.errors) {
        for (const err of data.errors) {
          result.errors.push(err.message);
        }
      }
    } catch (err) {
      result.failed += batch.length;
      result.errors.push(err instanceof Error ? err.message : 'Network error');
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Orchestrator — fetch signals + tokens and dispatch
// ---------------------------------------------------------------------------

export async function dispatchSignalPushes(
  signals: TradingSignal[],
  tokens: ExpoPushTokenRecord[],
): Promise<{
  signalsProcessed: number;
  totalMessages: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const allMessages: ExpoPushMessage[] = [];

  for (const signal of signals) {
    const msgs = buildSignalMessages(signal, tokens);
    allMessages.push(...msgs);
  }

  const result = await sendExpoPushNotifications(allMessages);

  return {
    signalsProcessed: signals.length,
    totalMessages: allMessages.length,
    sent: result.sent,
    failed: result.failed,
    errors: result.errors.slice(0, 10), // cap error detail
  };
}
