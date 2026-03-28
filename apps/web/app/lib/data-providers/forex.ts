/**
 * Forex Data Providers — Frankfurter (ECB), fawazahmed0 CDN
 * All free, no API key, no rate limits
 */

import { type ForexRate, type OHLCV, safeFetch } from './types';

// ─── Frankfurter API ───────────────────────────────────────────────────────
// https://frankfurter.dev/ — ECB data, no key, no limits, self-hostable

const FRANKFURTER_PAIRS: Record<string, { from: string; to: string }> = {
  EURUSD: { from: 'EUR', to: 'USD' },
  GBPUSD: { from: 'GBP', to: 'USD' },
  USDJPY: { from: 'USD', to: 'JPY' },
  AUDUSD: { from: 'AUD', to: 'USD' },
  USDCAD: { from: 'USD', to: 'CAD' },
  NZDUSD: { from: 'NZD', to: 'USD' },
  USDCHF: { from: 'USD', to: 'CHF' },
  EURGBP: { from: 'EUR', to: 'GBP' },
  EURJPY: { from: 'EUR', to: 'JPY' },
  GBPJPY: { from: 'GBP', to: 'JPY' },
};

export async function fetchFrankfurterRates(): Promise<ForexRate[]> {
  const data = await safeFetch<{ rates: Record<string, number>; date: string }>(
    'https://api.frankfurter.dev/latest?from=USD',
  );
  if (!data?.rates) return [];

  const rates: ForexRate[] = [];
  const ts = Date.now();

  for (const [pair, config] of Object.entries(FRANKFURTER_PAIRS)) {
    const { from, to } = config;
    let rate: number | undefined;

    if (from === 'USD') {
      rate = data.rates[to];
    } else if (to === 'USD') {
      const inverseRate = data.rates[from];
      if (inverseRate) rate = 1 / inverseRate;
    } else {
      // Cross rate via USD
      const fromRate = data.rates[from];
      const toRate = data.rates[to];
      if (fromRate && toRate) rate = toRate / fromRate;
    }

    if (rate != null) {
      rates.push({
        pair,
        rate: +rate.toFixed(5),
        timestamp: ts,
        source: 'frankfurter',
      });
    }
  }

  return rates;
}

export async function fetchFrankfurterHistory(
  pair: string,
  days: number = 365,
): Promise<OHLCV[]> {
  const config = FRANKFURTER_PAIRS[pair];
  if (!config) return [];

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const data = await safeFetch<{
    rates: Record<string, Record<string, number>>;
  }>(
    `https://api.frankfurter.dev/${startDate}..${endDate}?from=${config.from}&to=${config.to}`,
    { timeoutMs: 15000 },
  );
  if (!data?.rates) return [];

  // Daily rates only — build pseudo-OHLCV (open=close=rate for daily forex)
  return Object.entries(data.rates)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, currencies]) => {
      const rate = currencies[config.to] ?? 0;
      return {
        timestamp: new Date(date).getTime(),
        open: rate,
        high: rate,
        low: rate,
        close: rate,
        volume: 0,
      };
    });
}

// ─── fawazahmed0 Exchange API ──────────────────────────────────────────────
// CDN-hosted (jsDelivr + Cloudflare Pages fallback), 200+ currencies

const FAWAZ_CURRENCY_MAP: Record<string, { from: string; to: string }> = {
  EURUSD: { from: 'eur', to: 'usd' },
  GBPUSD: { from: 'gbp', to: 'usd' },
  USDJPY: { from: 'usd', to: 'jpy' },
  AUDUSD: { from: 'aud', to: 'usd' },
  USDCAD: { from: 'usd', to: 'cad' },
  NZDUSD: { from: 'nzd', to: 'usd' },
  USDCHF: { from: 'usd', to: 'chf' },
  EURGBP: { from: 'eur', to: 'gbp' },
  EURJPY: { from: 'eur', to: 'jpy' },
  GBPJPY: { from: 'gbp', to: 'jpy' },
  USDMYR: { from: 'usd', to: 'myr' },
  USDSGD: { from: 'usd', to: 'sgd' },
  USDHKD: { from: 'usd', to: 'hkd' },
  USDCNY: { from: 'usd', to: 'cny' },
  USDINR: { from: 'usd', to: 'inr' },
  USDKRW: { from: 'usd', to: 'krw' },
  USDTHB: { from: 'usd', to: 'thb' },
  USDIDR: { from: 'usd', to: 'idr' },
};

const FAWAZ_PRIMARY = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';
const FAWAZ_FALLBACK = 'https://currency-api.pages.dev/v1/currencies';

export async function fetchFawazRates(): Promise<ForexRate[]> {
  // Fetch USD-based rates first, then EUR for cross rates
  let data = await safeFetch<Record<string, Record<string, number>>>(
    `${FAWAZ_PRIMARY}/usd.json`,
  );
  if (!data) {
    data = await safeFetch<Record<string, Record<string, number>>>(
      `${FAWAZ_FALLBACK}/usd.json`,
    );
  }
  if (!data?.usd) return [];

  const usdRates = data.usd;
  const rates: ForexRate[] = [];
  const ts = Date.now();

  for (const [pair, config] of Object.entries(FAWAZ_CURRENCY_MAP)) {
    const { from, to } = config;
    let rate: number | undefined;

    if (from === 'usd') {
      rate = usdRates[to];
    } else if (to === 'usd') {
      const inverseRate = usdRates[from];
      if (inverseRate) rate = 1 / inverseRate;
    } else {
      const fromRate = usdRates[from];
      const toRate = usdRates[to];
      if (fromRate && toRate) rate = toRate / fromRate;
    }

    if (rate != null) {
      rates.push({
        pair,
        rate: +rate.toFixed(5),
        timestamp: ts,
        source: 'fawazahmed0',
      });
    }
  }

  return rates;
}
