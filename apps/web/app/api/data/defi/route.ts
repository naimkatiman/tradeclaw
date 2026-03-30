import { NextRequest, NextResponse } from 'next/server';
import {
  fetchDeFiProtocols,
  fetchTotalTVL,
  fetchDeFiYields,
  fetchDeFiTokenPrices,
  fetchStablecoinData,
} from '../../../lib/data-providers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'overview'; // overview | protocols | yields | tokens | stablecoins
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const minTvl = parseInt(searchParams.get('minTvl') || '1000000', 10);
    const stableOnly = searchParams.get('stableOnly') === 'true';

    switch (view) {
      case 'protocols': {
        const protocols = await fetchDeFiProtocols(limit);
        return NextResponse.json({ protocols, timestamp: new Date().toISOString() });
      }
      case 'yields': {
        const yields = await fetchDeFiYields({ minTvl, stableOnly, limit });
        return NextResponse.json({ yields, timestamp: new Date().toISOString() });
      }
      case 'tokens': {
        const tokens = await fetchDeFiTokenPrices();
        return NextResponse.json({ tokens, timestamp: new Date().toISOString() });
      }
      case 'stablecoins': {
        const stablecoins = await fetchStablecoinData();
        return NextResponse.json({ stablecoins, timestamp: new Date().toISOString() });
      }
      default: {
        // Overview: fetch TVL + top protocols + token prices in parallel
        const [tvl, protocols, tokens] = await Promise.allSettled([
          fetchTotalTVL(),
          fetchDeFiProtocols(10),
          fetchDeFiTokenPrices(),
        ]);

        return NextResponse.json({
          tvl: tvl.status === 'fulfilled' ? tvl.value : null,
          topProtocols: protocols.status === 'fulfilled' ? protocols.value : [],
          tokenPrices: tokens.status === 'fulfilled' ? tokens.value : [],
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
