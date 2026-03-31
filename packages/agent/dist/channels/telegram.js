import { formatNumber, formatDiff, emaTrendText } from './base.js';
/**
 * Telegram Bot API channel adapter.
 */
export class TelegramChannel {
    type = 'telegram';
    enabled;
    botToken;
    chatId;
    constructor(config) {
        this.enabled = config.enabled;
        this.botToken = config.telegramBotToken || '';
        this.chatId = config.telegramChatId || '';
    }
    validate() {
        if (!this.botToken)
            return 'Telegram bot token is required';
        if (!this.chatId)
            return 'Telegram chat ID is required';
        if (!this.botToken.includes(':'))
            return 'Invalid Telegram bot token format (expected BOT_ID:TOKEN)';
        return null;
    }
    async sendSignal(signal) {
        const message = this.formatSignal(signal);
        return this.send(message);
    }
    async sendMessage(text) {
        return this.send(text);
    }
    formatSignal(signal) {
        const diamond = signal.direction === 'BUY' ? '\u25C6' : '\u25C7';
        const skillName = signal.skill || 'Multi-Indicator';
        const esc = (s) => s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
        const fmt = (n) => esc(formatNumber(n));
        const diff = (a, b) => esc(formatDiff(a, b));
        const lines = [
            `*${diamond} ${signal.direction} ${signal.symbol}*  \\[${signal.confidence}%\\]`,
            `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
            `\u25B8 Entry    ${fmt(signal.entry)}`,
            `\u25B8 SL       ${fmt(signal.stopLoss)}   ${diff(signal.entry, signal.stopLoss)}`,
            `\u25B8 TP1      ${fmt(signal.takeProfit1)}   ${diff(signal.entry, signal.takeProfit1)}`,
            `\u25B8 TP2      ${fmt(signal.takeProfit2)}   ${diff(signal.entry, signal.takeProfit2)}`,
            `\u25B8 TP3      ${fmt(signal.takeProfit3)}   ${diff(signal.entry, signal.takeProfit3)}`,
            ``,
            `\u25C8 RSI: ${signal.indicators.rsi.value}  ${capitalize(signal.indicators.rsi.signal)}`,
            `\u25C8 MACD: ${capitalize(signal.indicators.macd.signal)}`,
            `\u25C8 EMA: ${emaTrendText(signal.indicators.ema.trend)}`,
            `\u25C9 ${signal.timeframe}  \\|  ${esc(skillName)}`,
            `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,
            `\u2295 tradeclaw\\.win`,
        ];
        return lines.join('\n');
    }
    async send(text) {
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text,
                    parse_mode: 'MarkdownV2',
                    disable_web_page_preview: true,
                }),
            });
            if (!response.ok) {
                const retryResponse = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: this.chatId,
                        text: text.replace(/[*_\[\]()~`>#+\-=|{}.!\\]/g, ''),
                        disable_web_page_preview: true,
                    }),
                });
                if (!retryResponse.ok) {
                    const err = await retryResponse.text();
                    console.error(`[telegram] Failed to send message: ${err}`);
                    return false;
                }
            }
            return true;
        }
        catch (error) {
            console.error(`[telegram] Error sending message:`, error);
            return false;
        }
    }
}
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
//# sourceMappingURL=telegram.js.map