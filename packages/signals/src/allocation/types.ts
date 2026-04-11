/**
 * Dynamic Allocation Strategy — Type Definitions
 *
 * Defines the data structures for regime-aware position sizing
 * and portfolio risk management.
 */

export interface AllocationRules {
  /** Maximum % of portfolio that can be in open positions. */
  maxExposurePct: number;
  /** Maximum leverage multiplier. */
  maxLeverage: number;
  /** Which trade directions are permitted in this regime. */
  allowedDirections: ('BUY' | 'SELL')[];
  /** Maximum % of portfolio for a single position. */
  maxSinglePositionPct: number;
  /** Whether to use tighter stop losses. */
  tightenStops: boolean;
}

export interface AllocationResult {
  /** Recommended position size as % of portfolio. */
  positionSizePct: number;
  /** Recommended leverage multiplier. */
  leverageMultiplier: number;
  /** Whether the allocation is approved. */
  approved: boolean;
  /** Explanation if not approved. */
  reason?: string;
  /** Current regime driving this allocation. */
  regime: string;
  /** The rules being applied. */
  rules: AllocationRules;
}

export interface PortfolioState {
  totalEquity: number;
  cash: number;
  positionsValue: number;
  openPositions: PositionSummary[];
  highWaterMark: number;
  drawdownPct: number;
}

export interface PositionSummary {
  symbol: string;
  direction: 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
}
