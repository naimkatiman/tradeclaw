import type { SymbolConfig } from './types.js';

export const SYMBOLS: Record<string, SymbolConfig> = {
  XAUUSD: {
    symbol: 'XAUUSD',
    name: 'Gold / US Dollar',
    pip: 0.01,
    basePrice: 3020.00,
    volatility: 0.008,
  },
  XAGUSD: {
    symbol: 'XAGUSD',
    name: 'Silver / US Dollar',
    pip: 0.001,
    basePrice: 33.50,
    volatility: 0.012,
  },
  BTCUSD: {
    symbol: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    pip: 0.01,
    basePrice: 87000.00,
    volatility: 0.025,
  },
  ETHUSD: {
    symbol: 'ETHUSD',
    name: 'Ethereum / US Dollar',
    pip: 0.01,
    basePrice: 2050.00,
    volatility: 0.030,
  },
  SOLUSD: {
    symbol: 'SOLUSD',
    name: 'Solana / US Dollar',
    pip: 0.01,
    basePrice: 140.00,
    volatility: 0.035,
  },
  DOGEUSD: {
    symbol: 'DOGEUSD',
    name: 'Dogecoin / US Dollar',
    pip: 0.00001,
    basePrice: 0.178,
    volatility: 0.040,
  },
  BNBUSD: {
    symbol: 'BNBUSD',
    name: 'BNB / US Dollar',
    pip: 0.01,
    basePrice: 608.50,
    volatility: 0.025,
  },
  XRPUSD: {
    symbol: 'XRPUSD',
    name: 'Ripple / US Dollar',
    pip: 0.0001,
    basePrice: 2.45,
    volatility: 0.028,
  },
  EURUSD: {
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    pip: 0.0001,
    basePrice: 1.0790,
    volatility: 0.004,
  },
  GBPUSD: {
    symbol: 'GBPUSD',
    name: 'British Pound / US Dollar',
    pip: 0.0001,
    basePrice: 1.2920,
    volatility: 0.005,
  },
  USDJPY: {
    symbol: 'USDJPY',
    name: 'US Dollar / Japanese Yen',
    pip: 0.01,
    basePrice: 150.30,
    volatility: 0.004,
  },
  AUDUSD: {
    symbol: 'AUDUSD',
    name: 'Australian Dollar / US Dollar',
    pip: 0.0001,
    basePrice: 0.6290,
    volatility: 0.006,
  },
  USDCAD: {
    symbol: 'USDCAD',
    name: 'US Dollar / Canadian Dollar',
    pip: 0.0001,
    basePrice: 1.3826,
    volatility: 0.005,
  },
  NZDUSD: {
    symbol: 'NZDUSD',
    name: 'New Zealand Dollar / US Dollar',
    pip: 0.0001,
    basePrice: 0.5799,
    volatility: 0.004,
  },
  USDCHF: {
    symbol: 'USDCHF',
    name: 'US Dollar / Swiss Franc',
    pip: 0.0001,
    basePrice: 0.7922,
    volatility: 0.004,
  },
};

export function getSymbolConfig(symbol: string): SymbolConfig | undefined {
  return SYMBOLS[symbol.toUpperCase()];
}

export function getAllSymbols(): string[] {
  return Object.keys(SYMBOLS);
}

/**
 * Update a symbol's base price at runtime (e.g. after fetching live prices).
 */
export function updateBasePrice(symbol: string, price: number): void {
  const config = SYMBOLS[symbol.toUpperCase()];
  if (config && price > 0) {
    config.basePrice = price;
  }
}
