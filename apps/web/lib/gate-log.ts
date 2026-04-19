import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import type { GateMode, GateState, GateThresholds } from './full-risk-gates';
import type { MarketRegime } from '@tradeclaw/signals';

const DEFAULT_PATH = '/tmp/tradeclaw-gate-decisions.log';

interface SignalForLog {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
}

interface GateBatchLog {
  ts: string;
  mode: GateMode;
  gateState: {
    gatesAllow: boolean;
    reason: string | null;
    streakLossCount: number;
    currentDrawdownPct: number;
    dataPoints: number;
    regime: MarketRegime;
    thresholds: GateThresholds;
  };
  passedCount: number;
  blockedCount: number;
  passedSignals: SignalForLog[];
  blockedSignals: SignalForLog[];
}

function getLogPath(): string {
  return process.env.TRADECLAW_GATE_LOG_PATH ?? DEFAULT_PATH;
}

/**
 * Append-only NDJSON sink for gate decisions. One line per evaluated batch
 * of signals from a single getTrackedSignals call.
 *
 * Phase 1 (shadow): both passedSignals and blockedSignals populated; nothing
 * is actually filtered downstream. Phase 2 (active): blockedSignals is the
 * list of dropped signals.
 *
 * Fire-and-forget. Never throws — log failures shouldn't break the request.
 */
export async function logGateDecision(entry: GateBatchLog): Promise<void> {
  try {
    const logPath = getLogPath();
    const dir = path.dirname(logPath);
    await fs.mkdir(dir, { recursive: true }).catch(() => undefined);
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(logPath, line, 'utf8');
  } catch (err) {
    // Swallow — log to stderr but don't propagate
    console.error('[gate-log] append failed:', err);
  }
}

export function buildGateLogEntry(
  mode: GateMode,
  gateState: GateState,
  passedSignals: SignalForLog[],
  blockedSignals: SignalForLog[],
): GateBatchLog {
  return {
    ts: new Date().toISOString(),
    mode,
    gateState: {
      gatesAllow: gateState.gatesAllow,
      reason: gateState.reason,
      streakLossCount: gateState.streakLossCount,
      currentDrawdownPct: gateState.currentDrawdownPct,
      dataPoints: gateState.dataPoints,
      regime: gateState.regime,
      thresholds: gateState.thresholds,
    },
    passedCount: passedSignals.length,
    blockedCount: blockedSignals.length,
    passedSignals,
    blockedSignals,
  };
}

export type { SignalForLog, GateBatchLog };
