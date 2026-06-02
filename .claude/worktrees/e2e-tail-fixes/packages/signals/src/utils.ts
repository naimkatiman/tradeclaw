/**
 * Generate a unique signal ID.
 * Canonical format: SIG-{SYMBOL}-{TF}-{DIRECTION}-{timestamp36}{rand4}
 */
export function generateSignalId(symbol?: string, timeframe?: string, direction?: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  if (symbol && timeframe && direction) {
    return `SIG-${symbol.toUpperCase()}-${timeframe.toUpperCase()}-${direction.toUpperCase()}-${ts}${rand}`;
  }
  return `SIG-${ts}-${rand}`;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Format a number with commas for display.
 */
export function formatNumber(value: number, decimals?: number): string {
  if (decimals !== undefined) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  if (value >= 1000) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else if (value >= 1) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  } else {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 5,
      maximumFractionDigits: 5,
    });
  }
}

/**
 * Format the price difference for display.
 */
export function formatDiff(entry: number, target: number): string {
  const diff = target - entry;
  const sign = diff >= 0 ? '+' : '-';
  return `${sign}$${formatNumber(Math.abs(diff))}`;
}

/**
 * Get the EMA trend display text.
 */
export function emaTrendText(trend: string): string {
  switch (trend) {
    case 'up': return 'Uptrend';
    case 'down': return 'Downtrend';
    default: return 'Sideways';
  }
}
