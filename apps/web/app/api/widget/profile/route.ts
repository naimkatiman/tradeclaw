import { NextRequest, NextResponse } from 'next/server';
import { getTrackedSignals } from '../../../../lib/tracked-signals';
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
    <text x="44" y="52" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="11" fill="${esc(textMuted)}">Live Signal Feed</text>
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
  <text x="25" y="183" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="10" fill="${esc(textMuted)}">tradeclaw.win · Open Source AI Trading Signals</text>
  <text x="470" y="183" text-anchor="end" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="10" fill="${esc(accentColor)}">⭐ Star</text>
</svg>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawPair = searchParams.get('pair')?.toUpperCase() ?? 'BTCUSD';
  const pair = VALID_PAIRS.includes(rawPair) ? rawPair : 'BTCUSD';
  const theme = searchParams.get('theme') === 'light' ? 'light' : 'dark';

  let direction = 'NEUTRAL';
  let confidence = 0;
  let entryPrice = 0;
  let rsi = 50;

  try {
    const { signals } = await getTrackedSignals({
      symbol: pair,
      timeframe: 'H1',
      minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE,
    });
    const signal = signals[0];
    if (signal) {
      direction = signal.direction;
      confidence = signal.confidence;
      entryPrice = signal.entryPrice;
      rsi = signal.indicators.rsi.value;
    }
  } catch {
    // Fallback values already set
  }

  const svg = buildSvg({ pair, direction, confidence, entryPrice, rsi, theme });

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, max-age=300',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Content-Type-Options': 'nosniff',
    },
  });
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
