/**
 * Deep-daily validation: does daily time-series momentum clear costs?
 * (Phase 4.5 — D4, the make-or-break experiment.)
 *
 * The research's #1 cost-surviving timing edge is daily TS momentum (~28-day
 * lookback, ~5-day hold, Sharpe ~1.5 at 15bps; Han/Kang/Ryu 2023). The empirical
 * edge-map NEVER actually tested it — it ran the `classic` scorer on D1 bars over
 * a 2-year window too short to matter. This CLI tests the real thing: the C2
 * dailyMomentumEntry module driven through runBacktest under crypto perp costs on
 * deep daily history (~2100 bars / ~6 years per symbol), across the symbol set,
 * in three exit/geometry configs, with walk-forward folds and a cross-symbol
 * robustness gate.
 *
 * Three configs per symbol (all under crypto perp costs AND zero cost, so raw
 * edge and friction drag are separable):
 *   - signal-flip: the FAITHFUL momentum test — ride to the opposite cross, SL
 *     floor only, no TP. This is the realistic momentum config.
 *   - geometry-2R: the shipped LIVE_GEOMETRY (ATR14 2.5×SL, TP@2R) — comparison.
 *   - geometry-4R: LIVE_GEOMETRY with the wide 4R target the empirical map flagged.
 *
 * Data source: the gitignored deep daily dumps in data/research/candles
 * (SYMBOL-D1.json), loader shape identical to regime-backtest-cli.ts /
 * export-regime-features.ts.
 *
 * Determinism contract: `spec` + `results` + `aggregate` are pure functions of
 * the dumped candles and the code (the pure assembly in
 * daily-momentum-assembly.ts). Only `meta.runAt` varies between identical runs.
 * The output filename is derived from the spec, so re-running overwrites its file
 * instead of forking a near-duplicate.
 *
 * Honest-numbers discipline: cost-adjusted return/expectancy is reported AS-IS.
 * Thin cells (< THIN_CELL_MIN_TRADES) and single-symbol flukes are flagged. The
 * 28-day default lookback is run as specced — NO parameter tuning to manufacture
 * a positive. The verdict is evidence-bound: DEPLOYABLE only on a robust positive
 * (majority of symbols, ≥30 trades, robust across folds); a marginal or negative
 * result ships as the honest finding.
 *
 * Usage (after backfill of the D1 dumps):
 *   npx tsx scripts/research/daily-momentum-validation.ts \
 *     --candles-dir data/research/candles --timeframe D1 --folds 4
 */

import fs from 'fs';
import path from 'path';
import type { OHLCV } from '@tradeclaw/core';
import { CRYPTO_PERP_COSTS } from '../../packages/strategies/src';
import {
  CONFIGS,
  THIN_CELL_MIN_TRADES,
  computeSymbol,
  aggregateConfig,
  verdictFor,
  type ConfigId,
  type SymbolResult,
  type CostedCell,
} from './daily-momentum-assembly';

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const TF_HOURS: Record<string, number> = { H1: 1, H4: 4, D1: 24 };

/** The 10 liquid majors the deep daily dumps cover (Phase 4.5 D1 backfill). */
const DEFAULT_SYMBOLS = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD', 'LINKUSD', 'AVAXUSD'];

interface CandleDump {
  symbol: string;
  timeframe: string;
  source: string;
  candles: OHLCV[];
}

/** Same dump shape + loader as regime-backtest-cli.ts / export-regime-features.ts. */
function loadDump(candlesDir: string, symbol: string, timeframe: string): OHLCV[] {
  const file = path.join(candlesDir, `${symbol}-${timeframe}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`candle dump not found: ${file} — run backfill-candles.ts --out-dir first`);
  }
  const dump = JSON.parse(fs.readFileSync(file, 'utf-8')) as CandleDump;
  if (dump.symbol !== symbol || dump.timeframe !== timeframe || !Array.isArray(dump.candles)) {
    throw new Error(`candle dump ${file} does not match ${symbol} ${timeframe}`);
  }
  return dump.candles.slice().sort((a, b) => a.timestamp - b.timestamp);
}

/** Compact one costed cell for the console: trades / wr / costed return / zero-cost / drag. */
function cellStr(c: CostedCell): string {
  const thin = c.costed.totalTrades < THIN_CELL_MIN_TRADES ? ' ⚠THIN' : '';
  return (
    `n=${String(c.costed.totalTrades).padStart(4)} wr=${(c.costed.winRate * 100).toFixed(1).padStart(5)}% ` +
    `costed=${(c.costed.totalReturn * 100).toFixed(2).padStart(8)}% zero=${(c.zeroCost.totalReturn * 100).toFixed(2).padStart(8)}% ` +
    `drag=${(c.frictionDrag * 100).toFixed(2).padStart(7)}% E=${(c.costed.expectancy * 100).toFixed(3).padStart(7)}%${thin}`
  );
}

(() => {
  const symbolsArg = arg('symbols', '');
  const symbols = (symbolsArg ? symbolsArg.split(',').map((s) => s.trim().toUpperCase()) : DEFAULT_SYMBOLS);
  const timeframe = arg('timeframe', 'D1').toUpperCase();
  const candlesDir = arg('candles-dir', 'data/research/candles');
  // Validate BEFORE clamping: a non-finite or non-positive --folds is an operator
  // error, not something to silently clamp to 1. Math.max/floor only run on a
  // value already known to be a positive finite number.
  const foldsRaw = Number(arg('folds', '4'));
  if (!Number.isFinite(foldsRaw) || foldsRaw <= 0) {
    console.error(`--folds must be a positive number, got '${arg('folds', '4')}'`);
    process.exit(2);
  }
  const folds = Math.max(1, Math.floor(foldsRaw));
  const outDir = arg('out', 'docs/research/experiments');

  const costs = CRYPTO_PERP_COSTS;
  const barHours = TF_HOURS[timeframe] ?? 24;

  const symbolResults: SymbolResult[] = [];
  for (const symbol of symbols) {
    const candles = loadDump(candlesDir, symbol, timeframe);
    if (candles.length < 400) {
      console.error(
        `Insufficient dumped candles for ${symbol} ${timeframe}: have ${candles.length} (need ≥400 for a ` +
        'meaningful daily window with folds). Run backfill-candles.ts --out-dir first.',
      );
      process.exit(3);
    }
    const r = computeSymbol(symbol, candles, folds, costs, barHours, timeframe);
    symbolResults.push(r);

    // ── Console summary (full range) ───────────────────────────────────────
    console.log(`\n=== ${symbol} ${timeframe}  ${r.firstBar.slice(0, 10)}→${r.lastBar.slice(0, 10)}  (${r.candleCount} bars, ${folds} folds) ===`);
    for (const cfg of CONFIGS) {
      console.log(`    ${cfg.id.padEnd(12)} ${cellStr(r.full[cfg.id])}`);
    }
  }

  // ── Cross-symbol aggregate + verdict, per config ─────────────────────────
  const aggregates = CONFIGS.map((cfg) => {
    const agg = aggregateConfig(cfg.id, symbolResults);
    const { verdict, reasons } = verdictFor(agg);
    return { ...agg, verdict, verdictReasons: reasons, label: cfg.label };
  });

  console.log(`\n========== CROSS-SYMBOL AGGREGATE (${symbolResults.length} symbols, costs=crypto perp) ==========`);
  for (const a of aggregates) {
    const flukeStr = a.flukeSymbols.length > 0
      ? a.flukeSymbols.map((f) => `${f.symbol} ${(f.costedReturn * 100).toFixed(0)}%`).join(', ')
      : 'none';
    console.log(
      `\n  ${a.config}  [${a.label}]\n` +
      `    symbols positive+adequate: ${a.symbolsPositiveAndAdequate}/${a.symbolsTotal}  ` +
      `(positive-raw ${a.symbolsPositiveRaw}/${a.symbolsTotal}, thin ${a.symbolsThin}/${a.symbolsTotal})\n` +
      `    mean costed return ${(a.meanCostedReturn * 100).toFixed(2)}% (ex-flukes ${(a.meanCostedReturnExFlukes * 100).toFixed(2)}%)  ` +
      `mean zero-cost ${(a.meanZeroCostReturn * 100).toFixed(2)}%  mean drag ${(a.meanFrictionDrag * 100).toFixed(2)}%\n` +
      `    mean expectancy ${(a.meanExpectancy * 100).toFixed(3)}%/trade  mean trades ${a.meanTrades}  ` +
      `fold-stability ${(a.foldStability * 100).toFixed(0)}% (${a.foldCellsThin}/${a.foldCellsTotal} fold cells THIN)\n` +
      `    inflating flukes: ${flukeStr}\n` +
      `    VERDICT: ${a.verdict} — ${a.verdictReasons.join('; ')}`,
    );
  }

  const caveats = [
    'folds are contiguous sub-periods (stability inspection, not walk-forward optimization); daily-momentum has NO fitted parameters, so this is across-time stability, not in-sample/out-of-sample tuning',
    'per-fold indicator warmup restarts at the fold boundary (the 28-bar momentum lookback + the 14-bar ATR), and a position open at fold end force-closes at the last bar — short folds therefore carry fewer trades than the full range',
    'cost model = crypto perp (fee 0.05%/side + slippage 0.15%/side + funding 0.01%/8h); funding is a sign-agnostic upper bound, so a directional carry could be cheaper than modeled (costs are conservative, not optimistic)',
    `THIN CELLS: any config×symbol cell with fewer than ${THIN_CELL_MIN_TRADES} trades is flagged ⚠THIN — below that count the standard error of the mean dominates, so the cell's return/expectancy is insufficient evidence`,
    `FOLD-STABILITY THIN WEAKNESS: foldStability is the fraction of (symbol × fold) cells with positive costed return, and it counts THIN fold cells (< ${THIN_CELL_MIN_TRADES} trades) as if adequate — a positive-but-underpowered fold inflates it. aggregate.<config>.foldCellsThin / foldCellsTotal exposes how many of the cells behind the number were thin, so the stability read can be discounted accordingly (the gate threshold is unchanged — this is a transparency field, not a new gate)`,
    'INFLATING FLUKES: aggregate.<config>.flukeSymbols lists symbols whose extreme positive costed return (≥ +100% absolute, or ≥ 5× the cross-symbol median) inflate meanCostedReturn; meanCostedReturnExFlukes is the mean with them removed. A positive mean driven by one or two flukes is why a config can be MARGINAL (not positive) — read the ex-flukes mean alongside the headline mean',
    'signal-flip exit rides the trend to the opposite-direction momentum cross with the ATR SL as a floor and NO take-profit (tpRMultiple is ignored in this mode); geometry-2R/4R use the ATR TP/SL ladder',
    'totalReturn is the compounded fractional return at flat 10%-of-balance allocation; expectancy is the per-trade mean pnlPct (position-size-neutral) — the deployable bar reads BOTH',
    'lookback is the specced 28-day default — NO tuning; a one-off lookback sensitivity, if reported, is labeled as such and is not the headline',
  ];

  const spec = {
    strategy: 'daily-momentum',
    entryModule: 'dailyMomentumEntry',
    lookback: 28,
    timeframe,
    folds,
    barHours,
    costs: { ...costs },
    configs: CONFIGS.map((c) => ({ id: c.id, label: c.label, exitMode: c.exitMode, geometry: c.geometry })),
    symbols,
    deployableBar: {
      meanCostedReturnAndExpectancy: '> 0',
      symbolsPositiveAndAdequate: `≥ majority (> half), each with ≥ ${THIN_CELL_MIN_TRADES} trades`,
      foldStability: '> 50% of (symbol × fold) cells positive',
      thinFloor: THIN_CELL_MIN_TRADES,
    },
    perSymbolWindow: Object.fromEntries(
      symbolResults.map((s) => [s.symbol, { candleCount: s.candleCount, firstBar: s.firstBar, lastBar: s.lastBar }]),
    ),
    caveats,
  };

  const results = Object.fromEntries(
    symbolResults.map((s) => [
      s.symbol,
      {
        candleCount: s.candleCount,
        firstBar: s.firstBar,
        lastBar: s.lastBar,
        full: s.full,
        folds: s.folds,
      },
    ]),
  );

  const aggregate = Object.fromEntries(
    aggregates.map((a) => [a.config, a]),
  ) as Record<ConfigId, (typeof aggregates)[number]>;

  const payload = { meta: { runAt: new Date().toISOString() }, spec, aggregate, results };

  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `daily-momentum-validation-${symbols.join('_')}-${timeframe}-f${folds}.json`;
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  // REGISTRY headline: per-config verdict + positive/total + mean costed return.
  const registryPath = path.join(outDir, 'REGISTRY.md');
  const headline = aggregates
    .map((a) => `${a.config} ${a.verdict} ${a.symbolsPositiveAndAdequate}/${a.symbolsTotal}+ mean=${(a.meanCostedReturn * 100).toFixed(2)}%`)
    .join(' · ');
  fs.appendFileSync(
    registryPath,
    `- ${payload.meta.runAt.slice(0, 10)} \`${fileName}\` — Phase 4.5 D4 deep-daily daily-momentum (28d TS momentum) validation, ` +
    `${symbols.length} majors ${timeframe} (~${symbolResults[0]?.candleCount ?? 0} bars), costs=crypto perp, ${folds} folds, ` +
    `configs={signal-flip,geometry-2R,geometry-4R}: ${headline}\n`,
  );

  console.log(`\nwritten: ${outPath}`);
  console.log('NOTE: the per-config VERDICT above IS the honest gate read — DEPLOYABLE requires a robust positive across the majority of symbols + folds, not one lucky cell.');
})();
