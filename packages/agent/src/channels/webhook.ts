import type { TradingSignal, ChannelConfig } from '@tradeclaw/signals';
import type { BaseChannel } from './base.js';

/**
 * Generic HTTP webhook channel adapter.
 */
export class WebhookChannel implements BaseChannel {
  readonly type = 'webhook';
  readonly enabled: boolean;
  private webhookUrl: string;

  constructor(config: ChannelConfig) {
    this.enabled = config.enabled;
    this.webhookUrl = config.webhookUrl || '';
  }

  validate(): string | null {
    if (!this.webhookUrl) return 'Webhook URL is required';
    try {
      new URL(this.webhookUrl);
    } catch {
      return 'Invalid webhook URL format';
    }
    return null;
  }

  async sendSignal(signal: TradingSignal): Promise<boolean> {
    return this.post({
      event: 'signal',
      signal,
      timestamp: new Date().toISOString(),
    });
  }

  async sendMessage(text: string): Promise<boolean> {
    return this.post({
      event: 'message',
      text,
      timestamp: new Date().toISOString(),
    });
  }

  private async post(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'tradeclaw-agent/0.2.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`[webhook] Failed to POST to ${this.webhookUrl}: ${response.status} ${err}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[webhook] Error posting to ${this.webhookUrl}:`, error);
      return false;
    }
  }
}
