import { NextRequest, NextResponse } from 'next/server';
import { fetchFrankfurterRates, fetchFawazRates, fetchFrankfurterHistory } from '../../../lib/data-providers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pair = searchParams.get('pair'); // e.g. EURUSD
    const days = parseInt(searchParams.get('days') || '0', 10);

    // Historical data for a specific pair
    if (pair && days > 0) {
      const history = await fetchFrankfurterHistory(pair, days);
      return NextResponse.json({
        pair,
        history,
        source: 'frankfurter',
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch from both providers in parallel, prefer Frankfurter
    const [frankfurter, fawaz] = await Promise.allSettled([
      fetchFrankfurterRates(),
      fetchFawazRates(),
    ]);

    const rates = frankfurter.status === 'fulfilled' && frankfurter.value.length > 0
      ? frankfurter.value
      : fawaz.status === 'fulfilled' ? fawaz.value : [];

    // Merge: fawaz has more pairs (MYR, SGD, etc.)
    const rateMap = new Map(rates.map((r) => [r.pair, r]));
    if (fawaz.status === 'fulfilled') {
      for (const r of fawaz.value) {
        if (!rateMap.has(r.pair)) rateMap.set(r.pair, r);
      }
    }

    return NextResponse.json({
      rates: [...rateMap.values()],
      count: rateMap.size,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
