/**
 * Macro/Economic Data Providers — FRED, World Bank, IMF
 * FRED requires free API key; World Bank and IMF are fully open
 */

import { type MacroDataPoint, safeFetch } from './types';

// ─── FRED (Federal Reserve Economic Data) ──────────────────────────────────
// https://fred.stlouisfed.org/docs/api/fred/ — free key, 120 req/min

// Key economic indicators
const FRED_SERIES: Record<string, { name: string; unit: string }> = {
  'GDP': { name: 'US GDP', unit: 'billions USD' },
  'UNRATE': { name: 'US Unemployment Rate', unit: 'percent' },
  'CPIAUCSL': { name: 'US CPI (All Items)', unit: 'index' },
  'FEDFUNDS': { name: 'Federal Funds Rate', unit: 'percent' },
  'DGS10': { name: '10-Year Treasury Yield', unit: 'percent' },
  'DGS2': { name: '2-Year Treasury Yield', unit: 'percent' },
  'T10Y2Y': { name: '10Y-2Y Treasury Spread', unit: 'percent' },
  'DCOILWTICO': { name: 'WTI Crude Oil Price', unit: 'USD/barrel' },
  'DEXUSEU': { name: 'USD/EUR Exchange Rate', unit: 'USD per EUR' },
  'VIXCLS': { name: 'CBOE VIX', unit: 'index' },
  'M2SL': { name: 'M2 Money Supply', unit: 'billions USD' },
  'MORTGAGE30US': { name: '30-Year Mortgage Rate', unit: 'percent' },
  'UMCSENT': { name: 'Consumer Sentiment', unit: 'index' },
  'PAYEMS': { name: 'Total Nonfarm Payrolls', unit: 'thousands' },
  'PCE': { name: 'Personal Consumption Expenditures', unit: 'billions USD' },
};

interface FREDObservation {
  date: string;
  value: string;
}

export async function fetchFREDSeries(
  seriesId: string,
  limit: number = 12,
): Promise<MacroDataPoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];

  const config = FRED_SERIES[seriesId];
  if (!config) return [];

  const data = await safeFetch<{
    observations: FREDObservation[];
  }>(
    `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`,
  );
  if (!data?.observations) return [];

  return data.observations
    .filter((o) => o.value !== '.')
    .map((o) => ({
      seriesId,
      name: config.name,
      value: parseFloat(o.value),
      date: o.date,
      unit: config.unit,
      source: 'fred',
    }));
}

export async function fetchFREDLatest(): Promise<MacroDataPoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];

  const results = await Promise.allSettled(
    Object.keys(FRED_SERIES).map((id) => fetchFREDSeries(id, 1)),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<MacroDataPoint[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

export function getFREDSeriesList(): Array<{ id: string; name: string; unit: string }> {
  return Object.entries(FRED_SERIES).map(([id, config]) => ({
    id,
    ...config,
  }));
}

// ─── World Bank ────────────────────────────────────────────────────────────
// https://api.worldbank.org/v2/ — no key needed

const WB_INDICATORS: Record<string, { name: string; unit: string }> = {
  'NY.GDP.MKTP.CD': { name: 'GDP (current USD)', unit: 'USD' },
  'NY.GDP.MKTP.KD.ZG': { name: 'GDP Growth (annual %)', unit: 'percent' },
  'FP.CPI.TOTL.ZG': { name: 'Inflation (CPI annual %)', unit: 'percent' },
  'SL.UEM.TOTL.ZS': { name: 'Unemployment (% of labor force)', unit: 'percent' },
  'BX.KLT.DINV.CD.WD': { name: 'FDI Net Inflows', unit: 'USD' },
  'FR.INR.RINR': { name: 'Real Interest Rate', unit: 'percent' },
  'NE.TRD.GNFS.ZS': { name: 'Trade (% of GDP)', unit: 'percent' },
  'GC.DOD.TOTL.GD.ZS': { name: 'Government Debt (% of GDP)', unit: 'percent' },
};

export async function fetchWorldBankData(
  indicator: string,
  country: string = 'US',
  years: number = 10,
): Promise<MacroDataPoint[]> {
  const config = WB_INDICATORS[indicator];
  if (!config) return [];

  const data = await safeFetch<
    [unknown, Array<{ date: string; value: number | null }>]
  >(
    `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&per_page=${years}&mrv=${years}`,
    { timeoutMs: 10000 },
  );
  if (!data?.[1]) return [];

  return data[1]
    .filter((d) => d.value !== null)
    .map((d) => ({
      seriesId: indicator,
      name: config.name,
      value: d.value!,
      date: d.date,
      unit: config.unit,
      source: 'worldbank',
    }));
}

export async function fetchWorldBankLatest(
  country: string = 'US',
): Promise<MacroDataPoint[]> {
  const results = await Promise.allSettled(
    Object.keys(WB_INDICATORS).map((id) => fetchWorldBankData(id, country, 1)),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<MacroDataPoint[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

export function getWorldBankIndicators(): Array<{ id: string; name: string; unit: string }> {
  return Object.entries(WB_INDICATORS).map(([id, config]) => ({
    id,
    ...config,
  }));
}

// ─── IMF ───────────────────────────────────────────────────────────────────
// https://dataservices.imf.org/ — no key needed, SDMX JSON format

export async function fetchIMFExchangeRates(): Promise<MacroDataPoint[]> {
  const data = await safeFetch<{
    CompactData: {
      DataSet: {
        Series: Array<{
          '@_REF_AREA': string;
          Obs: Array<{ '@_TIME_PERIOD': string; '@_OBS_VALUE': string }> | { '@_TIME_PERIOD': string; '@_OBS_VALUE': string };
        }>;
      };
    };
  }>(
    'https://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData/IFS/M.US.ENDA_XDC_USD_RATE..?startPeriod=2023&endPeriod=2026',
    { timeoutMs: 15000 },
  );
  if (!data?.CompactData?.DataSet?.Series) return [];

  const series = data.CompactData.DataSet.Series;
  const allSeries = Array.isArray(series) ? series : [series];

  return allSeries.flatMap((s) => {
    const obs = Array.isArray(s.Obs) ? s.Obs : [s.Obs];
    return obs
      .filter((o) => o?.['@_OBS_VALUE'])
      .map((o) => ({
        seriesId: `IMF_XR_${s['@_REF_AREA']}`,
        name: `Exchange Rate (${s['@_REF_AREA']})`,
        value: parseFloat(o['@_OBS_VALUE']),
        date: o['@_TIME_PERIOD'],
        unit: 'national currency per USD',
        source: 'imf',
      }));
  });
}
