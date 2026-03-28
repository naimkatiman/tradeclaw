import { NextRequest, NextResponse } from 'next/server';
import { validatePluginCode, executePlugin, type PluginIndicator, type OHLCV } from '../../../../lib/plugin-system';
import { getOHLCV, type OHLCV as OHLCVData } from '@/app/lib/ohlcv';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, params: pluginParams, symbol, timeframe } = body;

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    // Validate
    const validation = validatePluginCode(code);
    if (!validation.valid) {
      return NextResponse.json({ valid: false, error: validation.error });
    }

    // Fetch real OHLCV data (default: BTCUSD H1)
    let candles: OHLCV[];
    let source: string;

    try {
      const ohlcvResult = await getOHLCV(
        (symbol as string) || 'BTCUSD',
        (timeframe as string) || 'H1'
      );
      candles = ohlcvResult.candles.map((c: OHLCVData) => ({
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        timestamp: c.timestamp,
      }));
      source = ohlcvResult.source;
    } catch {
      // Fallback: synthetic candles when real OHLCV fetch fails
      candles = Array.from({ length: 100 }, (_, i) => {
        const base = 100 + Math.sin(i * 0.1) * 10 + (Math.random() - 0.5) * 3;
        return {
          open: base - 0.5 + Math.random(),
          high: base + Math.random() * 2,
          low: base - Math.random() * 2,
          close: base + 0.5 - Math.random(),
          volume: 1000 + Math.random() * 5000,
          timestamp: Date.now() - (100 - i) * 3600000,
        };
      });
      source = 'synthetic';
    }

    // Execute
    const mockPlugin: PluginIndicator = {
      id: 'test',
      name: 'Test',
      description: '',
      version: '1.0.0',
      author: 'test',
      category: 'custom',
      code,
      params: pluginParams || [],
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = executePlugin(mockPlugin, candles);
    return NextResponse.json({ valid: true, result, candleCount: candles.length, source });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
