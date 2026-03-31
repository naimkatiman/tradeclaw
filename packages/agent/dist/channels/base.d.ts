import type { TradingSignal, ChannelConfig } from '@tradeclaw/signals';
import { formatNumber, formatDiff, emaTrendText } from '@tradeclaw/signals';
export { formatNumber, formatDiff, emaTrendText };
/**
 * Base interface for all channel adapters.
 */
export interface BaseChannel {
    readonly type: string;
    readonly enabled: boolean;
    sendSignal(signal: TradingSignal): Promise<boolean>;
    sendMessage(text: string): Promise<boolean>;
    validate(): string | null;
}
/**
 * Get the emoji for RSI signal.
 */
export declare function rsiEmoji(signal: string): string;
/**
 * Create a channel adapter from configuration.
 */
export declare function createChannel(config: ChannelConfig): Promise<BaseChannel | null>;
//# sourceMappingURL=base.d.ts.map