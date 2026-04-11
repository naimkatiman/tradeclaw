/**
 * Circuit Breakers & Risk Veto Layer — Type Definitions
 *
 * Defines the data structures for circuit breakers that protect
 * against excessive drawdowns, losing streaks, and correlated exposure.
 */

export type BreakerType =
  | 'daily_drawdown'      // >3% daily loss
  | 'weekly_drawdown'     // >7% weekly loss
  | 'max_drawdown'        // >15% from peak
  | 'consecutive_losses'  // 5+ consecutive losses
  | 'correlation_limit';  // >3 correlated positions

export type BreakerAction = 'halt_new' | 'reduce_allocation' | 'close_all';

export interface BreakerConfig {
  type: BreakerType;
  threshold: number;
  action: BreakerAction;
  cooldownMinutes: number;
  description: string;
}

export interface BreakerState {
  type: BreakerType;
  active: boolean;
  triggeredAt?: string;
  resolvedAt?: string;
  reason?: string;
  action: BreakerAction;
}

export interface RiskState {
  breakers: BreakerState[];
  activeBreakers: BreakerType[];
  canTrade: boolean;
  maxAllocationOverride?: number;
  equityCurve: EquityPoint[];
  currentDrawdownPct: number;
  highWaterMark: number;
  consecutiveLosses: number;
}

export interface EquityPoint {
  equity: number;
  timestamp: string;
  drawdownPct: number;
}

export interface VetoResult {
  approved: boolean;
  reason?: string;
  vetoedBy?: BreakerType;
  riskState: RiskState;
}

export interface TradeOutcome {
  signalId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  pnl: number;
  pnlPct: number;
  closedAt: string;
  outcome: 'win' | 'loss' | 'breakeven';
}

/** Metrics fed into the circuit breaker engine for evaluation. */
export interface RiskMetrics {
  dailyPnlPct: number;
  weeklyPnlPct: number;
  drawdownFromPeakPct: number;
  consecutiveLosses: number;
  openPositions: { symbol: string; direction: string }[];
}
