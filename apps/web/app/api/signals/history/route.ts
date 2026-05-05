import { NextRequest, NextResponse } from 'next/server';
import { resolveRealOutcomes, isCountedResolved, isRealOutcome, type SignalHistoryRecord } from '../../../../lib/signal-history';
import { getResolvedSlice, parseScope } from '../../../../lib/signal-slice';
import { getTierFromRequest, meetsMinimumTier, upgradeRequiredBody } from '../../../../lib/tier';
import { parseCategoryFilter, symbolsForCategory } from '../../../lib/symbol-config';

const CSV_HEADERS = [
  'id',
  'pair',
  'timeframe',
  'direction',
  'confidence',
  'entryPrice',
  'takeProfit1',
  'stopLoss',
  'timestamp',
  'strategyId',
  'gateBlocked',
  'gateReason',
  'outcome4hHit',
  'outcome4hPnlPct',
  'outcome24hHit',
  'outcome24hPnlPct',
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = value instanceof Date ? value.toISOString() : String(value);
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function signalHistoryToCsv(records: SignalHistoryRecord[]): string {
  const rows = records.map(record => [
    record.id,
    record.pair,
    record.timeframe,
    record.direction,
    record.confidence,
    record.entryPrice,
    record.tp1,
    record.sl,
    new Date(record.timestamp).toISOString(),
    record.strategyId,
    record.gateBlocked ?? false,
    record.gateReason,
    record.outcomes['4h']?.hit,
    record.outcomes['4h']?.pnlPct,
    record.outcomes['24h']?.hit,
    record.outcomes['24h']?.pnlPct,
  ]);

  return [
    CSV_HEADERS.join(','),
    ...rows.map(row => row.map(csvCell).join(',')),
  ].join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format')?.toLowerCase();

    if (format === 'csv') {
      const tier = await getTierFromRequest(request);
      if (!meetsMinimumTier(tier, 'pro')) {
        return NextResponse.json(
          upgradeRequiredBody({
            reason: 'Signal history CSV export requires Pro.',
            source: 'signals-history-csv',
          }),
          { status: 402 },
        );
      }
    }

    await resolveRealOutcomes();

    // `scope=pro` (default) shows all-symbol / full-history track record as a
    // marketing surface — past outcomes have no tradable edge. `scope=free`
    // restricts to the free-tier symbol whitelist and 24h window so anyone
    // can compare what the free experience delivers against Pro.
    //
    // Track record is intentionally NOT gated by the caller's tier. Gating
    // here would hide the product's capability from the exact people we need
    // to show it to.
    const scope = parseScope(searchParams.get('scope'));
    const category = parseCategoryFilter(searchParams.get('category'));

    const pair = searchParams.get('pair')?.toUpperCase();
    const direction = searchParams.get('direction')?.toUpperCase() as 'BUY' | 'SELL' | undefined;
    const outcome = searchParams.get('outcome');
    const period = searchParams.get('period');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Shared source of truth — equity endpoint reads from the same slice so
    // win-rate / resolved counts can never disagree across surfaces.
    const slice = await getResolvedSlice({ scope, period });
    let records = slice.periodFiltered;

    const categorySymbols = !pair && category !== 'all'
      ? new Set(symbolsForCategory(category))
      : null;

    if (pair) records = records.filter(r => r.pair === pair);
    if (categorySymbols) records = records.filter(r => categorySymbols.has(r.pair));
    if (direction === 'BUY' || direction === 'SELL') records = records.filter(r => r.direction === direction);
    if (outcome === 'win') records = records.filter(r => r.outcomes['24h']?.hit === true);
    if (outcome === 'loss') records = records.filter(r => r.outcomes['24h']?.hit === false);
    if (outcome === 'pending') records = records.filter(r => !r.outcomes['24h']);

    const sort = searchParams.get('sort');
    if (sort === 'resolved-first') {
      const resolvedSorted = records.filter(r => r.outcomes['24h'] !== null).sort((a, b) => b.timestamp - a.timestamp);
      const pending = records.filter(r => r.outcomes['24h'] === null).sort((a, b) => b.timestamp - a.timestamp);
      records = [...resolvedSorted, ...pending];
    } else {
      records.sort((a, b) => b.timestamp - a.timestamp);
    }

    if (format === 'csv') {
      const csv = signalHistoryToCsv(records);
      const filename = `tradeclaw-signal-history-${new Date().toISOString().slice(0, 10)}.csv`;
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }

    const total = records.length;
    const page = records.slice(offset, offset + limit);

    // Counted resolved = same predicate every other surface uses (equity,
    // leaderboard, strategy breakdown). When pair/direction filters are
    // applied, recompute from the filtered records so the stats reflect the
    // user's view; otherwise reuse the shared slice's resolved set so the
    // unfiltered view byte-matches /api/signals/equity.
    const filtersApplied = pair || categorySymbols || direction === 'BUY' || direction === 'SELL'
      || outcome === 'win' || outcome === 'loss' || outcome === 'pending';
    const resolved = filtersApplied
      ? records.filter(isCountedResolved)
      : slice.resolved;
    const wins = resolved.filter(r => r.outcomes['24h']!.hit);
    const totalPnl = resolved.reduce((sum, r) => sum + (r.outcomes['24h']?.pnlPct ?? 0), 0);
    const avgConfidence = records.length > 0
      ? records.reduce((sum, r) => sum + r.confidence, 0) / records.length
      : 0;

    // Excluded buckets — surfaced for transparency, not folded into win-rate.
    const expired = records.filter(r =>
      !r.isSimulated && !r.gateBlocked && r.outcomes['24h'] && !isRealOutcome(r.outcomes['24h'])
    ).length;
    const gateBlocked = records.filter(r => r.gateBlocked).length;
    const pending = records.filter(r => !r.isSimulated && !r.gateBlocked && !r.outcomes['24h']).length;

    let bestSignal: { pair: string; pnlPct: number } | null = null;
    for (const r of resolved) {
      const pnl = r.outcomes['24h']?.pnlPct ?? 0;
      if (!bestSignal || pnl > bestSignal.pnlPct) {
        bestSignal = { pair: r.pair, pnlPct: pnl };
      }
    }

    // Streak walks only counted-resolved trades (most recent first). Skipping
    // expired/gate-blocked rows is the whole point of using the canonical
    // predicate — otherwise streak counts placeholders as losses.
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
      scope,
      category,
      earliestTimestamp: slice.earliestTimestamp,
      stats: {
        totalSignals: records.length,
        resolved: resolved.length,
        expired,
        gateBlocked,
        pending,
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
