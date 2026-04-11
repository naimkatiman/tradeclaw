/**
 * In-memory paper trading broker.
 *
 * Simulates order execution with instant fills at the requested price.
 * Tracks positions, equity, and P&L entirely in memory — no external API calls.
 * Useful for testing and for users without a broker account.
 */

import type {
  IBroker,
  AccountInfo,
  Position,
  OrderRequest,
  OrderResult,
} from './types.js';

interface PaperBrokerOptions {
  initialEquity?: number;
}

interface InternalPosition {
  symbol: string;
  direction: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
}

interface InternalOrder {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  quantity: number;
  filledPrice: number;
  status: OrderResult['status'];
  createdAt: string;
  signalId?: string;
}

const DEFAULT_EQUITY = 100_000;

export class PaperBroker implements IBroker {
  readonly name = 'paper';
  readonly isPaper = true;

  private equity: number;
  private cash: number;
  private positions: Map<string, InternalPosition> = new Map();
  private orders: InternalOrder[] = [];
  private nextOrderId = 1;

  constructor(opts?: PaperBrokerOptions) {
    this.equity = opts?.initialEquity ?? DEFAULT_EQUITY;
    this.cash = this.equity;
  }

  // -- IBroker implementation ------------------------------------------------

  async connect(): Promise<void> {
    // Nothing to connect — everything is in-memory
  }

  async disconnect(): Promise<void> {
    // Nothing to tear down
  }

  async getAccount(): Promise<AccountInfo> {
    const positionsValue = this.computePositionsValue();
    return {
      id: 'paper-account',
      broker: 'paper',
      equity: this.cash + positionsValue,
      cash: this.cash,
      buyingPower: this.cash,
      positionsValue,
      currency: 'USD',
      isPaper: true,
    };
  }

  async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values()).map((p) => {
      const marketValue = p.quantity * p.currentPrice;
      const costBasis = p.quantity * p.entryPrice;
      const sign = p.direction === 'long' ? 1 : -1;
      const unrealizedPnl = sign * (marketValue - costBasis);
      const unrealizedPnlPct =
        costBasis !== 0 ? (unrealizedPnl / costBasis) * 100 : 0;

      return {
        symbol: p.symbol,
        direction: p.direction,
        quantity: p.quantity,
        entryPrice: p.entryPrice,
        currentPrice: p.currentPrice,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPct,
      };
    });
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    const fillPrice = order.limitPrice ?? order.stopPrice ?? 0;
    if (fillPrice <= 0) {
      throw new Error(
        `Paper broker requires a limitPrice or stopPrice to simulate fill (got ${fillPrice})`,
      );
    }

    const orderId = `paper-${this.nextOrderId++}`;
    const quantity = Math.floor(order.quantity);
    const cost = quantity * fillPrice;

    if (order.direction === 'BUY') {
      if (cost > this.cash) {
        return {
          orderId,
          broker: 'paper',
          status: 'rejected',
          message: `Insufficient cash: need $${cost.toFixed(2)}, have $${this.cash.toFixed(2)}`,
          createdAt: new Date().toISOString(),
        };
      }

      this.cash -= cost;
      this.addOrUpdatePosition(order.symbol, 'long', quantity, fillPrice);
    } else {
      // SELL — open a short or close a long
      const existing = this.positions.get(order.symbol);
      if (existing && existing.direction === 'long') {
        // Closing a long position
        const closeQty = Math.min(quantity, existing.quantity);
        const proceeds = closeQty * fillPrice;
        this.cash += proceeds;
        existing.quantity -= closeQty;
        if (existing.quantity <= 0) {
          this.positions.delete(order.symbol);
        }
      } else {
        // Opening a short
        this.cash += cost;
        this.addOrUpdatePosition(order.symbol, 'short', quantity, fillPrice);
      }
    }

    const record: InternalOrder = {
      id: orderId,
      symbol: order.symbol,
      direction: order.direction,
      quantity,
      filledPrice: fillPrice,
      status: 'filled',
      createdAt: new Date().toISOString(),
      signalId: order.signalId,
    };
    this.orders.push(record);

    return {
      orderId,
      broker: 'paper',
      status: 'filled',
      filledQuantity: quantity,
      filledPrice: fillPrice,
      createdAt: record.createdAt,
    };
  }

  async cancelOrder(_orderId: string): Promise<void> {
    // Paper orders fill instantly, so there is nothing to cancel
  }

  async closePosition(symbol: string): Promise<void> {
    const pos = this.positions.get(symbol);
    if (!pos) return;

    // Close at current price
    const proceeds = pos.quantity * pos.currentPrice;
    if (pos.direction === 'long') {
      this.cash += proceeds;
    } else {
      // For a short: cash was credited on open, now we buy back
      this.cash -= proceeds;
    }
    this.positions.delete(symbol);
  }

  async closeAllPositions(): Promise<void> {
    const symbols = Array.from(this.positions.keys());
    for (const symbol of symbols) {
      await this.closePosition(symbol);
    }
  }

  // -- Helpers for testing / price simulation --------------------------------

  /** Update the current price for a symbol (useful for P&L testing). */
  setCurrentPrice(symbol: string, price: number): void {
    const pos = this.positions.get(symbol);
    if (pos) {
      pos.currentPrice = price;
    }
  }

  // -- Private helpers -------------------------------------------------------

  private addOrUpdatePosition(
    symbol: string,
    direction: 'long' | 'short',
    quantity: number,
    price: number,
  ): void {
    const existing = this.positions.get(symbol);
    if (existing && existing.direction === direction) {
      // Average into the existing position
      const totalQty = existing.quantity + quantity;
      existing.entryPrice =
        (existing.entryPrice * existing.quantity + price * quantity) / totalQty;
      existing.quantity = totalQty;
      existing.currentPrice = price;
    } else {
      this.positions.set(symbol, {
        symbol,
        direction,
        quantity,
        entryPrice: price,
        currentPrice: price,
      });
    }
  }

  private computePositionsValue(): number {
    let total = 0;
    for (const p of this.positions.values()) {
      total += p.quantity * p.currentPrice;
    }
    return total;
  }
}
