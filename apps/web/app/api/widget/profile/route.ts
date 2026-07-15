import { NextRequest, NextResponse } from 'next/server';
import { getTrackedSignalsForRequest } from '../../../../lib/tracked-signals';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../../lib/signal-thresholds';

export const dynamic = 'force-dynamic';

const VALID_PAIRS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD',
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'XRPUSD',
];

const SHORT_NAMES: Record<string, string> = {
  BTCUSD: 'BTC/USD', ETHUSD: 'ETH/USD', XAUUSD: 'XAU/USD',
  XAGUSD: 'XAG/USD', EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY', AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD', XRPUSD: 'XRP/USD',
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function responseHeaders(state: 'recorded-real-signal' | 'unavailable', recordedAt?: string) {
  return {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff',
    'X-TradeClaw-Data-State': state,
    ...(recordedAt ? { 'X-TradeClaw-Recorded-At': recordedAt } : {}),
  };
}

function buildUnavailableSvg(pair: string, theme: 'dark' | 'light', reason: string): string {
  const isDark = theme === 'dark';
  const bg = isDark ? '#0d1117' : '#ffffff';
  const border = isDark ? '#30363d' : '#d0d7de';
  const textPrimary = isDark ? '#e6edf3' : '#1f2328';
  const textMuted = isDark ? '#8b949e' : '#656d76';
  const shortName = SHORT_NAMES[pair] ?? pair;

  return `<svg width="495" height="195" viewBox="0 0 495 195" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="TradeClaw ${esc(shortName)} signal unavailable">
  <title>No eligible recorded signal is available (${esc(reason)}). No placeholder values were substituted.</title>
  <rect x="0.5" y="0.5" rx="4.5" height="194" width="494" stroke="${border}" fill="${bg}"/>
  <text x="25" y="42" font-family="Segoe UI,Arial,sans-serif" font-size="14" font-weight="700" fill="${textPrimary}">TradeClaw</text>
  <text x="25" y="86" font-family="Segoe UI,Arial,sans-serif" font-size="22" font-weight="700" fill="${textPrimary}">${esc(shortName)}</text>
  <text x="25" y="122" font-family="Segoe UI,Arial,sans-serif" font-size="16" font-weight="600" fill="${textMuted}">SIGNAL UNAVAILABLE</text>
  <text x="25" y="148" font-family="Segoe UI,Arial,sans-serif" font-size="11" fill="${textMuted}">No confidence, entry price, or RSI placeholder is shown.</text>
  <text x="25" y="180" font-family="Segoe UI,Arial,sans-serif" font-size="10" fill="${textMuted}">Latest eligible recorded real-quality signals only</text>
</svg>`;
}

function buildSvg({
  pair,
  direction,
  confidence,
  entryPrice,
  rsi,
  theme,
}: {
  pair: string;
  direction: string;
  confidence: number;
  entryPrice: number;
  rsi: number;
  theme: 'dark' | 'light';
}): string {
  const isDark = theme === 'dark';
  const bg = isDark ? '#0d1117' : '#ffffff';
  const border = isDark ? '#30363d' : '#d0d7de';
  const textPrimary = isDark ? '#e6edf3' : '#1f2328';
  const textMuted = isDark ? '#8b949e' : '#656d76';
  const accentColor = isDark ? '#10b981' : '#1a7f37';
  const logoColor = isDark ? '#10b981' : '#1a7f37';
  const barBg = isDark ? '#21262d' : '#eaeef2';

  const dirColor = direction === 'BUY'
    ? (isDark ? '#3fb950' : '#1a7f37')
    : direction === 'SELL'
      ? (isDark ? '#f85149' : '#cf222e')
      : (isDark ? '#8b949e' : '#656d76');

  const barFill = direction === 'BUY'
    ? (isDark ? '#3fb950' : '#1a7f37')
    : direction === 'SELL'
      ? (isDark ? '#f85149' : '#cf222e')
      : (isDark ? '#8b949e' : '#656d76');

  const barWidth = Math.round((confidence / 100) * 415);
  const shortName = SHORT_NAMES[pair] ?? pair;
  const priceDisplay = entryPrice >= 1000
    ? entryPrice.toFixed(2)
    : entryPrice >= 1
      ? entryPrice.toFixed(4)
      : entryPrice.toFixed(6);

  // 495×195 — standard GitHub stats card size
  return `<svg width="495" height="195" viewBox="0 0 495 195" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="TradeClaw Signal: ${esc(shortName)} ${esc(direction)} ${confidence}%">
  <title>TradeClaw Signal — ${esc(shortName)} ${esc(direction)} ${confidence}% confidence</title>
  <rect x="0.5" y="0.5" rx="4.5" height="99%" stroke="${esc(border)}" width="494" fill="${esc(bg)}"/>

  <!-- Header row -->
  <g>
    <!-- Lightning bolt icon -->
    <text x="25" y="38" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="18" fill="${esc(logoColor)}">⚡</text>
    <text x="44" y="36" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="14" font-weight="700" fill="${esc(textPrimary)}">TradeClaw</text>
    <text x="44" y="52" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="11" fill="${esc(textMuted)}">Latest eligible recorded signal</text>
  </g>

  <!-- Pair name -->
  <text x="25" y="90" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="22" font-weight="700" fill="${esc(textPrimary)}">${esc(shortName)}</text>

  <!-- Direction badge -->
  <rect x="185" y="72" width="${direction.length * 9 + 20}" height="24" rx="12" fill="${esc(dirColor)}" opacity="0.15"/>
  <text x="${185 + (direction.length * 9 + 20) / 2}" y="88" text-anchor="middle" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="12" font-weight="700" fill="${esc(dirColor)}">${esc(direction)}</text>

  <!-- Confidence label -->
  <text x="25" y="120" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="11" fill="${esc(textMuted)}">CONFIDENCE</text>
  <text x="25" y="140" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="22" font-weight="700" fill="${esc(dirColor)}">${confidence}%</text>

  <!-- Entry price label -->
  <text x="200" y="120" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="11" fill="${esc(textMuted)}">ENTRY PRICE</text>
  <text x="200" y="140" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="18" font-weight="600" fill="${esc(textPrimary)}">${esc(priceDisplay)}</text>

  <!-- RSI label -->
  <text x="370" y="120" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="11" fill="${esc(textMuted)}">RSI</text>
  <text x="370" y="140" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="18" font-weight="600" fill="${esc(textPrimary)}">${rsi.toFixed(1)}</text>

  <!-- Progress bar -->
  <rect x="25" y="157" width="445" height="6" rx="3" fill="${esc(barBg)}"/>
  <rect x="25" y="157" width="${barWidth}" height="6" rx="3" fill="${esc(barFill)}"/>

  <!-- Footer -->
  <text x="25" y="183" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="10" fill="${esc(textMuted)}">tradeclaw.win · OHLCV-based signal research</text>
  <text x="470" y="183" text-anchor="end" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="10" fill="${esc(accentColor)}">⭐ Star</text>
</svg>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawPair = searchParams.get('pair')?.toUpperCase() ?? 'BTCUSD';
  const pair = rawPair;
  const theme = searchParams.get('theme') === 'light' ? 'light' : 'dark';

  if (!VALID_PAIRS.includes(pair)) {
    return new NextResponse(buildUnavailableSvg(pair, theme, 'unsupported-symbol'), {
      headers: responseHeaders('unavailable'),
    });
  }

  try {
    const { signals } = await getTrackedSignalsForRequest(request, {
      symbol: pair,
      timeframe: 'H1',
      minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE,
    });
    const signal = signals.find((candidate) =>
      candidate.dataQuality === 'real' &&
      (candidate.direction === 'BUY' || candidate.direction === 'SELL') &&
      Number.isFinite(candidate.confidence) &&
      candidate.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE &&
      candidate.confidence <= 100 &&
      Number.isFinite(candidate.entry) &&
      Number.isFinite(candidate.indicators?.rsi?.value) &&
      !Number.isNaN(Date.parse(candidate.timestamp)),
    );
    if (!signal) {
      return new NextResponse(buildUnavailableSvg(pair, theme, 'no-eligible-recorded-signal'), {
        headers: responseHeaders('unavailable'),
      });
    }

    const svg = buildSvg({
      pair,
      direction: signal.direction,
      confidence: signal.confidence,
      entryPrice: signal.entry,
      rsi: signal.indicators.rsi.value,
      theme,
    });
    return new NextResponse(svg, {
      headers: responseHeaders('recorded-real-signal', signal.timestamp),
    });
  } catch {
    return new NextResponse(buildUnavailableSvg(pair, theme, 'signal-source-unavailable'), {
      headers: responseHeaders('unavailable'),
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
