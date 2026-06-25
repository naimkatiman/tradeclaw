/**
 * Phase 5 Track B: does cross-sectional momentum beat passive holding after
 * costs? Spec + frozen gates: docs/plans/2026-06-13-phase5-carry-xsection-research.md (D4).
 *
 * Variants (pre-registered, NO tuning): B1 long-only top-5; B2 long-short
 * top5−bottom5 (gross 1.0, unlevered). 14-day lookback, weekly rebalance.
 * Benchmarks through the IDENTICAL machinery + costs: equal-weight basket
 * (the gate benchmark) and BTC buy-and-hold (reference only).
 *
 * Survivorship: today's top-30 universe is an optimistic bias (disclosed);
 * the 2024-06→end subwindow (all 30 listed) is reported alongside.
 *
 * Determinism: only meta.runAt varies. Filename derives from the spec.
 *
 * Usage (after backfill-candles.ts --out-dir, 30 symbols, D1):
 *   npx tsx scripts/research/xsection-validation.ts --candles-dir data/research/candles --folds 4
 */

import fs from 'fs';
import path from 'path';
import {
  buildGrid,
  runXsection,
  runBasket,
  btcHold,
  splitGridFolds,
  sliceGrid,
  xsectionGates,
  XS_SIDE_COST,
  type DailySeries,
  type XsectionResult,
  type DailyGrid,
} from './xsection-assembly';

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const UNIVERSE = [
  'BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD', 'LINKUSD', 'AVAXUSD',
  'LTCUSD', 'BCHUSD', 'ETCUSD', 'XLMUSD', 'TRXUSD', 'ATOMUSD', 'NEARUSD', 'FILUSD', 'UNIUSD', 'AAVEUSD',
  'SANDUSD', 'MANAUSD', 'ICPUSD', 'ALGOUSD', 'VETUSD', 'AXSUSD', 'THETAUSD', 'GRTUSD', 'HBARUSD', 'INJUSD',
];
const LOOKBACK = 14;
const REBALANCE = 7;
const TOPK = 5;
const SUBWINDOW_FROM = Date.UTC(2024, 5, 1); // 2024-06-01: all 30 listed

interface CandleDump { symbol: string; timeframe: string; source: string; candles: Array<{ timestamp: number; close: number }> }

function loadSeries(dir: string, symbol: string): DailySeries {
  const file = path.join(dir, `${symbol}-D1.json`);
  if (!fs.existsSync(file)) throw new Error(`candle dump not found: ${file} — run backfill-candles.ts --out-dir first`);
  const dump = JSON.parse(fs.readFileSync(file, 'utf-8')) as CandleDump;
  if (dump.symbol !== symbol || !Array.isArray(dump.candles)) throw new Error(`dump ${file} does not match ${symbol}`);
  return {
    symbol,
    bars: dump.candles
      .map((c) => ({ ts: c.timestamp, close: c.close }))
      .sort((a, b) => a.ts - b.ts),
  };
}

function pct(x: number): string { return `${(x * 100).toFixed(2)}%`; }

function line(label: string, r: { totalReturn: number; sharpe: number; maxDrawdown: number; totalTurnoverCost: number; rebalanceCount: number }): string {
  return `${label.padEnd(14)} ret=${pct(r.totalReturn).padStart(9)} sharpe=${r.sharpe.toFixed(2).padStart(6)} ` +
    `dd=${pct(r.maxDrawdown).padStart(7)} cost=${pct(r.totalTurnoverCost).padStart(7)} rebs=${r.rebalanceCount}`;
}

/** Strip the bulky dailyReturns + rebalances from the persisted payload (derivable from the dumps). */
function compact(r: XsectionResult) {
  const { dailyReturns: _d, rebalances, ...rest } = r;
  return {
    ...rest,
    rebalanceCount: rebalances.length,
    meanEligible: +(
      rebalances.reduce((s, x) => s + x.eligibleCount, 0) / Math.max(1, rebalances.length)
    ).toFixed(1),
  };
}

function evaluate(grid: DailyGrid, folds: number) {
  const opts = { topK: TOPK, lookback: LOOKBACK, rebalanceEvery: REBALANCE };
  const b1 = runXsection(grid, { ...opts, mode: 'long-only' });
  const b2 = runXsection(grid, { ...opts, mode: 'long-short' });
  const basket = runBasket(grid, opts);
  const btc = btcHold(grid, opts);

  const foldRanges = splitGridFolds(grid, folds);
  const foldRows = foldRanges.map((f) => {
    const g = sliceGrid(grid, f.from, f.to);
    const s1 = runXsection(g, { ...opts, mode: 'long-only' });
    const s2 = runXsection(g, { ...opts, mode: 'long-short' });
    const bk = runBasket(g, opts);
    return {
      label: f.label,
      from: new Date(g.ts[0]).toISOString().slice(0, 10),
      to: new Date(g.ts[g.ts.length - 1]).toISOString().slice(0, 10),
      b1: { totalReturn: s1.totalReturn, sharpe: s1.sharpe, excess: +(s1.totalReturn - bk.totalReturn).toFixed(10) },
      b2: { totalReturn: s2.totalReturn, sharpe: s2.sharpe, excess: +(s2.totalReturn - bk.totalReturn).toFixed(10) },
      basket: { totalReturn: bk.totalReturn, sharpe: bk.sharpe },
    };
  });

  const gates = {
    B1: xsectionGates({
      strategyReturn: b1.totalReturn, basketReturn: basket.totalReturn,
      strategySharpe: b1.sharpe, basketSharpe: basket.sharpe,
      foldsExcessPositive: foldRows.filter((f) => f.b1.excess > 0).length, foldsTotal: folds,
    }),
    B2: xsectionGates({
      strategyReturn: b2.totalReturn, basketReturn: basket.totalReturn,
      strategySharpe: b2.sharpe, basketSharpe: basket.sharpe,
      foldsExcessPositive: foldRows.filter((f) => f.b2.excess > 0).length, foldsTotal: folds,
    }),
  };

  return { b1: compact(b1), b2: compact(b2), basket: compact(basket), btc: compact(btc), folds: foldRows, gates };
}

(() => {
  const candlesDir = arg('candles-dir', 'data/research/candles');
  const foldsArg = arg('folds', '4');
  const foldsRaw = Number(foldsArg);
  if (!Number.isFinite(foldsRaw) || foldsRaw <= 0) {
    console.error(`--folds must be a positive number, got '${foldsArg}'`);
    process.exit(2);
  }
  const folds = Math.max(1, Math.floor(foldsRaw));
  const outDir = arg('out', 'docs/research/experiments');

  const series = UNIVERSE.map((s) => loadSeries(candlesDir, s));
  const grid = buildGrid(series);
  if (grid.ts.length < LOOKBACK + REBALANCE + 1) {
    console.error('grid too short for lookback+rebalance warmup');
    process.exit(4);
  }
  const full = evaluate(grid, folds);

  // subwindow: all-30-listed window (survivorship mitigation read)
  const subFrom = grid.ts.findIndex((t) => t >= SUBWINDOW_FROM);
  if (subFrom < 0) { console.error('subwindow start beyond grid end — check dumps'); process.exit(3); }
  const subGrid = sliceGrid(grid, subFrom, grid.ts.length - 1);
  if (subGrid.ts.length < LOOKBACK + REBALANCE + 1) {
    console.error('grid too short for lookback+rebalance warmup');
    process.exit(4);
  }
  const sub = evaluate(subGrid, folds);

  console.log(`\n=== Track B cross-sectional momentum (${UNIVERSE.length} majors, lb${LOOKBACK}, rb${REBALANCE}, top${TOPK}) ===`);
  console.log('  FULL WINDOW');
  console.log('    ' + line('B1', full.b1));
  console.log('    ' + line('B2', full.b2));
  console.log('    ' + line('basket', full.basket));
  console.log('    ' + line('btcHold', full.btc));
  console.log(`    GATES B1: ${full.gates.B1.pass ? 'PASS' : 'FAIL'} ${full.gates.B1.reasons.join('; ')}`);
  console.log(`    GATES B2: ${full.gates.B2.pass ? 'PASS' : 'FAIL'} ${full.gates.B2.reasons.join('; ')}`);
  console.log('  SUBWINDOW 2024-06→end (all 30 listed)');
  console.log('    ' + line('B1', sub.b1));
  console.log('    ' + line('B2', sub.b2));
  console.log('    ' + line('basket', sub.basket));
  console.log('    ' + line('btcHold', sub.btc));
  console.log(`    GATES B1: ${sub.gates.B1.pass ? 'PASS' : 'FAIL'} ${sub.gates.B1.reasons.join('; ')}`);
  console.log(`    GATES B2: ${sub.gates.B2.pass ? 'PASS' : 'FAIL'} ${sub.gates.B2.reasons.join('; ')}`);

  const caveats = [
    "survivorship: the 30-symbol universe is TODAY'S liquid majors — an optimistic bias the full-window numbers inherit; the 2024-06→end subwindow (all 30 listed) is the bias-mitigated read and the gate verdict quotes BOTH",
    'eligibility is listing-date-aware (a symbol ranks only with lookback+1 stored bars), which removes look-ahead but not selection bias',
    `costs: ${XS_SIDE_COST * 100}%/side (Phase 2 crypto model) charged on actual turnover at each rebalance; the basket benchmark pays the SAME costs through the SAME machinery`,
    "weights are fixed between rebalances (drift ignored) and a held symbol's missing bar contributes 0 that day — both simplifications are symmetric across strategy and benchmark",
    'B2 long-short is gross 1.0 dollar-neutral UNLEVERED; short-leg funding flows are NOT modeled here (Track A quantifies funding separately)',
    'the gate benchmark is the equal-weight basket, NOT zero: rotation must beat passive holding of the same universe or it is churn',
    'gates are FROZEN in docs/plans/2026-06-13-phase5-carry-xsection-research.md — any deviation is a protocol break and must be called out in the memo',
  ];

  const spec = {
    track: 'B-xsection',
    universe: UNIVERSE,
    lookback: LOOKBACK,
    rebalanceEvery: REBALANCE,
    topK: TOPK,
    sideCost: XS_SIDE_COST,
    folds,
    subwindowFrom: new Date(SUBWINDOW_FROM).toISOString().slice(0, 10),
    gates: { vsBasket: 'return AND Sharpe > basket', foldsExcessPositive: '≥ 3/4' },
    gridDays: grid.ts.length,
    caveats,
  };

  const payload = { meta: { runAt: new Date().toISOString() }, spec, full, subwindow: sub };
  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `xsection-validation-${UNIVERSE.length}majors-D1-lb${LOOKBACK}-rb${REBALANCE}-top${TOPK}-f${folds}.json`;
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  const registryPath = path.join(outDir, 'REGISTRY.md');
  fs.appendFileSync(
    registryPath,
    `- ${payload.meta.runAt.slice(0, 10)} \`${fileName}\` — Phase 5 Track B cross-sectional momentum, ${UNIVERSE.length} majors D1 lb${LOOKBACK} rb${REBALANCE} top${TOPK}, ` +
    `costs=${XS_SIDE_COST * 100}%/side, ${folds} folds: ` +
    `B1(long-only) ret=${pct(full.b1.totalReturn)} vs basket ${pct(full.basket.totalReturn)} gates=${full.gates.B1.pass ? 'PASS' : 'FAIL'} · ` +
    `B2(long-short) ret=${pct(full.b2.totalReturn)} vs basket ${pct(full.basket.totalReturn)} gates=${full.gates.B2.pass ? 'PASS' : 'FAIL'} · ` +
    `subwindow(2024-06→) B1 ret=${pct(sub.b1.totalReturn)} vs basket ${pct(sub.basket.totalReturn)} ${sub.gates.B1.pass ? 'PASS' : 'FAIL'} ` +
    `B2 ret=${pct(sub.b2.totalReturn)} vs basket ${pct(sub.basket.totalReturn)} ${sub.gates.B2.pass ? 'PASS' : 'FAIL'}\n`,
  );

  console.log(`\nwritten: ${outPath}`);
  console.log('NOTE: the gate benchmark is the equal-weight basket — beating zero is not the bar.');
})();
