import { NextRequest, NextResponse } from 'next/server';
import { readHistoryAsync, resolveRealOutcomes } from '../../../../lib/signal-history';
import { readSessionFromRequest } from '../../../../lib/user-session';
import { getUserTier, TIER_SYMBOLS, TIER_HISTORY_DAYS, meetsMinimumTier } from '../../../../lib/tier';

export async function GET(request: NextRequest) {
  try {
    await resolveRealOutcomes();
    const { searchParams } = new URL(request.url);
    const session = readSessionFromRequest(request);
    const tier = session?.userId
      ? await getUserTier(session.userId)
      : 'free' as const;

    const pair = searchParams.get('pair')?.toUpperCase();
    const direction = searchParams.get('direction')?.toUpperCase() as 'BUY' | 'SELL' | undefined;
    const outcome = searchParams.get('outcome');
    const period = searchParams.get('period');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    let records = await readHistoryAsync();

    // Tier gate: filter symbols and history window based on subscription
    const allowedSymbols = TIER_SYMBOLS[tier];
    const historyDays = TIER_HISTORY_DAYS[tier];
    if (!meetsMinimumTier(tier, 'pro')) {
      records = records.filter(r => allowedSymbols.includes(r.pair));
      if (historyDays !== null) {
        const cutoff = Date.now() - historyDays * 24 * 60 * 60 * 1000;
        records = records.filter(r => r.timestamp >= cutoff);
      }
    }

    const periodDays: Record<string, number> = {
      '7d': 7, '30d': 30, '90d': 90, '180d': 180, '1y': 365, '5y': 1825,
    };
    if (period && period in periodDays) {
      const cutoff = Date.now() - periodDays[period] * 24 * 60 * 60 * 1000;
      records = records.filter(r => r.timestamp >= cutoff);
    }
    if (pair) records = records.filter(r => r.pair === pair);
    if (direction === 'BUY' || direction === 'SELL') records = records.filter(r => r.direction === direction);
    if (outcome === 'win') records = records.filter(r => r.outcomes['24h']?.hit === true);
    if (outcome === 'loss') records = records.filter(r => r.outcomes['24h']?.hit === false);
    if (outcome === 'pending') records = records.filter(r => !r.outcomes['24h']);

    const sort = searchParams.get('sort');
    if (sort === 'resolved-first') {
      const resolved = records.filter(r => r.outcomes['24h'] !== null).sort((a, b) => b.timestamp - a.timestamp);
      const pending = records.filter(r => r.outcomes['24h'] === null).sort((a, b) => b.timestamp - a.timestamp);
      records = [...resolved, ...pending];
    } else {
      records.sort((a, b) => b.timestamp - a.timestamp);
    }

    const total = records.length;
    const page = records.slice(offset, offset + limit);

    const resolved = records.filter(r => r.outcomes['24h'] && !r.isSimulated);
    const wins = resolved.filter(r => r.outcomes['24h']!.hit);
    const totalPnl = resolved.reduce((sum, r) => sum + (r.outcomes['24h']?.pnlPct ?? 0), 0);
    const avgConfidence = records.length > 0
      ? records.reduce((sum, r) => sum + r.confidence, 0) / records.length
      : 0;

    let bestSignal: { pair: string; pnlPct: number } | null = null;
    for (const r of resolved) {
      const pnl = r.outcomes['24h']?.pnlPct ?? 0;
      if (!bestSignal || pnl > bestSignal.pnlPct) {
        bestSignal = { pair: r.pair, pnlPct: pnl };
      }
    }

    const sortedResolved = [...resolved].sort((a, b) => b.timestamp - a.timestamp);
    let streak = 0;
    if (sortedResolved.length > 0) {
      const firstHit = sortedResolved[0].outcomes['24h']!.hit;
      for (const r of sortedResolved) {
        if (r.outcomes['24h']!.hit === firstHit) {
          streak += firstHit ? 1 : -1;
        } else {
          break;
        }
      }
    }

    const cacheHeaders = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' };
    return NextResponse.json({
      records: page,
      total,
      offset,
      limit,
      stats: {
        totalSignals: records.length,
        resolved: resolved.length,
        wins: wins.length,
        losses: resolved.length - wins.length,
        winRate: resolved.length > 0 ? +(wins.length / resolved.length * 100).toFixed(1) : 0,
        totalPnlPct: +totalPnl.toFixed(2),
        avgPnlPct: resolved.length > 0 ? +(totalPnl / resolved.length).toFixed(2) : 0,
        avgConfidence: +avgConfidence.toFixed(1),
        bestSignal,
        streak,
      },
    }, { headers: cacheHeaders });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
