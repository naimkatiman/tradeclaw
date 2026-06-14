import 'server-only';

/**
 * Phase 4 D8 — Append-only NDJSON sink + per-tick orchestrator for the
 * router/calibration shadow recorder. Mirrors gate-log.ts (logGateDecision /
 * buildGateLogEntry) exactly: one NDJSON line per evaluated tick-batch,
 * fire-and-forget, NEVER throws — a log failure must not break the broadcast.
 *
 * This sink writes ONLY to the shadow log. It does NOT touch signal_history, the
 * broadcast set, or the published confidence. The calibrated probability lives
 * here and nowhere else (it is never fed back). See strategy-router-shadow.ts.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { isCountedResolved } from './signal-history';
import { getCachedHistory } from './signal-history-cache';
import {
  fitIsotonic,
  normalizeConfidence,
  MIN_CALIBRATION_SAMPLES,
  MIN_CALIBRATION_CONFIDENCE,
  type IsotonicMap,
} from './confidence-calibration';
import {
  buildRouterShadowBatch,
  type RouterShadowBatch,
  type RouterShadowCandidate,
} from './strategy-router-shadow';

const DEFAULT_PATH = '/tmp/tradeclaw-router-decisions.log';

function getLogPath(): string {
  return process.env.TRADECLAW_ROUTER_LOG_PATH ?? DEFAULT_PATH;
}

/**
 * Fit the C7 isotonic calibration map ONCE per tick over the resolved history
 * (the same population /api/calibration uses: isCountedResolved, confidence
 * normalized to [0,1], win = 24h TP-before-SL). Returns null when the population
 * is below MIN_CALIBRATION_SAMPLES — the shadow record then carries
 * calibratedConfidence: null (honest "no map yet"), never a fabricated number.
 *
 * Reads through the layered cache (getCachedHistory: 10-min TTL, Redis+memory,
 * deduplicated in-flight) — this fire-and-forget path must not issue an uncached
 * full SELECT every tick. Bounded: one cached read + one fit per tick, NOT per
 * candidate.
 */
export async function fitTickCalibrationMap(): Promise<IsotonicMap | null> {
  const history = await getCachedHistory();
  const pairs = history
    .filter(isCountedResolved)
    .map((s) => ({
      conf: normalizeConfidence(s.confidence),
      win: s.outcomes['24h']?.hit ? 1 : 0,
    }))
    .filter((p) => p.conf >= MIN_CALIBRATION_CONFIDENCE);
  if (pairs.length < MIN_CALIBRATION_SAMPLES) return null;
  return fitIsotonic(pairs);
}

/**
 * Append-only NDJSON sink. One line per evaluated tick-batch. Fire-and-forget;
 * never throws — log failures are swallowed to stderr (matching gate-log.ts).
 */
export async function logRouterShadowBatch(entry: RouterShadowBatch): Promise<void> {
  try {
    const logPath = getLogPath();
    const dir = path.dirname(logPath);
    await fs.mkdir(dir, { recursive: true }).catch(() => undefined);
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(logPath, line, 'utf8');
  } catch (err) {
    // Swallow — log to stderr but don't propagate.
    console.error('[router-decisions-log] append failed:', err);
  }
}

/**
 * Per-tick orchestrator. Fits the calibration map once, builds the shadow batch
 * (router + would-be calibrated confidence per candidate), and appends it.
 *
 * Fire-and-forget by contract: this is a side-effect-only path. It NEVER alters
 * the broadcast set, the recorded rows, or the published confidence. The caller
 * invokes it without awaiting (or guards it) so a failure here can never break
 * the broadcast. The whole body is wrapped so even a synchronous throw is
 * contained.
 *
 * `mode` is passed through to the record (shadow|active). In this branch active
 * records identically to shadow and enforces nothing — activation is a later
 * operator decision (plan D8).
 */
export async function recordRouterShadow(
  mode: 'shadow' | 'active',
  candidates: RouterShadowCandidate[],
  regimeOf: (symbol: string) => string,
): Promise<void> {
  try {
    if (candidates.length === 0) return;
    const calibrationMap = await fitTickCalibrationMap();
    const batch = buildRouterShadowBatch(mode, candidates, regimeOf, calibrationMap);
    await logRouterShadowBatch(batch);
  } catch (err) {
    // Side-effect-only path — never propagate. A shadow-recorder failure must
    // not affect the live broadcast in any way.
    console.error('[router-decisions-log] shadow recording failed:', err);
  }
}
