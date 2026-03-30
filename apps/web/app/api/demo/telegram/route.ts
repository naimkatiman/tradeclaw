import { NextRequest, NextResponse } from 'next/server';
import { getSignals } from '@/app/lib/signals';

// In-memory rate limiter: chatId → last send timestamp (ms)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000; // 1 request per chat ID per 60s

const ALLOWED_PAIRS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD',
  'XAGUSD', 'SOLUSD', 'BNBUSD', 'USDJPY', 'XRPUSD',
];

function escapeV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, pair } = body as { chatId?: string; pair?: string };

    // Validate chatId
    if (!chatId || !/^\d{1,15}$/.test(chatId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chat ID. Must be numeric (up to 15 digits).' },
        { status: 400 }
      );
    }

    // Validate pair
    const normalizedPair = (pair || 'BTCUSD').toUpperCase();
    if (!ALLOWED_PAIRS.includes(normalizedPair)) {
      return NextResponse.json(
        { success: false, error: 'Invalid trading pair.' },
        { status: 400 }
      );
    }

    // Rate limit check
    const now = Date.now();
    const last = rateLimitMap.get(chatId);
    if (last && now - last < RATE_LIMIT_MS) {
      const waitSec = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
      return NextResponse.json(
        { success: false, error: `Rate limited. Please wait ${waitSec}s before sending another signal.` },
        { status: 429 }
      );
    }

    // Fetch a signal for the pair
    const { signals } = await getSignals({ symbol: normalizedPair });
    if (!signals || signals.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Could not generate a signal right now. Please try again.' },
        { status: 503 }
      );
    }
    const signal = signals[0];

    // Format MarkdownV2 message
    const emoji = signal.direction === 'BUY' ? '🟢' : '🔴';
    const dirLabel = signal.direction === 'BUY' ? 'BUY SIGNAL' : 'SELL SIGNAL';
    const confBar = '█'.repeat(Math.round(signal.confidence / 10)) + '░'.repeat(10 - Math.round(signal.confidence / 10));

    const lines: string[] = [
      `${emoji} *${escapeV2(`${dirLabel} — ${signal.symbol}`)}*`,
      escapeV2('━━━━━━━━━━━━━━━━━'),
      `💰 *Entry:* ${escapeV2('$' + formatPrice(signal.entry))}`,
      `🎯 *Take Profit:* ${escapeV2('$' + formatPrice(signal.takeProfit1 ?? signal.entry * 1.02))}`,
      `🛑 *Stop Loss:* ${escapeV2('$' + formatPrice(signal.stopLoss ?? signal.entry * 0.98))}`,
      `📊 *Confidence:* ${escapeV2(String(signal.confidence))}% ${escapeV2(confBar)}`,
      `⏱ *Timeframe:* ${escapeV2(signal.timeframe)}`,
      '',
      escapeV2('📈 Powered by TradeClaw — tradeclaw.win'),
      escapeV2('⚠️ For educational purposes only. Not financial advice.'),
    ];

    const text = lines.join('\n');

    // Send via Telegram Bot API
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { success: false, error: 'Telegram bot is not configured on this server.' },
        { status: 503 }
      );
    }

    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: true,
        }),
      }
    );

    const tgData = await tgRes.json() as { ok: boolean; description?: string };

    if (!tgData.ok) {
      // Friendly messages for common Telegram errors
      const desc = tgData.description ?? '';
      let userError = 'Could not deliver message. ';
      if (desc.includes('chat not found') || desc.includes('user not found')) {
        userError += 'Chat ID not found. Make sure you sent /start to the bot first.';
      } else if (desc.includes('bot was blocked')) {
        userError += 'You have blocked the bot. Unblock it in Telegram and try again.';
      } else {
        userError += desc || 'Please verify your chat ID and try again.';
      }
      return NextResponse.json({ success: false, error: userError }, { status: 400 });
    }

    // Record rate limit
    rateLimitMap.set(chatId, now);

    return NextResponse.json({
      success: true,
      signal: {
        pair: signal.symbol,
        direction: signal.direction,
        confidence: signal.confidence,
        entry: signal.entry,
        takeProfit: signal.takeProfit1,
        stopLoss: signal.stopLoss,
      },
    });
  } catch (err) {
    console.error('[demo/telegram] error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
