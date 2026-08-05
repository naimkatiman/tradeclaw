/**
 * Pure math for the regime expectancy study (spec:
 * docs/plans/2026-08-05-regime-expectancy-study.md). No I/O, no DB — every
 * function here is unit-tested. The CLI (regime-expectancy-study.ts) is the
 * only file that talks to Postgres.
 *
 * Counted-trade semantics deliberately mirror apps/web/lib/signal-history.ts
 * isCountedResolved (dashboard parity), which KEEPS nonzero target='expired'
 * rows and REQUIRES observed-OHLCV provenance. recost-segment.ts drops all
 * expired rows — do not copy that here or the reconciliation gate fails.
 */

export const DAY_MS = 86_400_000;
/** equity/route.ts — per-trade R cap for sizing (stat R stays uncapped). */
export const HARD_R_CAP = 8;

/** apps/web/lib/outcome-provenance.ts OBSERVED_OHLCV_OUTCOME_SOURCES. */
const OBSERVED_SOURCES = new Set([
  'market-data-hub',
  'binance',
  'stooq',
  'kraken',
  'cryptocompare',
]);

type AssetClass = 'crypto' | 'metals' | 'fx' | 'stocks/cmdty';

/** Mirrors recost-segment.ts fallback for pre-051 rows (backtest-options.ts costModelFor). */
const FALLBACK_RT_COST_PCT: Record<AssetClass, number> = {
  crypto: 0.40,
  metals: 0.10,
  fx: 0.04,
  'stocks/cmdty': 0.04,
};

const FX_SET = new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF']);

function assetClassFor(symbol: string): AssetClass {
  const s = symbol.toUpperCase();
  if (/XAU|XAG/.test(s)) return 'metals';
  if (/BTC|ETH|SOL|BNB|XRP|ADA|DOGE|DOT|LINK|AVAX/.test(s) || /USDT$/.test(s)) return 'crypto';
  if (FX_SET.has(s)) return 'fx';
  return 'stocks/cmdty';
}

export interface StudyRow {
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry_price: number;
  sl: number | null;
  cost_estimate_pct: number | null;
  strategy_id: string | null;
  created_at: string;
  pnl_pct: number | null;
  hit: boolean | null;
  target: string | null;
  source: string | null;
}

export interface StudyTrade {
  ts: number;
  pair: string;
  direction: 'BUY' | 'SELL';
  strategyId: string;
  confidence: number;
  /** raw (uncapped) R — used for gross stats, dashboard parity */
  rRaw: number;
  /** sized (±HARD_R_CAP) R — what the equity path compounds */
  rSized: number;
  /** round-trip cost in R = cost%_notional / riskPct */
  costR: number;
  isWin: boolean;
}

/** Dashboard-parity counted filter (lib isCountedResolved semantics). */
export function isCountedRow(r: StudyRow): boolean {
  if (r.pnl_pct === null || r.hit === null) return false;
  if (r.pnl_pct === 0 && !r.hit) return false; // force-expiry placeholder
  return typeof r.source === 'string' && OBSERVED_SOURCES.has(r.source);
}

export function toStudyTrade(r: StudyRow): StudyTrade | null {
  if (!isCountedRow(r)) return null;
  if (r.sl === null || r.entry_price <= 0) return null;
  const riskPct = (Math.abs(r.entry_price - r.sl) / r.entry_price) * 100;
  if (!Number.isFinite(riskPct) || riskPct <= 0) return null;

  const rRaw = (r.pnl_pct as number) / riskPct;
  const rSized = Math.max(-HARD_R_CAP, Math.min(HARD_R_CAP, rRaw));
  const costPctNotional =
    r.cost_estimate_pct != null && r.cost_estimate_pct > 0
      ? r.cost_estimate_pct
      : FALLBACK_RT_COST_PCT[assetClassFor(r.pair)];

  return {
    ts: new Date(r.created_at).getTime(),
    pair: r.pair,
    direction: r.direction,
    strategyId: r.strategy_id ?? 'unknown',
    confidence: Number(r.confidence),
    rRaw,
    rSized,
    costR: costPctNotional / riskPct,
    isWin: !!r.hit,
  };
}
