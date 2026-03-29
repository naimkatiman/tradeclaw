/**
 * Market hours validation for different asset classes
 * Ensures signals are only generated when markets are actively trading
 */

interface MarketHours {
  open: number; // UTC hour
  close: number; // UTC hour
  days: number[]; // 0 = Sunday, 6 = Saturday
}

const MARKET_HOURS: Record<string, MarketHours> = {
  // Forex: Sunday 5pm EST - Friday 5pm EST = Sunday 10pm UTC - Saturday 12am UTC (next day)
  FOREX: {
    open: 22, // Sunday 22:00 UTC (5pm EST)
    close: 24, // Friday 24:00 UTC is treated as 23:59 - checked via day
    days: [0, 1, 2, 3, 4, 5], // Sun-Fri (not Sat)
  },
  // Metals: London session (8am-5pm London time) = London opening + overlapping NY session
  // Use 8am UTC to 9pm UTC (covers most liquid hours)
  METALS: {
    open: 8, // 8am UTC
    close: 21, // 9pm UTC
    days: [1, 2, 3, 4, 5], // Mon-Fri only
  },
  // Crypto: Always trading 24/7
  CRYPTO: {
    open: 0,
    close: 24,
    days: [0, 1, 2, 3, 4, 5, 6], // All days
  },
};

/**
 * Get asset class for a symbol
 */
function getAssetClass(symbol: string): 'FOREX' | 'METALS' | 'CRYPTO' {
  if (symbol === 'XAUUSD' || symbol === 'XAGUSD') return 'METALS';
  if (['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'].includes(symbol)) {
    return 'FOREX';
  }
  return 'CRYPTO'; // Bitcoin, Ethereum, Solana, Dogecoin, BNB, XRP
}

/**
 * Check if a market is currently open for trading
 * @param symbol Trading symbol (e.g., 'EURUSD', 'BTCUSD')
 * @param timestamp Optional timestamp to check (defaults to now)
 * @returns true if market is open, false otherwise
 */
export function isMarketOpen(symbol: string, timestamp?: number): boolean {
  const now = new Date(timestamp || Date.now());
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const utcHour = now.getUTCHours();

  const assetClass = getAssetClass(symbol);
  const hours = MARKET_HOURS[assetClass];

  // Check if today is a trading day
  if (!hours.days.includes(dayOfWeek)) {
    return false;
  }

  // Check if within trading hours
  // Special case for forex: spans Sunday-Friday with wrap-around
  if (assetClass === 'FOREX') {
    if (dayOfWeek === 0) {
      // Sunday: open from 22:00 UTC onwards
      return utcHour >= hours.open;
    }
    if (dayOfWeek === 5) {
      // Friday: close at 24:00 UTC (end of day)
      return true;
    }
    // Mon-Thu: entire day is trading hours
    return true;
  }

  // For other markets: simple hour check
  return utcHour >= hours.open && utcHour < hours.close;
}

/**
 * Get human-readable market status for a symbol
 */
export function getMarketStatus(symbol: string, timestamp?: number): string {
  const assetClass = getAssetClass(symbol);
  const isOpen = isMarketOpen(symbol, timestamp);
  const hours = MARKET_HOURS[assetClass];

  if (isOpen) return 'OPEN';

  if (assetClass === 'CRYPTO') return 'OPEN'; // Always open
  if (assetClass === 'FOREX') return 'CLOSED (Forex: Sun 5pm-Fri 5pm EST)';
  return `CLOSED (${hours.open}:00-${hours.close}:00 UTC, Mon-Fri)`;
}
