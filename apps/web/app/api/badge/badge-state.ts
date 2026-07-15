import type { NextRequest } from 'next/server';
import type { BadgeDirection } from '../../lib/badge';
import { getTrackedSignalsForRequest } from '../../../lib/tracked-signals';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../lib/signal-thresholds';

export interface AvailableBadgeState {
  available: true;
  direction: BadgeDirection;
  confidence: number;
  rsi: number;
  recordedAt: string | null;
  dataQuality: 'real';
}

export interface UnavailableBadgeState {
  available: false;
  direction: null;
  confidence: null;
  rsi: null;
  recordedAt: null;
  dataQuality: null;
  reason: 'unsupported-symbol' | 'no-eligible-recorded-signal' | 'signal-source-unavailable';
}

export type BadgeState = AvailableBadgeState | UnavailableBadgeState;

export function unavailableBadgeState(reason: UnavailableBadgeState['reason']): UnavailableBadgeState {
  return {
    available: false,
    direction: null,
    confidence: null,
    rsi: null,
    recordedAt: null,
    dataQuality: null,
    reason,
  };
}

function validRecordedAt(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

export async function loadBadgeState(
  request: NextRequest,
  pair: string,
  timeframe: string,
): Promise<BadgeState> {
  try {
    const { signals } = await getTrackedSignalsForRequest(request, {
      symbol: pair,
      timeframe,
      minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE,
    });

    const signal = signals.find((candidate) =>
      candidate.dataQuality === 'real' &&
      (candidate.direction === 'BUY' || candidate.direction === 'SELL') &&
      Number.isFinite(candidate.confidence) &&
      candidate.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE &&
      candidate.confidence <= 100 &&
      Number.isFinite(candidate.indicators?.rsi?.value),
    );

    if (!signal) return unavailableBadgeState('no-eligible-recorded-signal');
    const recordedAt = validRecordedAt(signal.timestamp);
    if (!recordedAt) return unavailableBadgeState('no-eligible-recorded-signal');

    return {
      available: true,
      direction: signal.direction,
      confidence: signal.confidence,
      rsi: signal.indicators.rsi.value,
      recordedAt,
      dataQuality: 'real',
    };
  } catch {
    return unavailableBadgeState('signal-source-unavailable');
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateUnavailableBadgeSvg(symbol: string, reason: string): string {
  const label = 'TradeClaw';
  const value = `${symbol} unavailable`;
  const leftWidth = 78;
  const rightWidth = Math.max(92, Math.ceil(value.length * 6.5) + 24);
  const totalWidth = leftWidth + rightWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${escapeXml(`${label}: ${value}`)}">
  <title>${escapeXml(`No eligible recorded signal is available (${reason}). No placeholder values were substituted.`)}</title>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#1a1a2e"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="#6b7280"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${leftWidth / 2}" y="14">${label}</text>
    <text x="${leftWidth + rightWidth / 2}" y="14">${escapeXml(value)}</text>
  </g>
</svg>`;
}

export const BADGE_RESPONSE_HEADERS = {
  'Content-Type': 'image/svg+xml',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
} as const;
