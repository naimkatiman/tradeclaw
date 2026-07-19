'use client';

// ---------------------------------------------------------------------------
// Provider-lane badge inferred from the symbol. Runtime signals currently carry
// only real-versus-synthetic quality, not the exact upstream provider.
// ---------------------------------------------------------------------------

import { useLocale } from './locale-provider';
import { formatMessage } from '../../lib/product-i18n/format';
import { getDashboardEvidenceTranslations } from '../../lib/product-i18n/dashboard-evidence';
import { getHtmlLanguage, type Locale } from '../../lib/translations';

type DataSource = 'Binance' | 'Swissquote' | 'Stooq' | 'TradingView' | 'CoinGecko' | 'TA Engine';

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
  Stooq: {
    color: '#10b981',
    border: 'rgba(16,185,129,0.3)',
    bg: 'rgba(16,185,129,0.1)',
  },
  TradingView: {
    color: '#2962ff',
    border: 'rgba(41,98,255,0.3)',
    bg: 'rgba(41,98,255,0.1)',
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

/** Derive the expected provider lane from a trading symbol string. */
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

/** Small non-intrusive badge showing the expected provider lane. */
export function DataSourceBadge({ source }: DataSourceBadgeProps) {
  const { locale } = useLocale();
  const copy = getDashboardEvidenceTranslations(locale).dataSource;
  const cfg = SOURCE_CONFIG[source];
  const tooltip = formatMessage(copy.tooltip, { source });
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono leading-none select-none"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
      title={tooltip}
      aria-label={tooltip}
    >
      <span
        aria-hidden="true"
        className="h-1 w-1 rounded-full shrink-0"
        style={{ background: cfg.color }}
      />
      <bdi dir="ltr">{source}</bdi>
    </span>
  );
}

/** Format a UTC timestamp for display on signal cards in the selected locale. */
export function formatSignalTimestamp(iso: string, locale: Locale = 'en'): string {
  const d = new Date(iso);
  const formatted = new Intl.DateTimeFormat(getHtmlLanguage(locale), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }).format(d);
  return `${formatted} UTC`;
}

/** Generate a short signal ID hash (e.g. "sig_a3f2") from a full signal ID. */
export function shortSignalId(id: string): string {
  // Take last 4 hex-like chars from the id, or first 4 if short
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  const fragment = clean.length >= 4 ? clean.slice(-4).toLowerCase() : clean.toLowerCase();
  return `sig_${fragment}`;
}
