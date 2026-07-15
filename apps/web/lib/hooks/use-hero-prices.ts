'use client';

import { useEffect, useMemo, useState } from 'react';

export interface HeroPrice {
  price: number | null;
  change24h: number | null;
  source: string;
}

export interface HeroPricesData {
  prices: Record<string, HeroPrice>;
  loading: boolean;
  stale: boolean;
}

interface ApiPriceTick {
  price: number;
  change24h: number | null;
  source: string;
}

interface ApiPricesResponse {
  prices: Record<string, ApiPriceTick>;
  stale?: boolean;
}

type Mapping = { key: string } | { derived: 'GBPJPY' };

const POLL_MS = 30_000;

const HERO_SYMBOL_MAP: Record<string, Mapping> = {
  'XAU/USD': { key: 'XAUUSD' },
  'XAG/USD': { key: 'XAGUSD' },
  'BTC/USD': { key: 'BTCUSD' },
  'ETH/USD': { key: 'ETHUSD' },
  'EUR/USD': { key: 'EURUSD' },
  'GBP/USD': { key: 'GBPUSD' },
  'USD/JPY': { key: 'USDJPY' },
  'AUD/USD': { key: 'AUDUSD' },
  'SOL/USD': { key: 'SOLUSD' },
  'GBP/JPY': { derived: 'GBPJPY' },
  // RoboForex CFDs via market-data-hub (PR #40, hub seed).
  // Real Brent crude CFD (~$80) and true index levels — not ETF proxies.
  'BRENT/USD': { key: 'BRENTUSD' },
  'WTI/USD': { key: 'WTIUSD' },
  'OIL/USD': { key: 'BRENTUSD' }, // Backwards-compat alias — defaults to Brent
  NAS100: { key: 'NAS100' },
  US500: { key: 'US500' },
  US30: { key: 'US30' },
  UK100: { key: 'UK100' },
  GER40: { key: 'GER40' },
  JPY225: { key: 'JPY225' },
  FRA40: { key: 'FRA40' },
  AUS200: { key: 'AUS200' },
  SWI20: { key: 'SWI20' },
  SPA35: { key: 'SPA35' },
  // Single-stock pass-through (hub Twelve Data lane — TD-only, not in RoboForex seed).
  // Tech / mega-cap.
  NVDA: { key: 'NVDAUSD' },
  TSLA: { key: 'TSLAUSD' },
  AAPL: { key: 'AAPLUSD' },
  MSFT: { key: 'MSFTUSD' },
  GOOGL: { key: 'GOOGLUSD' },
  AMZN: { key: 'AMZNUSD' },
  META: { key: 'METAUSD' },
  NFLX: { key: 'NFLXUSD' },
  // Semiconductors (high retail demand — see audit).
  AMD: { key: 'AMDUSD' },
  MU: { key: 'MUUSD' },
  AVGO: { key: 'AVGOUSD' },
  INTC: { key: 'INTCUSD' },
  TSM: { key: 'TSMUSD' },
  QCOM: { key: 'QCOMUSD' },
  // Financials.
  JPM: { key: 'JPMUSD' },
  GS: { key: 'GSUSD' },
  BAC: { key: 'BACUSD' },
  // Crypto-correlated.
  COIN: { key: 'COINUSD' },
  // Consumer / streaming.
  DIS: { key: 'DISUSD' },
  // Foundational FX context indicators (no platform should ship without these).
  DXY: { key: 'DXY' },
  VIX: { key: 'VIX' },
  // Commodities completeness.
  'NG/USD': { key: 'NGUSD' },     // Natural gas
  'HG/USD': { key: 'HGUSD' },     // Copper
  'XPT/USD': { key: 'XPTUSD' },   // Platinum
  'XPD/USD': { key: 'XPDUSD' },   // Palladium
  // Indices — Asia + small cap gaps.
  HSI: { key: 'HSI' },             // Hang Seng
  RUT2000: { key: 'RUT2000' },     // Russell 2000 (US small cap)
};

export function formatPairPrice(label: string, price: number | null): string {
  if (price === null || !Number.isFinite(price)) return '—';
  switch (label) {
    case 'BTC/USD':
    case 'ETH/USD':
    case 'XAU/USD':
    case 'XAG/USD':
    case 'SOL/USD':
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'EUR/USD':
    case 'GBP/USD':
    case 'AUD/USD':
      return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    case 'USD/JPY':
    case 'GBP/JPY':
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    case 'OIL/USD':
    case 'BRENT/USD':
    case 'WTI/USD':
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'NAS100':
    case 'US500':
    case 'US30':
    case 'UK100':
    case 'GER40':
    case 'JPY225':
    case 'FRA40':
    case 'AUS200':
    case 'SWI20':
    case 'SPA35':
    case 'HSI':
    case 'RUT2000':
      return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    case 'NVDA':
    case 'TSLA':
    case 'AAPL':
    case 'MSFT':
    case 'AMD':
    case 'MU':
    case 'GOOGL':
    case 'AMZN':
    case 'META':
    case 'NFLX':
    case 'AVGO':
    case 'INTC':
    case 'TSM':
    case 'QCOM':
    case 'JPM':
    case 'GS':
    case 'BAC':
    case 'COIN':
    case 'DIS':
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'DXY':
    case 'VIX':
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'NG/USD':
    case 'HG/USD':
      return price.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
    case 'XPT/USD':
    case 'XPD/USD':
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    default:
      return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
}

function emptyPrices(labels: readonly string[]): Record<string, HeroPrice> {
  const init: Record<string, HeroPrice> = {};
  for (const l of labels) init[l] = { price: null, change24h: null, source: 'pending' };
  return init;
}

export function useHeroPrices(labels: readonly string[]): HeroPricesData {
  const labelKey = useMemo(() => labels.join(','), [labels]);
  const [prices, setPrices] = useState<Record<string, HeroPrice>>(() => emptyPrices(labels));
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const labelList = labelKey.split(',').filter(Boolean);

    async function fetchPrices() {
      try {
        const res = await fetch('/api/prices', { cache: 'no-store' });
        if (!res.ok) {
          const unavailable = emptyPrices(labelList);
          for (const value of Object.values(unavailable)) value.source = 'unavailable';
          setPrices(unavailable);
          setLoading(false);
          return;
        }
        const data = (await res.json()) as ApiPricesResponse;
        if (cancelled) return;

        const next: Record<string, HeroPrice> = {};
        for (const label of labelList) {
          const mapping = HERO_SYMBOL_MAP[label];
          if (!mapping) {
            next[label] = { price: null, change24h: null, source: 'unmapped' };
            continue;
          }
          if ('derived' in mapping) {
            const gbpUsd = data.prices.GBPUSD;
            const usdJpy = data.prices.USDJPY;
            if (gbpUsd && usdJpy) {
              next[label] = {
                price: gbpUsd.price * usdJpy.price,
                change24h: gbpUsd.change24h !== null && usdJpy.change24h !== null
                  ? gbpUsd.change24h + usdJpy.change24h
                  : null,
                source: `derived:${gbpUsd.source}+${usdJpy.source}`,
              };
            } else {
              next[label] = { price: null, change24h: null, source: 'derived-missing' };
            }
            continue;
          }
          const tick = data.prices[mapping.key];
          if (tick) {
            next[label] = { price: tick.price, change24h: tick.change24h, source: tick.source };
          } else {
            next[label] = { price: null, change24h: null, source: 'missing' };
          }
        }
        setPrices(next);
        setStale(Boolean(data.stale));
        setLoading(false);
      } catch {
        if (cancelled) return;
        const unavailable = emptyPrices(labelList);
        for (const value of Object.values(unavailable)) value.source = 'unavailable';
        setPrices(unavailable);
        setLoading(false);
      }
    }

    void fetchPrices();
    const iv = setInterval(fetchPrices, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [labelKey]);

  return { prices, loading, stale };
}
