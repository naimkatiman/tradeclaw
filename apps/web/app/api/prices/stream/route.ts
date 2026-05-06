// SSE endpoint for real-time price ticks + signal events
// GET /api/prices/stream?pairs=BTCUSD,ETHUSD
//
// Uses Binance WebSocket for sub-second crypto prices, Stooq for metals,
// and open.er-api.com for forex. Signals come from the real TA engine.

import { NextRequest } from 'next/server';
import { getLivePrices, SYMBOLS, getSignals, type TradingSignal } from '../../../lib/signals';
import { applyTierSignalVisibility, getTierFromRequest, type Tier } from '../../../../lib/tier';

/* ── Known symbols (used to validate ?pairs= query param) ── */
const KNOWN_SYMBOLS = new Set(SYMBOLS.map(s => s.symbol));

/* ── Price state: track last-known price and session high/low ── */
interface PriceState {
  price: number;
  open: number;
  high: number;
  low: number;
}

const priceState = new Map<string, PriceState>();

function updatePriceState(pair: string, newPrice: number): PriceState {
  const existing = priceState.get(pair);
  if (!existing) {
    const state: PriceState = { price: newPrice, open: newPrice, high: newPrice, low: newPrice };
    priceState.set(pair, state);
    return state;
  }
  existing.price = newPrice;
  if (newPrice > existing.high) existing.high = newPrice;
  if (newPrice < existing.low) existing.low = newPrice;
  return existing;
}

/* ── Fetch real prices (CoinGecko + Stooq + forex API) ── */
async function fetchRealPrices(): Promise<Map<string, { price: number; change24h: number }>> {
  const result = new Map<string, { price: number; change24h: number }>();

  // Fetch crypto with 24h change from CoinGecko
  const [cryptoResult, forexResult, xauResult, xagResult] = await Promise.allSettled([
    fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,solana,cardano,binancecoin&vs_currencies=usd&include_24hr_change=true',
      { signal: AbortSignal.timeout(8000), cache: 'no-store' },
    ).then(r => r.ok ? r.json() as Promise<Record<string, { usd: number; usd_24h_change?: number }>> : null),
    fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8000), cache: 'no-store' })
      .then(r => r.ok ? r.json() as Promise<{ rates: Record<string, number> }> : null),
    fetchStooq('xauusd'),
    fetchStooq('xagusd'),
  ]);

  // Crypto
  if (cryptoResult.status === 'fulfilled' && cryptoResult.value) {
    const data = cryptoResult.value;
    const cryptoMap: Record<string, string> = {
      bitcoin: 'BTCUSD',
      ethereum: 'ETHUSD',
      ripple: 'XRPUSD',
      solana: 'SOLUSD',
      cardano: 'ADAUSD',
      binancecoin: 'BNBUSD',
    };
    for (const [id, symbol] of Object.entries(cryptoMap)) {
      if (data[id]?.usd) {
        result.set(symbol, {
          price: data[id].usd,
          change24h: +(data[id].usd_24h_change?.toFixed(2) ?? 0),
        });
      }
    }
  }

  // Forex
  if (forexResult.status === 'fulfilled' && forexResult.value) {
    const r = forexResult.value.rates || {};
    if (r.EUR) result.set('EURUSD', { price: +(1 / r.EUR).toFixed(5), change24h: 0 });
    if (r.GBP) result.set('GBPUSD', { price: +(1 / r.GBP).toFixed(5), change24h: 0 });
    if (r.JPY) result.set('USDJPY', { price: +r.JPY.toFixed(3), change24h: 0 });
    if (r.AUD) result.set('AUDUSD', { price: +(1 / r.AUD).toFixed(5), change24h: 0 });
    if (r.CAD) result.set('USDCAD', { price: +r.CAD.toFixed(5), change24h: 0 });
    if (r.NZD) result.set('NZDUSD', { price: +(1 / r.NZD).toFixed(5), change24h: 0 });
    if (r.CHF) result.set('USDCHF', { price: +r.CHF.toFixed(5), change24h: 0 });
  }

  // Metals via Stooq
  if (xauResult.status === 'fulfilled' && xauResult.value !== null) {
    result.set('XAUUSD', { price: xauResult.value, change24h: 0 });
  }
  if (xagResult.status === 'fulfilled' && xagResult.value !== null) {
    result.set('XAGUSD', { price: xagResult.value, change24h: 0 });
  }

  return result;
}

async function fetchStooq(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`https://stooq.com/q/l/?s=${symbol}&f=c&h&e=csv`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;
    const val = parseFloat(lines[1].trim());
    return isNaN(val) || val <= 0 ? null : val;
  } catch {
    return null;
  }
}

/* ── Fetch real signals from the TA engine ── */
async function fetchVisibleSignals(tier: Tier): Promise<TradingSignal[]> {
  try {
    const { signals } = await getSignals({});
    return applyTierSignalVisibility(signals, tier).visible;
  } catch {
    return [];
  }
}

/** Build a reason string from a signal's indicator summary */
function buildReason(signal: TradingSignal): string {
  const parts: string[] = [];
  const ind = signal.indicators;
  if (ind.rsi.signal === 'oversold') parts.push('RSI oversold');
  else if (ind.rsi.signal === 'overbought') parts.push('RSI overbought');
  if (ind.macd.signal === 'bullish') parts.push('MACD bullish');
  else if (ind.macd.signal === 'bearish') parts.push('MACD bearish');
  if (ind.ema.trend === 'up') parts.push('EMA uptrend');
  else if (ind.ema.trend === 'down') parts.push('EMA downtrend');
  if (ind.stochastic.signal === 'oversold') parts.push('Stoch oversold');
  else if (ind.stochastic.signal === 'overbought') parts.push('Stoch overbought');
  if (ind.bollingerBands.position === 'lower') parts.push('BB lower band');
  else if (ind.bollingerBands.position === 'upper') parts.push('BB upper band');
  return parts.length > 0 ? parts.join(' + ') : `${signal.timeframe} TA signal`;
}

/* ── SSE helpers ── */
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function formatPrice(pair: string, price: number): number {
  if (price >= 1000) return +price.toFixed(2);
  if (price >= 10) return +price.toFixed(3);
  if (price >= 1) return +price.toFixed(4);
  return +price.toFixed(5);
}

/* ── Intervals ── */
const PRICE_POLL_MS = 15_000;   // forex/metals poll every 15s (crypto via WebSocket)
const SIGNAL_POLL_MS = 45_000;  // fetch signals every 45s
const HEARTBEAT_MS = 15_000;    // heartbeat every 15s

/* ── Binance REST for fast crypto prices (2s poll, no ws dependency) ── */
const BINANCE_SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: 'BTCUSD',
  ETHUSDT: 'ETHUSD',
  XRPUSDT: 'XRPUSD',
  SOLUSDT: 'SOLUSD',
  BNBUSDT: 'BNBUSD',
};
const BINANCE_CRYPTO_POLL_MS = 2_000;  // 2s — Binance allows 1200 req/min

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
}

async function fetchBinancePrices(): Promise<Map<string, { price: number; change24h: number }>> {
  const result = new Map<string, { price: number; change24h: number }>();
  try {
    const symbols = Object.keys(BINANCE_SYMBOL_MAP);
    const resp = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`,
      { signal: AbortSignal.timeout(3000), cache: 'no-store' },
    );
    if (!resp.ok) return result;
    const tickers: BinanceTicker[] = await resp.json();
    for (const t of tickers) {
      const pair = BINANCE_SYMBOL_MAP[t.symbol];
      if (!pair) continue;
      const price = parseFloat(t.lastPrice);
      const change24h = parseFloat(t.priceChangePercent);
      if (!isNaN(price) && price > 0) {
        result.set(pair, { price, change24h: +change24h.toFixed(2) });
      }
    }
  } catch { /* fail silently, next poll will retry */ }
  return result;
}

/* ── GET handler ── */
export async function GET(req: NextRequest) {
  const tier = await getTierFromRequest(req);
  const pairsParam = req.nextUrl.searchParams.get('pairs');
  const requestedPairs = pairsParam
    ? pairsParam.split(',').filter(s => KNOWN_SYMBOLS.has(s))
    : [...KNOWN_SYMBOLS];

  if (requestedPairs.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid symbols' }), { status: 400 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  // Track which signal IDs we have already emitted so we only send new ones
  const emittedSignalIds = new Set<string>();

  const stream = new ReadableStream({
    start(controller) {
      // Helper to safely enqueue
      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        } catch {
          // stream may be closed
        }
      }

      // Send connected event
      send('connected', { pairs: requestedPairs, ts: Date.now() });

      // ── Initial data push (immediate) ──
      void (async () => {
        try {
          const livePrices = await getLivePrices();
          if (closed) return;
          for (const pair of requestedPairs) {
            const price = livePrices.get(pair);
            if (price == null) continue;
            const state = updatePriceState(pair, price);
            send('price', {
              pair,
              price: formatPrice(pair, state.price),
              change24h: 0,
              high24h: formatPrice(pair, state.high),
              low24h: formatPrice(pair, state.low),
              timestamp: Date.now(),
              source: 'initial',
            });
          }
        } catch {
          // Initial fetch failed — next poll will catch up
        }
      })();

      // ── Binance fast poll for crypto prices (2s) ──
      const cryptoPairs = new Set(Object.values(BINANCE_SYMBOL_MAP));
      const cryptoInterval = setInterval(() => {
        if (closed) return;
        void (async () => {
          try {
            const prices = await fetchBinancePrices();
            if (closed) return;
            for (const pair of requestedPairs) {
              if (!cryptoPairs.has(pair)) continue;
              const data = prices.get(pair);
              if (!data) continue;
              const state = updatePriceState(pair, data.price);
              send('price', {
                pair,
                price: formatPrice(pair, state.price),
                change24h: data.change24h,
                high24h: formatPrice(pair, state.high),
                low24h: formatPrice(pair, state.low),
                timestamp: Date.now(),
                source: 'binance',
              });
            }
          } catch { /* next poll */ }
        })();
      }, BINANCE_CRYPTO_POLL_MS);

      // ── Poll interval for forex/metals only (crypto handled by Binance) ──
      const nonCryptoPairs = requestedPairs.filter(p => !cryptoPairs.has(p));

      const priceInterval = setInterval(() => {
        if (closed || nonCryptoPairs.length === 0) return;
        void (async () => {
          try {
            const prices = await fetchRealPrices();
            if (closed) return;
            for (const pair of nonCryptoPairs) {
              const data = prices.get(pair);
              if (!data) continue;
              const state = updatePriceState(pair, data.price);
              const change24h = data.change24h !== 0
                ? data.change24h
                : (state.open !== 0 ? +((state.price - state.open) / state.open * 100).toFixed(2) : 0);
              send('price', {
                pair,
                price: formatPrice(pair, state.price),
                change24h,
                high24h: formatPrice(pair, state.high),
                low24h: formatPrice(pair, state.low),
                timestamp: Date.now(),
                source: 'poll',
              });
            }
          } catch {
            // Silently skip failed poll; next interval will retry
          }
        })();
      }, PRICE_POLL_MS);

      // ── Signal poll interval ──
      const signalInterval = setInterval(() => {
        if (closed) return;
        void (async () => {
          try {
            const signals = await fetchVisibleSignals(tier);
            if (closed) return;
            for (const sig of signals) {
              if (emittedSignalIds.has(sig.id)) continue;
              // Only emit signals for pairs the client cares about
              if (!requestedPairs.includes(sig.symbol)) continue;
              emittedSignalIds.add(sig.id);
              send('signal', {
                id: sig.id,
                pair: sig.symbol,
                direction: sig.direction,
                confidence: sig.confidence,
                entry: sig.entry,
                timestamp: new Date(sig.timestamp).getTime(),
                reason: buildReason(sig),
              });
            }
            // Prevent unbounded growth: trim old IDs if set gets large
            if (emittedSignalIds.size > 500) {
              const arr = [...emittedSignalIds];
              for (let i = 0; i < arr.length - 200; i++) {
                emittedSignalIds.delete(arr[i]);
              }
            }
          } catch {
            // Silently skip failed signal fetch
          }
        })();
      }, SIGNAL_POLL_MS);

      // Also fetch signals once on connect (after a short delay to let prices settle)
      const initialSignalTimeout = setTimeout(() => {
        if (closed) return;
        void (async () => {
          try {
            const signals = await fetchVisibleSignals(tier);
            if (closed) return;
            for (const sig of signals) {
              if (emittedSignalIds.has(sig.id)) continue;
              if (!requestedPairs.includes(sig.symbol)) continue;
              emittedSignalIds.add(sig.id);
              send('signal', {
                id: sig.id,
                pair: sig.symbol,
                direction: sig.direction,
                confidence: sig.confidence,
                entry: sig.entry,
                timestamp: new Date(sig.timestamp).getTime(),
                reason: buildReason(sig),
              });
            }
          } catch {
            // ignore
          }
        })();
      }, 3_000);

      // ── Heartbeat ──
      const heartbeatInterval = setInterval(() => {
        send('heartbeat', { ts: Date.now() });
      }, HEARTBEAT_MS);

      // ── Cleanup on abort ──
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(cryptoInterval);
        clearInterval(priceInterval);
        clearInterval(signalInterval);
        clearInterval(heartbeatInterval);
        clearTimeout(initialSignalTimeout);
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
