'use client';

// ---------------------------------------------------------------------------
// Data Source Badge — shows where price data originates
// ---------------------------------------------------------------------------

type DataSource = 'Binance' | 'Swissquote' | 'OANDA' | 'TradingView' | 'Yahoo Finance' | 'CoinGecko' | 'TA Engine';

interface DataSourceBadgeProps {
  source: DataSource;
}

const SOURCE_CONFIG: Record<DataSource, { color: string; border: string; bg: string }> = {
  Binance: {
    color: '#f59e0b',
    border: 'rgba(245,158,11,0.3)',
    bg: 'rgba(245,158,11,0.1)',
  },
  Swissquote: {
    color: '#06b6d4',
    border: 'rgba(6,182,212,0.3)',
    bg: 'rgba(6,182,212,0.1)',
  },
  OANDA: {
    color: '#10b981',
    border: 'rgba(16,185,129,0.3)',
    bg: 'rgba(16,185,129,0.1)',
  },
  TradingView: {
    color: '#2962ff',
    border: 'rgba(41,98,255,0.3)',
    bg: 'rgba(41,98,255,0.1)',
  },
  'Yahoo Finance': {
    color: '#a78bfa',
    border: 'rgba(167,139,250,0.3)',
    bg: 'rgba(167,139,250,0.1)',
  },
  CoinGecko: {
    color: '#34d399',
    border: 'rgba(52,211,153,0.3)',
    bg: 'rgba(52,211,153,0.1)',
  },
  'TA Engine': {
    color: '#60a5fa',
    border: 'rgba(96,165,250,0.3)',
    bg: 'rgba(96,165,250,0.1)',
  },
};

/** Derive the data source from a trading symbol string. */
export function getDataSource(symbol: string): DataSource {
  const s = symbol.toUpperCase();
  if (['BTC', 'ETH', 'XRP', 'SOL', 'DOGE', 'BNB', 'ADA', 'DOT', 'LINK', 'AVAX', 'ATOM', 'MATIC'].some(c => s.startsWith(c))) return 'Binance';
  if (
    ['XAU', 'XAG', 'EUR', 'GBP', 'USD', 'AUD', 'NZD', 'CAD', 'CHF'].some(c =>
      s.startsWith(c),
    )
  )
    return 'Swissquote';
  if (['SPX', 'NDX', 'DJI', 'DAX', 'FTSE', 'NKX', 'HSI', 'VIX', 'WTI', 'BRN', 'NG', 'HG', 'PL', 'PA'].some(c => s.startsWith(c)))
    return 'TradingView';
  return 'TA Engine';
}

/** Small non-intrusive badge showing the price data provider. */
export function DataSourceBadge({ source }: DataSourceBadgeProps) {
  const cfg = SOURCE_CONFIG[source];
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono leading-none select-none"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
      title={`Price data sourced from ${source} in real-time`}
    >
      <span
        className="h-1 w-1 rounded-full shrink-0"
        style={{ background: cfg.color }}
      />
      {source}
    </span>
  );
}

/** Format a UTC timestamp for display on signal cards (e.g. "2026-03-29 14:32 UTC"). */
export function formatSignalTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

/** Generate a short signal ID hash (e.g. "sig_a3f2") from a full signal ID. */
export function shortSignalId(id: string): string {
  // Take last 4 hex-like chars from the id, or first 4 if short
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  const fragment = clean.length >= 4 ? clean.slice(-4).toLowerCase() : clean.toLowerCase();
  return `sig_${fragment}`;
}
