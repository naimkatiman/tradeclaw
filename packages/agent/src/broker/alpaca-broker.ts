/**
 * Alpaca Markets broker implementation.
 *
 * Uses the Alpaca REST API directly via fetch — no SDK dependency.
 * Defaults to paper trading mode for safety.
 */

import type {
  IBroker,
  AccountInfo,
  Position,
  OrderRequest,
  OrderResult,
} from './types.js';

interface AlpacaBrokerOptions {
  apiKey: string;
  secretKey: string;
  paper?: boolean;
}

const PAPER_URL = 'https://paper-api.alpaca.markets';
const LIVE_URL = 'https://api.alpaca.markets';

export class AlpacaBroker implements IBroker {
  readonly name = 'alpaca';
  readonly isPaper: boolean;

  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(opts: AlpacaBrokerOptions) {
    this.apiKey = opts.apiKey;
    this.secretKey = opts.secretKey;
    this.isPaper = opts.paper ?? true;
    this.baseUrl = this.isPaper ? PAPER_URL : LIVE_URL;
  }

  // -- helpers ---------------------------------------------------------------

  private headers(): Record<string, string> {
    return {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.secretKey,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}/v2${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Alpaca ${method} ${path} failed (${res.status}): ${text}`,
      );
    }

    // DELETE endpoints may return 204 with no body
    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
  }

  // -- IBroker implementation ------------------------------------------------

  async connect(): Promise<void> {
    // Verify the API key by fetching the account
    await this.request('GET', '/account');
  }

  async disconnect(): Promise<void> {
    // No persistent connection to tear down
  }

  async getAccount(): Promise<AccountInfo> {
    const raw = await this.request<AlpacaAccount>('GET', '/account');
    return {
      id: raw.account_number,
      broker: 'alpaca',
      equity: Number(raw.equity),
      cash: Number(raw.cash),
      buyingPower: Number(raw.buying_power),
      positionsValue: Number(raw.long_market_value) + Number(raw.short_market_value),
      currency: raw.currency,
      isPaper: this.isPaper,
    };
  }

  async getPositions(): Promise<Position[]> {
    const raw = await this.request<AlpacaPosition[]>('GET', '/positions');
    return raw.map((p) => ({
      symbol: p.symbol,
      direction: p.side === 'long' ? 'long' as const : 'short' as const,
      quantity: Number(p.qty),
      entryPrice: Number(p.avg_entry_price),
      currentPrice: Number(p.current_price),
      marketValue: Number(p.market_value),
      unrealizedPnl: Number(p.unrealized_pl),
      unrealizedPnlPct: Number(p.unrealized_plpc) * 100,
    }));
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    const body = this.buildOrderBody(order);
    const raw = await this.request<AlpacaOrder>('POST', '/orders', body);
    return {
      orderId: raw.id,
      broker: 'alpaca',
      status: mapAlpacaStatus(raw.status),
      filledQuantity: raw.filled_qty ? Number(raw.filled_qty) : undefined,
      filledPrice: raw.filled_avg_price
        ? Number(raw.filled_avg_price)
        : undefined,
      message: undefined,
      createdAt: raw.created_at,
    };
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request('DELETE', `/orders/${orderId}`);
  }

  async closePosition(symbol: string): Promise<void> {
    await this.request('DELETE', `/positions/${encodeURIComponent(symbol)}`);
  }

  async closeAllPositions(): Promise<void> {
    await this.request('DELETE', '/positions');
  }

  // -- private helpers -------------------------------------------------------

  private buildOrderBody(order: OrderRequest): Record<string, unknown> {
    if (order.orderType === 'bracket') {
      return {
        symbol: order.symbol,
        qty: String(Math.floor(order.quantity)),
        side: order.direction === 'BUY' ? 'buy' : 'sell',
        type: 'limit',
        time_in_force: order.timeInForce ?? 'gtc',
        limit_price: String(order.limitPrice ?? order.stopLoss),
        order_class: 'bracket',
        stop_loss: order.stopLoss
          ? { stop_price: String(order.stopLoss) }
          : undefined,
        take_profit: order.takeProfit
          ? { limit_price: String(order.takeProfit) }
          : undefined,
      };
    }

    const body: Record<string, unknown> = {
      symbol: order.symbol,
      qty: String(Math.floor(order.quantity)),
      side: order.direction === 'BUY' ? 'buy' : 'sell',
      type: order.orderType,
      time_in_force: order.timeInForce ?? 'day',
    };

    if (order.orderType === 'limit' && order.limitPrice != null) {
      body.limit_price = String(order.limitPrice);
    }
    if (order.orderType === 'stop' && order.stopPrice != null) {
      body.stop_price = String(order.stopPrice);
    }

    return body;
  }
}

// -- Alpaca API response shapes (internal) -----------------------------------

function mapAlpacaStatus(
  status: string,
): OrderResult['status'] {
  switch (status) {
    case 'filled':
      return 'filled';
    case 'partially_filled':
      return 'partial';
    case 'canceled':
    case 'expired':
    case 'replaced':
      return 'cancelled';
    case 'rejected':
      return 'rejected';
    default:
      return 'submitted';
  }
}

interface AlpacaAccount {
  account_number: string;
  equity: string;
  cash: string;
  buying_power: string;
  long_market_value: string;
  short_market_value: string;
  currency: string;
}

interface AlpacaPosition {
  symbol: string;
  side: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
}

interface AlpacaOrder {
  id: string;
  status: string;
  filled_qty: string | null;
  filled_avg_price: string | null;
  created_at: string;
}
