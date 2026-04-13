import 'server-only';

import { getSignals } from '../app/lib/signals';
import { recordSignalsAsync } from './signal-history';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from './signal-thresholds';
import { getActivePreset } from '../app/api/cron/signals/preset-dispatch';
import { fetchGateState, getGateMode } from './full-risk-gates';
import { logGateDecision, buildGateLogEntry, type SignalForLog } from './gate-log';
import {
  resolveLicense,
  anonymousContext,
  FREE_STRATEGY,
  type LicenseContext,
} from './licenses';

export interface GetTrackedSignalsParams {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  minConfidence?: number;
  /** License context for read-time strategy filtering. Defaults to anonymous ({classic}). */
  ctx?: LicenseContext;
}

export async function getTrackedSignals(params: GetTrackedSignalsParams) {
  const result = await getSignals(params);
  const ctx = params.ctx ?? anonymousContext();

  if (result.signals.length > 0) {
    // This is the actual production write path for signal_history (the
    // /api/cron/signals route reads from live_signals which is empty in
    // production, so it never inserts anything). Tag with the active
    // preset so /track-record's per-strategy breakdown reflects reality.
    const strategyId = getActivePreset().id;

    const filtered = result.signals.filter(
      (signal) =>
        signal.dataQuality === 'real' &&
        signal.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE,
    );

    // ── Full-risk gate evaluation ─────────────────────────────
    // Phase 1 (shadow): evaluate but do NOT filter — record everything,
    // log gate decisions to /tmp/tradeclaw-gate-decisions.log so we can
    // measure predicted-vs-actual block rate before flipping to active.
    // Phase 2 (active): blocked signals are dropped before recording.
    const mode = getGateMode();
    let toRecord = filtered;
    let blockedSignals: SignalForLog[] = [];

    if (mode !== 'off' && filtered.length > 0) {
      const gateState = await fetchGateState();
      const passedSignals: SignalForLog[] = [];
      const blocked: SignalForLog[] = [];

      for (const sig of filtered) {
        const summary: SignalForLog = {
          id: sig.id,
          symbol: sig.symbol,
          direction: sig.direction,
          confidence: sig.confidence,
        };
        if (gateState.gatesAllow) {
          passedSignals.push(summary);
        } else {
          blocked.push(summary);
        }
      }
      blockedSignals = blocked;

      // Fire-and-forget log of every batch
      const entry = buildGateLogEntry(mode, gateState, passedSignals, blocked);
      logGateDecision(entry).catch(() => undefined);

      if (mode === 'active' && !gateState.gatesAllow) {
        // Drop blocked signals from the recording pipeline
        toRecord = [];
      }
    }

    const recordPayload = toRecord.map((signal) => ({
      id: signal.id,
      symbol: signal.symbol,
      timeframe: signal.timeframe,
      direction: signal.direction,
      confidence: signal.confidence,
      entry: signal.entry,
      timestamp: signal.timestamp,
      takeProfit1: signal.takeProfit1,
      stopLoss: signal.stopLoss,
      strategyId,
    }));

    // Record to PostgreSQL (or file fallback) — fire and forget
    if (recordPayload.length > 0) {
      recordSignalsAsync(recordPayload).catch(() => {});
    }

    // In active mode, also strip blocked signals from the response so
    // downstream consumers (UI, API clients) see the same view as the DB.
    // In shadow mode the response is unchanged.
    if (mode === 'active' && blockedSignals.length > 0) {
      const blockedIds = new Set(blockedSignals.map((b) => b.id));
      result.signals = result.signals.filter((s) => !blockedIds.has(s.id));
    }
  }

  // Read-time license filter — keep free classic, drop anything the caller
  // doesn't have a grant for. Recording above was not filtered, so the DB
  // retains the full historical set for backtests.
  result.signals = result.signals.filter((s) => {
    const sid = s.strategyId ?? FREE_STRATEGY;
    return ctx.unlockedStrategies.has(sid);
  });

  return result;
}

/**
 * Convenience wrapper: resolves the license context from the Request,
 * then delegates to getTrackedSignals. Preferred for any API route or
 * server component that has a Request in hand.
 */
export async function getTrackedSignalsForRequest(
  req: Request,
  params: Omit<GetTrackedSignalsParams, 'ctx'> = {},
) {
  const ctx = await resolveLicense(req);
  return getTrackedSignals({ ...params, ctx });
}
