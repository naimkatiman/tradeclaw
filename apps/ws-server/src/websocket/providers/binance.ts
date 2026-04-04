import WebSocket from 'ws';
import type { MarketDataProvider, TickCallback } from '../provider.js';
import {
  toBinanceSymbol,
  normalizeBinanceMiniTicker,
  type BinanceMiniTicker,
} from '../normalizer.js';

const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/stream';
const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 10_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const RECONNECT_BEFORE_MS = 23 * 60 * 60 * 1000; // Reconnect before 24h limit

export class BinanceProvider implements MarketDataProvider {
  readonly name = 'binance';
  private ws: WebSocket | null = null;
  private onTick: TickCallback | null = null;
  private symbols: Set<string> = new Set();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private connected = false;
  private intentionalClose = false;
  private connectTime = 0;

  async connect(symbols: string[], onTick: TickCallback): Promise<void> {
    this.onTick = onTick;
    for (const s of symbols) this.symbols.add(s.toUpperCase());
    await this.openConnection();
  }

  async disconnect(): Promise<void> {
    this.intentionalClose = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close(1000, 'shutdown');
      this.ws = null;
    }
    this.connected = false;
  }

  subscribe(symbols: string[]): void {
    const streams: string[] = [];
    for (const s of symbols) {
      const upper = s.toUpperCase();
      if (this.symbols.has(upper)) continue;
      this.symbols.add(upper);
      const bn = toBinanceSymbol(upper);
      if (bn) streams.push(`${bn}@miniTicker`);
    }
    if (streams.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ method: 'SUBSCRIBE', params: streams, id: Date.now() }));
    }
  }

  unsubscribe(symbols: string[]): void {
    const streams: string[] = [];
    for (const s of symbols) {
      const upper = s.toUpperCase();
      if (!this.symbols.has(upper)) continue;
      this.symbols.delete(upper);
      const bn = toBinanceSymbol(upper);
      if (bn) streams.push(`${bn}@miniTicker`);
    }
    if (streams.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ method: 'UNSUBSCRIBE', params: streams, id: Date.now() }));
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async openConnection(): Promise<void> {
    // Build combined stream URL
    const streams = Array.from(this.symbols)
      .map(s => toBinanceSymbol(s))
      .filter(Boolean)
      .map(bn => `${bn}@miniTicker`);

    if (streams.length === 0) return;

    const url = `${BINANCE_WS_BASE}?streams=${streams.join('/')}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      let resolved = false;

      this.ws.on('open', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.connectTime = Date.now();
        this.startPingPong();
        this.scheduleRefresh();
        if (!resolved) { resolved = true; resolve(); }
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('pong', () => {
        if (this.pongTimer) { clearTimeout(this.pongTimer); this.pongTimer = null; }
      });

      this.ws.on('close', (code, reason) => {
        this.connected = false;
        this.clearTimers();
        if (!this.intentionalClose) {
          this.scheduleReconnect();
        }
        if (!resolved) { resolved = true; resolve(); }
      });

      this.ws.on('error', (err) => {
        if (!resolved) { resolved = true; reject(err); }
      });
    });
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const parsed = JSON.parse(data.toString());
      // Combined stream format: { stream: "btcusdt@miniTicker", data: {...} }
      const payload = parsed.data || parsed;
      if (payload.e === '24hrMiniTicker') {
        const tick = normalizeBinanceMiniTicker(payload as BinanceMiniTicker);
        if (tick && this.onTick) {
          this.onTick(tick);
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }

  private startPingPong(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
        this.pongTimer = setTimeout(() => {
          // Pong not received — force reconnect
          this.ws?.terminate();
        }, PONG_TIMEOUT_MS);
      }
    }, PING_INTERVAL_MS);
  }

  private scheduleRefresh(): void {
    // Reconnect before Binance's 24h limit
    this.refreshTimer = setTimeout(async () => {
      if (this.connected && !this.intentionalClose) {
        this.ws?.close(1000, 'refresh');
      }
    }, RECONNECT_BEFORE_MS);
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      (2 ** this.reconnectAttempts) * 1000 + Math.random() * 1000,
      MAX_RECONNECT_DELAY_MS
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.openConnection();
      } catch {
        this.scheduleReconnect();
      }
    }, delay);
  }

  private clearTimers(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    if (this.pongTimer) { clearTimeout(this.pongTimer); this.pongTimer = null; }
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.refreshTimer) { clearTimeout(this.refreshTimer); this.refreshTimer = null; }
  }
}
