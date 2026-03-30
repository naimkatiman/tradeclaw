/**
 * Generate a unique signal ID.
 */
export function generateSignalId() {
    return `SIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}
/**
 * Clamp a value between min and max.
 */
export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
/**
 * Format a number with commas for display.
 */
export function formatNumber(value, decimals) {
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
    }
    else if (value >= 1) {
        return value.toLocaleString('en-US', {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
        });
    }
    else {
        return value.toLocaleString('en-US', {
            minimumFractionDigits: 5,
            maximumFractionDigits: 5,
        });
    }
}
/**
 * Format the price difference for display.
 */
export function formatDiff(entry, target) {
    const diff = target - entry;
    const sign = diff >= 0 ? '+' : '-';
    return `${sign}$${formatNumber(Math.abs(diff))}`;
}
/**
 * Get the EMA trend display text.
 */
export function emaTrendText(trend) {
    switch (trend) {
        case 'up': return 'Uptrend';
        case 'down': return 'Downtrend';
        default: return 'Sideways';
    }
}
//# sourceMappingURL=utils.js.map