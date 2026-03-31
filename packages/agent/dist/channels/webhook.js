/**
 * Generic HTTP webhook channel adapter.
 */
export class WebhookChannel {
    type = 'webhook';
    enabled;
    webhookUrl;
    constructor(config) {
        this.enabled = config.enabled;
        this.webhookUrl = config.webhookUrl || '';
    }
    validate() {
        if (!this.webhookUrl)
            return 'Webhook URL is required';
        try {
            new URL(this.webhookUrl);
        }
        catch {
            return 'Invalid webhook URL format';
        }
        return null;
    }
    async sendSignal(signal) {
        return this.post({
            event: 'signal',
            signal,
            timestamp: new Date().toISOString(),
        });
    }
    async sendMessage(text) {
        return this.post({
            event: 'message',
            text,
            timestamp: new Date().toISOString(),
        });
    }
    async post(payload) {
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
        }
        catch (error) {
            console.error(`[webhook] Error posting to ${this.webhookUrl}:`, error);
            return false;
        }
    }
}
//# sourceMappingURL=webhook.js.map