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

export interface Bar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Per-bar ADX with Wilder smoothing (same conventions as
 * packages/signals/src/regime/features.ts computeAdxSeries, re-implemented
 * here because research scripts stay off the unbuilt @tradeclaw/signals dist).
 * Output aligned to bars; null until index 2*period-1.
 */
export function adxSeries(bars: Bar[], period = 14): (number | null)[] {
  const n = bars.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n < 2 * period) return out;

  // tr/pdm/ndm[k] describe the move INTO bar k+1.
  const tr: number[] = [];
  const pdm: number[] = [];
  const ndm: number[] = [];
  for (let i = 1; i < n; i++) {
    const h = bars[i].high;
    const l = bars[i].low;
    const pc = bars[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    const up = h - bars[i - 1].high;
    const dn = bars[i - 1].low - l;
    pdm.push(up > dn && up > 0 ? up : 0);
    ndm.push(dn > up && dn > 0 ? dn : 0);
  }

  let sTr = 0;
  let sP = 0;
  let sN = 0;
  for (let k = 0; k < period; k++) {
    sTr += tr[k];
    sP += pdm[k];
    sN += ndm[k];
  }

  // dxAt[i] for bar index i = period .. n-1
  const dxAt = new Map<number, number>();
  for (let i = period; i < n; i++) {
    const pdi = sTr > 0 ? (100 * sP) / sTr : 0;
    const ndi = sTr > 0 ? (100 * sN) / sTr : 0;
    const sum = pdi + ndi;
    dxAt.set(i, sum > 0 ? (100 * Math.abs(pdi - ndi)) / sum : 0);
    if (i + 1 < n) {
      const k = i; // tr[k] is the move into bar k+1
      sTr = sTr - sTr / period + tr[k];
      sP = sP - sP / period + pdm[k];
      sN = sN - sN / period + ndm[k];
    }
  }

  // First ADX at 2*period-1 = mean of DX over bars period..2*period-1.
  let adx = 0;
  for (let i = period; i < 2 * period; i++) adx += dxAt.get(i)!;
  adx /= period;
  out[2 * period - 1] = adx;
  for (let i = 2 * period; i < n; i++) {
    adx = (adx * (period - 1) + dxAt.get(i)!) / period;
    out[i] = adx;
  }
  return out;
}

/** Kaufman efficiency ratio: |net change| / path length over `window` steps. Null until index `window`. */
export function efficiencyRatioSeries(closes: number[], window = 20): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = window; i < closes.length; i++) {
    let path = 0;
    for (let j = i - window + 1; j <= i; j++) path += Math.abs(closes[j] - closes[j - 1]);
    out[i] = path > 0 ? Math.abs(closes[i] - closes[i - window]) / path : 0;
  }
  return out;
}
