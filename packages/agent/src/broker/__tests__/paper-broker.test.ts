import { PaperBroker } from '../paper-broker.js';
import type { OrderRequest } from '../types.js';

describe('PaperBroker', () => {
  let broker: PaperBroker;

  beforeEach(() => {
    broker = new PaperBroker({ initialEquity: 100_000 });
  });

  describe('initial state', () => {
    it('should have the configured initial equity', async () => {
      const account = await broker.getAccount();
      expect(account.equity).toBe(100_000);
      expect(account.cash).toBe(100_000);
      expect(account.positionsValue).toBe(0);
      expect(account.broker).toBe('paper');
      expect(account.isPaper).toBe(true);
    });

    it('should default to $100,000 when no options provided', async () => {
      const defaultBroker = new PaperBroker();
      const account = await defaultBroker.getAccount();
      expect(account.equity).toBe(100_000);
    });

    it('should start with no positions', async () => {
      const positions = await broker.getPositions();
      expect(positions).toEqual([]);
    });
  });

  describe('buy orders', () => {
    it('should create a long position on BUY', async () => {
      const order: OrderRequest = {
        symbol: 'AAPL',
        direction: 'BUY',
        quantity: 10,
        orderType: 'limit',
        limitPrice: 150,
      };

      const result = await broker.placeOrder(order);
      expect(result.status).toBe('filled');
      expect(result.filledQuantity).toBe(10);
      expect(result.filledPrice).toBe(150);
      expect(result.broker).toBe('paper');

      const positions = await broker.getPositions();
      expect(positions).toHaveLength(1);
      expect(positions[0].symbol).toBe('AAPL');
      expect(positions[0].direction).toBe('long');
      expect(positions[0].quantity).toBe(10);
      expect(positions[0].entryPrice).toBe(150);
    });

    it('should deduct cash on BUY', async () => {
      await broker.placeOrder({
        symbol: 'AAPL',
        direction: 'BUY',
        quantity: 10,
        orderType: 'limit',
        limitPrice: 150,
      });

      const account = await broker.getAccount();
      expect(account.cash).toBe(100_000 - 10 * 150);
    });

    it('should reject BUY when insufficient cash', async () => {
      const result = await broker.placeOrder({
        symbol: 'AAPL',
        direction: 'BUY',
        quantity: 1000,
        orderType: 'limit',
        limitPrice: 150,
      });

      expect(result.status).toBe('rejected');
      expect(result.message).toContain('Insufficient cash');

      const positions = await broker.getPositions();
      expect(positions).toHaveLength(0);
    });

    it('should average into existing long position', async () => {
      await broker.placeOrder({
        symbol: 'AAPL',
        direction: 'BUY',
        quantity: 10,
        orderType: 'limit',
        limitPrice: 100,
      });
      await broker.placeOrder({
        symbol: 'AAPL',
        direction: 'BUY',
        quantity: 10,
        orderType: 'limit',
        limitPrice: 200,
      });

      const positions = await broker.getPositions();
      expect(positions).toHaveLength(1);
      expect(positions[0].quantity).toBe(20);
      expect(positions[0].entryPrice).toBe(150); // average of 100 and 200
    });
  });

  describe('sell orders', () => {
    it('should create a short position on SELL when no existing long', async () => {
      const result = await broker.placeOrder({
        symbol: 'TSLA',
        direction: 'SELL',
        quantity: 5,
        orderType: 'limit',
        limitPrice: 200,
      });

      expect(result.status).toBe('filled');

      const positions = await broker.getPositions();
      expect(positions).toHaveLength(1);
      expect(positions[0].symbol).toBe('TSLA');
      expect(positions[0].direction).toBe('short');
      expect(positions[0].quantity).toBe(5);
    });

    it('should close a long position on SELL', async () => {
      await broker.placeOrder({
        symbol: 'AAPL',
        direction: 'BUY',
        quantity: 10,
        orderType: 'limit',
        limitPrice: 150,
      });

      await broker.placeOrder({
        symbol: 'AAPL',
        direction: 'SELL',
        quantity: 10,
        orderType: 'limit',
        limitPrice: 160,
      });

      const positions = await broker.getPositions();
      expect(positions).toHaveLength(0);

      // Cash should reflect proceeds from selling
      const account = await broker.getAccount();
      // Started 100k, bought 10@150 = -1500, sold 10@160 = +1600 => 100_100
      expect(account.cash).toBe(100_000 - 1500 + 1600);
    });

    it('should partially close a long position', async () => {
      await broker.placeOrder({
        symbol: 'AAPL',
        direction: 'BUY',
        quantity: 10,
        orderType: 'limit',
        limitPrice: 150,
      });

      await broker.placeOrder({
        symbol: 'AAPL',
        direction: 'SELL',
        quantity: 5,
        orderType: 'limit',
        limitPrice: 160,
      });

      const positions = await broker.getPositions();
      expect(positions).toHaveLength(1);
      expect(positions[0].quantity).toBe(5);
    });
  });

  describe('P&L calculation', () => {
    it('should compute unrealized P&L for a long position', async () => {
      await broker.placeOrder({
        symbol: 'AAPL',
        direction: 'BUY',
        quantity: 10,
        orderType: 'limit',
        limitPrice: 100,
      });

      // Price rises to 120
      broker.setCurrentPrice('AAPL', 120);

      const positions = await broker.getPositions();
      expect(positions[0].currentPrice).toBe(120);
      expect(positions[0].unrealizedPnl).toBe(200); // 10 * (120-100)
      expect(positions[0].unrealizedPnlPct).toBe(20); // 20%
    });

    it('should compute negative P&L for a losing long', async () => {
      await broker.placeOrder({
        symbol: 'AAPL',
        direction: 'BUY',
        quantity: 10,
        orderType: 'limit',
        limitPrice: 100,
      });

      broker.setCurrentPrice('AAPL', 80);

      const positions = await broker.getPositions();
      expect(positions[0].unrealizedPnl).toBe(-200); // 10 * (80-100)
      expect(positions[0].unrealizedPnlPct).toBe(-20);
    });

    it('should compute P&L for a short position', async () => {
      await broker.placeOrder({
        symbol: 'TSLA',
        direction: 'SELL',
        quantity: 5,
        orderType: 'limit',
        limitPrice: 200,
      });

      // Price drops to 180 — short profits
      broker.setCurrentPrice('TSLA', 180);

      const positions = await broker.getPositions();
      // Short P&L: -1 * (5*180 - 5*200) = -1 * (900-1000) = 100
      expect(positions[0].unrealizedPnl).toBe(100);
    });
  });

  describe('closePosition', () => {
    it('should remove a position by symbol', async () => {
      await broker.placeOrder({
        symbol: 'AAPL',
        direction: 'BUY',
        quantity: 10,
        orderType: 'limit',
        limitPrice: 100,
      });

      await broker.closePosition('AAPL');

      const positions = await broker.getPositions();
      expect(positions).toHaveLength(0);
    });

    it('should do nothing when closing a non-existent position', async () => {
      await broker.closePosition('NONEXISTENT');
      const positions = await broker.getPositions();
      expect(positions).toHaveLength(0);
    });
  });

  describe('closeAllPositions', () => {
    it('should close all open positions', async () => {
      await broker.placeOrder({
        symbol: 'AAPL',
        direction: 'BUY',
        quantity: 10,
        orderType: 'limit',
        limitPrice: 100,
      });
      await broker.placeOrder({
        symbol: 'TSLA',
        direction: 'BUY',
        quantity: 5,
        orderType: 'limit',
        limitPrice: 200,
      });

      const beforePositions = await broker.getPositions();
      expect(beforePositions).toHaveLength(2);

      await broker.closeAllPositions();

      const afterPositions = await broker.getPositions();
      expect(afterPositions).toHaveLength(0);
    });
  });

  describe('connect / disconnect', () => {
    it('should resolve without error', async () => {
      await expect(broker.connect()).resolves.toBeUndefined();
      await expect(broker.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw when no price available for market order simulation', async () => {
      await expect(
        broker.placeOrder({
          symbol: 'AAPL',
          direction: 'BUY',
          quantity: 10,
          orderType: 'market',
        }),
      ).rejects.toThrow('Paper broker requires a limitPrice or stopPrice');
    });
  });
});
