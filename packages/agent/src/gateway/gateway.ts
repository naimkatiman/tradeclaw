import { loadConfig } from './config.js';
import { Scheduler } from './scheduler.js';
import { runScanAsync } from '../signals/engine.js';
import { fetchLivePrices } from '../signals/prices.js';
import { createChannel, type BaseChannel } from '../channels/base.js';
import { SkillLoader } from '../skills/loader.js';
import { join } from 'node:path';
import type { GatewayConfig, TradingSignal } from '@tradeclaw/signals';

/**
 * Core gateway daemon.
 * Orchestrates scanning, signal generation, and channel delivery.
 */
export class Gateway {
  private config: GatewayConfig | null = null;
  private scheduler: Scheduler | null = null;
  private channels: BaseChannel[] = [];
  private skillLoader: SkillLoader;
  private latestSignals: TradingSignal[] = [];
  private startTime: Date | null = null;

  constructor() {
    const skillsDir = join(process.cwd(), 'skills');
    this.skillLoader = new SkillLoader(skillsDir);
  }

  async start(configPath?: string): Promise<void> {
    console.log('');
    console.log('  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
    console.log('  \u2551       tradeclaw-agent v0.2.0          \u2551');
    console.log('  \u2551   Self-hosted trading signal agent    \u2551');
    console.log('  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D');
    console.log('');

    this.config = await loadConfig(configPath);
    console.log(`[gateway] Loaded config: ${this.config.symbols.length} symbols, ${this.config.timeframes.length} timeframes`);
    console.log(`[gateway] Min confidence: ${this.config.minConfidence}%`);
    console.log(`[gateway] Scan interval: ${this.config.scanInterval}s`);

    try {
      const prices = await fetchLivePrices();
      console.log(`[gateway] Live prices loaded: ${prices.size} symbols`);
    } catch {
      console.warn('[gateway] Live prices unavailable \u2014 using fallback prices');
    }

    await this.initChannels();
    await this.initSkills();
    this.setupShutdownHandlers();

    this.startTime = new Date();
    this.scheduler = new Scheduler(this.config.scanInterval, async () => { await this.performScan(); });
    await this.scheduler.start();

    console.log('[gateway] Daemon is running. Press Ctrl+C to stop.');
  }

  async scanOnce(configPath?: string): Promise<TradingSignal[]> {
    this.config = await loadConfig(configPath);
    await this.initChannels();
    await this.initSkills();

    const signals = await this.performScan();
    return signals;
  }

  getLatestSignals(): TradingSignal[] {
    return this.latestSignals;
  }

  getStatus(): {
    running: boolean;
    uptime: number;
    scanCount: number;
    config: GatewayConfig | null;
    channelCount: number;
    skillCount: number;
  } {
    return {
      running: this.scheduler?.isRunning() ?? false,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      scanCount: this.scheduler?.getScanCount() ?? 0,
      config: this.config,
      channelCount: this.channels.length,
      skillCount: this.skillLoader.getLoadedSkills().length,
    };
  }

  async testChannels(): Promise<void> {
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
      `Min confidence: ${this.config.minConfidence}%`,
      '',
      '\u2705 If you see this, your channel is working!',
    ].join('\n');

    for (const channel of this.channels) {
      const success = await channel.sendMessage(testMessage);
      console.log(`[gateway] Test message to ${channel.type}: ${success ? '\u2705 sent' : '\u274C failed'}`);
    }
  }

  stop(): void {
    console.log('[gateway] Shutting down...');
    this.scheduler?.stop();
    console.log('[gateway] Stopped.');
  }

  private async initChannels(): Promise<void> {
    if (!this.config) return;

    this.channels = [];
    for (const channelConfig of this.config.channels) {
      if (!channelConfig.enabled) continue;

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

    if (this.channels.length === 0) {
      console.warn('[gateway] No channels configured. Signals will only be logged to console.');
    }
  }

  private async initSkills(): Promise<void> {
    if (!this.config) return;

    const skills = await this.skillLoader.loadSkills(this.config.skills);
    console.log(`[gateway] Loaded ${skills.length} skills: ${skills.map(s => s.name).join(', ') || 'none'}`);
  }

  private async performScan(): Promise<TradingSignal[]> {
    if (!this.config) return [];

    const timestamp = new Date().toISOString();
    console.log(`\n[scan] Starting scan at ${timestamp}`);

    const signals = await runScanAsync(
      this.config.symbols,
      this.config.timeframes,
      this.config.minConfidence
    );

    const loadedSkills = this.skillLoader.getLoadedSkills();
    for (const skill of loadedSkills) {
      for (const symbol of this.config.symbols) {
        try {
          const skillSignals = skill.analyze(symbol, this.config.timeframes);
          for (const sig of skillSignals) {
            if (sig.confidence >= this.config.minConfidence) {
              signals.push(sig);
            }
          }
        } catch (error) {
          console.error(`[scan] Skill "${skill.name}" failed for ${symbol}:`, error);
        }
      }
    }

    const bestSignals = new Map<string, TradingSignal>();
    for (const signal of signals) {
      const key = `${signal.symbol}-${signal.timeframe}`;
      const existing = bestSignals.get(key);
      if (!existing || signal.confidence > existing.confidence) {
        bestSignals.set(key, signal);
      }
    }

    this.latestSignals = Array.from(bestSignals.values()).sort(
      (a, b) => b.confidence - a.confidence
    );

    console.log(`[scan] Generated ${this.latestSignals.length} signals (filtered from ${signals.length})`);

    for (const signal of this.latestSignals) {
      const dir = signal.direction === 'BUY' ? '\u{1F7E2} BUY ' : '\u{1F534} SELL';
      console.log(`  ${dir} ${signal.symbol} [${signal.confidence}%] entry=${signal.entry} tf=${signal.timeframe}`);
    }

    if (this.latestSignals.length > 0) {
      await this.deliverSignals(this.latestSignals);
    }

    return this.latestSignals;
  }

  private async deliverSignals(signals: TradingSignal[]): Promise<void> {
    for (const channel of this.channels) {
      let sent = 0;
      let failed = 0;

      for (const signal of signals) {
        const success = await channel.sendSignal(signal);
        if (success) {
          sent++;
        } else {
          failed++;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`[delivery] ${channel.type}: ${sent} sent, ${failed} failed`);
    }
  }

  private setupShutdownHandlers(): void {
    const shutdown = () => {
      this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}
