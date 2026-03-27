// SSE endpoint for real-time price ticks + signal events
// GET /api/prices/stream?pairs=BTCUSD,ETHUSD

import { NextRequest } from 'next/server';

/* ── asset base prices & volatility ── */
const ASSETS: Record<string, { base: number; vol: number; decimals: number }> = {
  BTCUSD:  { base: 87_500,  vol: 0.0008,  decimals: 2 },
  ETHUSD:  { base: 2_050,   vol: 0.001,   decimals: 2 },
  XAUUSD:  { base: 3_025,   vol: 0.0003,  decimals: 2 },
  XAGUSD:  { base: 33.8,    vol: 0.0005,  decimals: 4 },
  EURUSD:  { base: 1.0835,  vol: 0.0001,  decimals: 5 },
  GBPUSD:  { base: 1.2920,  vol: 0.0001,  decimals: 5 },
  USDJPY:  { base: 150.25,  vol: 0.0002,  decimals: 3 },
  AUDUSD:  { base: 0.6280,  vol: 0.00015, decimals: 5 },
  BNBUSD:  { base: 620,     vol: 0.001,   decimals: 2 },
  SOLUSD:  { base: 138,     vol: 0.0015,  decimals: 2 },
};

/* ── price state (random-walk) ── */
const state: Record<string, { price: number; open24h: number; high24h: number; low24h: number }> = {};

function initState() {
  for (const [sym, cfg] of Object.entries(ASSETS)) {
    if (state[sym]) continue;
    const jitter = cfg.base * (Math.random() * 0.002 - 0.001);
    const p = cfg.base + jitter;
    state[sym] = { price: p, open24h: p, high24h: p * 1.005, low24h: p * 0.995 };
  }
}

function tick(sym: string): { pair: string; price: number; change24h: number; high24h: number; low24h: number; timestamp: number } {
  const cfg = ASSETS[sym];
  if (!cfg) throw new Error(`Unknown symbol: ${sym}`);
  const s = state[sym];
  const move = s.price * cfg.vol * (Math.random() * 2 - 1);
  s.price = Math.max(s.price + move, cfg.base * 0.8);
  if (s.price > s.high24h) s.high24h = s.price;
  if (s.price < s.low24h) s.low24h = s.price;
  return {
    pair: sym,
    price: +s.price.toFixed(cfg.decimals),
    change24h: +((s.price - s.open24h) / s.open24h * 100).toFixed(2),
    high24h: +s.high24h.toFixed(cfg.decimals),
    low24h: +s.low24h.toFixed(cfg.decimals),
    timestamp: Date.now(),
  };
}

/* ── signal generation (lightweight) ── */
const DIRECTIONS = ['BUY', 'SELL'] as const;
const REASONS = [
  'RSI oversold + MACD crossover',
  'EMA 20/50 golden cross',
  'Bollinger squeeze breakout',
  'Stochastic divergence',
  'MACD histogram reversal',
  'RSI overbought + bearish engulfing',
  'EMA death cross confirmation',
  'Support bounce + volume spike',
  'Resistance rejection + RSI divergence',
  'Triple EMA alignment',
];

let signalCounter = 0;

function maybeSignal(symbols: string[]): null | {
  id: string; pair: string; direction: 'BUY' | 'SELL';
  confidence: number; entry: number; timestamp: number; reason: string;
} {
  // ~3% chance per tick cycle = roughly one signal every 30-90s at 2s interval
  if (Math.random() > 0.03) return null;
  const sym = symbols[Math.floor(Math.random() * symbols.length)];
  const cfg = ASSETS[sym];
  if (!cfg) return null;
  const dir = DIRECTIONS[Math.floor(Math.random() * 2)];
  signalCounter++;
  return {
    id: `SIG-${Date.now()}-${signalCounter}`,
    pair: sym,
    direction: dir,
    confidence: +(60 + Math.random() * 35).toFixed(1),
    entry: +state[sym].price.toFixed(cfg.decimals),
    timestamp: Date.now(),
    reason: REASONS[Math.floor(Math.random() * REASONS.length)],
  };
}

/* ── SSE helpers ── */
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/* ── GET handler ── */
export async function GET(req: NextRequest) {
  initState();

  const pairsParam = req.nextUrl.searchParams.get('pairs');
  const symbols = pairsParam
    ? pairsParam.split(',').filter(s => ASSETS[s])
    : Object.keys(ASSETS);

  if (symbols.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid symbols' }), { status: 400 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Send connected event
      controller.enqueue(encoder.encode(sseEvent('connected', { pairs: symbols, ts: Date.now() })));

      // Price tick interval (every 2s)
      const priceInterval = setInterval(() => {
        if (closed) return;
        try {
          for (const sym of symbols) {
            const data = tick(sym);
            controller.enqueue(encoder.encode(sseEvent('price', data)));
          }
          // Maybe emit a signal
          const sig = maybeSignal(symbols);
          if (sig) {
            controller.enqueue(encoder.encode(sseEvent('signal', sig)));
          }
        } catch {
          // stream may be closed
        }
      }, 2000);

      // Heartbeat (every 15s)
      const heartbeatInterval = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sseEvent('heartbeat', { ts: Date.now() })));
        } catch {
          // ignore
        }
      }, 15000);

      // Cleanup on cancel
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(priceInterval);
        clearInterval(heartbeatInterval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx compat
    },
  });
}
