/**
 * Headless research backtest runner (engine-makeover Phase 2).
 *
 * The missing middle of the research loop: hypothesis → COSTED backtest on
 * STORED candles → sub-period folds → registered result. Reads exclusively
 * from the `candles` store so the same spec always replays the same bars —
 * never from live providers.
 *
 * Fold semantics: --folds N runs each preset on N CONTIGUOUS SUB-PERIODS in
 * addition to the full range. This is stability inspection, NOT walk-forward
 * optimization (no presets have fitted parameters yet). Caveats per fold:
 * indicator/regime warmup restarts at the fold boundary, and a trade open at
 * fold end force-closes at the last bar ('EOD'). Negligible on H1 folds,
 * material on short D1 folds.
 *
 * Determinism contract: `spec` + `results` are pure functions of the stored
 * candles, the code, and the HMM model files (whose content hash is recorded
 * in spec.hmmModels); only `meta.runAt` varies between identical runs. The
 * output filename is derived from the spec, so re-running an experiment
 * overwrites its file instead of forking a near-duplicate.
 *
 * Usage:
 *   railway run --service Postgres npx tsx scripts/research/run-backtest-cli.ts \
 *     --symbol BTCUSD --timeframe H1 --from 2024-06-01 --to 2026-06-01 \
 *     --presets all --geometry live --costs auto --folds 4
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  PRESETS,
  runBacktest,
  costModelFor,
  CRYPTO_PERP_COSTS,
  FX_COSTS,
  METALS_COSTS,
  ZERO_COSTS,
  LIVE_GEOMETRY,
  FIXED_LEGACY_GEOMETRY,
  type BacktestOptions,
  type BacktestResult,
  type StrategyId,
} from '../../packages/strategies/src';
import { connect, getStoredCandles, getCoverage } from './candle-db';

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const TF_HOURS: Record<string, number> = { H1: 1, H4: 4, D1: 24 };

/**
 * Presets whose semantics do not survive a single multi-year window:
 * hmm-top3 (and full-risk, which wraps it) caps signals to the top 3 BY
 * WINDOW — production applies that cap per 5-minute scan cycle, so a 2-year
 * run yields 3 trades and measures nothing about the deployed preset.
 */
const WINDOW_CAPPED_PRESETS = new Set(['hmm-top3', 'full-risk']);

/** Identity of the HMM model files regime presets classify with — part of the determinism contract. */
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

function metrics(r: BacktestResult) {
  const avgCostPct = r.trades.length > 0
    ? r.trades.reduce((s, t) => s + (t.costPct ?? 0), 0) / r.trades.length
    : 0;
  return {
    totalTrades: r.totalTrades,
    winRate: +r.winRate.toFixed(4),
    profitFactor: Number.isFinite(r.profitFactor) ? +r.profitFactor.toFixed(3) : null,
    maxDrawdown: +r.maxDrawdown.toFixed(4),
    sharpeRatio: +r.sharpeRatio.toFixed(3),
    totalReturn: +r.totalReturn.toFixed(4),
    avgCostPct: +avgCostPct.toFixed(4),
    reason: r.reason ?? null,
  };
}

(async () => {
  const symbol = arg('symbol', 'BTCUSD').toUpperCase();
  const timeframe = arg('timeframe', 'H1').toUpperCase();
  const from = arg('from', '');
  const to = arg('to', '');
  const presetsArg = arg('presets', 'all');
  const geometryArg = arg('geometry', 'live');
  const costsArg = arg('costs', 'auto');
  const folds = Math.max(1, Number(arg('folds', '4')));
  const outDir = arg('out', 'docs/research/experiments');
  // Phase 4.5 knobs (all optional; absent = legacy behavior unchanged).
  const tpRArg = arg('tp-r', '');
  const exitModeArg = arg('exit-mode', 'geometry');
  const minConfidenceArg = arg('min-confidence', '');

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
  if (exitModeArg !== 'geometry' && exitModeArg !== 'signal-flip') {
    console.error(`--exit-mode must be 'geometry' or 'signal-flip', got '${exitModeArg}'`);
    process.exit(2);
  }
  const tpR = tpRArg ? Number(tpRArg) : undefined;
  if (tpR !== undefined && (!Number.isFinite(tpR) || tpR <= 0)) {
    console.error(`--tp-r must be a positive number, got '${tpRArg}'`);
    process.exit(2);
  }
  const minConfidence = minConfidenceArg ? Number(minConfidenceArg) : undefined;
  if (minConfidence !== undefined && !Number.isFinite(minConfidence)) {
    console.error(`--min-confidence must be a number, got '${minConfidenceArg}'`);
    process.exit(2);
  }

  // --tp-r overrides the geometry's R-multiple (wide targets as a first-class
  // flag). Only the ATR ('live') geometry carries tpRMultiple; the legacy fixed
  // 2%/1% geometry has no R-multiple, so --tp-r is rejected against it rather
  // than silently ignored.
  let geometry = geometryArg === 'legacy' ? FIXED_LEGACY_GEOMETRY : LIVE_GEOMETRY;
  if (tpR !== undefined) {
    if (geometry.mode !== 'atr') {
      console.error('--tp-r only applies to the ATR (live) geometry; drop --geometry legacy or --tp-r');
      process.exit(2);
    }
    geometry = { ...geometry, tpRMultiple: tpR };
  }
  const costs =
    costsArg === 'zero' ? ZERO_COSTS
    : costsArg === 'crypto' ? CRYPTO_PERP_COSTS
    : costsArg === 'fx' ? FX_COSTS
    : costsArg === 'metals' ? METALS_COSTS
    : costModelFor(symbol);
  const options: BacktestOptions = {
    costs,
    geometry,
    barHours: TF_HOURS[timeframe] ?? 1,
    ...(exitModeArg === 'signal-flip' ? { exitMode: 'signal-flip' as const } : {}),
    ...(minConfidence !== undefined ? { minConfidence } : {}),
  };

  const requestedPresets = presetsArg === 'all'
    ? (Object.keys(PRESETS) as StrategyId[])
    : (presetsArg.split(',').map((s) => s.trim()) as StrategyId[]);
  const unknown = requestedPresets.filter((id) => !(id in PRESETS));
  if (unknown.length > 0) {
    console.error(`Unknown preset(s): ${unknown.join(', ')}. Valid: ${Object.keys(PRESETS).join(', ')}`);
    process.exit(2);
  }
  const presetIds = requestedPresets;

  const client = await connect();
  try {
    const candles = await getStoredCandles(client, symbol, timeframe, fromTs, toTs);
    if (candles.length < 100) {
      const cov = await getCoverage(client, symbol, timeframe);
      console.error(
        `Insufficient stored candles for ${symbol} ${timeframe} in [${from}, ${to}]: have ${candles.length}.` +
        (cov.count > 0
          ? ` Store covers ${new Date(cov.minTs!).toISOString().slice(0, 10)}→${new Date(cov.maxTs!).toISOString().slice(0, 10)} (${cov.count} bars).`
          : ' Store is empty for this series.') +
        ' Run scripts/research/backfill-candles.ts first.',
      );
      process.exit(3);
    }

    const foldSize = Math.floor(candles.length / folds);
    const results: Record<string, { full: ReturnType<typeof metrics>; folds: Array<ReturnType<typeof metrics> & { from: string; to: string }> }> = {};

    const runOptions = { ...options, context: { symbol, timeframe } };
    for (const id of presetIds) {
      const preset = PRESETS[id];
      const full = metrics(runBacktest(candles, preset, runOptions));
      const foldResults = [];
      for (let f = 0; f < folds; f++) {
        const start = f * foldSize;
        const end = f === folds - 1 ? candles.length : (f + 1) * foldSize;
        const slice = candles.slice(start, end);
        foldResults.push({
          ...metrics(runBacktest(slice, preset, runOptions)),
          from: new Date(slice[0].timestamp).toISOString().slice(0, 10),
          to: new Date(slice[slice.length - 1].timestamp).toISOString().slice(0, 10),
        });
      }
      results[id] = { full, folds: foldResults };
      const capped = WINDOW_CAPPED_PRESETS.has(id) ? '  [WINDOW-CAPPED — not production-comparable]' : '';
      console.log(
        `${id.padEnd(14)} trades=${String(full.totalTrades).padStart(4)} winRate=${(full.winRate * 100).toFixed(1)}% ` +
        `return=${(full.totalReturn * 100).toFixed(1)}% maxDD=${(full.maxDrawdown * 100).toFixed(1)}% PF=${full.profitFactor ?? '∞'} avgCost=${full.avgCostPct}%${capped}`,
      );
    }

    const caveats = [
      'folds are contiguous sub-periods (stability inspection, not walk-forward optimization); per-fold indicator/regime warmup restarts and open trades force-close EOD at fold end',
      ...presetIds.filter((id) => WINDOW_CAPPED_PRESETS.has(id)).map(
        (id) => `${id}: top-3 cap applies to the WHOLE window under this runner (production caps per scan cycle) — its numbers are not production-comparable`,
      ),
    ];
    // Provenance string reflects the ACTUAL R-multiple when --tp-r overrides it,
    // so a 4R run is not mislabeled as the 2R default. Unchanged when --tp-r is
    // absent.
    const geometryLabel = geometryArg === 'legacy'
      ? 'legacy-fixed-2-1'
      : `live-atr14x2.5-tp${geometry.mode === 'atr' ? geometry.tpRMultiple : 2}R`;
    const spec = {
      symbol,
      timeframe,
      from,
      to,
      geometry: geometryLabel,
      costs: { ...costs },
      folds,
      candleCount: candles.length,
      firstBar: new Date(candles[0].timestamp).toISOString(),
      lastBar: new Date(candles[candles.length - 1].timestamp).toISOString(),
      presets: presetIds,
      entryContext: { symbol, timeframe },
      hmmModels: hmmModelIdentity(),
      // Phase 4.5 knobs recorded only when set, so the default-run spec is
      // unchanged (no spurious provenance churn on legacy invocations).
      ...(exitModeArg === 'signal-flip' ? { exitMode: 'signal-flip' } : {}),
      ...(minConfidence !== undefined ? { minConfidence } : {}),
      caveats,
    };
    const payload = { meta: { runAt: new Date().toISOString() }, spec, results };

    fs.mkdirSync(outDir, { recursive: true });
    const fileName = `${symbol}-${timeframe}-${from}-${to}-${geometryArg}-${costsArg}-${presetIds.join('_')}-f${folds}.json`;
    const outPath = path.join(outDir, fileName);
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

    const registryPath = path.join(outDir, 'REGISTRY.md');
    const headline = presetIds
      .map((id) => {
        const tag = WINDOW_CAPPED_PRESETS.has(id) ? ' (window-capped)' : '';
        return `${id} ${(results[id].full.totalReturn * 100).toFixed(1)}%/${(results[id].full.winRate * 100).toFixed(0)}%wr${tag}`;
      })
      .join(' · ');
    fs.appendFileSync(
      registryPath,
      `- ${payload.meta.runAt.slice(0, 10)} \`${fileName}\` — ${symbol} ${timeframe} ${from}→${to}, ${spec.geometry}, costs=${costsArg}, ${candles.length} bars: ${headline}\n`,
    );
    console.log(`\nwritten: ${outPath}`);
  } finally {
    await client.end();
  }
})().catch((err) => {
  console.error('run-backtest-cli failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
