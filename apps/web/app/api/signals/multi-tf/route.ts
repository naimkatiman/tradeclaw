import { NextRequest, NextResponse } from 'next/server';
import { generateMultiTFSignal, type SignalMode } from '../../../lib/signal-generator';
import { SYMBOLS } from '../../../lib/signals';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairFilter = searchParams.get('pair')?.toUpperCase();
    const modeParam = searchParams.get('mode')?.toLowerCase();
    const mode: SignalMode = modeParam === 'scalp' ? 'scalp' : 'swing';

    if (pairFilter && !SYMBOLS.some(s => s.symbol === pairFilter)) {
      return NextResponse.json(
        { error: `Unknown symbol: ${pairFilter}`, available: SYMBOLS.map(s => s.symbol) },
        { status: 400 }
      );
    }

    const targetSymbols = pairFilter
      ? SYMBOLS.filter(s => s.symbol === pairFilter)
      : SYMBOLS;

    const settled = await Promise.allSettled(
      targetSymbols.map(s => generateMultiTFSignal(s.symbol, mode))
    );

    const results = settled
      .filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof generateMultiTFSignal>>> =>
          r.status === 'fulfilled' && r.value !== null
      )
      .map(r => r.value!);

    // Build summary stats
    const bullish = results.filter(r => r.dominantDirection === 'BUY').length;
    const bearish = results.filter(r => r.dominantDirection === 'SELL').length;
    const conflicted = results.filter(r => r.isConflicted).length;
    const allAligned = results.filter(r => r.agreementCount === 3).length;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      mode,
      count: results.length,
      summary: { bullish, bearish, conflicted, allAligned },
      results,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
