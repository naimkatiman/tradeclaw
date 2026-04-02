/**
 * Daily Signal Digest — formats top-3 signals as a MarkdownV2 Telegram message.
 *
 * Used by /api/cron/daily-digest (Vercel cron 08:00 UTC) and /digest/preview.
 */

import { getSignals, type TradingSignal } from '../app/lib/signals';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyDigest {
  signals: TradingSignal[];
  message: string;
  date: string;
  count: number;
}

// ---------------------------------------------------------------------------
// MarkdownV2 helpers
// ---------------------------------------------------------------------------

function esc(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

/**
 * Build a visual confidence bar using block characters.
 * 10 segments — filled (█) for confidence proportion, empty (░) for the rest.
 */
function confidenceBar(confidence: number): string {
  const filled = Math.round((confidence / 100) * 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ---------------------------------------------------------------------------
// Message formatter
// ---------------------------------------------------------------------------

function formatSignalBlock(signal: TradingSignal, idx: number): string {
  const dirEmoji = signal.direction === 'BUY' ? '📈' : '📉';
  const dirLabel = signal.direction;

  const lines: string[] = [
    `${idx > 0 ? '\n' : ''}${dirEmoji} *${esc(`#${idx + 1} ${dirLabel} ${signal.symbol}`)}*`,
    `${esc(confidenceBar(signal.confidence))} ${esc(String(signal.confidence))}%`,
    `💰 Entry: \\$${esc(fmtPrice(signal.entry))}`,
    `🎯 TP: \\$${esc(fmtPrice(signal.takeProfit1))}`,
    `🛑 SL: \\$${esc(fmtPrice(signal.stopLoss))}`,
  ];

  // Indicator summary
  const parts: string[] = [];
  if (signal.indicators.rsi) {
    parts.push(`RSI ${esc(signal.indicators.rsi.value.toFixed(1))}`);
  }
  if (signal.indicators.macd) {
    const bias = signal.indicators.macd.signal === 'bullish' ? '✅' : signal.indicators.macd.signal === 'bearish' ? '⚠️' : '➖';
    parts.push(`MACD ${bias}`);
  }
  if (parts.length > 0) {
    lines.push(`📊 ${parts.join(' \\| ')}`);
  }

  return lines.join('\n');
}

function buildDigestMessage(signals: TradingSignal[], dateStr: string): string {
  const header = [
    `📅 *${esc(`Daily Signal Digest — ${dateStr}`)}*`,
    esc('━'.repeat(24)),
    `_Top ${signals.length} signals by confidence_`,
  ].join('\n');

  const blocks = signals.map((sig, i) => formatSignalBlock(sig, i));

  const footer = [
    '',
    esc('━'.repeat(24)),
    `🤖 _TradeClaw_ \\| [tradeclaw\\.win](https://tradeclaw.win) \\| [GitHub](https://github.com/naimkatiman/tradeclaw)`,
    `⚠️ _Not financial advice\\. DYOR\\._`,
  ].join('\n');

  return [header, '', ...blocks, footer].join('\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch top-3 signals and format as a MarkdownV2 Telegram digest message.
 */
export async function getDailyDigest(): Promise<DailyDigest> {
  const { signals } = await getSignals({ minConfidence: 60 });
  const top = signals.slice(0, 3);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const message = top.length > 0
    ? buildDigestMessage(top, dateStr)
    : `📅 *${esc(`Daily Signal Digest — ${dateStr}`)}*\n\n_No high\\-confidence signals today\\. Markets quiet\\._`;

  return {
    signals: top,
    message,
    date: dateStr,
    count: top.length,
  };
}

/**
 * Return a plain-text version of the digest (for the preview page).
 */
export function digestToPlainText(digest: DailyDigest): string {
  if (digest.count === 0) {
    return `📅 Daily Signal Digest — ${digest.date}\n\nNo high-confidence signals today. Markets quiet.`;
  }

  const lines = [
    `📅 Daily Signal Digest — ${digest.date}`,
    '━'.repeat(24),
    `Top ${digest.count} signals by confidence`,
    '',
  ];

  digest.signals.forEach((sig, i) => {
    const dir = sig.direction === 'BUY' ? '📈' : '📉';
    lines.push(`${dir} #${i + 1} ${sig.direction} ${sig.symbol}`);
    lines.push(`${confidenceBar(sig.confidence)} ${sig.confidence}%`);
    lines.push(`💰 Entry: $${fmtPrice(sig.entry)}`);
    lines.push(`🎯 TP: $${fmtPrice(sig.takeProfit1)}`);
    lines.push(`🛑 SL: $${fmtPrice(sig.stopLoss)}`);

    const parts: string[] = [];
    if (sig.indicators.rsi) parts.push(`RSI ${sig.indicators.rsi.value.toFixed(1)}`);
    if (sig.indicators.macd) {
      const bias = sig.indicators.macd.signal === 'bullish' ? '✅' : sig.indicators.macd.signal === 'bearish' ? '⚠️' : '➖';
      parts.push(`MACD ${bias}`);
    }
    if (parts.length > 0) lines.push(`📊 ${parts.join(' | ')}`);
    lines.push('');
  });

  lines.push('━'.repeat(24));
  lines.push('🤖 TradeClaw | tradeclaw.win');
  lines.push('⚠️ Not financial advice. DYOR.');

  return lines.join('\n');
}
