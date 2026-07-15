import { NextRequest, NextResponse } from 'next/server';
import { validatePluginCode, executePlugin, type PluginIndicator, type OHLCV } from '../../../../lib/plugin-system';
import { getOHLCV, type OHLCV as OHLCVData } from '@/app/lib/ohlcv';
import { assertAdminApi } from '../../../../lib/admin-gate';

export async function POST(request: NextRequest) {
  const unauthorized = await assertAdminApi(request);
  if (unauthorized) return unauthorized;
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
    const ohlcvResult = await getOHLCV(
      (symbol as string) || 'BTCUSD',
      (timeframe as string) || 'H1'
    );
    const candles: OHLCV[] = ohlcvResult.candles.map((c: OHLCVData) => ({
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      timestamp: c.timestamp,
    }));
    const source = ohlcvResult.source;
    if (candles.length === 0 || source === 'unavailable') {
      return NextResponse.json({
        valid: true,
        available: false,
        error: 'Observed OHLCV is unavailable; plugin execution was skipped.',
        candleCount: 0,
        source,
      }, { status: 503 });
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
