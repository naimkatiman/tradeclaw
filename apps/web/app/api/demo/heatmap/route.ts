import { NextResponse } from 'next/server';

// Deterministic demo heatmap — no live data required.
const ENTRIES = [
  { pair: 'XAUUSD', name: 'Gold', direction: 'BUY', confidence: 82, price: 3075.5, rsi: 62.1, macd: 2.3 },
  { pair: 'BTCUSD', name: 'Bitcoin', direction: 'BUY', confidence: 78, price: 84250, rsi: 58.4, macd: 120 },
  { pair: 'ETHUSD', name: 'Ethereum', direction: 'BUY', confidence: 72, price: 1920, rsi: 52.0, macd: 8.5 },
  { pair: 'XAGUSD', name: 'Silver', direction: 'NEUTRAL', confidence: 54, price: 34.5, rsi: 48.2, macd: 0.05 },
  { pair: 'EURUSD', name: 'EUR/USD', direction: 'SELL', confidence: 68, price: 1.0835, rsi: 42.1, macd: -0.0008 },
  { pair: 'GBPUSD', name: 'GBP/USD', direction: 'BUY', confidence: 65, price: 1.2935, rsi: 55.3, macd: 0.0005 },
  { pair: 'USDJPY', name: 'USD/JPY', direction: 'SELL', confidence: 74, price: 150.85, rsi: 68.0, macd: -0.15 },
  { pair: 'AUDUSD', name: 'AUD/USD', direction: 'NEUTRAL', confidence: 51, price: 0.658, rsi: 49.7, macd: -0.00003 },
] as const;

export async function GET() {
  return NextResponse.json(
    { mode: 'demo', entries: ENTRIES },
    { headers: { 'Cache-Control': 'public, s-maxage=300' } }
  );
}
