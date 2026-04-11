/**
 * Execution engine — orchestrates the full signal-to-order pipeline.
 *
 * Flow: Signal -> Risk Veto -> Allocation Check -> Position Sizing -> Broker Order
 *
 * Risk and allocation logic are injected via callbacks so the engine stays
 * decoupled from the signals package.
 */

import type { IBroker, OrderRequest, OrderResult } from './types.js';

export interface ExecutionSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
}

export interface RiskCheckResult {
  approved: boolean;
  reason?: string;
}

export interface AllocationCheckResult {
  approved: boolean;
  positionSizePct: number;
}

export interface ExecutionContext {
  broker: IBroker;
  riskCheck: (signal: ExecutionSignal) => RiskCheckResult;
  allocationCheck: (signal: ExecutionSignal) => AllocationCheckResult;
}

export type ExecutionStage = 'risk' | 'allocation' | 'broker';

export interface ExecutionResult {
  executed: boolean;
  order?: OrderResult;
  reason?: string;
  stage?: ExecutionStage;
}

export class ExecutionEngine {
  private ctx: ExecutionContext;

  constructor(ctx: ExecutionContext) {
    this.ctx = ctx;
  }

  async executeSignal(signal: ExecutionSignal): Promise<ExecutionResult> {
    // 1. Risk veto
    const risk = this.ctx.riskCheck(signal);
    if (!risk.approved) {
      return { executed: false, reason: risk.reason, stage: 'risk' };
    }

    // 2. Allocation check
    const alloc = this.ctx.allocationCheck(signal);
    if (!alloc.approved) {
      return { executed: false, reason: 'Allocation denied', stage: 'allocation' };
    }

    // 3. Position sizing
    const account = await this.ctx.broker.getAccount();
    const positionValue = account.equity * (alloc.positionSizePct / 100);
    const quantity = positionValue / signal.entry;

    // 4. Place bracket order
    const order: OrderRequest = {
      symbol: signal.symbol,
      direction: signal.direction,
      quantity,
      orderType: 'bracket',
      limitPrice: signal.entry,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit1,
      timeInForce: 'gtc',
      signalId: signal.id,
    };

    try {
      const result = await this.ctx.broker.placeOrder(order);
      return { executed: true, order: result };
    } catch (err) {
      return {
        executed: false,
        reason: (err as Error).message,
        stage: 'broker',
      };
    }
  }
}
