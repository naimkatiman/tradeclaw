import { NextResponse } from 'next/server';
import {
  fetchBinancePrices,
  fetchHubQuotes,
  isHubEnabled,
} from '../../lib/data-providers';

const STOOQ_SYMBOLS: Record<string, string> = {
  XAUUSD: 'xauusd',
  XAGUSD: 'xagusd',
  EURUSD: 'eurusd',
  GBPUSD: 'gbpusd',
  USDJPY: 'usdjpy',
  AUDUSD: 'audusd',
  USDCAD: 'usdcad',
  NZDUSD: 'nzdusd',
  USDCHF: 'usdchf',
};
const EXPECTED_SYMBOLS = ['BTCUSD', 'ETHUSD', ...Object.keys(STOOQ_SYMBOLS)];

interface PriceEntry {
  price: number;
  change24h: number | null;
  source: string;
}

function validPrice(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

async function fetchStooqPrices(prices: Record<string, PriceEntry>): Promise<void> {
  await Promise.allSettled(
    Object.entries(STOOQ_SYMBOLS).map(async ([symbol, stooqSymbol]) => {
      if (prices[symbol]) return;
      try {
        const response = await fetch(`https://stooq.com/q/l/?s=${stooqSymbol}&f=c&h&e=csv`, {
          signal: AbortSignal.timeout(5000),
          cache: 'no-store',
        });
        if (!response.ok) return;
        const lines = (await response.text()).trim().split('\n');
        if (lines.length < 2) return;
        const price = Number.parseFloat(lines[1].trim());
        if (validPrice(price)) {
          prices[symbol] = { price, change24h: null, source: 'stooq' };
        }
      } catch {
        // Missing provider data remains absent from the response.
      }
    }),
  );
}

export async function GET() {
  const prices: Record<string, PriceEntry> = {};
  const providerErrors: string[] = [];

  if (isHubEnabled()) {
    try {
      const quotes = await fetchHubQuotes();
      for (const quote of quotes) {
        if (!validPrice(quote.price)) continue;
        prices[quote.symbol] = {
          price: quote.price,
          change24h: Number.isFinite(quote.change24h) ? quote.change24h! : null,
          source: quote.source,
        };
      }
    } catch {
      providerErrors.push('hub');
    }
  }

  try {
    const quotes = await fetchBinancePrices();
    for (const quote of quotes) {
      if (prices[quote.symbol] || !validPrice(quote.price)) continue;
      prices[quote.symbol] = {
        price: quote.price,
        change24h: Number.isFinite(quote.change24h) ? quote.change24h! : null,
        source: quote.source,
      };
    }
  } catch {
    providerErrors.push('binance');
  }

  await fetchStooqPrices(prices);

  const sourceCounts: Record<string, number> = {};
  for (const entry of Object.values(prices)) {
    sourceCounts[entry.source] = (sourceCounts[entry.source] ?? 0) + 1;
  }

  const count = Object.keys(prices).length;
  console.info(JSON.stringify({
    evt: 'api/prices',
    count,
    sources: sourceCounts,
    providerErrors,
    hubEnabled: isHubEnabled(),
  }));

  const body = {
    timestamp: new Date().toISOString(),
    count,
    prices,
    hubEnabled: isHubEnabled(),
    partial: providerErrors.length > 0 || EXPECTED_SYMBOLS.some((symbol) => !prices[symbol]),
    unavailableSymbolsOmitted: true,
  };

  if (count === 0) {
    return NextResponse.json(
      { ...body, unavailable: true, error: 'No provider-backed prices are currently available.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
