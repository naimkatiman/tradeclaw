import 'server-only';

import { getSignals } from '../app/lib/signals';
import { safeProfileId } from '../app/lib/signal-generator';
import { recordSignalsAsync } from './signal-history';
import { invalidateHistoryCache } from './signal-history-cache';
import { enqueueSignalPost } from './social-queue';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE, minConfidenceFor } from './signal-thresholds';
import { getActivePreset } from '../app/api/cron/signals/preset-dispatch';
import { fetchGateState, getGateMode } from './full-risk-gates';
import { logGateDecision, buildGateLogEntry, type SignalForLog } from './gate-log';

/**
 * Priority order for picking the "effective" strategy view. Higher index =
 * lower published confidence floor. With the tier system gone every caller
 * gets the full built-in set, so the floor is that of the highest entry.
 */
const STRATEGY_PRIORITY = [
  'classic',
  'regime-aware',
  'vwap-ema-bb',
  'hmm-top3',
  'full-risk',
] as const;

/**
 * TradingView partner strategies stay DARK pending partner sign-off (plan
 * open decision #4). Rows keep accruing via /api/webhooks/tradingview into
 * premium_signals, but nothing tv-* is served on any public surface.
 */
function isDarkStrategy(strategyId: string | undefined | null): boolean {
  return (strategyId ?? '').startsWith('tv-');
}

export interface GetTrackedSignalsParams {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  minConfidence?: number;
}

// In-process throttle for the Writer A side-effect pipeline. The DB dedup
// (2h ON CONFLICT window) already makes re-recording a no-op, but every
// anonymous request still paid for the INSERT attempts, cache invalidation,
// one self-HTTP dispatch per signal, and social enqueues. Skip the whole
// block when this process handled the same signal set within the window.
const SIDE_EFFECT_THROTTLE_MS = 60_000;
let lastSideEffectKey = '';
let lastSideEffectAt = 0;

export async function getTrackedSignals(params: GetTrackedSignalsParams) {
  // Dispatch engine profile from SIGNAL_ENGINE_PRESET. Unknown ids fall back
  // to 'classic' (current production label is 'hmm-top3', which is not yet a
  // STRATEGY_PROFILES entry, so this is a no-op behaviorally — see Task 2 of
  // docs/plans/2026-05-01-monetization-consolidation.md).
  const activePresetId = getActivePreset().id;
  const profileId = safeProfileId(activePresetId);
  const result = await getSignals({ ...params, profileId });

  if (result.signals.length > 0) {
    // Writer A of signal_history: request side-effect path. Writer B is the
    // /api/cron/signals route which calls getSignals() the same way and
    // dedups against the same 2h symbol+direction window. Tag with the
    // profile that actually generated the rows (profileId, line 75) so
    // /track-record's per-strategy breakdown is honest — the env preset id
    // (e.g. 'hmm-top3') is only a label until it becomes a STRATEGY_PROFILES
    // entry, and stamping it would misattribute classic-generated rows.
    const strategyId = profileId;

    const filtered = result.signals.filter(
      (signal) =>
        signal.dataQuality === 'real' &&
        signal.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE,
    );

    // ── Full-risk gate evaluation ─────────────────────────────
    // shadow: log decisions, record everything un-flagged.
    // active: record everything, but stamp gate_blocked=TRUE + gate_reason
    //         on rows that would have been dropped. Blocked rows are still
    //         stripped from the live API response below so consumers don't
    //         see untradable signals. Engine hit-rate keeps accumulating
    //         against full history; paper-trade equity curve filters out
    //         blocked rows. See docs/plans/2026-04-20-gate-blocked-recording.md.
    // off: no evaluation.
    const mode = getGateMode();
    let blockedSignals: SignalForLog[] = [];
    let gateBlockedAll = false;
    let gateReason: string | undefined;

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
        gateBlockedAll = true;
        gateReason = gateState.reason ?? 'gate_blocked';
      }
    }

    const recordPayload = filtered.map((signal) => {
      const blockedByFullRisk = gateBlockedAll;
      const blocked = blockedByFullRisk;
      let reason: string | undefined;
      if (blockedByFullRisk) reason = gateReason;
      return {
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
        entryAtr: signal.entryAtr,
        atrMultiplier: signal.atrMultiplier,
        gateBlocked: blocked,
        gateReason: reason,
      };
    });

    // Record to PostgreSQL (or file fallback) — fire and forget
    const sideEffectKey = recordPayload.map((s) => s.id).sort().join('|');
    const sideEffectDue =
      sideEffectKey !== lastSideEffectKey ||
      Date.now() - lastSideEffectAt >= SIDE_EFFECT_THROTTLE_MS;
    if (recordPayload.length > 0 && sideEffectDue) {
      lastSideEffectKey = sideEffectKey;
      lastSideEffectAt = Date.now();
      recordSignalsAsync(recordPayload).catch(() => {});
      invalidateHistoryCache().catch(() => {});

      // Downstream fan-out is tradable-only. Blocked signals are recorded
      // for track-record accounting, but users must not be alerted about
      // trades the system refused to take, and we must not post marketing
      // copy for blocked signals.
      const tradablePayload = recordPayload.filter((s) => !s.gateBlocked);

      // Fan out to user alert rules — fire and forget
      const dispatchUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/alert-rules/dispatch`
        : null;
      if (dispatchUrl) {
        for (const sig of tradablePayload) {
          fetch(dispatchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}`,
            },
            body: JSON.stringify({ signal: sig }),
          }).catch(() => undefined);
        }
      }

      // Enqueue social posts for high-confidence signals (fire-and-forget)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';
      for (const sig of tradablePayload) {
        if (sig.confidence < 75) continue;
        const imageUrl = `${baseUrl}/api/og/signal/${sig.id}`;
        const decimals = sig.symbol.includes('JPY') ? 3 : 5;
        const entry = typeof sig.entry === 'number' ? sig.entry.toFixed(decimals) : String(sig.entry);
        const copy = [
          sig.direction === 'BUY' ? '\u{1F7E2}' : '\u{1F534}',
          `${sig.symbol} ${sig.direction} @ ${entry}`,
          sig.takeProfit1 ? `| TP1 ${Number(sig.takeProfit1).toFixed(decimals)}` : '',
          sig.stopLoss ? `| SL ${Number(sig.stopLoss).toFixed(decimals)}` : '',
          `| ${sig.confidence}% confidence`,
          `\n\nTrack live: ${baseUrl}/track-record`,
        ].filter(Boolean).join(' ');
        enqueueSignalPost(sig.id, copy, imageUrl, { symbol: sig.symbol, direction: sig.direction }).catch(() => {});
      }
    }

    // In active mode, strip blocked signals from the response so
    // downstream consumers (UI, API clients) see the same view as the DB.
    // In shadow mode the response is unchanged.
    if (mode === 'active' && blockedSignals.length > 0) {
      const blockedIds = new Set(blockedSignals.map((b) => b.id));
      result.signals = result.signals.filter((s) => !blockedIds.has(s.id));
    }
  }

  // Partner strategies stay dark (see isDarkStrategy). Everything else is
  // free for everyone — the tier read-filter is gone.
  result.signals = result.signals.filter((s) => !isDarkStrategy(s.strategyId));

  // Published confidence floor. Every caller now gets the lowest floor the
  // built-in strategy set allows (formerly the paid view).
  const floor = Math.min(
    PUBLISHED_SIGNAL_MIN_CONFIDENCE,
    ...STRATEGY_PRIORITY.map((sid) => minConfidenceFor(sid)),
  );
  result.signals = result.signals.filter((s) => s.confidence >= floor);

  // The premium_signals merge (TradingView webhook ingest + remote HTTP feed)
  // was removed: those feeds are partner-owned and stay dark per plan open
  // decision #4. Ingestion continues via /api/webhooks/tradingview; nothing
  // is served from it here.

  return result;
}

/**
 * Convenience wrapper kept for call-site compatibility: with the tier system
 * removed there is no per-request access context, so this simply delegates.
 */
export async function getTrackedSignalsForRequest(
  _req: Request,
  params: GetTrackedSignalsParams = {},
) {
  return getTrackedSignals(params);
}
