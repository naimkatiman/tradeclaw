import {
  evaluateCostAdjustedEdge,
  getStrictlyApprovedSignalIds,
  type EdgeEvidenceSummary,
  type EdgeGateReason,
} from './cost-adjusted-edge-gate';

export type EntryFanoutGateReason =
  | `cost_adjusted_edge:${EdgeGateReason}`
  | 'signal_approval:missing'
  | 'signal_approval:denied';

export interface EntryFanoutGateVerdict {
  allowed: boolean;
  reason: EntryFanoutGateReason;
  evidence: Pick<
    EdgeEvidenceSummary,
    | 'usableCount'
    | 'activeDays'
    | 'coverage'
    | 'perSignalMeanNetR'
    | 'equalDayLowerBoundNetR'
  >;
}

/**
 * Entry-like fan-out requires both positive aggregate evidence and the exact
 * persisted signal's explicit broadcast approval. Missing ids, legacy NULL
 * decisions, and database failures therefore deny delivery.
 */
export async function evaluateEntryFanoutGate(input: {
  symbol: string;
  signalId?: string;
}): Promise<EntryFanoutGateVerdict> {
  const edge = await evaluateCostAdjustedEdge({ symbols: [input.symbol] });
  const evidence = {
    usableCount: edge.usableCount,
    activeDays: edge.activeDays,
    coverage: edge.coverage,
    perSignalMeanNetR: edge.perSignalMeanNetR,
    equalDayLowerBoundNetR: edge.equalDayLowerBoundNetR,
  };

  if (!edge.allowed) {
    return {
      allowed: false,
      reason: `cost_adjusted_edge:${edge.reason}`,
      evidence,
    };
  }

  const signalId = input.signalId?.trim();
  if (!signalId) {
    return { allowed: false, reason: 'signal_approval:missing', evidence };
  }

  const approved = await getStrictlyApprovedSignalIds([signalId]);
  if (!approved.has(signalId)) {
    return { allowed: false, reason: 'signal_approval:denied', evidence };
  }

  return { allowed: true, reason: 'cost_adjusted_edge:ready', evidence };
}
