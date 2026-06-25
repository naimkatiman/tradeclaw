/**
 * Phase 5 Track A: does funding-rate carry clear its FROZEN gates?
 * Spec + gates: docs/plans/2026-06-13-phase5-carry-xsection-research.md (D2).
 *
 * Variants (all pre-registered, NO tuning):
 *   A1 always-on BTC carry — the raw structural yield.
 *   A2 threshold-gated per symbol — enter trailing-7d-annualized > 5%, exit < 0%.
 *   A3 top-3 carry rotation, weekly rebalance, across the 10-major universe.
 *
 * Accounting: carry-assembly.ts (notional 1 / capital 2 unlevered; yields on
 * 2× capital; full two-leg costs). Disclosed v1 limitations: basis MTM path
 * risk and short-leg squeeze risk are NOT modeled — stated in spec + memo.
 *
 * Determinism: spec/results/gates are pure functions of the dumped events.
 * Only meta.runAt varies. Output filename derives from the spec.
 *
 * Usage (after backfill-funding.ts --out-dir):
 *   npx tsx scripts/research/carry-validation.ts --funding-dir data/research/funding --folds 4
 */

import fs from 'fs';
import path from 'path';
import {
  runAlwaysOn,
  runThresholdGated,
  runCarryRotation,
  splitFolds,
  recentSlice,
  carryGates,
  CARRY_COSTS,
  type FundingEvent,
  type CarryRunResult,
} from './carry-assembly';

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const DEFAULT_SYMBOLS = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD', 'LINKUSD', 'AVAXUSD'];
const THRESHOLDS = { enterAbove: 0.05, exitBelow: 0, trailingDays: 7 } as const;
const ROTATION = { topK: 3, rebalanceDays: 7, trailingDays: 7 } as const;
const RECENT_DAYS = 730;

interface FundingDump { symbol: string; source: string; events: Array<{ ts: number; rate: number; markPrice: number | null }> }

function loadFunding(dir: string, symbol: string): FundingEvent[] {
  const file = path.join(dir, `${symbol}-funding.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`funding dump not found: ${file} — run backfill-funding.ts --out-dir first`);
  }
  const dump = JSON.parse(fs.readFileSync(file, 'utf-8')) as FundingDump;
  if (dump.symbol !== symbol || !Array.isArray(dump.events)) {
    throw new Error(`funding dump ${file} does not match ${symbol}`);
  }
  return dump.events
    .map((e) => ({ ts: e.ts, rate: e.rate }))
    .sort((a, b) => a.ts - b.ts);
}

function pct(x: number): string { return `${(x * 100).toFixed(2)}%`; }

function summarize(label: string, r: CarryRunResult): string {
  return `${label.padEnd(26)} ann=${pct(r.annualizedReturn).padStart(8)} ret=${pct(r.returnOnCapital).padStart(8)} ` +
    `dd=${pct(r.maxDrawdown).padStart(7)} gross/cap=${pct(r.grossIncome / 2).padStart(8)} costs/cap=${pct(r.totalCosts / 2).padStart(7)} ` +
    `days=${r.windowDays.toFixed(0)} events=${r.eventCount}`;
}

(() => {
  const symbolsArg = arg('symbols', '');
  const symbols = symbolsArg ? symbolsArg.split(',').map((s) => s.trim().toUpperCase()) : DEFAULT_SYMBOLS;
  const fundingDir = arg('funding-dir', 'data/research/funding');
  const foldsRaw = Number(arg('folds', '4'));
  if (!Number.isFinite(foldsRaw) || foldsRaw <= 0) {
    console.error(`--folds must be a positive number, got '${arg('folds', '4')}'`);
    process.exit(2);
  }
  const folds = Math.max(1, Math.floor(foldsRaw));
  const outDir = arg('out', 'docs/research/experiments');

  const perSymbol: Record<string, FundingEvent[]> = {};
  for (const s of symbols) perSymbol[s] = loadFunding(fundingDir, s);

  // ── A1: always-on BTC ──────────────────────────────────────────────────────
  const btc = perSymbol['BTCUSD'];
  if (!btc || btc.length < 100) {
    console.error('A1 requires a BTCUSD funding dump with ≥100 events');
    process.exit(3);
  }
  const a1Full = runAlwaysOn(btc);
  const a1Recent = runAlwaysOn(recentSlice(btc, RECENT_DAYS));
  const a1Folds = splitFolds(btc, folds).map((f, i) => ({ fold: `fold${i + 1}`, ...runAlwaysOn(f) }));
  const a1Gates = carryGates({
    fullAnnualized: a1Full.annualizedReturn,
    recentAnnualized: a1Recent.annualizedReturn,
    maxDrawdown: a1Full.maxDrawdown,
    foldsPositive: a1Folds.filter((f) => f.returnOnCapital > 0).length,
    foldsTotal: folds,
  });

  console.log('\n=== A1 always-on BTC carry ===');
  console.log('  ' + summarize('full', a1Full));
  console.log('  ' + summarize(`recent-${RECENT_DAYS}d`, a1Recent));
  for (const f of a1Folds) console.log('  ' + summarize(f.fold, f));
  console.log(`  GATES: ${a1Gates.pass ? 'PASS' : 'FAIL'} ${a1Gates.reasons.join('; ')}`);

  // ── A2: threshold-gated per symbol ────────────────────────────────────────
  function buildA2(events: FundingEvent[]) {
    const full = runThresholdGated(events, THRESHOLDS);
    const recent = runThresholdGated(recentSlice(events, RECENT_DAYS), THRESHOLDS);
    const foldRuns = splitFolds(events, folds).map((f, i) => ({ fold: `fold${i + 1}`, ...runThresholdGated(f, THRESHOLDS) }));
    const gates = carryGates({
      fullAnnualized: full.annualizedReturn,
      recentAnnualized: recent.annualizedReturn,
      maxDrawdown: full.maxDrawdown,
      foldsPositive: foldRuns.filter((f) => f.returnOnCapital > 0).length,
      foldsTotal: folds,
    });
    return { full, recent, folds: foldRuns, gates };
  }
  const a2: Record<string, ReturnType<typeof buildA2>> = {};
  console.log('\n=== A2 threshold-gated carry (enter >5%/yr trailing-7d, exit <0%) ===');
  for (const s of symbols) {
    a2[s] = buildA2(perSymbol[s]);
    console.log(`  ${s}: ${summarize('full', a2[s].full)}  trips=${a2[s].full.roundTrips}  GATES ${a2[s].gates.pass ? 'PASS' : 'FAIL'}`);
  }
  const a2PassCount = symbols.filter((s) => a2[s].gates.pass).length;

  // ── A3: top-3 rotation across the universe ────────────────────────────────
  // A3 evaluates the universe only where the WHOLE universe exists: clip every
  // symbol to the latest first-event ts (commonStart). This prevents phantom
  // holds of not-yet-listed symbols (empty trailing window ranks as 0) and makes
  // fold windows comparable across symbols.
  const commonStart = Math.max(...symbols.map((s) => perSymbol[s][0].ts));
  const a3PerSymbol = Object.fromEntries(
    symbols.map((s) => [s, perSymbol[s].filter((e) => e.ts >= commonStart)]),
  );
  const a3Full = runCarryRotation(a3PerSymbol, ROTATION);
  const recentPerSymbol = Object.fromEntries(symbols.map((s) => [s, recentSlice(a3PerSymbol[s], RECENT_DAYS)]));
  const a3Recent = runCarryRotation(recentPerSymbol, ROTATION);
  // A3 folds are TIME-aligned: equal calendar slices of [commonStart, a3End],
  // not per-symbol event-count slices (symbols have different cadences/lengths).
  const a3End = Math.max(...symbols.map((s) => { const ev = a3PerSymbol[s]; return ev.length ? ev[ev.length - 1].ts : commonStart; }));
  const a3Folds = Array.from({ length: folds }, (_, i) => {
    const from = commonStart + ((a3End - commonStart) * i) / folds;
    const to = i === folds - 1 ? a3End : commonStart + ((a3End - commonStart) * (i + 1)) / folds;
    const sliced = Object.fromEntries(
      symbols.map((s) => [s, a3PerSymbol[s].filter((e) => e.ts >= from && (i === folds - 1 ? e.ts <= to : e.ts < to))]),
    );
    return { fold: `fold${i + 1}`, ...runCarryRotation(sliced, ROTATION) };
  });
  const a3Gates = carryGates({
    fullAnnualized: a3Full.annualizedReturn,
    recentAnnualized: a3Recent.annualizedReturn,
    maxDrawdown: a3Full.maxDrawdown,
    foldsPositive: a3Folds.filter((f) => f.returnOnCapital > 0).length,
    foldsTotal: folds,
  });
  console.log('\n=== A3 top-3 carry rotation, weekly ===');
  console.log('  ' + summarize('full', a3Full) + `  swaps=${a3Full.totalSwaps}`);
  console.log('  ' + summarize(`recent-${RECENT_DAYS}d`, a3Recent));
  for (const f of a3Folds) console.log('  ' + summarize(f.fold, f));
  console.log(`  GATES: ${a3Gates.pass ? 'PASS' : 'FAIL'} ${a3Gates.reasons.join('; ')}`);

  const caveats = [
    'capital model: notional 1, capital 2 (1 spot + 1 perp margin, unlevered) — all yields are on 2× deployed capital; a desk running leverage would scale yield AND risk',
    `costs: spot ${CARRY_COSTS.spotSide * 100}%/side + perp ${CARRY_COSTS.perpSide * 100}%/side = ${CARRY_COSTS.roundTrip * 100}% of notional per full round trip; A1 pays one round trip, A2/A3 pay per position change`,
    'basis mark-to-market path risk and short-perp-leg squeeze/liquidation risk are NOT modeled (v1 limitation, disclosed in the spec) — if gates pass, Phase 5.5 measures basis from perp klines BEFORE any go-live decision',
    'income accrues for events strictly after entry up to and including exit — no look-ahead; trailing-7d annualized signal uses only events ≤ decision time',
    'funding events are summed as they occurred — no fixed 8h-interval assumption (some symbols moved to 4h intervals)',
    'annualization is simple (return × 365/days), not compounded — transparent and conservative at these magnitudes',
    'folds are contiguous sub-periods; each fold is a standalone deployment (its own entry/exit costs), so short folds carry proportionally more cost drag',
    'A3 (rotation) is evaluated only from the date ALL universe symbols have funding history (a3CommonStart) — prevents phantom holds of unlisted symbols and makes folds time-aligned calendar slices, unlike A1/A2 whose folds are per-symbol event-count slices',
    'gates are FROZEN in docs/plans/2026-06-13-phase5-carry-xsection-research.md — any deviation is a protocol break and must be called out in the memo',
  ];

  const spec = {
    track: 'A-carry',
    variants: {
      A1: { kind: 'always-on', symbol: 'BTCUSD' },
      A2: { kind: 'threshold-gated', ...THRESHOLDS, symbols },
      A3: { kind: 'rotation', ...ROTATION, symbols },
    },
    costs: { ...CARRY_COSTS },
    capitalModel: { notional: 1, capital: 2, leverage: 'none' },
    recentWindowDays: RECENT_DAYS,
    a3CommonStart: new Date(commonStart).toISOString().slice(0, 10),
    folds,
    gates: {
      fullAnnualized: '> 8%', recentAnnualized: '> 5%', maxDrawdown: '< 10%', foldsPositive: '≥ 3/4',
    },
    perSymbolWindow: Object.fromEntries(symbols.map((s) => {
      const ev = perSymbol[s];
      return [s, {
        eventCount: ev.length,
        first: ev.length ? new Date(ev[0].ts).toISOString() : null,
        last: ev.length ? new Date(ev[ev.length - 1].ts).toISOString() : null,
      }];
    })),
    caveats,
  };

  const results = {
    A1: { full: a1Full, recent: a1Recent, folds: a1Folds, gates: a1Gates },
    A2: Object.fromEntries(symbols.map((s) => [s, a2[s]])),
    A2Summary: { symbolsPassing: a2PassCount, symbolsTotal: symbols.length },
    A3: { full: a3Full, recent: a3Recent, folds: a3Folds, gates: a3Gates },
  };

  const payload = { meta: { runAt: new Date().toISOString() }, spec, results };
  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `carry-validation-${symbols.length}majors-f${folds}.json`;
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  const registryPath = path.join(outDir, 'REGISTRY.md');
  fs.appendFileSync(
    registryPath,
    `- ${payload.meta.runAt.slice(0, 10)} \`${fileName}\` — Phase 5 Track A carry validation, ${symbols.length} majors, ` +
    `costs=two-leg (${CARRY_COSTS.roundTrip * 100}% RT), capital=2x unlevered, ${folds} folds: ` +
    `A1(BTC always-on) ann=${pct(a1Full.annualizedReturn)} recent=${pct(a1Recent.annualizedReturn)} dd=${pct(a1Full.maxDrawdown)} gates=${a1Gates.pass ? 'PASS' : 'FAIL'} · ` +
    `A2(threshold) ${a2PassCount}/${symbols.length} symbols pass · ` +
    `A3(top-3 rotation) ann=${pct(a3Full.annualizedReturn)} recent=${pct(a3Recent.annualizedReturn)} gates=${a3Gates.pass ? 'PASS' : 'FAIL'}\n`,
  );

  console.log(`\nwritten: ${outPath}`);
  console.log('NOTE: the gates above ARE the frozen spec gates — a FAIL ships as the honest finding, not a tuning invitation.');
})();
