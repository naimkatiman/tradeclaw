import { NextResponse } from 'next/server';
import { fetchFinnhubQuotes, fetchFMPQuotes } from '../../../lib/data-providers';

export async function GET() {
  // Try Finnhub first (higher rate limit), fall back to FMP
  const [finnhub, fmp] = await Promise.allSettled([
    fetchFinnhubQuotes(),
    fetchFMPQuotes(),
  ]);

  const quotes = finnhub.status === 'fulfilled' && finnhub.value.length > 0
    ? finnhub.value
    : fmp.status === 'fulfilled' ? fmp.value : [];

  if (quotes.length === 0) {
    return NextResponse.json({
      quotes: [],
      message: 'No stock API keys configured. Set FINNHUB_API_KEY or FMP_API_KEY in .env',
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    quotes,
    count: quotes.length,
    timestamp: new Date().toISOString(),
  });
}
