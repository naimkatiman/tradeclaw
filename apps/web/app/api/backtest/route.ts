import { NextRequest, NextResponse } from 'next/server';
import { getOHLCV } from '../../lib/ohlcv';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbol = searchParams.get('symbol') || 'XAUUSD';
  const timeframe = searchParams.get('timeframe') || 'H1';

  const VALID_SYMBOLS = [
    'XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD',
    'USDJPY', 'XAGUSD', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'XRPUSD',
  ];
  const VALID_TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'];

  if (!VALID_SYMBOLS.includes(symbol)) {
    return NextResponse.json(
      { error: `Invalid symbol: ${symbol}` },
      { status: 400 },
    );
  }
  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    return NextResponse.json(
      { error: `Invalid timeframe: ${timeframe}` },
      { status: 400 },
    );
  }

  try {
    const { candles, source } = await getOHLCV(symbol, timeframe);

    if (candles.length === 0) {
      return NextResponse.json(
        { error: `No OHLCV data available for ${symbol} ${timeframe}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ candles, source, symbol, timeframe });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching OHLCV data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
