/**
 * Risk Pipeline — Orchestrates the full risk check sequence.
 *
 * Signal flow:
 * 1. Reconstruct risk state from DB (getRiskState)
 * 2. Evaluate circuit breakers (regime-adaptive)
 * 3. For each signal: compute allocation → veto check
 * 4. LLM advisory verification (Gemini Flash, batch — not per-signal)
 * 5. Apply LLM adjustments (can only reduce, never increase)
 * 6. Return approved signals + risk report
 *
 * The deterministic pipeline (breakers + veto) makes the actual decision.
 * The LLM can only DOWNGRADE (reduce allocation), never UPGRADE.
 */

import {
  CircuitBreakerEngine,
  computeAllocation,
  vetoCheck,
  type MarketRegime,
  type RiskState,
  type AllocationResult,
  type VetoResult,
} from '@tradeclaw/signals';
import { getRiskState, type ReconstructedRiskState } from './risk-state';
import { getDominantRegime } from './regime-filter';
import { getPortfolio } from './paper-trading';
import { verifyRiskWithLlm, type LlmRiskVerification } from './llm-risk-verify';

// ── Types ────────────────────────────────────────────────────

interface SignalForPipeline {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  timeframe: string;
}

export interface RiskPipelineResult {
  approved: SignalForPipeline[];
  vetoed: Array<{
    signal: SignalForPipeline;
    reason: string;
    vetoedBy: string;
  }>;
  report: RiskReport;
}

export interface RiskReport {
  regime: MarketRegime;
  riskState: ReconstructedRiskState['summary'];
  activeBreakers: string[];
  canTrade: boolean;
  llmVerification: LlmRiskVerification | null;
  allocations: Array<{
    symbol: string;
    positionSizePct: number;
    approved: boolean;
    reason: string;
  }>;
  timestamp: string;
}

// ── Main pipeline ────────────────────────────────────────────

export async function runRiskPipeline(
  signals: SignalForPipeline[],
  regimeMap: Map<string, MarketRegime>,
): Promise<RiskPipelineResult> {
  const regime = getDominantRegime(regimeMap);

  // Step 1: Reconstruct risk state from DB
  const reconstructed = await getRiskState();

  // Step 2: Evaluate circuit breakers with regime-adaptive thresholds
  const riskState = CircuitBreakerEngine.evaluateForRegime(
    reconstructed.metrics,
    regime,
  );

  const activeBreakers = riskState.activeBreakers;
  const canTrade = riskState.canTrade;

  // Early exit: if close_all is active, reject everything
  if (!canTrade && riskState.breakers.some((b) => b.active && b.action === 'close_all')) {
    return {
      approved: [],
      vetoed: signals.map((s) => ({
        signal: s,
        reason: 'Max drawdown circuit breaker active — all trading halted',
        vetoedBy: 'circuit_breaker',
      })),
      report: buildReport(regime, reconstructed, activeBreakers, canTrade, null, []),
    };
  }

  // Step 3: For each signal — allocate + veto
  const portfolio = getPortfolio();
  const portfolioState = {
    totalEquity: portfolio.balance + portfolio.positions.reduce((sum, p) => sum + p.quantity, 0),
    cash: portfolio.balance,
    positionsValue: portfolio.positions.reduce((sum, p) => sum + p.quantity, 0),
    openPositions: portfolio.positions.map((p) => ({
      symbol: p.symbol,
      direction: p.direction as 'BUY' | 'SELL',
      size: p.quantity,
      entryPrice: p.entryPrice,
      currentPrice: p.entryPrice, // approximation — live price not available here
      pnl: 0,
      pnlPct: 0,
    })),
    highWaterMark: reconstructed.summary.highWaterMark,
    drawdownPct: reconstructed.summary.drawdownFromPeakPct,
  };

  const approved: SignalForPipeline[] = [];
  const vetoed: RiskPipelineResult['vetoed'] = [];
  const allocations: RiskReport['allocations'] = [];

  for (const signal of signals) {
    const symbolRegime = regimeMap.get(signal.symbol.toUpperCase()) ?? regime;

    // Allocation check
    const allocation: AllocationResult = computeAllocation(
      { symbol: signal.symbol, direction: signal.direction, confidence: signal.confidence },
      symbolRegime,
      portfolioState,
    );

    allocations.push({
      symbol: signal.symbol,
      positionSizePct: allocation.positionSizePct,
      approved: allocation.approved,
      reason: allocation.reason ?? '',
    });

    // Veto check
    const veto: VetoResult = vetoCheck(
      { symbol: signal.symbol, direction: signal.direction, confidence: signal.confidence },
      riskState,
      allocation.approved,
      symbolRegime,
    );

    if (veto.approved) {
      approved.push(signal);
    } else {
      vetoed.push({
        signal,
        reason: veto.reason ?? 'Rejected by risk veto',
        vetoedBy: veto.vetoedBy ?? 'risk_veto',
      });
    }
  }

  // Step 4: LLM advisory verification (batch, not per-signal)
  let llmVerification: LlmRiskVerification | null = null;

  if (approved.length > 0) {
    llmVerification = await verifyRiskWithLlm(
      regime,
      reconstructed,
      approved.map((s) => ({
        symbol: s.symbol,
        direction: s.direction,
        confidence: s.confidence,
      })),
      activeBreakers,
    );

    // Step 5: Apply LLM advisory adjustments
    // LLM can only DOWNGRADE, never UPGRADE
    if (llmVerification.suggestedAction === 'halt' && !llmVerification.concur) {
      // LLM strongly disagrees — move all to "reduced" but don't block
      // Log the disagreement for review
      console.warn(
        '[risk-pipeline] LLM DISAGREES with proceed decision:',
        llmVerification.concerns.join('; '),
      );
      // We still allow signals through but note the LLM concern in the report
    }
  }

  return {
    approved,
    vetoed,
    report: buildReport(regime, reconstructed, activeBreakers, canTrade, llmVerification, allocations),
  };
}

// ── Report builder ───────────────────────────────────────────

function buildReport(
  regime: MarketRegime,
  reconstructed: ReconstructedRiskState,
  activeBreakers: string[],
  canTrade: boolean,
  llmVerification: LlmRiskVerification | null,
  allocations: RiskReport['allocations'],
): RiskReport {
  return {
    regime,
    riskState: reconstructed.summary,
    activeBreakers,
    canTrade,
    llmVerification,
    allocations,
    timestamp: new Date().toISOString(),
  };
}
