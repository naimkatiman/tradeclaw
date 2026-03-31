import type { TradingSignal, ChannelConfig } from '@tradeclaw/signals';
import type { BaseChannel } from './base.js';
/**
 * Telegram Bot API channel adapter.
 */
export declare class TelegramChannel implements BaseChannel {
    readonly type = "telegram";
    readonly enabled: boolean;
    private botToken;
    private chatId;
    constructor(config: ChannelConfig);
    validate(): string | null;
    sendSignal(signal: TradingSignal): Promise<boolean>;
    sendMessage(text: string): Promise<boolean>;
    private formatSignal;
    private send;
}
//# sourceMappingURL=telegram.d.ts.map