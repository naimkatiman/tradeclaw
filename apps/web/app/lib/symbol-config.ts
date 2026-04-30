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
  // Commodities (Pro tier) — oil
  { symbol: 'WTIUSD', name: 'WTI Crude Oil', pip: 0.01, basePrice: 78.50, volatility: 1.5 },
  { symbol: 'BRNUSD', name: 'Brent Crude Oil', pip: 0.01, basePrice: 82.30, volatility: 1.5 },
  // Stocks (Pro tier) — US mega-caps + index ETFs
  { symbol: 'NVDAUSD', name: 'NVIDIA', pip: 0.01, basePrice: 145.00, volatility: 5.0 },
  { symbol: 'TSLAUSD', name: 'Tesla', pip: 0.01, basePrice: 240.00, volatility: 8.0 },
  { symbol: 'AAPLUSD', name: 'Apple', pip: 0.01, basePrice: 230.00, volatility: 3.5 },
  { symbol: 'MSFTUSD', name: 'Microsoft', pip: 0.01, basePrice: 420.00, volatility: 5.0 },
  { symbol: 'GOOGLUSD', name: 'Alphabet', pip: 0.01, basePrice: 175.00, volatility: 3.5 },
  { symbol: 'AMZNUSD', name: 'Amazon', pip: 0.01, basePrice: 200.00, volatility: 4.0 },
  { symbol: 'METAUSD', name: 'Meta', pip: 0.01, basePrice: 580.00, volatility: 8.0 },
  { symbol: 'SPYUSD', name: 'S&P 500 ETF', pip: 0.01, basePrice: 580.00, volatility: 4.0 },
  { symbol: 'QQQUSD', name: 'Nasdaq 100 ETF', pip: 0.01, basePrice: 500.00, volatility: 5.0 },
];

export const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'] as const;
