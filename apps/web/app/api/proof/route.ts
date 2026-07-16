import { NextResponse } from 'next/server';
import {
  isCountedResolved,
  isObservedOHLCVOutcomeSource,
  isRealOutcome,
} from '../../../lib/signal-history';
import { getResolvedSlice } from '../../../lib/signal-slice';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export interface ProofSignal {
  id: string;
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  tp1?: number;
  sl?: number;
  timestamp: number;
  isSimulated: boolean;
  telegramPostedAt?: number;
  outcome4h: {
    resolved: boolean;
    hit: boolean | null;
    price: number | null;
    pnlPct: number | null;
  };
  outcome24h: {
    resolved: boolean;
    hit: boolean | null;
    price: number | null;
    pnlPct: number | null;
  };
}

export interface ProofResponse {
  stats: ProofStats;
  signals: ProofSignal[];
  methodology: {
    population: string;
    score: string;
    runningPnlPct: string;
  };
  window: {
    sourceRecordsLoaded: number;
    sourceReadLimit: number;
    potentiallyTruncatedBeforeStart: boolean;
  };
}

export interface ProofStats {
  totalSignals: number;
  realSignals: number;
  resolvedSignals: number;
  winRate4h: number;
  winRate24h: number;
  avgConfidence: number;
  runningPnlPct: number;
  totalWins: number;
  totalLosses: number;
  openSignals: number;
  lastUpdated: number;
}

export async function GET() {
  try {
    const slice = await getResolvedSlice({ scope: 'pro' });
    const history = slice.scopedRecords;

    const realSignals = history.filter((r) => !r.isSimulated);
    const counted24h = slice.resolved;

    const mapped: ProofSignal[] = realSignals.map((r) => {
      const o4h = r.outcomes['4h'];
      const o24h = r.outcomes['24h'];
      const publishable4h = !r.gateBlocked && isRealOutcome(o4h) && isObservedOHLCVOutcomeSource(o4h.source);
      const publishable24h = isCountedResolved(r);

      return {
        id: r.id,
        pair: r.pair,
        timeframe: r.timeframe,
        direction: r.direction,
        confidence: r.confidence,
        entryPrice: r.entryPrice,
        tp1: r.tp1,
        sl: r.sl,
        timestamp: r.timestamp,
        isSimulated: r.isSimulated ?? false,
        telegramPostedAt: r.telegramPostedAt,
        outcome4h: {
          resolved: publishable4h,
          hit: publishable4h ? o4h.hit : null,
          price: publishable4h ? o4h.price : null,
          pnlPct: publishable4h ? o4h.pnlPct : null,
        },
        outcome24h: {
          resolved: publishable24h,
          hit: publishable24h ? o24h!.hit : null,
          price: publishable24h ? o24h!.price : null,
          pnlPct: publishable24h ? o24h!.pnlPct : null,
        },
      };
    });

    const resolved4h = realSignals.filter((r) => {
      const outcome = r.outcomes['4h'];
      return !r.gateBlocked && isRealOutcome(outcome) && isObservedOHLCVOutcomeSource(outcome.source);
    });
    const wins4h = resolved4h.filter((r) => r.outcomes['4h']!.hit);
    const wins24h = counted24h.filter((r) => r.outcomes['24h']!.hit);
    const losses24h = counted24h.length - wins24h.length;

    const pnlValues = counted24h.map((r) => r.outcomes['24h']!.pnlPct);
    const runningPnlPct =
      pnlValues.length > 0
        ? pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length
        : 0;

    const avgConfidence =
      mapped.length > 0
        ? mapped.reduce((a, b) => a + b.confidence, 0) / mapped.length
        : 0;

    const stats: ProofStats = {
      totalSignals: history.length,
      realSignals: realSignals.length,
      resolvedSignals: counted24h.length,
      winRate4h:
        resolved4h.length > 0
          ? Math.round((wins4h.length / resolved4h.length) * 100)
          : 0,
      winRate24h:
        counted24h.length > 0
          ? Math.round((wins24h.length / counted24h.length) * 100)
          : 0,
      avgConfidence: Math.round(avgConfidence),
      runningPnlPct: Math.round(runningPnlPct * 100) / 100,
      totalWins: wins24h.length,
      totalLosses: losses24h,
      openSignals: mapped.filter(
        (s) => !s.outcome4h.resolved && !s.outcome24h.resolved,
      ).length,
      lastUpdated: mapped.reduce((latest, signal) => Math.max(latest, signal.timestamp), 0),
    };

    const body: ProofResponse = {
      stats,
      signals: mapped.slice(0, 200),
      methodology: {
        population: 'public-scope, non-simulated, non-gate-blocked records with approved observed-OHLCV outcome provenance',
        score: 'mechanical rule/confluence score; not a probability or edge estimate',
        runningPnlPct: 'legacy field name for mean unsized 24h directional price move; not account or portfolio P&L',
      },
      window: {
        sourceRecordsLoaded: slice.sourceRecordsLoaded,
        sourceReadLimit: slice.sourceReadLimit,
        potentiallyTruncatedBeforeStart: slice.sourceWindowPotentiallyTruncated,
      },
    };

    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load proof data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
