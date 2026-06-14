/**
 * market_regimes writer — Phase 3 regime engine, plan D8
 * (docs/plans/2026-06-11-phase3-regime-engine.md).
 *
 * Brings the dead regime layer to life. Per crypto symbol: refresh the
 * latest closed H1 candles from Binance → classify with the structural HMM
 * over the stored history → apply hysteresis against the latest persisted
 * row → INSERT INTO market_regimes. Hysteresis state lives in the DB: every
 * row this writer stores carries `barsHeld` inside its features JSONB, so
 * the dwell counter survives restarts and replicas.
 */

import { applyHysteresis, classifyRegime } from '@tradeclaw/signals';
import type { HysteresisState, MarketRegime } from '@tradeclaw/signals';
import { execute, queryOne } from './db-pool';
import { getRecentCandles, refreshCandles, REGIME_CANDLE_UNIVERSE } from './candle-store';

/**
 * Skip the entire run when the latest market_regimes row is younger than
 * this. The in-process 5-minute sync tick lands 1-2 times inside each hourly
 * minute<10 window, AND multiple Railway replicas can fire the same slot —
 * this guard makes both benign: the late tick sees the early tick's rows and
 * exits without touching Binance or the table.
 */
const IDEMPOTENCY_WINDOW_MS = 30 * 60 * 1000;

/**
 * Minimum stored H1 bars required to classify: 43-bar feature warmup +
 * 64-vector Viterbi sequence + margin for sparse stretches.
 */
const MIN_BARS = 150;

/** Stored bars loaded per classification (~2.4 months of H1). */
const RECENT_BARS = 400;

/** Trailing observation window passed to classifyRegime; recorded in features. */
const SEQUENCE_LENGTH = 64;

export interface RegimeWriterFailure {
  symbol: string;
  stage: 'refresh' | 'data' | 'classify';
  error: string;
}

export type RegimeWriterResult =
  | { skipped: true; reason: string }
  | {
      skipped: false;
      processed: number;
      written: number;
      failures: RegimeWriterFailure[];
      durationMs: number;
    };

interface LatestRegimeRow {
  regime: string;
  features: { barsHeld?: number } | null;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function runRegimeWriter(): Promise<RegimeWriterResult> {
  const t0 = Date.now();

  const latest = await queryOne<{ detected_at: string | Date }>(
    `SELECT detected_at FROM market_regimes ORDER BY detected_at DESC LIMIT 1`,
  );
  if (latest) {
    const ageMs = Date.now() - new Date(latest.detected_at).getTime();
    if (ageMs < IDEMPOTENCY_WINDOW_MS) {
      return {
        skipped: true,
        reason:
          `latest market_regimes row is ${Math.round(ageMs / 60_000)}min old ` +
          `(inside the ${IDEMPOTENCY_WINDOW_MS / 60_000}min idempotency window)`,
      };
    }
  }

  let processed = 0;
  let written = 0;
  const failures: RegimeWriterFailure[] = [];

  for (const symbol of REGIME_CANDLE_UNIVERSE) {
    processed += 1;

    try {
      await refreshCandles(symbol);
    } catch (err) {
      // A Binance failure must not kill the other symbols — record it and
      // still classify this symbol on the (possibly stale) stored candles.
      failures.push({ symbol, stage: 'refresh', error: errMsg(err) });
    }

    try {
      const bars = await getRecentCandles(symbol, 'H1', RECENT_BARS);
      if (bars.length < MIN_BARS) {
        failures.push({
          symbol,
          stage: 'data',
          error: `only ${bars.length} stored H1 bars (need >= ${MIN_BARS})`,
        });
        continue;
      }

      const classification = classifyRegime(symbol, bars, {
        sequenceLength: SEQUENCE_LENGTH,
      });

      const prevRow = await queryOne<LatestRegimeRow>(
        `SELECT regime, features
           FROM market_regimes
          WHERE symbol = $1
          ORDER BY detected_at DESC
          LIMIT 1`,
        [symbol],
      );
      const prev: HysteresisState | null = prevRow
        ? {
            regime: prevRow.regime as MarketRegime,
            barsHeld: prevRow.features?.barsHeld ?? 1,
          }
        : null;

      const finalRegime = applyHysteresis(
        prev,
        classification.regime,
        classification.confidence,
      );
      // Caller contract from hysteresis.ts: barsHeld resets after every
      // accepted switch; increments only while the label is unchanged.
      const barsHeld = prev !== null && finalRegime === prev.regime ? prev.barsHeld + 1 : 1;

      // The column stores the posterior of the label actually persisted —
      // when hysteresis holds the old label, the candidate's posterior would
      // be misleading. DECIMAL(5,4), 0..1: clamp and round to 4dp.
      const posterior = classification.allProbabilities[finalRegime];
      const confidence = Math.min(1, Math.max(0, Math.round(posterior * 10_000) / 10_000));

      const features = {
        ...classification.features,
        candidate: classification.regime,
        candidateConfidence: classification.confidence,
        barsHeld,
        sequenceLength: SEQUENCE_LENGTH,
      };

      await execute(
        `INSERT INTO market_regimes (symbol, regime, confidence, features)
         VALUES ($1, $2, $3, $4)`,
        [symbol, finalRegime, confidence, JSON.stringify(features)],
      );
      written += 1;
    } catch (err) {
      failures.push({ symbol, stage: 'classify', error: errMsg(err) });
    }
  }

  return { skipped: false, processed, written, failures, durationMs: Date.now() - t0 };
}
