import WebSocket from 'ws';
import { toBinanceSymbol, normalizeBinanceMiniTicker, } from '../normalizer.js';
const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/stream';
const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 10_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const RECONNECT_BEFORE_MS = 23 * 60 * 60 * 1000; // Reconnect before 24h limit
export class BinanceProvider {
    name = 'binance';
    ws = null;
    onTick = null;
    symbols = new Set();
    pingTimer = null;
    pongTimer = null;
    reconnectTimer = null;
    refreshTimer = null;
    reconnectAttempts = 0;
    connected = false;
    intentionalClose = false;
    connectTime = 0;
    async connect(symbols, onTick) {
        this.onTick = onTick;
        for (const s of symbols)
            this.symbols.add(s.toUpperCase());
        await this.openConnection();
    }
    async disconnect() {
        this.intentionalClose = true;
        this.clearTimers();
        if (this.ws) {
            this.ws.close(1000, 'shutdown');
            this.ws = null;
        }
        this.connected = false;
    }
    subscribe(symbols) {
        const streams = [];
        for (const s of symbols) {
            const upper = s.toUpperCase();
            if (this.symbols.has(upper))
                continue;
            this.symbols.add(upper);
            const bn = toBinanceSymbol(upper);
            if (bn)
                streams.push(`${bn}@miniTicker`);
        }
        if (streams.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ method: 'SUBSCRIBE', params: streams, id: Date.now() }));
        }
    }
    unsubscribe(symbols) {
        const streams = [];
        for (const s of symbols) {
            const upper = s.toUpperCase();
            if (!this.symbols.has(upper))
                continue;
            this.symbols.delete(upper);
            const bn = toBinanceSymbol(upper);
            if (bn)
                streams.push(`${bn}@miniTicker`);
        }
        if (streams.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ method: 'UNSUBSCRIBE', params: streams, id: Date.now() }));
        }
    }
    isConnected() {
        return this.connected;
    }
    async openConnection() {
        // Build combined stream URL
        const streams = Array.from(this.symbols)
            .map(s => toBinanceSymbol(s))
            .filter(Boolean)
            .map(bn => `${bn}@miniTicker`);
        if (streams.length === 0)
            return;
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
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            });
            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });
            this.ws.on('pong', () => {
                if (this.pongTimer) {
                    clearTimeout(this.pongTimer);
                    this.pongTimer = null;
                }
            });
            this.ws.on('close', (code, reason) => {
                this.connected = false;
                this.clearTimers();
                if (!this.intentionalClose) {
                    this.scheduleReconnect();
                }
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            });
            this.ws.on('error', (err) => {
                if (!resolved) {
                    resolved = true;
                    reject(err);
                }
            });
        });
    }
    handleMessage(data) {
        try {
            const parsed = JSON.parse(data.toString());
            // Combined stream format: { stream: "btcusdt@miniTicker", data: {...} }
            const payload = parsed.data || parsed;
            if (payload.e === '24hrMiniTicker') {
                const tick = normalizeBinanceMiniTicker(payload);
                if (tick && this.onTick) {
                    this.onTick(tick);
                }
            }
        }
        catch {
            // Ignore malformed messages
        }
    }
    startPingPong() {
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
    scheduleRefresh() {
        // Reconnect before Binance's 24h limit
        this.refreshTimer = setTimeout(async () => {
            if (this.connected && !this.intentionalClose) {
                this.ws?.close(1000, 'refresh');
            }
        }, RECONNECT_BEFORE_MS);
    }
    scheduleReconnect() {
        const delay = Math.min((2 ** this.reconnectAttempts) * 1000 + Math.random() * 1000, MAX_RECONNECT_DELAY_MS);
        this.reconnectAttempts++;
        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.openConnection();
            }
            catch {
                this.scheduleReconnect();
            }
        }, delay);
    }
    clearTimers() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        if (this.pongTimer) {
            clearTimeout(this.pongTimer);
            this.pongTimer = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
}
//# sourceMappingURL=binance.js.map