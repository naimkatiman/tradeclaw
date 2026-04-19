import { NextRequest, NextResponse } from 'next/server';
import { readSubscribers } from '../../../../lib/telegram-subscribers';

const TELEGRAM_API = 'https://api.telegram.org';
const RATE_LIMIT_MS = 34; // ~30 messages/second

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignalPayload {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  takeProfit3?: number;
  timeframe: string;
  indicators?: {
    rsi?: { value: number; signal: 'oversold' | 'neutral' | 'overbought' };
    macd?: { signal: 'bullish' | 'bearish' | 'neutral' };
    ema?: { trend: 'up' | 'down' | 'sideways' };
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function e(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function formatPrice(p: number): string {
  if (p >= 1000) {
    return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

function buildSignalMessage(signal: SignalPayload, appUrl?: string): string {
  const emoji = signal.direction === 'BUY' ? '🟢' : '🔴';
  const dirLabel = signal.direction === 'BUY' ? 'BUY SIGNAL' : 'SELL SIGNAL';

  const lines: string[] = [
    `${emoji} *${e(`${dirLabel} — ${signal.symbol}`)}*`,
    e('━━━━━━━━━━━━━━━━━'),
    `💰 *Entry:* \\$${e(formatPrice(signal.entry))}`,
    `🎯 *Take Profit:* \\$${e(formatPrice(signal.takeProfit1))}`,
    `🛑 *Stop Loss:* \\$${e(formatPrice(signal.stopLoss))}`,
    `📊 *Confidence:* ${e(String(signal.confidence))}%`,
    `⏱ *Timeframe:* ${e(signal.timeframe)}`,
    '',
  ];

  if (signal.indicators) {
    lines.push('*Indicators:*');
    if (signal.indicators.rsi) {
      const { value, signal: sig } = signal.indicators.rsi;
      const label =
        sig === 'oversold' ? 'oversold ✅' : sig === 'overbought' ? 'overbought ⚠️' : 'neutral';
      lines.push(`• RSI: ${e(value.toFixed(1))} \\(${e(label)}\\)`);
    }
    if (signal.indicators.macd) {
      const label =
        signal.indicators.macd.signal === 'bullish'
          ? 'bullish crossover ✅'
          : signal.indicators.macd.signal === 'bearish'
          ? 'bearish crossover ⚠️'
          : 'neutral';
      lines.push(`• MACD: ${e(label)}`);
    }
    if (signal.indicators.ema) {
      const label =
        signal.indicators.ema.trend === 'up'
          ? 'price above 50 EMA ✅'
          : signal.indicators.ema.trend === 'down'
          ? 'price below 50 EMA ⚠️'
          : 'sideways';
      lines.push(`• EMA: ${e(label)}`);
    }
    lines.push('');
  }

  lines.push(`⚠️ _Not financial advice\\. DYOR\\._`);

  if (appUrl) {
    const url = `${appUrl}/signal/${encodeURIComponent(signal.symbol.toLowerCase())}`;
    lines.push(`🔗 [View details](${url})`);
  }

  return lines.join('\n');
}

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) return { ok: false, error: data.description };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ---------------------------------------------------------------------------
// POST /api/telegram/send
// Body: { signal, broadcast?, chatId?, appUrl? }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 503 });
  }

  let body: {
    signal?: SignalPayload;
    broadcast?: boolean;
    chatId?: string;
    appUrl?: string;
    test?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Test ping mode
  if (body.test) {
    if (!body.chatId) {
      return NextResponse.json({ error: 'chatId required for test send' }, { status: 400 });
    }

    const result = await sendTelegramMessage(
      token,
      body.chatId,
      '✅ TradeClaw connected\\. You will receive trading signals here\\.'
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: 'Test message sent' });
  }

  if (!body.signal) {
    return NextResponse.json({ error: 'signal payload required' }, { status: 400 });
  }

  const text = buildSignalMessage(body.signal, body.appUrl);

  // Broadcast to all subscribers
  if (body.broadcast) {
    const subscribers = await readSubscribers();

    const eligible = subscribers.filter((sub) => {
      const pairsOk =
        sub.subscribedPairs === 'all' ||
        (Array.isArray(sub.subscribedPairs) &&
          sub.subscribedPairs.includes(body.signal!.symbol));
      const confOk = body.signal!.confidence >= sub.minConfidence;
      return pairsOk && confOk;
    });

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < eligible.length; i++) {
      const result = await sendTelegramMessage(token, eligible[i].chatId, text);
      if (result.ok) sent++;
      else failed++;

      if (i < eligible.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
      }
    }

    return NextResponse.json({ ok: true, sent, failed, total: eligible.length });
  }

  // Single target send
  if (!body.chatId) {
    return NextResponse.json({ error: 'chatId required when not broadcasting' }, { status: 400 });
  }

  const result = await sendTelegramMessage(token, body.chatId, text);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
