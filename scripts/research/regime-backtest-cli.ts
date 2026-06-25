/**
 * Per-regime walk-forward evidence for the three routed strategies
 * (engine-makeover Phase 4 — D6, the OFFLINE GATE EVIDENCE).
 *
 * Runs the C5 regime-conditioned harness (perRegimeMetrics, via the pure
 * assembly helpers in regime-backtest-assembly.ts) over BTC/ETH/SOL H1 and
 * reports the FULL 2×3 entry×regime matrix — both base entries (classic,
 * vwap-ema-bb) × all three regimes — per symbol, over the full range AND each
 * contiguous fold. The routed DIAGONAL it highlights is the gate-relevant slice:
 *   trend route    = classic momentum + C2 trend filter  (classic@trend)
 *   volatile route = vwap-ema-bb mean reversion           (vwap-ema-bb@volatile)
 *   range route    = vwap-ema-bb band-edge fade           (vwap-ema-bb@range)
 * The full matrix shows WHY routing helps (or whether it does not — reported
 * honestly). The off-diagonal cells (classic@volatile, classic@range,
 * vwap-ema-bb@trend) are the counterfactuals: what the OTHER entry would have
 * done in that regime.
 *
 * Why this CLI and not run-backtest-cli's preset path: the runner window-caps
 * hmm-top3/full-risk (top-3 by window → ~3 trades / 2y), so they measure nothing
 * over a long run. perRegimeMetrics drives the ENTRY MODULES directly, conditioned
 * on each bar's classifier regime — no window cap, real per-regime sample sizes.
 *
 * Data source: a candle dump produced by backfill-candles.ts --out-dir (the
 * Phase 3 self-contained path — no DB creds). Loader shape mirrors
 * export-regime-features.ts exactly. The regime classifier auto-resolves the
 * committed scripts/hmm-regime/models/crypto_hmm.json (set HMM_MODEL_DIR to
 * override); BTC/ETH/SOL map to the crypto asset class.
 *
 * Costs + geometry: crypto perp costs + live ATR geometry — the shipped
 * strategy's geometry, matching run-backtest-cli's `--geometry live --costs auto`.
 *
 * Determinism contract: `spec` + `results` are pure functions of the dumped
 * candles, the code, and the HMM model file (its content hash is recorded in
 * spec.hmmModels). Only `meta.runAt` varies between identical runs; the metrics
 * do not. The output filename is derived from the spec, so re-running overwrites
 * its file instead of forking a near-duplicate. No Date.now() in the metrics.
 *
 * Honest-numbers discipline: per-regime expectancy is mean pnlPct AFTER modeled
 * costs. If a routed cell's cost-adjusted expectancy is ≤ 0, or a cell has too
 * few trades to trust, it is reported AS-IS. The gate is allowed to FAIL on
 * paper — that gates live activation, not this evidence run. No parameter tuning.
 *
 * Usage (after backfill-candles.ts --out-dir data/research/candles):
 *   npx tsx scripts/research/regime-backtest-cli.ts \
 *     --symbols BTCUSD,ETHUSD,SOLUSD --timeframe H1 \
 *     --from 2024-06-01 --to 2026-06-01 \
 *     --candles-dir data/research/candles --folds 4
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { classicEntry } from '../../packages/strategies/src/entry/classic';
import { vwapEmaBbEntry } from '../../packages/strategies/src/entry/vwap-ema-bb';
import {
  CRYPTO_PERP_COSTS,
  LIVE_GEOMETRY,
  type BacktestOptions,
} from '../../packages/strategies/src';
import type { OHLCV } from '@tradeclaw/core';
import {
  entryRegimeMatrix,
  routedDiagonal,
  THIN_CELL_MIN_TRADES,
  type NamedEntry,
  type EntryRow,
} from './regime-backtest-assembly';

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const TF_HOURS: Record<string, number> = { H1: 1, H4: 4, D1: 24 };

/** The two base entries the matrix evaluates (classic momentum, vwap-ema-bb MR). */
const ENTRIES: ReadonlyArray<NamedEntry> = [
  { id: 'classic', entry: classicEntry },
  { id: 'vwap-ema-bb', entry: vwapEmaBbEntry },
];

interface CandleDump {
  symbol: string;
  timeframe: string;
  source: string;
  candles: OHLCV[];
}

/** Same dump shape + loader as export-regime-features.ts (one source of truth for the format). */
function loadDump(candlesDir: string, symbol: string, timeframe: string): OHLCV[] {
  const file = path.join(candlesDir, `${symbol}-${timeframe}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`candle dump not found: ${file} — run backfill-candles.ts --out-dir first`);
  }
  const dump = JSON.parse(fs.readFileSync(file, 'utf-8')) as CandleDump;
  if (dump.symbol !== symbol || dump.timeframe !== timeframe || !Array.isArray(dump.candles)) {
    throw new Error(`candle dump ${file} does not match ${symbol} ${timeframe}`);
  }
  return dump.candles;
}

/** Identity of the HMM model files the classifier uses — part of the determinism contract. */
function hmmModelIdentity(): Record<string, string> {
  const dir = process.env.HMM_MODEL_DIR ?? path.join('scripts', 'hmm-regime', 'models');
  const out: Record<string, string> = {};
  try {
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex').slice(0, 16);
      out[f] = hash;
    }
  } catch {
    out['(none)'] = 'hand-tuned-default-model';
  }
  return out;
}

/** A fold's window (full range or a contiguous sub-period), with its date bounds. */
interface FoldWindow {
  label: string;
  from: string;
  to: string;
  matrix: EntryRow[];
}

/** Format one cell as a compact console string: trades / winRate / expectancy-after-costs. */
function cellStr(c: { trades: number; winRate: number; expectancy: number; profitFactor: number | 'Infinity' | null }): string {
  const pf = c.profitFactor === null ? '—' : c.profitFactor === 'Infinity' ? '∞' : c.profitFactor.toFixed(2);
  return `n=${String(c.trades).padStart(4)} wr=${(c.winRate * 100).toFixed(1).padStart(5)}% E=${(c.expectancy * 100).toFixed(3).padStart(7)}% PF=${pf}`;
}

(() => {
  const symbols = arg('symbols', 'BTCUSD,ETHUSD,SOLUSD').split(',').map((s) => s.trim().toUpperCase());
  const timeframe = arg('timeframe', 'H1').toUpperCase();
  const from = arg('from', '');
  const to = arg('to', '');
  const candlesDir = arg('candles-dir', 'data/research/candles');
  const folds = Math.max(1, Number(arg('folds', '4')));
  const outDir = arg('out', 'docs/research/experiments');

  if (!from || !to) {
    console.error('Required: --from YYYY-MM-DD --to YYYY-MM-DD');
    process.exit(2);
  }
  const fromTs = Date.parse(`${from}T00:00:00Z`);
  const toTs = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(fromTs) || !Number.isFinite(toTs) || fromTs >= toTs) {
    console.error(`Invalid date range: --from ${from} --to ${to}`);
    process.exit(2);
  }
  if (!Number.isFinite(folds)) {
    console.error('--folds must be a number');
    process.exit(2);
  }

  // Crypto perp costs + live ATR geometry — the shipped geometry. Per-symbol the
  // context routes the classifier to the crypto HMM (BTC/ETH/SOL → crypto).
  const costs = CRYPTO_PERP_COSTS;
  const geometry = LIVE_GEOMETRY;
  const barHours = TF_HOURS[timeframe] ?? 1;

  const perSymbol: Record<string, { candleCount: number; firstBar: string; lastBar: string; full: EntryRow[]; folds: FoldWindow[] }> = {};

  for (const symbol of symbols) {
    const all = loadDump(candlesDir, symbol, timeframe)
      .filter((c) => c.timestamp >= fromTs && c.timestamp <= toTs)
      .sort((a, b) => a.timestamp - b.timestamp);
    if (all.length < 400) {
      console.error(
        `Insufficient dumped candles for ${symbol} ${timeframe} in [${from}, ${to}]: have ${all.length} ` +
        '(need ≥400 for the classifier warmup + a meaningful window). Run backfill-candles.ts --out-dir first.',
      );
      process.exit(3);
    }

    const backtest: BacktestOptions = { costs, geometry, barHours, context: { symbol, timeframe } };

    const full = entryRegimeMatrix(all, ENTRIES, backtest);

    const foldSize = Math.floor(all.length / folds);
    const foldWindows: FoldWindow[] = [];
    for (let f = 0; f < folds; f++) {
      const start = f * foldSize;
      const end = f === folds - 1 ? all.length : (f + 1) * foldSize;
      const slice = all.slice(start, end);
      foldWindows.push({
        label: `fold${f + 1}`,
        from: new Date(slice[0].timestamp).toISOString().slice(0, 10),
        to: new Date(slice[slice.length - 1].timestamp).toISOString().slice(0, 10),
        matrix: entryRegimeMatrix(slice, ENTRIES, backtest),
      });
    }

    perSymbol[symbol] = {
      candleCount: all.length,
      firstBar: new Date(all[0].timestamp).toISOString(),
      lastBar: new Date(all[all.length - 1].timestamp).toISOString(),
      full,
      folds: foldWindows,
    };

    // ── Console summary (full range) ───────────────────────────────────────
    console.log(`\n=== ${symbol} ${timeframe}  ${from}→${to}  (${all.length} bars, ${folds} folds) ===`);
    console.log('  FULL-RANGE entry×regime matrix (expectancy E = mean pnlPct AFTER crypto perp costs):');
    for (const row of full) {
      for (const r of ['trend', 'volatile', 'range'] as const) {
        const routed = (row.entry === 'classic' && r === 'trend')
          || (row.entry === 'vwap-ema-bb' && (r === 'volatile' || r === 'range'));
        const tag = routed ? ' ◀ ROUTED' : '';
        console.log(`    ${row.entry.padEnd(12)} @ ${r.padEnd(8)}  ${cellStr(row.byRegime[r])}${tag}`);
      }
    }
    const diag = routedDiagonal(full);
    const positives = diag.filter((d) => d.cell.expectancy > 0).length;
    console.log(`  ROUTED DIAGONAL: ${positives}/${diag.length} cells with positive cost-adjusted expectancy.`);
    for (const d of diag) {
      const verdict = d.cell.expectancy > 0 ? 'PASS' : 'FAIL';
      const thin = d.cell.trades < THIN_CELL_MIN_TRADES ? `  ⚠ THIN (<${THIN_CELL_MIN_TRADES} trades)` : '';
      console.log(`    ${d.route.padEnd(8)} (${d.entry}@${d.regime}): E=${(d.cell.expectancy * 100).toFixed(3)}% n=${d.cell.trades} → ${verdict}${thin}`);
    }
  }

  const caveats = [
    'folds are contiguous sub-periods (stability inspection, not walk-forward optimization); the routed entries have NO fitted parameters, so this is per-regime stability, not in-sample/out-of-sample tuning',
    'per-fold warmup restarts at the fold boundary: the classifier needs ~329 trailing bars (REGIME_CONDITION_WINDOW) and the entry indicators need their own warmup, so early-fold bars are dropped (conservative) — short folds therefore carry fewer trades per regime than the full range',
    `THIN CELLS: any (symbol, route, regime) cell with fewer than THIN_CELL_MIN_TRADES (${THIN_CELL_MIN_TRADES}) trades is flagged ⚠ — below that count the standard error of the mean dominates, so the cell's expectancy is insufficient evidence for the gate; sample size is reported per cell so this is visible, not hidden`,
    'the regime classifier runs over a BOUNDED trailing window per signal bar (329 bars), conditioning is EXCLUSIVE (a bar whose regime cannot be confirmed === target is DROPPED), so a regime bucket only ever holds bars provably in that regime',
    'cost model = crypto perp (fee 0.05%/side + slippage 0.15%/side + funding 0.01%/8h); funding is a sign-agnostic upper bound, so a directional carry could be cheaper than modeled (costs here are conservative, not optimistic)',
    'expectancy is per-trade FRACTIONAL and position-size-NEUTRAL (mean pnlPct, not notional) — it isolates the entry edge regardless of allocation; it is NOT a compounded return',
    'the trend route applies the C2 trend filter (EMA-50 slope agrees + ADX≥20) on top of the regime match; volatile/range routes do not — so classic@trend trade counts are strictly ≤ the unfiltered classic-on-trend-bars count',
  ];

  const spec = {
    symbols,
    timeframe,
    from,
    to,
    geometry: 'live-atr14x2.5-tp2R',
    costs: { ...costs },
    folds,
    entries: ENTRIES.map((e) => e.id),
    routedDiagonal: [
      { route: 'trend', entry: 'classic', regime: 'trend', note: 'classic momentum + C2 trend filter (EMA-50 slope + ADX≥20)' },
      { route: 'volatile', entry: 'vwap-ema-bb', regime: 'volatile', note: 'mean reversion both directions' },
      { route: 'range', entry: 'vwap-ema-bb', regime: 'range', note: 'band-edge fade' },
    ],
    regimeConditionWindow: 329,
    perSymbolWindow: Object.fromEntries(
      Object.entries(perSymbol).map(([s, v]) => [s, { candleCount: v.candleCount, firstBar: v.firstBar, lastBar: v.lastBar }]),
    ),
    hmmModels: hmmModelIdentity(),
    caveats,
  };

  const results = Object.fromEntries(
    Object.entries(perSymbol).map(([s, v]) => [
      s,
      {
        full: { byEntry: v.full },
        routedDiagonalFull: routedDiagonal(v.full),
        folds: v.folds.map((f) => ({
          label: f.label,
          from: f.from,
          to: f.to,
          byEntry: f.matrix,
          routedDiagonal: routedDiagonal(f.matrix),
        })),
      },
    ]),
  );

  const payload = { meta: { runAt: new Date().toISOString() }, spec, results };

  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `regime-routed-walkforward-${symbols.join('_')}-${timeframe}-${from}-${to}-f${folds}.json`;
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  // REGISTRY headline: routed-diagonal pass count + the three routed expectancies, per symbol.
  const registryPath = path.join(outDir, 'REGISTRY.md');
  const headline = Object.entries(results)
    .map(([s, r]) => {
      const diag = r.routedDiagonalFull;
      const pass = diag.filter((d) => d.cell.expectancy > 0).length;
      const cells = diag
        .map((d) => `${d.route}=${(d.cell.expectancy * 100).toFixed(3)}%/n${d.cell.trades}`)
        .join(' ');
      return `${s} routed ${pass}/${diag.length}+ (${cells})`;
    })
    .join(' · ');
  const modelHash = Object.entries(spec.hmmModels).map(([f, h]) => `${f} ${h}…`).join(', ');
  fs.appendFileSync(
    registryPath,
    `- ${payload.meta.runAt.slice(0, 10)} \`${fileName}\` — Phase 4 D6 per-regime routed walk-forward, ` +
    `${symbols.join('/')} ${timeframe} ${from}→${to}, ${spec.geometry}, costs=crypto, ${folds} folds, ` +
    `entries={classic,vwap-ema-bb}×{trend,volatile,range}: ${headline}. Model: ${modelHash}\n`,
  );

  console.log(`\nwritten: ${outPath}`);
  console.log('NOTE: routed-diagonal numbers above ARE the honest gate evidence — read the FAIL/⚠THIN flags.');
})();
