/**
 * Risk Veto Layer
 *
 * Final gatekeeper that approves or rejects trading signals based on
 * the current risk state produced by the circuit breaker engine.
 */

import type { BreakerType, RiskState, VetoResult } from './types';

export interface VetoSignalInput {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
}

/**
 * Run the veto check against the current risk state.
 *
 * Check order:
 * 1. close_all breaker → reject
 * 2. halt_new breaker → reject
 * 3. reduce_allocation breaker → approve with override
 * 4. allocationApproved false → reject
 * 5. Otherwise → approve
 */
export function vetoCheck(
  signal: VetoSignalInput,
  riskState: RiskState,
  allocationApproved: boolean,
): VetoResult {
  // 1. close_all breaker active → reject
  const closeAllBreaker = riskState.breakers.find(
    (b) => b.active && b.action === 'close_all',
  );
  if (closeAllBreaker) {
    return {
      approved: false,
      reason: 'Max drawdown breaker active',
      vetoedBy: closeAllBreaker.type,
      riskState,
    };
  }

  // 2. halt_new breaker active → reject
  const haltNewBreaker = riskState.breakers.find(
    (b) => b.active && b.action === 'halt_new',
  );
  if (haltNewBreaker) {
    return {
      approved: false,
      reason: `${formatBreakerName(haltNewBreaker.type)} is active, no new positions`,
      vetoedBy: haltNewBreaker.type,
      riskState,
    };
  }

  // 3. reduce_allocation active → approve but note override
  const reduceBreaker = riskState.breakers.find(
    (b) => b.active && b.action === 'reduce_allocation',
  );
  if (reduceBreaker) {
    return {
      approved: true,
      reason: `Allocation reduced to ${riskState.maxAllocationOverride ?? 25}% due to ${formatBreakerName(reduceBreaker.type)}`,
      riskState: {
        ...riskState,
        maxAllocationOverride: riskState.maxAllocationOverride ?? 25,
      },
    };
  }

  // 4. Allocation denied by regime rules
  if (!allocationApproved) {
    return {
      approved: false,
      reason: 'Allocation denied by regime rules',
      riskState,
    };
  }

  // 5. All clear
  return {
    approved: true,
    riskState,
  };
}

function formatBreakerName(type: BreakerType): string {
  return type.replace(/_/g, ' ');
}
