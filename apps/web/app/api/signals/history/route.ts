import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { readHistory, resolveRealOutcomes, type SignalHistoryRecord } from '../../../../lib/signal-history';

export async function GET(request: NextRequest) {
  // Resolve real outcomes for any pending non-simulated records
  await resolveRealOutcomes();
  const { searchParams } = new URL(request.url);
  
  const pair = searchParams.get('pair')?.toUpperCase();
  const direction = searchParams.get('direction')?.toUpperCase() as 'BUY' | 'SELL' | undefined;
  const outcome = searchParams.get('outcome'); // 'win' | 'loss' | 'pending'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  let records = readHistory();

  // Filters
  if (pair) records = records.filter(r => r.pair === pair);
  if (direction === 'BUY' || direction === 'SELL') records = records.filter(r => r.direction === direction);
  if (outcome === 'win') records = records.filter(r => r.outcomes['24h']?.hit === true);
  if (outcome === 'loss') records = records.filter(r => r.outcomes['24h']?.hit === false);
  if (outcome === 'pending') records = records.filter(r => !r.outcomes['24h']);

  // Sort by timestamp desc
  records.sort((a, b) => b.timestamp - a.timestamp);

  const total = records.length;
  const page = records.slice(offset, offset + limit);

  // Compute aggregate stats — exclude simulated seed data
  const resolved = records.filter(r => r.outcomes['24h'] && !r.isSimulated);
  const wins = resolved.filter(r => r.outcomes['24h']!.hit);
  const totalPnl = resolved.reduce((sum, r) => sum + (r.outcomes['24h']?.pnlPct ?? 0), 0);
  const avgConfidence = records.length > 0 
    ? records.reduce((sum, r) => sum + r.confidence, 0) / records.length 
    : 0;

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
    },
  });
=======
import { readHistory, resolveRealOutcomes } from '../../../../lib/signal-history';

export async function GET(request: NextRequest) {
  try {
    // Resolve real outcomes for any pending non-simulated records
    await resolveRealOutcomes();
    const { searchParams } = new URL(request.url);

    const pair = searchParams.get('pair')?.toUpperCase();
    const direction = searchParams.get('direction')?.toUpperCase() as 'BUY' | 'SELL' | undefined;
    const outcome = searchParams.get('outcome'); // 'win' | 'loss' | 'pending'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    let records = readHistory();

    // Filters
    if (pair) records = records.filter(r => r.pair === pair);
    if (direction === 'BUY' || direction === 'SELL') records = records.filter(r => r.direction === direction);
    if (outcome === 'win') records = records.filter(r => r.outcomes['24h']?.hit === true);
    if (outcome === 'loss') records = records.filter(r => r.outcomes['24h']?.hit === false);
    if (outcome === 'pending') records = records.filter(r => !r.outcomes['24h']);

    // Sort by timestamp desc
    records.sort((a, b) => b.timestamp - a.timestamp);

    const total = records.length;
    const page = records.slice(offset, offset + limit);

    // Compute aggregate stats — exclude simulated seed data
    const resolved = records.filter(r => r.outcomes['24h'] && !r.isSimulated);
    const wins = resolved.filter(r => r.outcomes['24h']!.hit);
    const totalPnl = resolved.reduce((sum, r) => sum + (r.outcomes['24h']?.pnlPct ?? 0), 0);
    const avgConfidence = records.length > 0
      ? records.reduce((sum, r) => sum + r.confidence, 0) / records.length
      : 0;

    // Best signal by P&L %
    let bestSignal: { pair: string; pnlPct: number } | null = null;
    for (const r of resolved) {
      const pnl = r.outcomes['24h']?.pnlPct ?? 0;
      if (!bestSignal || pnl > bestSignal.pnlPct) {
        bestSignal = { pair: r.pair, pnlPct: pnl };
      }
    }

    // Current streak (win/loss) — sorted newest first
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
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
>>>>>>> origin/main
}
