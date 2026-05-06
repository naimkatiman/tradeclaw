// Client-safe symbol configuration — no server-side imports (fs, pg, etc.)
// Import this instead of signals.ts when you only need SYMBOLS or TIMEFRAMES.

export type SymbolCategory = 'majors' | 'thematic';
export type CategoryFilter = 'all' | SymbolCategory;

export interface SymbolConfig {
  symbol: string;
  name: string;
  pip: number;
  basePrice: number;
  volatility: number;
  category: SymbolCategory;
}

export const SYMBOLS: SymbolConfig[] = [
  { symbol: 'XAUUSD', name: 'Gold', pip: 0.01, basePrice: 4505.0, volatility: 20, category: 'majors' },
  { symbol: 'XAGUSD', name: 'Silver', pip: 0.001, basePrice: 71.36, volatility: 0.8, category: 'thematic' },
  { symbol: 'BTCUSD', name: 'Bitcoin', pip: 0.01, basePrice: 70798.0, volatility: 2000, category: 'majors' },
  { symbol: 'ETHUSD', name: 'Ethereum', pip: 0.01, basePrice: 2147.53, volatility: 100, category: 'majors' },
  { symbol: 'SOLUSD', name: 'Solana', pip: 0.01, basePrice: 142.80, volatility: 8, category: 'thematic' },
  { symbol: 'DOGEUSD', name: 'Dogecoin', pip: 0.00001, basePrice: 0.178, volatility: 0.008, category: 'thematic' },
  { symbol: 'BNBUSD', name: 'BNB', pip: 0.01, basePrice: 608.50, volatility: 25, category: 'thematic' },
  { symbol: 'XRPUSD', name: 'XRP', pip: 0.0001, basePrice: 1.40, volatility: 0.03, category: 'thematic' },
  { symbol: 'EURUSD', name: 'EUR/USD', pip: 0.0001, basePrice: 1.1559, volatility: 0.005, category: 'majors' },
  { symbol: 'GBPUSD', name: 'GBP/USD', pip: 0.0001, basePrice: 1.3352, volatility: 0.006, category: 'majors' },
  { symbol: 'USDJPY', name: 'USD/JPY', pip: 0.01, basePrice: 159.53, volatility: 0.8, category: 'majors' },
  { symbol: 'AUDUSD', name: 'AUD/USD', pip: 0.0001, basePrice: 0.6939, volatility: 0.004, category: 'thematic' },
  { symbol: 'USDCAD', name: 'USD/CAD', pip: 0.0001, basePrice: 1.3826, volatility: 0.005, category: 'thematic' },
  { symbol: 'NZDUSD', name: 'NZD/USD', pip: 0.0001, basePrice: 0.5799, volatility: 0.004, category: 'thematic' },
  { symbol: 'USDCHF', name: 'USD/CHF', pip: 0.0001, basePrice: 0.7922, volatility: 0.004, category: 'thematic' },
  // Commodities (Pro tier) — oil
  { symbol: 'WTIUSD', name: 'WTI Crude Oil', pip: 0.01, basePrice: 78.50, volatility: 1.5, category: 'thematic' },
  // Twelve Data has no Brent CFD; BNO ETF is the standard US-listed Brent proxy.
  { symbol: 'BNOUSD', name: 'Brent Oil ETF (BNO)', pip: 0.01, basePrice: 28.50, volatility: 0.6, category: 'thematic' },
  // Stocks (Pro tier) — US mega-caps + index ETFs
  { symbol: 'NVDAUSD', name: 'NVIDIA', pip: 0.01, basePrice: 145.00, volatility: 5.0, category: 'thematic' },
  { symbol: 'TSLAUSD', name: 'Tesla', pip: 0.01, basePrice: 240.00, volatility: 8.0, category: 'thematic' },
  { symbol: 'AAPLUSD', name: 'Apple', pip: 0.01, basePrice: 230.00, volatility: 3.5, category: 'thematic' },
  { symbol: 'MSFTUSD', name: 'Microsoft', pip: 0.01, basePrice: 420.00, volatility: 5.0, category: 'thematic' },
  { symbol: 'GOOGLUSD', name: 'Alphabet', pip: 0.01, basePrice: 175.00, volatility: 3.5, category: 'thematic' },
  { symbol: 'AMZNUSD', name: 'Amazon', pip: 0.01, basePrice: 200.00, volatility: 4.0, category: 'thematic' },
  { symbol: 'METAUSD', name: 'Meta', pip: 0.01, basePrice: 580.00, volatility: 8.0, category: 'thematic' },
  { symbol: 'SPYUSD', name: 'S&P 500 ETF', pip: 0.01, basePrice: 580.00, volatility: 4.0, category: 'majors' },
  { symbol: 'QQQUSD', name: 'Nasdaq 100 ETF', pip: 0.01, basePrice: 500.00, volatility: 5.0, category: 'majors' },
];

export const MAJORS_SYMBOLS: readonly string[] = SYMBOLS
  .filter(s => s.category === 'majors')
  .map(s => s.symbol);

export const THEMATIC_SYMBOLS: readonly string[] = SYMBOLS
  .filter(s => s.category === 'thematic')
  .map(s => s.symbol);

export function parseCategoryFilter(raw: string | null | undefined): CategoryFilter {
  return raw === 'majors' || raw === 'thematic' ? raw : 'all';
}

export function symbolsForCategory(category: CategoryFilter): readonly string[] {
  if (category === 'majors') return MAJORS_SYMBOLS;
  if (category === 'thematic') return THEMATIC_SYMBOLS;
  return SYMBOLS.map(s => s.symbol);
}

export const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'] as const;
