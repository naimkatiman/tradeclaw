import type { TradingSignal, ChannelConfig } from '@tradeclaw/signals';
import { formatNumber, formatDiff, emaTrendText } from '@tradeclaw/signals';

// Re-export for use by channel implementations
export { formatNumber, formatDiff, emaTrendText };

export function isProviderObservedSignal(signal: TradingSignal): boolean {
  return signal.source === 'real'
    && signal.dataQuality === 'real'
    && Number.isFinite(signal.entry)
    && signal.entry > 0
    && Number.isFinite(signal.stopLoss)
    && Number.isFinite(signal.takeProfit1)
    && Number.isFinite(Date.parse(signal.timestamp));
}

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
export function rsiEmoji(signal: string): string {
  switch (signal) {
    case 'oversold': return '\u{1F7E2}';
    case 'overbought': return '\u{1F534}';
    default: return '\u{1F7E1}';
  }
}

/**
 * Create a channel adapter from configuration.
 */
export async function createChannel(config: ChannelConfig): Promise<BaseChannel | null> {
  if (!config.enabled) return null;

  switch (config.type) {
    case 'telegram': {
      const { TelegramChannel } = await import('./telegram.js');
      return new TelegramChannel(config);
    }
    case 'discord': {
      const { DiscordChannel } = await import('./discord.js');
      return new DiscordChannel(config);
    }
    case 'webhook': {
      const { WebhookChannel } = await import('./webhook.js');
      return new WebhookChannel(config);
    }
    default:
      return null;
  }
}
