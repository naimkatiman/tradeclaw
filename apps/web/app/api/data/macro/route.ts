import { NextRequest, NextResponse } from 'next/server';
import {
  fetchFREDLatest,
  fetchFREDSeries,
  getFREDSeriesList,
  fetchWorldBankLatest,
  fetchWorldBankData,
  getWorldBankIndicators,
} from '../../../lib/data-providers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'all'; // all | fred | worldbank
    const series = searchParams.get('series'); // specific series ID
    const country = searchParams.get('country') || 'US';
    const limit = parseInt(searchParams.get('limit') || '12', 10);

    // Specific series request
    if (series) {
      const data = source === 'worldbank'
        ? await fetchWorldBankData(series, country, limit)
        : await fetchFREDSeries(series, limit);

      return NextResponse.json({
        series,
        data,
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch latest from all sources
    const results: Record<string, unknown> = {};

    if (source === 'all' || source === 'fred') {
      const fredData = await fetchFREDLatest();
      results.fred = {
        data: fredData,
        availableSeries: getFREDSeriesList(),
      };
    }

    if (source === 'all' || source === 'worldbank') {
      const wbData = await fetchWorldBankLatest(country);
      results.worldbank = {
        data: wbData,
        availableIndicators: getWorldBankIndicators(),
      };
    }

    return NextResponse.json({
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
