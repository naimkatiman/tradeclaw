import type { SymbolConfig, SymbolCategory } from './types.js';

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
  ADAUSD: {
    symbol: 'ADAUSD',
    name: 'Cardano / US Dollar',
    pip: 0.0001,
    basePrice: 0.68,
    volatility: 0.035,
  },
  AVAXUSD: {
    symbol: 'AVAXUSD',
    name: 'Avalanche / US Dollar',
    pip: 0.01,
    basePrice: 36.50,
    volatility: 0.038,
  },
  DOTUSD: {
    symbol: 'DOTUSD',
    name: 'Polkadot / US Dollar',
    pip: 0.001,
    basePrice: 7.20,
    volatility: 0.035,
  },
  LINKUSD: {
    symbol: 'LINKUSD',
    name: 'Chainlink / US Dollar',
    pip: 0.001,
    basePrice: 15.80,
    volatility: 0.032,
  },
  MATICUSD: {
    symbol: 'MATICUSD',
    name: 'Polygon / US Dollar',
    pip: 0.0001,
    basePrice: 0.55,
    volatility: 0.038,
  },
  ATOMUSD: {
    symbol: 'ATOMUSD',
    name: 'Cosmos / US Dollar',
    pip: 0.001,
    basePrice: 9.40,
    volatility: 0.033,
  },
  UNIUSD: {
    symbol: 'UNIUSD',
    name: 'Uniswap / US Dollar',
    pip: 0.001,
    basePrice: 11.20,
    volatility: 0.035,
  },
  LTCUSD: {
    symbol: 'LTCUSD',
    name: 'Litecoin / US Dollar',
    pip: 0.01,
    basePrice: 92.00,
    volatility: 0.028,
  },
  BCHUSD: {
    symbol: 'BCHUSD',
    name: 'Bitcoin Cash / US Dollar',
    pip: 0.01,
    basePrice: 380.00,
    volatility: 0.030,
  },
  NEARUSD: {
    symbol: 'NEARUSD',
    name: 'NEAR Protocol / US Dollar',
    pip: 0.001,
    basePrice: 5.80,
    volatility: 0.040,
  },
  APTUSD: {
    symbol: 'APTUSD',
    name: 'Aptos / US Dollar',
    pip: 0.01,
    basePrice: 9.50,
    volatility: 0.038,
  },
  ARBUSD: {
    symbol: 'ARBUSD',
    name: 'Arbitrum / US Dollar',
    pip: 0.0001,
    basePrice: 1.10,
    volatility: 0.040,
  },
  OPUSD: {
    symbol: 'OPUSD',
    name: 'Optimism / US Dollar',
    pip: 0.0001,
    basePrice: 2.30,
    volatility: 0.038,
  },
  FILUSD: {
    symbol: 'FILUSD',
    name: 'Filecoin / US Dollar',
    pip: 0.001,
    basePrice: 6.50,
    volatility: 0.035,
  },
  INJUSD: {
    symbol: 'INJUSD',
    name: 'Injective / US Dollar',
    pip: 0.01,
    basePrice: 25.00,
    volatility: 0.042,
  },
  SUIUSD: {
    symbol: 'SUIUSD',
    name: 'Sui / US Dollar',
    pip: 0.0001,
    basePrice: 1.35,
    volatility: 0.045,
  },
  SEIUSD: {
    symbol: 'SEIUSD',
    name: 'Sei / US Dollar',
    pip: 0.0001,
    basePrice: 0.48,
    volatility: 0.045,
  },
  TIAUSD: {
    symbol: 'TIAUSD',
    name: 'Celestia / US Dollar',
    pip: 0.001,
    basePrice: 8.20,
    volatility: 0.042,
  },
  RENDERUSD: {
    symbol: 'RENDERUSD',
    name: 'Render / US Dollar',
    pip: 0.001,
    basePrice: 7.80,
    volatility: 0.040,
  },
  FETUSD: {
    symbol: 'FETUSD',
    name: 'Fetch.ai / US Dollar',
    pip: 0.0001,
    basePrice: 2.20,
    volatility: 0.045,
  },
  AABORUSD: {
    symbol: 'AABORUSD',
    name: 'Aave / US Dollar',
    pip: 0.01,
    basePrice: 180.00,
    volatility: 0.032,
  },
  PEPEUSD: {
    symbol: 'PEPEUSD',
    name: 'Pepe / US Dollar',
    pip: 0.00000001,
    basePrice: 0.0000085,
    volatility: 0.060,
  },
  SHIBUSD: {
    symbol: 'SHIBUSD',
    name: 'Shiba Inu / US Dollar',
    pip: 0.00000001,
    basePrice: 0.0000225,
    volatility: 0.050,
  },
  WIFUSD: {
    symbol: 'WIFUSD',
    name: 'dogwifhat / US Dollar',
    pip: 0.0001,
    basePrice: 2.50,
    volatility: 0.065,
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

export function getSymbolCategory(symbol: string): SymbolCategory {
  const metals = ['XAUUSD', 'XAGUSD'];
  const crypto = [
    'BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGEUSD', 'BNBUSD', 'XRPUSD',
    'ADAUSD', 'AVAXUSD', 'DOTUSD', 'LINKUSD', 'MATICUSD', 'ATOMUSD',
    'UNIUSD', 'LTCUSD', 'BCHUSD', 'NEARUSD', 'APTUSD', 'ARBUSD',
    'OPUSD', 'FILUSD', 'INJUSD', 'SUIUSD', 'SEIUSD', 'TIAUSD',
    'RENDERUSD', 'FETUSD', 'AABORUSD', 'PEPEUSD', 'SHIBUSD', 'WIFUSD',
  ];
  const s = symbol.toUpperCase();
  if (metals.includes(s)) return 'metals';
  if (crypto.includes(s)) return 'crypto';
  return 'forex';
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
