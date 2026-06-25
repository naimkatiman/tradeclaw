/**
 * Regime feature exporter (Phase 3 regime engine, plan D5/D7).
 *
 * Bridges the candle store to the Python HMM trainer: loads candles either
 * from the `candles` DB table or from a `--candles-dir` dump (produced by
 * backfill-candles.ts --out-dir), computes the four structural features via
 * the ONE TypeScript implementation (@tradeclaw/signals features.ts), and
 * writes per-symbol feature files. The trainer reads these vectors and never
 * recomputes features — that is the structural kill of the train/inference
 * feature-parity bug class (plan D5).
 *
 * Warmup bars (null vectors) are EXCLUDED from the export: the trainer must
 * never see silent fallbacks. Each row carries the bar close so the trainer
 * can compute forward-return OUTCOMES (evaluation labels, not classifier
 * features) without touching raw candles.
 *
 * Requires `npm run build:signals` first (the @tradeclaw/signals dist is
 * gitignored). Output files are raw data and stay out of git (root /data/
 * is gitignored).
 *
 * Usage (file mode — no DB needed):
 *   npx tsx scripts/research/export-regime-features.ts \
 *     --symbols BTCUSD,ETHUSD,SOLUSD --timeframe H1 \
 *     --candles-dir data/research/candles --out data/research/features
 *
 * Usage (DB mode):
 *   railway run --service Postgres npx tsx scripts/research/export-regime-features.ts \
 *     --symbols BTCUSD,ETHUSD,SOLUSD --timeframe H1 \
 *     --from 2024-06-01 --to 2026-06-01 --out data/research/features
 */

import fs from 'fs';
import path from 'path';
import {
  computeRegimeFeatureSeries,
  featureVectorToArray,
  REGIME_FEATURE_NAMES,
  type RegimeBar,
} from '@tradeclaw/signals';
import { connect, getStoredCandles, getCoverage } from './candle-db';

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

interface CandleDump {
  symbol: string;
  timeframe: string;
  source: string;
  candles: RegimeBar[];
}

function loadDump(candlesDir: string, symbol: string, timeframe: string): RegimeBar[] {
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

/**
 * The trainer (scripts/hmm-regime/train_hmm.py) is pinned to exactly these
 * four features. A fifth feature must fail HERE at export time — not only
 * when the trainer rejects the file.
 */
const EXPECTED_FEATURE_COUNT = 4;

(async () => {
  if (REGIME_FEATURE_NAMES.length !== EXPECTED_FEATURE_COUNT) {
    console.error(
      `REGIME_FEATURE_NAMES has ${REGIME_FEATURE_NAMES.length} entries, expected ${EXPECTED_FEATURE_COUNT} — ` +
      'update scripts/hmm-regime/train_hmm.py (FEATURE_NAMES + N_FEATURES) and this exporter together',
    );
    process.exit(2);
  }
  const symbols = arg('symbols', 'BTCUSD,ETHUSD,SOLUSD').split(',').map((s) => s.trim().toUpperCase());
  const timeframe = arg('timeframe', 'H1').toUpperCase();
  const candlesDir = arg('candles-dir', '');
  const from = arg('from', '');
  const to = arg('to', '');
  const outDir = arg('out', 'data/research/features');

  let fromTs = Number.NEGATIVE_INFINITY;
  let toTs = Number.POSITIVE_INFINITY;
  if (from) {
    fromTs = Date.parse(`${from}T00:00:00Z`);
    if (!Number.isFinite(fromTs)) {
      console.error(`Invalid --from ${from}`);
      process.exit(2);
    }
  }
  if (to) {
    toTs = Date.parse(`${to}T00:00:00Z`);
    if (!Number.isFinite(toTs)) {
      console.error(`Invalid --to ${to}`);
      process.exit(2);
    }
  }
  if (!candlesDir && (!from || !to)) {
    console.error('DB mode requires --from YYYY-MM-DD --to YYYY-MM-DD (or use --candles-dir)');
    process.exit(2);
  }

  const client = candlesDir ? null : await connect();
  fs.mkdirSync(outDir, { recursive: true });

  try {
    for (const symbol of symbols) {
      let bars: RegimeBar[];
      if (client) {
        bars = await getStoredCandles(client, symbol, timeframe, fromTs, toTs);
        if (bars.length < 100) {
          const cov = await getCoverage(client, symbol, timeframe);
          console.error(
            `Insufficient stored candles for ${symbol} ${timeframe}: have ${bars.length}.` +
            (cov.count > 0
              ? ` Store covers ${new Date(cov.minTs!).toISOString().slice(0, 10)}→${new Date(cov.maxTs!).toISOString().slice(0, 10)} (${cov.count} bars).`
              : ' Store is empty for this series.') +
            ' Run scripts/research/backfill-candles.ts first.',
          );
          process.exit(3);
        }
      } else {
        bars = loadDump(candlesDir, symbol, timeframe)
          .filter((c) => c.timestamp >= fromTs && c.timestamp <= toTs);
        if (bars.length < 100) {
          console.error(`Insufficient dumped candles for ${symbol} ${timeframe}: have ${bars.length}.`);
          process.exit(3);
        }
      }

      // One feature implementation (plan D5): @tradeclaw/signals features.ts.
      const series = computeRegimeFeatureSeries(bars);
      const rows: Array<{ timestamp: number; close: number; features: number[] }> = [];
      for (let i = 0; i < series.length; i++) {
        const v = series[i];
        if (v === null) continue; // warmup — never exported (plan D5)
        rows.push({
          timestamp: bars[i].timestamp,
          close: bars[i].close,
          features: featureVectorToArray(v),
        });
      }
      if (rows.length === 0) {
        console.error(`${symbol} ${timeframe}: zero non-warmup feature vectors — nothing to export`);
        process.exit(3);
      }

      const payload = {
        symbol,
        timeframe,
        source: client ? 'db' : `candles-dir:${candlesDir}`,
        feature_names: [...REGIME_FEATURE_NAMES],
        window: {
          from: new Date(rows[0].timestamp).toISOString(),
          to: new Date(rows[rows.length - 1].timestamp).toISOString(),
          bars: bars.length,
          vectors: rows.length,
          warmupExcluded: bars.length - rows.length,
        },
        rows,
      };
      const outPath = path.join(outDir, `${symbol}-${timeframe}-features.json`);
      fs.writeFileSync(outPath, JSON.stringify(payload));
      console.log(
        `  ${symbol} ${timeframe}: bars=${bars.length} vectors=${rows.length} ` +
        `warmupExcluded=${bars.length - rows.length} → ${outPath}`,
      );
    }
  } finally {
    if (client) await client.end();
  }
})().catch((err) => {
  console.error('export-regime-features failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
