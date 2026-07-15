import { loadConfig } from './config.js';
import { Scheduler } from './scheduler.js';
import { SIGNAL_SCAN_AVAILABILITY } from '../signals/engine.js';
import { fetchLivePrices } from '../signals/prices.js';
import { createChannel, isProviderObservedSignal } from '../channels/base.js';
/**
 * Core gateway daemon.
 * Orchestrates availability checks and future observed-candidate delivery.
 */
export class Gateway {
    config = null;
    scheduler = null;
    channels = [];
    latestSignals = [];
    startTime = null;
    initialized = false;
    channelWarned = false;
    async start(configPath) {
        console.log('');
        console.log('  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
        console.log('  \u2551       tradeclaw-agent v0.2.0          \u2551');
        console.log('  \u2551  Self-hosted research candidate agent \u2551');
        console.log('  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D');
        console.log('');
        this.config = await loadConfig(configPath);
        console.log(`[gateway] Loaded config: ${this.config.symbols.length} symbols, ${this.config.timeframes.length} timeframes`);
        console.log(`[gateway] Minimum rule score: ${this.config.minConfidence}/100`);
        console.log(`[gateway] Scan interval: ${this.config.scanInterval}s`);
        try {
            const prices = await fetchLivePrices();
            if (prices.size > 0) {
                console.log(`[gateway] Provider price observations loaded: ${prices.size} symbols`);
            }
            else {
                console.warn('[gateway] No provider price observations are currently available');
            }
        }
        catch {
            console.warn('[gateway] Provider prices unavailable; no fallback prices will be used');
        }
        await this.initChannels();
        console.warn(`[gateway] Signal scanning disabled: ${SIGNAL_SCAN_AVAILABILITY.reason}`);
        this.setupShutdownHandlers();
        this.startTime = new Date();
        this.scheduler = new Scheduler(this.config.scanInterval, async () => { await this.performScan(); });
        await this.scheduler.start();
        console.log('[gateway] Daemon is running. Press Ctrl+C to stop.');
    }
    async scanOnce(configPath) {
        if (!this.initialized) {
            this.config = await loadConfig(configPath);
            await this.initChannels();
            this.initialized = true;
        }
        const signals = await this.performScan();
        return signals;
    }
    getLatestSignals() {
        return this.latestSignals;
    }
    getStatus() {
        return {
            running: this.scheduler?.isRunning() ?? false,
            uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
            scanCount: this.scheduler?.getScanCount() ?? 0,
            config: this.config,
            channelCount: this.channels.length,
            skillCount: 0,
            ...SIGNAL_SCAN_AVAILABILITY,
        };
    }
    async testChannels() {
        if (!this.config) {
            this.config = await loadConfig();
        }
        await this.initChannels();
        const testMessage = [
            '\u{1F9EA} tradeclaw-agent test message',
            '',
            `Channels: ${this.channels.length} active`,
            `Symbols: ${this.config.symbols.join(', ')}`,
            `Timeframes: ${this.config.timeframes.join(', ')}`,
            `Minimum rule score: ${this.config.minConfidence}/100`,
            '',
            '\u2705 If you see this, your channel is working!',
        ].join('\n');
        for (const channel of this.channels) {
            const success = await channel.sendMessage(testMessage);
            console.log(`[gateway] Test message to ${channel.type}: ${success ? '\u2705 sent' : '\u274C failed'}`);
        }
    }
    stop() {
        console.log('[gateway] Shutting down...');
        this.scheduler?.stop();
        console.log('[gateway] Stopped.');
    }
    async initChannels() {
        if (!this.config)
            return;
        this.channels = [];
        for (const channelConfig of this.config.channels) {
            if (!channelConfig.enabled)
                continue;
            const channel = await createChannel(channelConfig);
            if (channel) {
                const validationError = channel.validate();
                if (validationError) {
                    console.warn(`[gateway] Channel ${channelConfig.type} validation failed: ${validationError}`);
                    continue;
                }
                this.channels.push(channel);
                console.log(`[gateway] Channel enabled: ${channelConfig.type}`);
            }
        }
        if (this.channels.length === 0 && !this.channelWarned) {
            console.warn('[gateway] No channels configured. Research candidates would only be logged locally.');
            console.warn('[gateway] Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID, DISCORD_WEBHOOK_URL, or WEBHOOK_URL env vars to enable delivery.');
            this.channelWarned = true;
        }
    }
    async performScan() {
        if (!this.config)
            return [];
        this.latestSignals = [];
        console.warn(`\n[scan] Unavailable: ${SIGNAL_SCAN_AVAILABILITY.reason}. No candidates were generated, delivered, or recorded.`);
        return [];
    }
    async deliverSignals(signals) {
        const observedSignals = signals.filter(isProviderObservedSignal);
        if (observedSignals.length === 0)
            return;
        for (const channel of this.channels) {
            let sent = 0;
            let failed = 0;
            for (const signal of observedSignals) {
                const success = await channel.sendSignal(signal);
                if (success) {
                    sent++;
                }
                else {
                    failed++;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            console.log(`[delivery] ${channel.type}: ${sent} sent, ${failed} failed`);
        }
    }
    setupShutdownHandlers() {
        const shutdown = () => {
            this.stop();
            process.exit(0);
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
}
//# sourceMappingURL=gateway.js.map