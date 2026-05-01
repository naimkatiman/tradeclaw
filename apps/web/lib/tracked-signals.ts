import 'server-only';

import { getSignals } from '../app/lib/signals';
import { safeProfileId } from '../app/lib/signal-generator';
import { getPremiumSignalsFor } from './premium-signals';
import { recordSignalsAsync } from './signal-history';
import { invalidateHistoryCache } from './signal-history-cache';
import { enqueueSignalPost } from './social-queue';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE, minConfidenceFor } from './signal-thresholds';
import { getActivePreset } from '../app/api/cron/signals/preset-dispatch';
import { fetchGateState, getGateMode } from './full-risk-gates';
import { logGateDecision, buildGateLogEntry, type SignalForLog } from './gate-log';
import { resolveAccessContext, getStrategiesForTier } from './tier';

// Inlined to break the dependency on ./licenses during the license→tier
// migration. Phase D removes ./licenses entirely; the value never changes.
const FREE_STRATEGY = 'classic';

/**
 * Priority order for picking a caller's "effective" strategy view. Higher
 * index = more premium. The first match in reverse order wins. Inlined from
 * the deprecated licenses module so this file no longer imports it.
 */
const STRATEGY_PRIORITY = [
  'classic',
  'regime-aware',
  'vwap-ema-bb',
  'hmm-top3',
  'full-risk',
] as const;

function pickHighestUnlocked(unlocked: Set<string> | ReadonlySet<string>): string {
  for (let i = STRATEGY_PRIORITY.length - 1; i >= 0; i--) {
    const sid = STRATEGY_PRIORITY[i];
    if (unlocked.has(sid)) return sid;
  }
  return FREE_STRATEGY;
}

/**
 * Structural shape of any caller carrying a strategy access set. Accepts
 * `AccessContext` (canonical) or any literal `{ unlockedStrategies: Set<string> }`.
 */
interface StrategyAccess {
  unlockedStrategies: Set<string> | ReadonlySet<string>;
}

export interface GetTrackedSignalsParams {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  minConfidence?: number;
  /** Strategy access for read-time filtering. Defaults to anonymous ({classic}). */
  ctx?: StrategyAccess;
}

export async function getTrackedSignals(params: GetTrackedSignalsParams) {
  // Dispatch engine profile from SIGNAL_ENGINE_PRESET. Unknown ids fall back
  // to 'classic' (current production label is 'hmm-top3', which is not yet a
  // STRATEGY_PROFILES entry, so this is a no-op behaviorally — see Task 2 of
  // docs/plans/2026-05-01-monetization-consolidation.md).
  const activePresetId = getActivePreset().id;
  const profileId = safeProfileId(activePresetId);
  const result = await getSignals({ ...params, profileId });
  const ctx: StrategyAccess = params.ctx ?? {
    unlockedStrategies: getStrategiesForTier('free'),
  };

  if (result.signals.length > 0) {
    // This is the actual production write path for signal_history (the
    // /api/cron/signals route reads from live_signals which is empty in
    // production, so it never inserts anything). Tag with the active
    // preset so /track-record's per-strategy breakdown reflects reality.
    const strategyId = activePresetId;

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

    const recordPayload = filtered.map((signal) => ({
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
      gateBlocked: gateBlockedAll,
      gateReason: gateBlockedAll ? gateReason : undefined,
    }));

    // Record to PostgreSQL (or file fallback) — fire and forget
    if (recordPayload.length > 0) {
      recordSignalsAsync(recordPayload).catch(() => {});
      invalidateHistoryCache();

      // Downstream fan-out is tradable-only. Blocked signals are recorded
      // for track-record accounting, but users must not be alerted about
      // trades the system refused to take, and we must not post marketing
      // copy for blocked signals.
      const tradablePayload = gateBlockedAll ? [] : recordPayload;

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

  // Per-caller confidence floor. Premium callers get a lower floor so they
  // see signals the free published threshold would have suppressed.
  const floor = minConfidenceFor(pickHighestUnlocked(ctx.unlockedStrategies));
  if (floor < PUBLISHED_SIGNAL_MIN_CONFIDENCE) {
    result.signals = result.signals.filter((s) => s.confidence >= floor);
  } else {
    result.signals = result.signals.filter(
      (s) => s.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE,
    );
  }

  // Merge premium signals. Two possible sources:
  //   1. premium_signals DB table (TradingView webhook ingest) — always on.
  //   2. Remote HTTP feed at PREMIUM_SIGNAL_SOURCE_URL — only on tradeclaw.win
  //      deploys that set the env var. Self-hosts see [] here.
  //
  // getPremiumSignalsFor is license-gated inside and returns [] for free-only
  // callers. The HTTP source is double-gated here by the local license check
  // so a misconfigured remote cannot leak premium strategies to a free caller.
  try {
    const { fetchPremiumFromHttp } = await import('./premium-signal-source');
    const [fromDb, fromHttp] = await Promise.all([
      getPremiumSignalsFor(ctx, {
        symbol: params.symbol,
        timeframe: params.timeframe,
        direction: params.direction,
      }),
      fetchPremiumFromHttp(),
    ]);

    const httpAllowed = fromHttp.filter((s) =>
      ctx.unlockedStrategies.has(s.strategyId ?? FREE_STRATEGY),
    );

    const extras = [...fromDb, ...httpAllowed];
    if (extras.length > 0) {
      const seen = new Set(result.signals.map((s) => s.id));
      const deduped = extras.filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      result.signals = [...result.signals, ...deduped].sort(
        (a, b) => b.confidence - a.confidence,
      );
    }
  } catch {
    // Premium table missing, remote down, or DB blip — don't break the free path.
  }

  return result;
}

/**
 * Convenience wrapper: resolves the access context from the Request,
 * then delegates to getTrackedSignals. Preferred for any API route or
 * server component that has a Request in hand.
 */
export async function getTrackedSignalsForRequest(
  req: Request,
  params: Omit<GetTrackedSignalsParams, 'ctx'> = {},
) {
  const ctx = await resolveAccessContext(req);
  return getTrackedSignals({ ...params, ctx });
}
