import type { TradingSignal, ChannelConfig } from '@tradeclaw/signals';
import type { BaseChannel } from './base.js';
/**
 * Discord Webhook channel adapter.
 */
export declare class DiscordChannel implements BaseChannel {
    readonly type = "discord";
    readonly enabled: boolean;
    private webhookUrl;
    constructor(config: ChannelConfig);
    validate(): string | null;
    sendSignal(signal: TradingSignal): Promise<boolean>;
    sendMessage(text: string): Promise<boolean>;
    private buildEmbed;
    private send;
}
//# sourceMappingURL=discord.d.ts.map