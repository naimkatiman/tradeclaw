/**
 * Slow regime-gate sandbox study (owner ask 2026-07-18): can a LOW-FREQUENCY
 * long/flat exposure gate on 1-2 assets survive real costs, where per-bar
 * entry timing (regime-routed gate, daily momentum, carry, xsection) already
 * failed the registry?
 *
 * Pre-registered spec: docs/plans/2026-07-18-slow-regime-gate-sandbox.md.
 * Parameters are FINAL before the first run — no sweeps, no tuning:
 *   - gate: close > EMA200 (D1)          [textbook default slow filter]
 *   - HMM sizing: production crypto HMM regime of the day (last-329-H1-bar
 *     window, production-mirror inference), ratios from the shipped
 *     allocator regime rules 15/8/6 normalized (trend 1.0 / volatile 0.533 /
 *     range 0.4)                          [shipped constants, not fitted]
 *   - vol targeting: 40% ann target, 20d realized, cap 1  [literature default]
 * Variants: buy-hold, ema200, ema200-hmm, ema200-vol — ALL reported.
 * Costs: spot (fee 0.10%/side + slip 0.15%/side, no funding) for long-only;
 * perp (CRYPTO_PERP_COSTS incl. funding) as sensitivity on buy-hold + hmm.
 *
 * Determinism contract: `spec` + `results` are pure functions of the dumped
 * candles, the code, and the HMM model file (hash recorded). Only meta.runAt
 * varies between runs. Mirrors regime-backtest-cli.ts conventions.
 *
 * Usage (after backfill-candles.ts --out-dir data/research/candles):
 *   npx tsx scripts/research/slow-gate-cli.ts \
 *     --symbols BTCUSD,ETHUSD --from 2017-09-01 --to 2026-07-16 \
 *     --candles-dir data/research/candles --folds 4
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { classifyRegime } from '@tradeclaw/signals';
import { CRYPTO_PERP_COSTS, REGIME_CONDITION_WINDOW } from '../../packages/strategies/src';
import {
  trendGateSeries,
  hmmSizeForRegime,
  volTargetSeries,
  simulateDaily,
  computeMetrics,
  dailyRegimeSeries,
  type DailyBar,
  type RegimeH1Bar,
  type RegimeLabel,
  type SlowGateCosts,
  type Metrics,
  type SimResult,
} from './slow-gate-assembly';

// ─── Pre-registered constants (docs/plans/2026-07-18-slow-regime-gate-sandbox.md) ──

const EMA_PERIOD = 200;
const VOL_TARGET_ANN = 0.4;
const VOL_LOOKBACK = 20;

/** Binance spot taker fee 0.10%/side + the repo's conservative 0.15% slippage. */
const SPOT_COSTS: SlowGateCosts = { feePctPerSide: 0.1, slippagePctPerSide: 0.15, fundingPctPer8h: 0 };

const USAGE = `Usage: npx tsx scripts/research/slow-gate-cli.ts \\
  [--symbols BTCUSD,ETHUSD] [--from YYYY-MM-DD] [--to YYYY-MM-DD] \\
  [--candles-dir data/research/candles] [--folds N] [--out docs/research/experiments]`;

const FLAG_DEFAULTS = {
  symbols: 'BTCUSD,ETHUSD',
  from: '2017-09-01',
  to: '2026-07-16',
  'candles-dir': 'data/research/candles',
  folds: '4',
  out: 'docs/research/experiments',
} as const;

type FlagName = keyof typeof FLAG_DEFAULTS;

interface CliOptions {
  symbols: string[];
  from: string;
  to: string;
  candlesDir: string;
  folds: number;
  outDir: string;
  help: boolean;
}

function fail(message: string): never {
  throw new Error(message);
}

function parseSymbolsFlag(raw: string): string[] {
  if (raw.trim().length === 0) {
    fail('Invalid --symbols: expected at least one symbol.');
  }

  const symbols: string[] = [];
  const seen = new Set<string>();

  for (const part of raw.split(',')) {
    const symbol = part.trim().toUpperCase();
    if (symbol.length === 0) {
      fail('Invalid --symbols: empty symbol in comma-separated list.');
    }
    if (!/^[A-Z0-9]+$/.test(symbol)) {
      fail(`Invalid --symbols: expected alphanumeric symbols, got "${symbol}".`);
    }
    if (seen.has(symbol)) {
      fail(`Invalid --symbols: duplicate symbol "${symbol}".`);
    }
    seen.add(symbol);
    symbols.push(symbol);
  }

  if (symbols.length > 2) {
    fail(`Invalid --symbols: expected one or two symbols, got ${symbols.length}.`);
  }

  return symbols;
}

function parsePositiveIntegerFlag(name: FlagName, raw: string): number {
  if (!/^\d+$/.test(raw)) {
    fail(`Invalid --${name}: expected a positive integer, got "${raw}".`);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    fail(`Invalid --${name}: expected a positive integer, got "${raw}".`);
  }
  return parsed;
}

function parseIsoDateFlag(name: 'from' | 'to', raw: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    fail(`Invalid --${name}: expected YYYY-MM-DD calendar date, got "${raw}".`);
  }

  const [year, month, day] = raw.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const roundTrip = new Date(timestamp);
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day
  ) {
    fail(`Invalid --${name}: expected YYYY-MM-DD calendar date, got "${raw}".`);
  }

  return raw;
}

function formatPathForMessage(targetPath: string): string {
  const relative = path.relative(process.cwd(), targetPath);
  if (relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    return relative;
  }
  return targetPath;
}

function existingFileAncestor(targetPath: string): string | null {
  let current = path.resolve(targetPath);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
  return fs.statSync(current).isFile() ? current : null;
}

function parseDirectoryFlag(name: 'candles-dir' | 'out', raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    fail(`Invalid --${name}: expected a non-empty path.`);
  }
  if (fs.existsSync(trimmed) && !fs.statSync(trimmed).isDirectory()) {
    fail(`Invalid --${name}: expected a directory path, got existing file "${trimmed}".`);
  }
  const fileAncestor = existingFileAncestor(trimmed);
  if (fileAncestor !== null) {
    fail(`Invalid --${name}: expected a directory path, got path under existing file "${formatPathForMessage(fileAncestor)}".`);
  }
  return trimmed;
}

function parseCliArgs(argv: string[]): CliOptions {
  const values: Record<FlagName, string> = { ...FLAG_DEFAULTS };
  const seen = new Set<FlagName>();

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help') {
      return {
        symbols: [],
        from: values.from,
        to: values.to,
        candlesDir: values['candles-dir'],
        folds: Number(values.folds),
        outDir: values.out,
        help: true,
      };
    }
    if (!token.startsWith('--')) {
      fail(`Unknown positional argument: ${token}.`);
    }

    const rawName = token.slice(2);
    if (!(rawName in FLAG_DEFAULTS)) {
      fail(`Unknown argument: --${rawName}. Expected --symbols, --from, --to, --candles-dir, --folds, --out, or --help.`);
    }
    const name = rawName as FlagName;
    if (seen.has(name)) {
      fail(`Duplicate argument: --${name}.`);
    }
    const rawValue = argv[i + 1];
    if (rawValue === undefined || rawValue.startsWith('--')) {
      fail(`Missing value for --${name}.`);
    }
    values[name] = rawValue;
    seen.add(name);
    i++;
  }

  const symbols = parseSymbolsFlag(values.symbols);
  const candlesDir = parseDirectoryFlag('candles-dir', values['candles-dir']);
  const outDir = parseDirectoryFlag('out', values.out);

  return {
    symbols,
    from: parseIsoDateFlag('from', values.from),
    to: parseIsoDateFlag('to', values.to),
    candlesDir,
    folds: parsePositiveIntegerFlag('folds', values.folds),
    outDir,
    help: false,
  };
}

type Timeframe = 'D1' | 'H1';

interface CandleDump {
  symbol: string;
  timeframe: Timeframe;
  source: string;
  candles: RegimeH1Bar[];
}

const CANDLE_NUMERIC_FIELDS = ['timestamp', 'open', 'high', 'low', 'close', 'volume'] as const;
const EXPECTED_CANDLE_STEP_MS: Record<Timeframe, number> = {
  D1: 86_400_000,
  H1: 3_600_000,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertFiniteCandleRows(
  file: string,
  timeframe: Timeframe,
  candles: unknown[],
): asserts candles is RegimeH1Bar[] {
  const seenTimestamps = new Set<number>();
  let previousTimestamp: number | null = null;

  for (const [index, candle] of candles.entries()) {
    if (
      !isRecord(candle) ||
      CANDLE_NUMERIC_FIELDS.some((field) => typeof candle[field] !== 'number' || !Number.isFinite(candle[field]))
    ) {
      throw new Error(
        `candle dump ${file} has invalid candle at index ${index}: expected finite timestamp/open/high/low/close/volume.`,
      );
    }

    const open = candle.open as number;
    const high = candle.high as number;
    const low = candle.low as number;
    const close = candle.close as number;
    const volume = candle.volume as number;
    if (volume < 0) {
      throw new Error(
        `candle dump ${file} has invalid candle at index ${index}: expected non-negative volume.`,
      );
    }
    if ([open, high, low, close].some((price) => price <= 0)) {
      throw new Error(
        `candle dump ${file} has invalid candle at index ${index}: expected positive open/high/low/close prices.`,
      );
    }
    if (high < low || open < low || open > high || close < low || close > high) {
      throw new Error(
        `candle dump ${file} has invalid candle at index ${index}: expected low <= open/close <= high and high >= low.`,
      );
    }

    const timestamp = candle.timestamp as number;
    if (!Number.isSafeInteger(timestamp)) {
      throw new Error(
        `candle dump ${file} has invalid candle at index ${index}: expected safe integer millisecond timestamp.`,
      );
    }
    if (seenTimestamps.has(timestamp)) {
      throw new Error(`candle dump ${file} has duplicate candle timestamp at index ${index}: ${timestamp}.`);
    }
    if (previousTimestamp !== null) {
      if (timestamp <= previousTimestamp) {
        throw new Error(
          `candle dump ${file} has non-increasing candle timestamp at index ${index}: expected greater than ${previousTimestamp}, got ${timestamp}.`,
        );
      }

      const expectedStep = EXPECTED_CANDLE_STEP_MS[timeframe];
      const observedStep = timestamp - previousTimestamp;
      if (observedStep !== expectedStep) {
        throw new Error(
          `candle dump ${file} has irregular ${timeframe} candle cadence at index ${index}: expected ${expectedStep}ms after index ${index - 1}, got ${observedStep}ms.`,
        );
      }
    }
    seenTimestamps.add(timestamp);
    previousTimestamp = timestamp;
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function formatDateHour(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ');
}

function loadDump(candlesDir: string, symbol: string, timeframe: Timeframe): RegimeH1Bar[] {
  const file = path.join(candlesDir, `${symbol}-${timeframe}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`candle dump not found: ${file} — run backfill-candles.ts --out-dir first`);
  }
  let dump: unknown;
  try {
    dump = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    throw new Error(`candle dump ${file} is not valid JSON.`);
  }
  if (!isRecord(dump)) {
    throw new Error(`candle dump ${file} does not match ${symbol} ${timeframe}.`);
  }
  const candles = dump.candles;
  if (dump.symbol !== symbol || dump.timeframe !== timeframe || !Array.isArray(candles)) {
    throw new Error(`candle dump ${file} does not match ${symbol} ${timeframe}.`);
  }
  assertFiniteCandleRows(file, timeframe, candles);
  return candles;
}

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

interface VariantRun {
  variant: string;
  costModel: string;
  metrics: Metrics;
  flips: number;
  avgExposure: number;
  totalCostPct: number;
}

function runVariant(
  bars: DailyBar[],
  exposures: (number | null)[],
  costs: SlowGateCosts,
  variant: string,
  costModel: string,
): VariantRun {
  const sim: SimResult = simulateDaily(bars, exposures, costs);
  const metrics = computeMetrics(sim.equity, bars.map((b) => b.timestamp));
  return {
    variant,
    costModel,
    metrics,
    flips: sim.flips,
    avgExposure: Math.round(sim.avgExposure * 1000) / 1000,
    totalCostPct: Math.round(sim.totalCostPct * 100) / 100,
  };
}

function fmt(r: VariantRun): string {
  const m = r.metrics;
  return (
    `${r.variant.padEnd(12)} [${r.costModel.padEnd(4)}] ` +
    `CAGR=${(m.cagr * 100).toFixed(1).padStart(6)}% ` +
    `maxDD=${(m.maxDrawdown * 100).toFixed(1).padStart(5)}% ` +
    `Calmar=${m.calmar === null ? '   —' : m.calmar.toFixed(2).padStart(5)} ` +
    `Sharpe=${m.sharpe === null ? '   —' : m.sharpe.toFixed(2).padStart(5)} ` +
    `flips=${String(r.flips).padStart(4)} avgExp=${r.avgExposure.toFixed(2)} costPaid=${r.totalCostPct.toFixed(1)}%`
  );
}

(() => {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      console.log(USAGE);
      return;
    }

    const { symbols, from, to, candlesDir, folds, outDir } = options;

    const fromTs = Date.parse(`${from}T00:00:00Z`);
    const toTs = Date.parse(`${to}T00:00:00Z`);
    if (!Number.isFinite(fromTs) || !Number.isFinite(toTs) || fromTs >= toTs) {
      fail(`Invalid date range: --from ${from} --to ${to}`);
    }

  const perSymbol: Record<string, {
    bars: number;
    firstBar: string;
    lastBar: string;
    regimeShare: Record<RegimeLabel | 'null', number>;
    full: VariantRun[];
    folds: Array<{ label: string; from: string; to: string; runs: VariantRun[] }>;
    equityCurves: Record<string, number[]>;
  }> = {};

  const d1BySymbol: Record<string, RegimeH1Bar[]> = {};
  for (const symbol of symbols) {
    const d1 = loadDump(candlesDir, symbol, 'D1')
      .filter((c) => c.timestamp >= fromTs && c.timestamp <= toTs)
      .sort((a, b) => a.timestamp - b.timestamp);
    if (d1.length < EMA_PERIOD + 100) {
      console.error(`Insufficient D1 bars for ${symbol}: ${d1.length}`);
      process.exit(3);
    }
    const maxFolds = Math.floor(d1.length / 2);
    if (folds > maxFolds) {
      fail(`Invalid --folds: expected at most ${maxFolds} folds so each fold has at least 2 D1 bars for ${symbol}; got ${folds}.`);
    }
    d1BySymbol[symbol] = d1;
  }

  if (symbols.length === 2) {
    const [a, b] = symbols;
    const firstA = formatDate(d1BySymbol[a][0].timestamp);
    const firstB = formatDate(d1BySymbol[b][0].timestamp);
    if (firstA !== firstB) {
      fail(`Cannot build two-sleeve portfolio for ${a}+${b}: first D1 dates differ (${a}=${firstA}, ${b}=${firstB}).`);
    }
    const latestA = formatDate(d1BySymbol[a][d1BySymbol[a].length - 1].timestamp);
    const latestB = formatDate(d1BySymbol[b][d1BySymbol[b].length - 1].timestamp);
    if (latestA !== latestB) {
      fail(`Cannot build two-sleeve portfolio for ${a}+${b}: latest D1 dates differ (${a}=${latestA}, ${b}=${latestB}).`);
    }
  }

  for (const symbol of symbols) {
    const d1 = d1BySymbol[symbol];
    const h1 = loadDump(candlesDir, symbol, 'H1')
      .filter((c) => c.timestamp <= toTs + 86_400_000)
      .sort((a, b) => a.timestamp - b.timestamp);
    if (h1.length < REGIME_CONDITION_WINDOW) {
      fail(`Insufficient H1 bars for ${symbol}: ${h1.length}; need at least ${REGIME_CONDITION_WINDOW} bars for production HMM classification.`);
    }
    const firstH1 = h1[0].timestamp;
    const firstD1 = d1[0].timestamp;
    if (firstH1 > firstD1) {
      fail(`Insufficient H1 coverage for ${symbol}: first H1 bar ${formatDate(firstH1)} is after first D1 bar ${formatDate(firstD1)}.`);
    }
    const latestH1 = h1[h1.length - 1].timestamp;
    const latestD1 = d1[d1.length - 1].timestamp;
    if (latestH1 < latestD1) {
      fail(`Insufficient H1 coverage for ${symbol}: latest H1 bar ${formatDate(latestH1)} is before latest D1 bar ${formatDate(latestD1)}.`);
    }
    const latestD1DayCloseH1 = latestD1 + EXPECTED_CANDLE_STEP_MS.D1 - EXPECTED_CANDLE_STEP_MS.H1;
    if (latestH1 < latestD1DayCloseH1) {
      fail(`Insufficient H1 coverage for ${symbol}: latest H1 bar ${formatDateHour(latestH1)} is before latest D1 day-close H1 bar ${formatDateHour(latestD1DayCloseH1)}.`);
    }

    const bars: DailyBar[] = d1.map((c) => ({ timestamp: c.timestamp, close: c.close }));
    const closes = bars.map((b) => b.close);
    const returns = closes.map((c, i) => (i === 0 ? 0 : c / closes[i - 1] - 1));

    console.log(`\n[${symbol}] classifying ${bars.length} days via production HMM (window=${REGIME_CONDITION_WINDOW} H1 bars)...`);
    const regimes = dailyRegimeSeries(
      bars,
      h1,
      (w) => classifyRegime(symbol, w).regime as RegimeLabel,
      REGIME_CONDITION_WINDOW,
    );
    const regimeShare: Record<RegimeLabel | 'null', number> = { trend: 0, volatile: 0, range: 0, null: 0 };
    for (const r of regimes) regimeShare[r ?? 'null']++;

    const gate = trendGateSeries(closes, EMA_PERIOD);
    const vol = volTargetSeries(returns, VOL_TARGET_ANN, VOL_LOOKBACK);

    const exposuresByVariant: Record<string, (number | null)[]> = {
      'buy-hold': bars.map(() => 1),
      'ema200': gate.map((g) => (g ? 1 : 0)),
      'ema200-hmm': gate.map((g, i) => (g ? hmmSizeForRegime(regimes[i]) : 0)),
      'ema200-vol': gate.map((g, i) => (g ? vol[i] ?? 0 : 0)),
    };

    const full: VariantRun[] = [];
    const equityCurves: Record<string, number[]> = {};
    for (const [variant, exp] of Object.entries(exposuresByVariant)) {
      full.push(runVariant(bars, exp, SPOT_COSTS, variant, 'spot'));
      equityCurves[variant] = simulateDaily(bars, exp, SPOT_COSTS).equity;
    }
    // Perp sensitivity: funding drag on the two headline variants.
    full.push(runVariant(bars, exposuresByVariant['buy-hold'], CRYPTO_PERP_COSTS, 'buy-hold', 'perp'));
    full.push(runVariant(bars, exposuresByVariant['ema200-hmm'], CRYPTO_PERP_COSTS, 'ema200-hmm', 'perp'));

    // Contiguous folds over the PRE-COMPUTED exposure series (trailing
    // indicators may use pre-fold history — trailing data, not lookahead).
    const foldSize = Math.floor(bars.length / folds);
    const foldRows: Array<{ label: string; from: string; to: string; runs: VariantRun[] }> = [];
    for (let f = 0; f < folds; f++) {
      const start = f * foldSize;
      const end = f === folds - 1 ? bars.length : (f + 1) * foldSize;
      const slice = bars.slice(start, end);
      const runs = Object.entries(exposuresByVariant).map(([variant, exp]) =>
        runVariant(slice, exp.slice(start, end), SPOT_COSTS, variant, 'spot'),
      );
      foldRows.push({
        label: `fold${f + 1}`,
        from: new Date(slice[0].timestamp).toISOString().slice(0, 10),
        to: new Date(slice[slice.length - 1].timestamp).toISOString().slice(0, 10),
        runs,
      });
    }

    perSymbol[symbol] = {
      bars: bars.length,
      firstBar: new Date(bars[0].timestamp).toISOString().slice(0, 10),
      lastBar: new Date(bars[bars.length - 1].timestamp).toISOString().slice(0, 10),
      regimeShare,
      full,
      folds: foldRows,
      equityCurves,
    };

    console.log(`=== ${symbol} ${perSymbol[symbol].firstBar}→${perSymbol[symbol].lastBar} (${bars.length} D1 bars) ===`);
    console.log(`  regime share: trend=${regimeShare.trend} volatile=${regimeShare.volatile} range=${regimeShare.range} warmup=${regimeShare.null}`);
    for (const r of full) console.log(`  ${fmt(r)}`);
    for (const fr of foldRows) {
      console.log(`  -- ${fr.label} ${fr.from}→${fr.to}`);
      for (const r of fr.runs) console.log(`     ${fmt(r)}`);
    }
  }

  // ── Two-sleeve 50/50 portfolio (half capital per symbol, no cross-rebalance) ──
  let portfolio: Record<string, VariantRun> | null = null;
  if (symbols.length === 2 && symbols.every((s) => perSymbol[s])) {
    const [a, b] = symbols;
    const la = perSymbol[a].equityCurves;
    const lb = perSymbol[b].equityCurves;
    const n = Math.min(perSymbol[a].bars, perSymbol[b].bars);
    const tsA = Date.parse(`${perSymbol[a].firstBar}T00:00:00Z`);
    portfolio = {};
    console.log(`\n=== 50/50 two-sleeve portfolio ${a}+${b} (last ${n} aligned days) ===`);
    for (const variant of Object.keys(la)) {
      const ea = la[variant].slice(-n);
      const eb = lb[variant].slice(-n);
      const combined = ea.map((e, i) => 0.5 * (e / ea[0]) + 0.5 * (eb[i] / eb[0]));
      const timestamps = combined.map((_, i) => tsA + i * 86_400_000);
      const metrics = computeMetrics(combined, timestamps);
      portfolio[variant] = {
        variant,
        costModel: 'spot',
        metrics,
        flips: -1,
        avgExposure: -1,
        totalCostPct: -1,
      };
      console.log(
        `  ${variant.padEnd(12)} CAGR=${(metrics.cagr * 100).toFixed(1)}% maxDD=${(metrics.maxDrawdown * 100).toFixed(1)}% ` +
        `Calmar=${metrics.calmar?.toFixed(2) ?? '—'} Sharpe=${metrics.sharpe?.toFixed(2) ?? '—'}`,
      );
    }
  }

  const caveats = [
    'pre-registered parameters (EMA200, 40% vol target, allocator ratios 15/8/6): NO sweeps were run — these are the first and only settings tested; changing them after seeing results would be tuning',
    'exposure decided at day close t applies to the close(t)->close(t+1) return; the classifier and indicators only see bars closed at/before t — no lookahead',
    'folds slice the PRE-COMPUTED exposure series: trailing indicators legitimately use pre-fold history (trailing data, not future data); fold 1 still contains the EMA200 warmup (flat) so its gated numbers are conservative',
    'spot cost model (0.10% fee + 0.15% slippage per side, no funding) is the realistic execution for a long-only gate; perp sensitivity includes the 0.01%/8h sign-agnostic funding upper bound',
    'the HMM regime is STRUCTURAL (volatility/structure, not drift): the registry walk-forward found no directional trend premium in the states — here the HMM only scales SIZE, direction comes from the EMA gate',
    'the two-sleeve portfolio holds half capital per symbol independently (no cross-rebalancing) — zero rebalance cost by construction, matching the quality-over-quantity brief',
    'survivorship note: BTC and ETH are the two assets that DID survive — a 2017 investor could not have known; results generalize to "the majors" only, not to any 2017 altcoin pick',
    'this is a SANDBOX study for the research registry: it does not activate anything live and does not by itself clear the deployable-edge gate',
  ];

  const spec = {
    symbols,
    from,
    to,
    emaPeriod: EMA_PERIOD,
    volTargetAnn: VOL_TARGET_ANN,
    volLookback: VOL_LOOKBACK,
    regimeWindowH1Bars: REGIME_CONDITION_WINDOW,
    sizingRatios: { trend: 1, volatile: 8 / 15, range: 6 / 15 },
    costs: { spot: SPOT_COSTS, perp: { ...CRYPTO_PERP_COSTS } },
    folds,
    variants: Object.keys(perSymbol[symbols[0]]?.equityCurves ?? {}),
    hmmModels: hmmModelIdentity(),
    caveats,
  };

  const results = Object.fromEntries(
    Object.entries(perSymbol).map(([s, v]) => [s, {
      bars: v.bars,
      firstBar: v.firstBar,
      lastBar: v.lastBar,
      regimeShare: v.regimeShare,
      full: v.full,
      folds: v.folds,
    }]),
  );

  const payload = {
    meta: { runAt: new Date().toISOString() },
    spec,
    results,
    portfolio,
  };

  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `slow-gate-${symbols.join('_')}-D1-${from}-${to}-f${folds}.json`;
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  const registryPath = path.join(outDir, 'REGISTRY.md');
  const headline = Object.entries(results)
    .map(([s, r]) => {
      const bh = r.full.find((x) => x.variant === 'buy-hold' && x.costModel === 'spot')!;
      const hmm = r.full.find((x) => x.variant === 'ema200-hmm' && x.costModel === 'spot')!;
      return (
        `${s} buy-hold CAGR=${(bh.metrics.cagr * 100).toFixed(1)}%/DD=${(bh.metrics.maxDrawdown * 100).toFixed(0)}%/Calmar=${bh.metrics.calmar?.toFixed(2)} ` +
        `vs ema200-hmm CAGR=${(hmm.metrics.cagr * 100).toFixed(1)}%/DD=${(hmm.metrics.maxDrawdown * 100).toFixed(0)}%/Calmar=${hmm.metrics.calmar?.toFixed(2)}/flips=${hmm.flips}`
      );
    })
    .join(' · ');
  fs.appendFileSync(
    registryPath,
    `- ${payload.meta.runAt.slice(0, 10)} \`${fileName}\` — slow regime-gate sandbox (owner ask: 1-2 assets, quality over quantity), ` +
    `D1 long/flat EMA200 gate x HMM sizing, spot costs (0.25%/side RT 0.5%), ${folds} folds, pre-registered params (no sweeps): ${headline}\n`,
  );

  console.log(`\nwritten: ${outPath}`);
  console.log('NOTE: pre-registered parameters — the numbers above are first-run, not tuned.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
