/**
 * Slippage Model — realistic trade execution friction
 * Applies configurable slippage to entry/exit prices based on asset class.
 * Slippage always works AGAINST the trader (worse fills).
 */

export interface SlippageConfig {
  enabled: boolean;
  pctEntry: number; // slippage % on entry (e.g. 0.15 = 0.15%)
  pctExit: number;  // slippage % on exit
}

// Default configs per asset class
const CRYPTO_SLIPPAGE: SlippageConfig = { enabled: true, pctEntry: 0.15, pctExit: 0.15 };
const FOREX_SLIPPAGE: SlippageConfig = { enabled: true, pctEntry: 0.02, pctExit: 0.02 };
const METALS_SLIPPAGE: SlippageConfig = { enabled: true, pctEntry: 0.05, pctExit: 0.05 };

const CRYPTO_SYMBOLS = ['BTCUSD', 'ETHUSD', 'XRPUSD', 'SOLUSD'];
const METALS_SYMBOLS = ['XAUUSD', 'XAGUSD'];

/**
 * Get the appropriate slippage config for a given symbol.
 */
export function getSlippageConfig(symbol: string): SlippageConfig {
  const upper = symbol.toUpperCase();
  if (CRYPTO_SYMBOLS.includes(upper)) return CRYPTO_SLIPPAGE;
  if (METALS_SYMBOLS.includes(upper)) return METALS_SLIPPAGE;
  return FOREX_SLIPPAGE;
}

/**
 * Apply slippage to a price. Slippage always works AGAINST the trader:
 * - BUY entry: price goes UP (you pay more)
 * - SELL entry: price goes DOWN (you receive less)
 * - BUY exit: price goes DOWN (you receive less when closing)
 * - SELL exit: price goes UP (you pay more when closing)
 */
export function applySlippage(
  price: number,
  direction: 'BUY' | 'SELL',
  type: 'entry' | 'exit',
  config: SlippageConfig,
): number {
  if (!config.enabled) return price;

  const pct = type === 'entry' ? config.pctEntry : config.pctExit;
  const factor = pct / 100;

  if (type === 'entry') {
    // Entry: slippage works against you
    return direction === 'BUY'
      ? price * (1 + factor)  // BUY: worse fill = higher price
      : price * (1 - factor); // SELL: worse fill = lower price
  }

  // Exit: slippage works against you
  return direction === 'BUY'
    ? price * (1 - factor)  // Closing BUY (selling): worse fill = lower price
    : price * (1 + factor); // Closing SELL (buying back): worse fill = higher price
}
