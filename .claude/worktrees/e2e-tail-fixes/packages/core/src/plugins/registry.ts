import * as fs from 'fs';
import * as path from 'path';
import type { IndicatorPlugin, IndicatorResult, OHLCV } from './types';

/**
 * Aggregated output from running all registered plugins against candle data.
 */
export interface AggregatedResult {
  /** Per-plugin results keyed by plugin name. */
  results: Record<string, IndicatorResult>;
  /** Overall consensus signal derived from plugin majority vote. */
  consensus: 'BUY' | 'SELL' | 'HOLD';
  /** Average confidence across all plugins (0-100). */
  averageConfidence: number;
}

/**
 * Central registry for indicator plugins.
 *
 * Register plugins manually or load them from a directory at runtime.
 */
export class PluginRegistry {
  private plugins: Map<string, IndicatorPlugin> = new Map();

  /** Register a single plugin. Throws if a plugin with the same name already exists. */
  register(plugin: IndicatorPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered.`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  /** Unregister a plugin by name. Returns true if it was removed. */
  unregister(name: string): boolean {
    return this.plugins.delete(name);
  }

  /** Get a registered plugin by name. */
  get(name: string): IndicatorPlugin | undefined {
    return this.plugins.get(name);
  }

  /** List all registered plugin names. */
  list(): string[] {
    return Array.from(this.plugins.keys());
  }

  /** Number of registered plugins. */
  get size(): number {
    return this.plugins.size;
  }

  /**
   * Load all `.ts` and `.js` plugin files from a directory.
   *
   * Each file must default-export (or named-export `plugin`) an object
   * satisfying the {@link IndicatorPlugin} interface.
   */
  async loadFromDirectory(directory: string): Promise<void> {
    if (!fs.existsSync(directory)) {
      throw new Error(`Plugin directory does not exist: ${directory}`);
    }

    const files = fs.readdirSync(directory).filter(
      (f) => f.endsWith('.ts') || f.endsWith('.js'),
    );

    for (const file of files) {
      const fullPath = path.resolve(directory, file);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = await import(fullPath);
      const plugin: IndicatorPlugin | undefined = mod.default ?? mod.plugin;

      if (plugin && plugin.name && typeof plugin.compute === 'function') {
        this.register(plugin);
      }
    }
  }

  /**
   * Run every registered plugin against the provided candle data and
   * return individual results plus an aggregated consensus.
   */
  runAll(candles: OHLCV[]): AggregatedResult {
    const results: Record<string, IndicatorResult> = {};
    const votes: Record<'BUY' | 'SELL' | 'HOLD', number> = {
      BUY: 0,
      SELL: 0,
      HOLD: 0,
    };
    let totalConfidence = 0;

    for (const [name, plugin] of this.plugins) {
      const result = plugin.compute(candles);
      results[name] = result;
      votes[result.signal]++;
      totalConfidence += result.confidence;
    }

    const pluginCount = this.plugins.size;
    const averageConfidence = pluginCount > 0
      ? Math.round(totalConfidence / pluginCount)
      : 0;

    // Determine consensus via majority vote; ties fall back to HOLD
    let consensus: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (votes.BUY > votes.SELL && votes.BUY > votes.HOLD) {
      consensus = 'BUY';
    } else if (votes.SELL > votes.BUY && votes.SELL > votes.HOLD) {
      consensus = 'SELL';
    }

    return { results, consensus, averageConfidence };
  }
}

/** Default singleton registry instance. */
export const pluginRegistry = new PluginRegistry();
