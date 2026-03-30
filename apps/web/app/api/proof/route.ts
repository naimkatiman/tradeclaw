import { NextResponse } from 'next/server';
import { readHistory } from '../../../lib/signal-history';

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
  outcome4h: {
    resolved: boolean;
    hit: boolean | null;
    price: number | null;
    pnlPct: number | null;
    resolvedAt?: number;
  };
  outcome24h: {
    resolved: boolean;
    hit: boolean | null;
    price: number | null;
    pnlPct: number | null;
    resolvedAt?: number;
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

export interface ProofResponse {
  stats: ProofStats;
  signals: ProofSignal[];
}

export async function GET() {
  try {
    const history = readHistory();

    // Filter: only non-simulated (real) signals
    const realSignals = history.filter((r) => r.isSimulated === false);

    const mapped: ProofSignal[] = realSignals.map((r) => {
      const o4h = r.outcomes['4h'];
      const o24h = r.outcomes['24h'];

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
        outcome4h: {
          resolved: o4h !== null,
          hit: o4h ? o4h.hit : null,
          price: o4h ? o4h.price : null,
          pnlPct: o4h ? o4h.pnlPct : null,
        },
        outcome24h: {
          resolved: o24h !== null,
          hit: o24h ? o24h.hit : null,
          price: o24h ? o24h.price : null,
          pnlPct: o24h ? o24h.pnlPct : null,
        },
      };
    });

    // Compute stats
    const resolved4h = mapped.filter((s) => s.outcome4h.resolved);
    const resolved24h = mapped.filter((s) => s.outcome24h.resolved);
    const wins4h = resolved4h.filter((s) => s.outcome4h.hit === true);
    const wins24h = resolved24h.filter((s) => s.outcome24h.hit === true);

    const allResolved = mapped.filter(
      (s) => s.outcome4h.resolved || s.outcome24h.resolved,
    );
    const allWins = mapped.filter(
      (s) => s.outcome4h.hit === true || s.outcome24h.hit === true,
    );
    const allLosses = mapped.filter(
      (s) =>
        (s.outcome4h.resolved && s.outcome4h.hit === false) ||
        (s.outcome24h.resolved && s.outcome24h.hit === false),
    );

    // Running P&L from resolved 24h outcomes
    const pnlValues = resolved24h
      .map((s) => s.outcome24h.pnlPct ?? 0)
      .filter((v) => v !== 0);
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
      resolvedSignals: allResolved.length,
      winRate4h:
        resolved4h.length > 0
          ? Math.round((wins4h.length / resolved4h.length) * 100)
          : 0,
      winRate24h:
        resolved24h.length > 0
          ? Math.round((wins24h.length / resolved24h.length) * 100)
          : 0,
      avgConfidence: Math.round(avgConfidence),
      runningPnlPct: Math.round(runningPnlPct * 100) / 100,
      totalWins: allWins.length,
      totalLosses: allLosses.length,
      openSignals: mapped.filter(
        (s) => !s.outcome4h.resolved && !s.outcome24h.resolved,
      ).length,
      lastUpdated: Date.now(),
    };

    return NextResponse.json({ stats, signals: mapped.slice(0, 200) });
  } catch (err) {
    console.error('proof API error', err);
    return NextResponse.json({ error: 'Failed to load proof data' }, { status: 500 });
  }
}
