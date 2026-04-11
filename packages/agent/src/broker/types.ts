/**
 * Broker abstraction layer types.
 *
 * Defines the common interface all broker implementations must satisfy,
 * plus the shared data structures for accounts, positions, and orders.
 */

export interface AccountInfo {
  id: string;
  broker: 'alpaca' | 'metaapi' | 'paper';
  equity: number;
  cash: number;
  buyingPower: number;
  positionsValue: number;
  currency: string;
  isPaper: boolean;
}

export interface Position {
  symbol: string;
  direction: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

export interface OrderRequest {
  symbol: string;
  direction: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop' | 'bracket';
  limitPrice?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeInForce?: 'day' | 'gtc' | 'ioc';
  signalId?: string;
}

export interface OrderResult {
  orderId: string;
  broker: string;
  status: 'submitted' | 'filled' | 'partial' | 'cancelled' | 'rejected';
  filledQuantity?: number;
  filledPrice?: number;
  message?: string;
  createdAt: string;
}

export interface IBroker {
  readonly name: string;
  readonly isPaper: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAccount(): Promise<AccountInfo>;
  getPositions(): Promise<Position[]>;
  placeOrder(order: OrderRequest): Promise<OrderResult>;
  cancelOrder(orderId: string): Promise<void>;
  closePosition(symbol: string): Promise<void>;
  closeAllPositions(): Promise<void>;
}
