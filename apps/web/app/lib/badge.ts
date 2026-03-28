/**
 * Badge SVG generator — produces flat shield-style badges for embedding in READMEs
 * No external dependencies; pure string template.
 */

export type BadgeDirection = 'BUY' | 'SELL' | 'NEUTRAL';

export interface BadgeParams {
  symbol: string;      // Short display name, e.g. "BTC", "EUR/USD"
  direction: BadgeDirection;
  confidence: number;  // 0–100
  rsi: number;         // For tooltip
  timeframe: string;   // e.g. "H1"
}

const DIRECTION_COLOR: Record<BadgeDirection, string> = {
  BUY: '#10b981',
  SELL: '#f43f5e',
  NEUTRAL: '#6b7280',
};

/**
 * Estimate pixel width of a string in DejaVu Sans 11px.
 * Approximation: average 6.5px per character.
 */
function estimateWidth(text: string): number {
  return Math.ceil(text.length * 6.5);
}

export function generateBadgeSvg(params: BadgeParams): string {
  const { symbol, direction, confidence, rsi, timeframe } = params;

  const rightColor = DIRECTION_COLOR[direction];

  const label = 'TradeClaw';
  const value =
    direction === 'NEUTRAL'
      ? `${symbol} · --`
      : `${symbol} · ${direction} ${confidence}%`;

  const labelPad = 12;
  const valuePad = 12;

  const leftWidth = estimateWidth(label) + labelPad * 2;   // ~78px
  const rightWidth = estimateWidth(value) + valuePad * 2;
  const totalWidth = leftWidth + rightWidth;

  const leftCenter = leftWidth / 2;
  const rightCenter = leftWidth + rightWidth / 2;

  const ariaLabel = `${label}: ${value}`;
  const titleText = `${ariaLabel} | RSI: ${rsi.toFixed(1)} | ${timeframe}`;

  // Escape any special XML chars in dynamic text
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${esc(ariaLabel)}">
  <title>${esc(titleText)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#1a1a2e"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${rightColor}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${leftCenter}" y="15" fill="#010101" fill-opacity=".25" aria-hidden="true">${esc(label)}</text>
    <text x="${leftCenter}" y="14">${esc(label)}</text>
    <text x="${rightCenter}" y="15" fill="#010101" fill-opacity=".25" aria-hidden="true">${esc(value)}</text>
    <text x="${rightCenter}" y="14">${esc(value)}</text>
  </g>
</svg>`;
}

/** Map full symbol to short display name for badge text */
export const BADGE_SHORT_NAMES: Record<string, string> = {
  XAUUSD: 'XAU',
  XAGUSD: 'XAG',
  BTCUSD: 'BTC',
  ETHUSD: 'ETH',
  XRPUSD: 'XRP',
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  AUDUSD: 'AUD/USD',
  USDCAD: 'USD/CAD',
  NZDUSD: 'NZD/USD',
  USDCHF: 'USD/CHF',
};
