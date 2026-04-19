#!/usr/bin/env node
// @ts-check
/**
 * Reference premium signal server for TradeClaw.
 *
 * Serves a `{ signals: TradingSignal[] }` JSON payload to any caller
 * presenting a valid Bearer token. No dependencies — uses node:http
 * directly so this file can be dropped into any Node 18+ environment.
 *
 * Replace `generateMockSignals()` with your real signal source.
 *
 * Env:
 *   PREMIUM_SIGNAL_SOURCE_KEY — shared secret, required.
 *   PORT                      — defaults to 8787.
 */

'use strict';

const http = require('node:http');

const PORT = Number(process.env.PORT ?? 8787);
const KEY = process.env.PREMIUM_SIGNAL_SOURCE_KEY;

if (!KEY) {
  console.error('PREMIUM_SIGNAL_SOURCE_KEY is required. Set it before starting.');
  process.exit(1);
}

const PREMIUM_SYMBOLS = [
  { symbol: 'EURUSD', timeframe: 'H1' },
  { symbol: 'GBPUSD', timeframe: 'H1' },
  { symbol: 'USDJPY', timeframe: 'H4' },
];

/**
 * Replace this with your real edge. The only contract is the return shape:
 * an array of objects matching the TradingSignal TS type documented in the
 * README. Every other field (internals, caching, batching, etc.) is yours.
 */
function generateMockSignals() {
  const now = Date.now();
  return PREMIUM_SYMBOLS.map((s, i) => {
    const isBuy = i % 2 === 0;
    const entry = s.symbol === 'USDJPY' ? 150.25 : 1.085 + i * 0.01;
    const atr = entry * 0.005;
    return {
      id: `premium-${s.symbol}-${now}-${i}`,
      strategyId: 'tv-zaky-classic',
      symbol: s.symbol,
      timeframe: s.timeframe,
      direction: isBuy ? 'BUY' : 'SELL',
      confidence: 82 + i * 2,
      entry,
      stopLoss: isBuy ? entry - atr * 1.5 : entry + atr * 1.5,
      takeProfit1: isBuy ? entry + atr * 1.5 : entry - atr * 1.5,
      takeProfit2: isBuy ? entry + atr * 2.5 : entry - atr * 2.5,
      takeProfit3: isBuy ? entry + atr * 3.5 : entry - atr * 3.5,
      timestamp: now - (i + 1) * 60_000,
      source: 'real',
      dataQuality: 'real',
    };
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'method not allowed' }));
    return;
  }

  const auth = req.headers['authorization'] ?? '';
  if (auth !== `Bearer ${KEY}`) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  try {
    const signals = generateMockSignals();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify({ signals }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'generator failed' }));
    console.error('[premium-signal-server]', err);
  }
});

server.listen(PORT, () => {
  console.log(`Premium signal server listening on :${PORT}`);
});
