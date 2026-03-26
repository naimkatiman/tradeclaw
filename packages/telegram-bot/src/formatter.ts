import type { SignalForBot } from './types';

/**
 * Escape special characters for Telegram MarkdownV2 parse mode.
 * All chars outside formatting markers must be escaped.
 */
export function escapeV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function formatPrice(p: number): string {
  if (p >= 1000) {
    return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

/**
 * Format a trading signal into a rich Telegram MarkdownV2 message.
 */
export function formatSignalMessage(signal: SignalForBot, appUrl?: string): string {
  const emoji = signal.direction === 'BUY' ? '🟢' : '🔴';
  const dirLabel = signal.direction === 'BUY' ? 'BUY SIGNAL' : 'SELL SIGNAL';

  const lines: string[] = [
    `${emoji} *${escapeV2(`${dirLabel} — ${signal.symbol}`)}*`,
    escapeV2('━━━━━━━━━━━━━━━━━'),
    `💰 *Entry:* \\$${escapeV2(formatPrice(signal.entry))}`,
    `🎯 *Take Profit:* \\$${escapeV2(formatPrice(signal.takeProfit1))}`,
    `🛑 *Stop Loss:* \\$${escapeV2(formatPrice(signal.stopLoss))}`,
    `📊 *Confidence:* ${escapeV2(String(signal.confidence))}%`,
    `⏱ *Timeframe:* ${escapeV2(signal.timeframe)}`,
    '',
  ];

  if (signal.indicators) {
    lines.push('*Indicators:*');
    if (signal.indicators.rsi) {
      const { value, signal: sig } = signal.indicators.rsi;
      const label = sig === 'oversold' ? 'oversold ✅' : sig === 'overbought' ? 'overbought ⚠️' : 'neutral';
      lines.push(`• RSI: ${escapeV2(value.toFixed(1))} \\(${escapeV2(label)}\\)`);
    }
    if (signal.indicators.macd) {
      const label =
        signal.indicators.macd.signal === 'bullish'
          ? 'bullish crossover ✅'
          : signal.indicators.macd.signal === 'bearish'
          ? 'bearish crossover ⚠️'
          : 'neutral';
      lines.push(`• MACD: ${escapeV2(label)}`);
    }
    if (signal.indicators.ema) {
      const label =
        signal.indicators.ema.trend === 'up'
          ? 'price above 50 EMA ✅'
          : signal.indicators.ema.trend === 'down'
          ? 'price below 50 EMA ⚠️'
          : 'sideways';
      lines.push(`• EMA: ${escapeV2(label)}`);
    }
    lines.push('');
  }

  lines.push(`⚠️ _Not financial advice\\. DYOR\\._`);

  if (appUrl) {
    const detailUrl = `${appUrl}/signal/${encodeURIComponent(signal.symbol.toLowerCase())}`;
    lines.push(`🔗 [View details](${detailUrl})`);
  }

  return lines.join('\n');
}

/**
 * Format a welcome message for new /start command users.
 */
export function formatWelcomeMessage(firstName?: string): string {
  const name = firstName ? escapeV2(firstName) : 'trader';
  return [
    `👋 *Welcome to TradeClaw, ${name}\\!*`,
    '',
    'I send real\\-time trading signal alerts for Forex, Crypto, and Commodities\\.',
    '',
    '*Quick start:*',
    '• /subscribe — Subscribe to all signals',
    '• /pairs — Browse available trading pairs',
    '• /signals — Fetch the latest signals now',
    '• /help — Full command list',
    '',
    '_Powered by TradeClaw open\\-source platform_',
  ].join('\n');
}

/**
 * Format the help message listing all available commands.
 */
export function formatHelpMessage(): string {
  return [
    '*TradeClaw Bot Commands*',
    escapeV2('━━━━━━━━━━━━━━━━━'),
    '/start — Welcome message',
    '/subscribe — Subscribe to signal alerts',
    '/unsubscribe — Stop receiving alerts',
    '/signals — Get latest signals on demand',
    '/pairs — List available trading pairs',
    '/settings — View your subscription settings',
    '/help — Show this help message',
    '',
    '_Set your preferences after /subscribe to filter by pair or confidence threshold\\._',
  ].join('\n');
}
