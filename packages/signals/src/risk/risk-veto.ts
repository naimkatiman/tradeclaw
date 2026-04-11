/**
 * Risk Veto Layer
 *
 * Final gatekeeper that approves or rejects trading signals based on
 * the current risk state produced by the circuit breaker engine.
 *
 * Regime-aware: in trending markets (bull/euphoria), high-confidence
 * signals can bypass halt_new breakers so trades can run to TP3.
 * close_all is always enforced as the ultimate safety net.
 */

import type { MarketRegime } from '../regime/types';
import type { BreakerType, RiskState, VetoResult } from './types';

export interface VetoSignalInput {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
}

/** Regimes where high-confidence signals can bypass halt_new. */
const TRENDING_REGIMES: MarketRegime[] = ['bull', 'euphoria'];

/** Minimum confidence to bypass halt_new in trending markets. */
const HIGH_CONFIDENCE_THRESHOLD = 80;

/**
 * Run the veto check against the current risk state.
 *
 * Check order:
 * 1. close_all breaker → always reject (safety net)
 * 2. halt_new breaker → reject, UNLESS regime is trending AND confidence >= 80
 * 3. reduce_allocation breaker → approve with override
 * 4. allocationApproved false → reject
 * 5. Otherwise → approve
 */
export function vetoCheck(
  signal: VetoSignalInput,
  riskState: RiskState,
  allocationApproved: boolean,
  regime?: MarketRegime,
): VetoResult {
  // 0. Primary check: if riskState.canTrade is explicitly false, find the reason
  if (riskState.canTrade === false) {
    // Still scan breakers for a meaningful rejection message
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

    const haltNewBreaker = riskState.breakers.find(
      (b) => b.active && b.action === 'halt_new',
    );

    // In trending markets, high-confidence signals can still bypass halt_new
    if (haltNewBreaker) {
      const isTrending = regime !== undefined && TRENDING_REGIMES.includes(regime);
      const isHighConfidence = signal.confidence >= HIGH_CONFIDENCE_THRESHOLD;

      if (isTrending && isHighConfidence) {
        return {
          approved: true,
          reason: `${formatBreakerName(haltNewBreaker.type)} active but bypassed (${regime} regime, ${signal.confidence}% confidence) — allocation capped`,
          riskState: {
            ...riskState,
            maxAllocationOverride: riskState.maxAllocationOverride ?? 50,
          },
        };
      }

      return {
        approved: false,
        reason: `${formatBreakerName(haltNewBreaker.type)} is active, no new positions`,
        vetoedBy: haltNewBreaker.type,
        riskState,
      };
    }

    // canTrade is false but no specific breaker found
    return {
      approved: false,
      reason: 'Trading halted by risk state',
      riskState,
    };
  }

  // 1. close_all breaker active → always reject (ultimate safety net)
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

  // 2. halt_new breaker active
  const haltNewBreaker = riskState.breakers.find(
    (b) => b.active && b.action === 'halt_new',
  );
  if (haltNewBreaker) {
    // In trending markets, high-confidence signals bypass halt_new
    const isTrending = regime !== undefined && TRENDING_REGIMES.includes(regime);
    const isHighConfidence = signal.confidence >= HIGH_CONFIDENCE_THRESHOLD;

    if (isTrending && isHighConfidence) {
      // Downgrade to reduced allocation instead of full block
      return {
        approved: true,
        reason: `${formatBreakerName(haltNewBreaker.type)} active but bypassed (${regime} regime, ${signal.confidence}% confidence) — allocation capped`,
        riskState: {
          ...riskState,
          maxAllocationOverride: riskState.maxAllocationOverride ?? 50,
        },
      };
    }

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
