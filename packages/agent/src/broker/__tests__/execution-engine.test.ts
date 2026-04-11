import { ExecutionEngine } from '../execution-engine.js';
import type { ExecutionSignal, ExecutionContext } from '../execution-engine.js';
import type { IBroker, AccountInfo, OrderResult, Position } from '../types.js';

// -- helpers -----------------------------------------------------------------

function makeSignal(overrides?: Partial<ExecutionSignal>): ExecutionSignal {
  return {
    id: 'sig-001',
    symbol: 'AAPL',
    direction: 'BUY',
    confidence: 0.85,
    entry: 150,
    stopLoss: 145,
    takeProfit1: 160,
    ...overrides,
  };
}

function makeMockBroker(overrides?: Partial<IBroker>): IBroker {
  const defaultAccount: AccountInfo = {
    id: 'test-account',
    broker: 'paper',
    equity: 100_000,
    cash: 100_000,
    buyingPower: 100_000,
    positionsValue: 0,
    currency: 'USD',
    isPaper: true,
  };

  const defaultOrderResult: OrderResult = {
    orderId: 'order-001',
    broker: 'paper',
    status: 'filled',
    filledQuantity: 10,
    filledPrice: 150,
    createdAt: new Date().toISOString(),
  };

  return {
    name: 'mock',
    isPaper: true,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getAccount: jest.fn().mockResolvedValue(defaultAccount),
    getPositions: jest.fn().mockResolvedValue([] as Position[]),
    placeOrder: jest.fn().mockResolvedValue(defaultOrderResult),
    cancelOrder: jest.fn().mockResolvedValue(undefined),
    closePosition: jest.fn().mockResolvedValue(undefined),
    closeAllPositions: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
  return {
    broker: makeMockBroker(),
    riskCheck: () => ({ approved: true }),
    allocationCheck: () => ({ approved: true, positionSizePct: 5 }),
    ...overrides,
  };
}

// -- tests -------------------------------------------------------------------

describe('ExecutionEngine', () => {
  describe('risk check', () => {
    it('should block execution when risk check denies', async () => {
      const ctx = makeContext({
        riskCheck: () => ({ approved: false, reason: 'Max daily loss reached' }),
      });
      const engine = new ExecutionEngine(ctx);

      const result = await engine.executeSignal(makeSignal());

      expect(result.executed).toBe(false);
      expect(result.stage).toBe('risk');
      expect(result.reason).toBe('Max daily loss reached');
      expect(ctx.broker.placeOrder).not.toHaveBeenCalled();
    });
  });

  describe('allocation check', () => {
    it('should block execution when allocation check denies', async () => {
      const ctx = makeContext({
        allocationCheck: () => ({ approved: false, positionSizePct: 0 }),
      });
      const engine = new ExecutionEngine(ctx);

      const result = await engine.executeSignal(makeSignal());

      expect(result.executed).toBe(false);
      expect(result.stage).toBe('allocation');
      expect(result.reason).toBe('Allocation denied');
      expect(ctx.broker.placeOrder).not.toHaveBeenCalled();
    });
  });

  describe('successful execution', () => {
    it('should execute signal through the full pipeline', async () => {
      const ctx = makeContext();
      const engine = new ExecutionEngine(ctx);

      const result = await engine.executeSignal(makeSignal());

      expect(result.executed).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order!.status).toBe('filled');
      expect(ctx.broker.getAccount).toHaveBeenCalled();
      expect(ctx.broker.placeOrder).toHaveBeenCalled();
    });

    it('should calculate position size from equity and allocation pct', async () => {
      const ctx = makeContext({
        allocationCheck: () => ({ approved: true, positionSizePct: 10 }),
      });
      const engine = new ExecutionEngine(ctx);
      const signal = makeSignal({ entry: 200 });

      await engine.executeSignal(signal);

      // equity=100k, 10% = 10k, at $200 entry = 50 shares
      const placeOrderCall = (ctx.broker.placeOrder as jest.Mock).mock.calls[0][0];
      expect(placeOrderCall.quantity).toBe(50);
      expect(placeOrderCall.symbol).toBe('AAPL');
      expect(placeOrderCall.direction).toBe('BUY');
      expect(placeOrderCall.orderType).toBe('bracket');
      expect(placeOrderCall.limitPrice).toBe(200);
      expect(placeOrderCall.stopLoss).toBe(145);
      expect(placeOrderCall.takeProfit).toBe(160);
      expect(placeOrderCall.signalId).toBe('sig-001');
    });
  });

  describe('broker errors', () => {
    it('should catch and return broker errors', async () => {
      const ctx = makeContext({
        broker: makeMockBroker({
          placeOrder: jest.fn().mockRejectedValue(new Error('Connection timeout')),
        }),
      });
      const engine = new ExecutionEngine(ctx);

      const result = await engine.executeSignal(makeSignal());

      expect(result.executed).toBe(false);
      expect(result.stage).toBe('broker');
      expect(result.reason).toBe('Connection timeout');
    });
  });

  describe('signal passthrough', () => {
    it('should pass the signalId to the order', async () => {
      const ctx = makeContext();
      const engine = new ExecutionEngine(ctx);

      await engine.executeSignal(makeSignal({ id: 'sig-xyz-789' }));

      const order = (ctx.broker.placeOrder as jest.Mock).mock.calls[0][0];
      expect(order.signalId).toBe('sig-xyz-789');
    });

    it('should use GTC time in force for bracket orders', async () => {
      const ctx = makeContext();
      const engine = new ExecutionEngine(ctx);

      await engine.executeSignal(makeSignal());

      const order = (ctx.broker.placeOrder as jest.Mock).mock.calls[0][0];
      expect(order.timeInForce).toBe('gtc');
    });
  });
});
