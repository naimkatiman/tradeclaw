import {
  D1_SLOW_GATE_PAPER_STRATEGY_ID,
  D1_SLOW_GATE_SYMBOLS,
  D1_SLOW_GATE_TIMEFRAME,
  runD1SlowGate,
  type D1SlowGateTransition,
} from '@tradeclaw/strategies';
import { getCandlesSince, refreshDailyCandles, type StoredCandle } from './candle-store';
import { recordSignalsAsync, type TrackedSignalInput } from './signal-history';

const DAY_MS = 86_400_000;
const MIN_D1_BARS = 200;
export const D1_SLOW_GATE_PAPER_START_TS = Date.UTC(2017, 8, 1);
export const D1_SLOW_GATE_PAPER_MAX_STALENESS_MS = 48 * 60 * 60 * 1000;

export type D1SlowGatePaperFailureStage =
  | 'refresh'
  | 'data'
  | 'strategy'
  | 'frequency'
  | 'persist'
  | 'lane';

export interface D1SlowGatePaperFailure {
  symbol: string;
  stage: D1SlowGatePaperFailureStage;
  error: string;
}

export interface D1SlowGatePaperResult {
  processed: number;
  candidates: number;
  recorded: number;
  failures: D1SlowGatePaperFailure[];
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function validatePaperCandles(candles: StoredCandle[], now: number): void {
  if (candles.length < MIN_D1_BARS) {
    throw new Error(`only ${candles.length} stored D1 bars (need >= ${MIN_D1_BARS})`);
  }
  if (candles[0].timestamp !== D1_SLOW_GATE_PAPER_START_TS) {
    throw new Error(
      `frozen D1 history must start at ${new Date(D1_SLOW_GATE_PAPER_START_TS).toISOString()}`,
    );
  }
  for (let index = 0; index < candles.length; index++) {
    const timestamp = candles[index].timestamp;
    if (timestamp % DAY_MS !== 0) {
      throw new Error(`D1 bar ${index} is not aligned to a UTC day boundary`);
    }
    if (index > 0) {
      const gap = timestamp - candles[index - 1].timestamp;
      if (gap <= 0) throw new Error('D1 timestamps must be strictly increasing');
      if (gap > D1_SLOW_GATE_PAPER_MAX_STALENESS_MS) {
        throw new Error(`D1 history is stale: ${gap / DAY_MS}-day gap at bar ${index}`);
      }
    }
  }

  const latestClose = candles[candles.length - 1].timestamp + DAY_MS;
  if (latestClose > now) {
    throw new Error('latest D1 bar is not provably closed');
  }
  const age = now - latestClose;
  if (age > D1_SLOW_GATE_PAPER_MAX_STALENESS_MS) {
    throw new Error(`latest closed D1 bar is stale by ${Math.floor(age / 3_600_000)}h`);
  }
}

function toTrackedSignal(
  symbol: string,
  transition: D1SlowGateTransition,
): TrackedSignalInput {
  return {
    id: `${D1_SLOW_GATE_PAPER_STRATEGY_ID}:${symbol}:${transition.action}:${transition.timestamp}`,
    symbol,
    timeframe: D1_SLOW_GATE_TIMEFRAME,
    direction: transition.direction,
    confidence: Math.round(Math.max(0, Math.min(1, transition.confidence)) * 10_000) / 100,
    entry: transition.price,
    timestamp: new Date(transition.timestamp + DAY_MS).toISOString(),
    stopLoss: transition.stopLoss,
    strategyId: D1_SLOW_GATE_PAPER_STRATEGY_ID,
    mode: 'swing',
    entryAtr: transition.entryAtr,
    atrMultiplier: transition.atrMultiplier,
    isSimulated: true,
  };
}

/**
 * Refreshes and evaluates the approved BTC/ETH D1 paper lane. Every failure is
 * collected and fails closed; callers can report it without breaking the live
 * signal path. Only a transition on the newest closed bar is eligible, so a
 * first deployment never manufactures historical paper rows.
 */
export async function runD1SlowGatePaperLane(
  options: { now?: number } = {},
): Promise<D1SlowGatePaperResult> {
  const now = options.now ?? Date.now();
  if (!Number.isSafeInteger(now) || now <= 0) {
    throw new Error('D1 paper lane now must be a positive safe-integer timestamp');
  }

  const failures: D1SlowGatePaperFailure[] = [];
  const candidates: TrackedSignalInput[] = [];
  let processed = 0;

  for (const symbol of D1_SLOW_GATE_SYMBOLS) {
    processed += 1;
    try {
      await refreshDailyCandles(symbol);
    } catch (error) {
      failures.push({ symbol, stage: 'refresh', error: message(error) });
      continue;
    }

    let candles: StoredCandle[];
    try {
      candles = await getCandlesSince(symbol, D1_SLOW_GATE_TIMEFRAME, D1_SLOW_GATE_PAPER_START_TS);
      validatePaperCandles(candles, now);
    } catch (error) {
      failures.push({ symbol, stage: 'data', error: message(error) });
      continue;
    }

    try {
      const run = runD1SlowGate(candles, { symbol, timeframe: D1_SLOW_GATE_TIMEFRAME });
      if (!run.frequencyCapPassed) {
        failures.push({
          symbol,
          stage: 'frequency',
          error: `${run.maxRollingDirectionChanges} direction changes exceed the rolling ceiling`,
        });
        continue;
      }

      const latestBarIndex = candles.length - 1;
      const transition = run.transitions.findLast((item) => item.barIndex === latestBarIndex);
      if (transition) candidates.push(toTrackedSignal(symbol, transition));
    } catch (error) {
      failures.push({ symbol, stage: 'strategy', error: message(error) });
    }
  }

  let recorded = 0;
  if (candidates.length > 0) {
    try {
      recorded = await recordSignalsAsync(candidates);
    } catch (error) {
      for (const candidate of candidates) {
        failures.push({ symbol: candidate.symbol, stage: 'persist', error: message(error) });
      }
    }
  }

  return { processed, candidates: candidates.length, recorded, failures };
}
