// Client-safe symbol configuration — no server-side imports (fs, pg, etc.)
// Import this instead of signals.ts when you only need SYMBOLS or TIMEFRAMES.

export const SYMBOLS = [
  { symbol: 'XAUUSD', name: 'Gold', pip: 0.01, basePrice: 4505.0, volatility: 20 },
  { symbol: 'XAGUSD', name: 'Silver', pip: 0.001, basePrice: 71.36, volatility: 0.8 },
  { symbol: 'BTCUSD', name: 'Bitcoin', pip: 0.01, basePrice: 70798.0, volatility: 2000 },
  { symbol: 'ETHUSD', name: 'Ethereum', pip: 0.01, basePrice: 2147.53, volatility: 100 },
  { symbol: 'SOLUSD', name: 'Solana', pip: 0.01, basePrice: 142.80, volatility: 8 },
  { symbol: 'DOGEUSD', name: 'Dogecoin', pip: 0.00001, basePrice: 0.178, volatility: 0.008 },
  { symbol: 'BNBUSD', name: 'BNB', pip: 0.01, basePrice: 608.50, volatility: 25 },
  { symbol: 'XRPUSD', name: 'XRP', pip: 0.0001, basePrice: 1.40, volatility: 0.03 },
  { symbol: 'EURUSD', name: 'EUR/USD', pip: 0.0001, basePrice: 1.1559, volatility: 0.005 },
  { symbol: 'GBPUSD', name: 'GBP/USD', pip: 0.0001, basePrice: 1.3352, volatility: 0.006 },
  { symbol: 'USDJPY', name: 'USD/JPY', pip: 0.01, basePrice: 159.53, volatility: 0.8 },
  { symbol: 'AUDUSD', name: 'AUD/USD', pip: 0.0001, basePrice: 0.6939, volatility: 0.004 },
  { symbol: 'USDCAD', name: 'USD/CAD', pip: 0.0001, basePrice: 1.3826, volatility: 0.005 },
  { symbol: 'NZDUSD', name: 'NZD/USD', pip: 0.0001, basePrice: 0.5799, volatility: 0.004 },
  { symbol: 'USDCHF', name: 'USD/CHF', pip: 0.0001, basePrice: 0.7922, volatility: 0.004 },
];

export const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'] as const;
