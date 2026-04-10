import { NextResponse } from 'next/server';

// Deterministic demo leaderboard — no DB, no external API.
const ASSETS = [
  { pair: 'XAUUSD', hitRate: 72.4, totalSignals: 156, avgConfidence: 78 },
  { pair: 'BTCUSD', hitRate: 68.1, totalSignals: 203, avgConfidence: 74 },
  { pair: 'ETHUSD', hitRate: 65.3, totalSignals: 187, avgConfidence: 71 },
  { pair: 'EURUSD', hitRate: 63.9, totalSignals: 142, avgConfidence: 69 },
  { pair: 'USDJPY', hitRate: 61.2, totalSignals: 128, avgConfidence: 67 },
  { pair: 'GBPUSD', hitRate: 59.8, totalSignals: 119, avgConfidence: 65 },
];

export async function GET() {
  return NextResponse.json(
    { mode: 'demo', assets: ASSETS },
    { headers: { 'Cache-Control': 'public, s-maxage=300' } }
  );
}
