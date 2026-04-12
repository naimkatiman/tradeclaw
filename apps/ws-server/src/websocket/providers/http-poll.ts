import type { MarketDataProvider, TickCallback } from '../provider.js';
import type { NormalizedTick } from '@tradeclaw/signals';

const DEFAULT_POLL_INTERVAL_MS = 5_000;

// Market Data Hub (hosted TradeClaw — optional)
const HUB_URL = process.env.MARKET_DATA_HUB_URL ?? '';

// Free API sources for forex/metals (fallback when hub unavailable)
const METALS_API = 'https://metals.live/api/v1/spot';
const EXCHANGE_RATE_API = 'https://open.er-api.com/v6/latest/USD';

export class HttpPollProvider implements MarketDataProvider {
  readonly name = 'http-poll';
  private symbols: Set<string> = new Set();
  private onTick: TickCallback | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private connected = false;
  private lastPrices: Map<string, number> = new Map();
  private pollIntervalMs: number;

  constructor(pollIntervalMs = DEFAULT_POLL_INTERVAL_MS) {
    this.pollIntervalMs = pollIntervalMs;
  }

  async connect(symbols: string[], onTick: TickCallback): Promise<void> {
    this.onTick = onTick;
    for (const s of symbols) this.symbols.add(s.toUpperCase());

    this.connected = true;

    // Initial fetch
    await this.poll();

    // Start polling
    this.pollTimer = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  async disconnect(): Promise<void> {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    this.connected = false;
  }

  subscribe(symbols: string[]): void {
    for (const s of symbols) this.symbols.add(s.toUpperCase());
  }

  unsubscribe(symbols: string[]): void {
    for (const s of symbols) this.symbols.delete(s.toUpperCase());
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async poll(): Promise<void> {
    // Try Market Data Hub first (single request for all symbols)
    if (HUB_URL) {
      try {
        const ok = await this.fetchFromHub();
        if (ok) return; // Hub served all symbols — skip individual APIs
      } catch {
        // Fall through to free APIs
      }
    }

    const promises: Promise<void>[] = [];

    const hasMetals = Array.from(this.symbols).some(s => s === 'XAUUSD' || s === 'XAGUSD');
    const hasForex = Array.from(this.symbols).some(s =>
      ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'].includes(s)
    );

    if (hasMetals) promises.push(this.fetchMetals());
    if (hasForex) promises.push(this.fetchForex());

    await Promise.allSettled(promises);
  }

  private async fetchFromHub(): Promise<boolean> {
    const res = await fetch(`${HUB_URL}/api/quotes`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;

    const quotes = await res.json() as Array<{
      symbol: string;
      price: number;
      timestamp: number;
    }>;
    if (!quotes?.length) return false;

    let matched = 0;
    for (const q of quotes) {
      const sym = q.symbol.replace('/', '');
      if (this.symbols.has(sym) && q.price > 0) {
        this.emitIfChanged(sym, q.price);
        matched++;
      }
    }
    return matched > 0;
  }

  private async fetchMetals(): Promise<void> {
    try {
      const res = await fetch(METALS_API);
      if (!res.ok) return;
      const data = await res.json() as Array<{ gold?: number; silver?: number }>;
      const spot = data[0];
      if (!spot) return;

      if (spot.gold && this.symbols.has('XAUUSD')) {
        this.emitIfChanged('XAUUSD', spot.gold);
      }
      if (spot.silver && this.symbols.has('XAGUSD')) {
        this.emitIfChanged('XAGUSD', spot.silver);
      }
    } catch {
      // Silently fail — next poll will retry
    }
  }

  private async fetchForex(): Promise<void> {
    try {
      const res = await fetch(EXCHANGE_RATE_API);
      if (!res.ok) return;
      const data = await res.json() as { rates: Record<string, number> };
      const rates = data.rates;
      if (!rates) return;

      const forexMap: Record<string, () => number | undefined> = {
        EURUSD: () => rates.EUR ? 1 / rates.EUR : undefined,
        GBPUSD: () => rates.GBP ? 1 / rates.GBP : undefined,
        USDJPY: () => rates.JPY,
        AUDUSD: () => rates.AUD ? 1 / rates.AUD : undefined,
        USDCAD: () => rates.CAD,
        NZDUSD: () => rates.NZD ? 1 / rates.NZD : undefined,
        USDCHF: () => rates.CHF,
      };

      for (const [symbol, getter] of Object.entries(forexMap)) {
        if (this.symbols.has(symbol)) {
          const price = getter();
          if (price && price > 0) {
            this.emitIfChanged(symbol, price);
          }
        }
      }
    } catch {
      // Silently fail
    }
  }

  private emitIfChanged(symbol: string, price: number): void {
    const last = this.lastPrices.get(symbol);
    if (last !== undefined && Math.abs(last - price) / price < 0.000001) return;

    this.lastPrices.set(symbol, price);

    const spread = price * 0.0003; // Wider spread for HTTP-polled data
    const tick: NormalizedTick = {
      symbol,
      bid: price - spread / 2,
      ask: price + spread / 2,
      mid: price,
      timestamp: Date.now(),
      provider: 'http-poll',
    };

    if (this.onTick) this.onTick(tick);
  }
}
