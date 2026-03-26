import type { TelegramApiResult, TelegramSubscriber, SignalForBot } from './types';
import { formatSignalMessage } from './formatter';

const TELEGRAM_API = 'https://api.telegram.org';
const RATE_LIMIT_MS = 34; // ~30 messages/second max (Telegram limit)

export class TelegramBot {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async post<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${TELEGRAM_API}/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as TelegramApiResult;
    if (!data.ok) {
      throw new Error(`Telegram API error (${method}): ${data.description ?? 'unknown error'}`);
    }
    return data.result as T;
  }

  async sendMessage(
    chatId: string,
    text: string,
    parseMode: 'MarkdownV2' | 'HTML' = 'MarkdownV2'
  ): Promise<void> {
    await this.post('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    });
  }

  async sendSignal(chatId: string, signal: SignalForBot, appUrl?: string): Promise<void> {
    const text = formatSignalMessage(signal, appUrl);
    await this.sendMessage(chatId, text);
  }

  /**
   * Broadcast a signal to multiple subscribers respecting Telegram rate limits.
   * Filters by subscriber preferences (pairs and minConfidence).
   */
  async broadcastSignal(
    subscribers: TelegramSubscriber[],
    signal: SignalForBot,
    appUrl?: string
  ): Promise<{ sent: number; failed: number }> {
    const eligible = subscribers.filter((sub) => {
      const pairsOk =
        sub.subscribedPairs === 'all' ||
        sub.subscribedPairs.includes(signal.symbol);
      const confOk = signal.confidence >= sub.minConfidence;
      return pairsOk && confOk;
    });

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < eligible.length; i++) {
      const sub = eligible[i];
      try {
        await this.sendSignal(sub.chatId, signal, appUrl);
        sent++;
      } catch {
        failed++;
      }

      // Rate limit: wait between messages (skip delay after last one)
      if (i < eligible.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
      }
    }

    return { sent, failed };
  }

  async getMe(): Promise<{ id: number; username: string; first_name: string }> {
    return this.post('getMe', {});
  }

  async setWebhook(url: string): Promise<void> {
    await this.post('setWebhook', { url, allowed_updates: ['message'] });
  }

  async deleteWebhook(): Promise<void> {
    await this.post('deleteWebhook', {});
  }

  async getWebhookInfo(): Promise<{
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
  }> {
    return this.post('getWebhookInfo', {});
  }
}
