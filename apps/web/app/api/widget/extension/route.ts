import { NextRequest, NextResponse } from 'next/server';
import { getTrackedSignalsForRequest } from '../../../../lib/tracked-signals';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../../lib/signal-thresholds';

export const dynamic = 'force-dynamic';

const DEFAULT_PAIRS = ['BTCUSD', 'ETHUSD', 'XAUUSD'];

function parsePairs(rawPairs: string | null) {
  if (!rawPairs) return DEFAULT_PAIRS;

  const pairs = rawPairs
    .split(',')
    .map((pair) => pair.trim().toUpperCase())
    .filter(Boolean)
    .filter((pair, index, arr) => arr.indexOf(pair) === index)
    .slice(0, 3);

  return pairs.length > 0 ? pairs : DEFAULT_PAIRS;
}

function buildSignalUrl(baseUrl: string, signal: { id?: string; symbol?: string }) {
  if (!signal.id) {
    return `${baseUrl}/dashboard`;
  }

  return `${baseUrl}/signal/${signal.id}`;
}

async function pickBestSignal(request: NextRequest, pair: string) {
  const { signals } = await getTrackedSignalsForRequest(request, {
    symbol: pair,
    minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE,
  });

  return signals
    .filter((signal) =>
      signal.dataQuality === 'real' &&
      (signal.direction === 'BUY' || signal.direction === 'SELL') &&
      Number.isFinite(signal.confidence) &&
      signal.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE &&
      signal.confidence <= 100 &&
      Number.isFinite(signal.entry) &&
      !Number.isNaN(Date.parse(signal.timestamp)),
    )
    .sort((left, right) => right.confidence - left.confidence)[0] ?? null;
}

function unavailableSignal(baseUrl: string, pair: string, reason: string) {
  return {
    available: false,
    symbol: pair,
    direction: null,
    confidence: null,
    entry: null,
    timeframe: null,
    recordedAt: null,
    dataQuality: null,
    source: null,
    reason,
    signalUrl: null,
    dashboardUrl: `${baseUrl}/dashboard`,
  };
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const baseUrl = requestUrl.origin;
  const pairs = parsePairs(requestUrl.searchParams.get('pairs'));

  const signals = await Promise.all(
    pairs.map(async (pair) => {
      let best: Awaited<ReturnType<typeof pickBestSignal>>;
      try {
        best = await pickBestSignal(request, pair);
      } catch {
        return unavailableSignal(baseUrl, pair, 'signal-source-unavailable');
      }

      if (!best) {
        return unavailableSignal(baseUrl, pair, 'no-eligible-recorded-signal');
      }

      return {
        available: true,
        symbol: pair,
        direction: best.direction,
        confidence: Math.round(best.confidence),
        entry: best.entry,
        timeframe: best.timeframe,
        recordedAt: Number.isNaN(Date.parse(best.timestamp)) ? null : best.timestamp,
        dataQuality: 'real' as const,
        source: 'recorded-real-signal',
        reason: null,
        signalUrl: buildSignalUrl(baseUrl, best),
        dashboardUrl: `${baseUrl}/dashboard`,
      };
    })
  );

  return NextResponse.json(
    {
      available: signals.some((signal) => signal.available),
      fetchedAt: new Date().toISOString(),
      baseUrl,
      pairs,
      signals,
      dashboardUrl: `${baseUrl}/dashboard`,
      trackRecordUrl: `${baseUrl}/track-record`,
      note: 'Recorded real-quality signals only; unavailable entries contain no synthetic direction, confidence, or timestamp.',
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    }
  );
}
