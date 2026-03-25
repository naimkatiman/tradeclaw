import { NextRequest, NextResponse } from 'next/server';

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

interface SignalPayload {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
}

function formatSignalMessage(signal: SignalPayload): string {
  const arrow = signal.direction === 'BUY' ? '▲' : '▼';
  const lines = [
    `${arrow} ${signal.symbol} ${signal.direction}`,
    `Confidence: ${signal.confidence}%`,
  ];
  if (signal.entry) lines.push(`Entry: ${signal.entry}`);
  if (signal.stopLoss) lines.push(`SL: ${signal.stopLoss}`);
  if (signal.takeProfit) lines.push(`TP: ${signal.takeProfit}`);
  lines.push(`\nPowered by TradeClaw`);
  return lines.join('\n');
}

async function sendTelegramMessage(config: TelegramConfig, text: string): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    return { ok: false, error: data.description || 'Telegram API error' };
  }
  return { ok: true };
}

// POST /api/telegram — send a signal or test message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botToken, chatId, signal, test } = body as {
      botToken: string;
      chatId: string;
      signal?: SignalPayload;
      test?: boolean;
    };

    if (!botToken || !chatId) {
      return NextResponse.json({ error: 'botToken and chatId are required' }, { status: 400 });
    }

    const config: TelegramConfig = { botToken, chatId };

    if (test) {
      const result = await sendTelegramMessage(config, 'TradeClaw connected. You will receive trading signals here.');
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, message: 'Test message sent' });
    }

    if (!signal) {
      return NextResponse.json({ error: 'signal payload required' }, { status: 400 });
    }

    const text = formatSignalMessage(signal);
    const result = await sendTelegramMessage(config, text);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
