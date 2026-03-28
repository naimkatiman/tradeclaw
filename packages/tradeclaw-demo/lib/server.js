'use strict';

const http = require('http');
const net = require('net');
const pc = require('picocolors');
const { getDemoPage } = require('./demo-page');

const PAIRS = [
  { symbol: 'BTC/USD', price: 67450, vol: 0.02 },
  { symbol: 'ETH/USD', price: 3280, vol: 0.025 },
  { symbol: 'XAU/USD', price: 2318, vol: 0.005 },
  { symbol: 'EUR/USD', price: 1.0812, vol: 0.001 },
  { symbol: 'GBP/USD', price: 1.2654, vol: 0.0012 },
  { symbol: 'USD/JPY', price: 151.24, vol: 0.0015 },
  { symbol: 'XAG/USD', price: 27.14, vol: 0.008 },
  { symbol: 'BNB/USD', price: 412.5, vol: 0.03 },
];

const TIMEFRAMES = ['H1', 'H4', 'D1'];

// Mutable price state for live simulation
const liveState = PAIRS.map((p) => ({ ...p, currentPrice: p.price }));

let seed = 42;
function pseudoRand() {
  seed = (seed * 1664525 + 1013904223) & 0xffffffff;
  return (seed >>> 0) / 0xffffffff;
}

function generateSignalsFromState() {
  // Evolve prices
  liveState.forEach((s) => {
    const drift = (pseudoRand() - 0.5) * s.vol;
    s.currentPrice = s.currentPrice * (1 + drift);
  });

  return liveState.map((pair) => {
    const dir = pseudoRand() > 0.45 ? 'BUY' : 'SELL';
    const tf = TIMEFRAMES[Math.floor(pseudoRand() * TIMEFRAMES.length)];
    const conf = Math.floor(65 + pseudoRand() * 30);
    const price = pair.currentPrice;
    const atr = price * pair.vol * 2;
    const tp = dir === 'BUY' ? price + atr * 1.5 : price - atr * 1.5;
    const sl = dir === 'BUY' ? price - atr : price + atr;
    const rsi = dir === 'BUY' ? 30 + pseudoRand() * 30 : 55 + pseudoRand() * 25;
    const macd = dir === 'BUY' ? pseudoRand() * 0.005 : -pseudoRand() * 0.005;

    const fmt = (n) => {
      if (Math.abs(n) < 0.01) return n.toFixed(5);
      if (Math.abs(n) > 1000) return n.toFixed(0);
      return n.toFixed(2);
    };

    return {
      symbol: pair.symbol,
      direction: dir,
      timeframe: tf,
      confidence: conf,
      entry: fmt(price),
      tp: fmt(tp),
      sl: fmt(sl),
      rsi: rsi.toFixed(1),
      macd: macd.toFixed(6),
      timestamp: new Date().toISOString(),
    };
  });
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(port, '127.0.0.1');
  });
}

async function findPort(preferred, candidates = [3000, 3001, 3002, 3100]) {
  if (preferred) {
    if (await isPortFree(preferred)) return preferred;
    console.error(pc.red(`  ✗ Port ${preferred} is in use. Trying auto-detect...`));
  }
  for (const p of candidates) {
    if (await isPortFree(p)) return p;
  }
  return 3333;
}

// Track SSE clients for live feed
const sseClients = new Set();

// Push signal update to all SSE clients
function broadcastSignals(signals) {
  if (sseClients.size === 0) return;
  const data = `data: ${JSON.stringify({ signals, count: signals.length, timestamp: new Date().toISOString() })}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch { sseClients.delete(res); }
  }
}

async function startServer(opts = {}) {
  const { port: preferredPort, noOpen } = opts;
  const port = await findPort(preferredPort);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    // REST signals endpoint
    if (url.pathname === '/api/signals') {
      seed = Date.now() & 0xffffffff;
      const signals = generateSignalsFromState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ signals, count: signals.length, source: 'tradeclaw-demo', timestamp: new Date().toISOString() }));
    }

    // SSE live feed endpoint
    if (url.pathname === '/api/signals/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write('retry: 3000\n\n');
      res.write(`data: ${JSON.stringify({ type: 'connected', message: 'TradeClaw live signal stream', timestamp: new Date().toISOString() })}\n\n`);
      sseClients.add(res);

      req.on('close', () => sseClients.delete(res));
      return;
    }

    // Health check
    if (url.pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', version: '0.2.0', clients: sseClients.size, uptime: Math.floor(process.uptime()) }));
    }

    // Serve demo page for all other routes
    const html = getDemoPage(port);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  // Emit live signals every 5 seconds to SSE clients
  const liveInterval = setInterval(() => {
    seed = Date.now() & 0xffffffff;
    const signals = generateSignalsFromState();
    broadcastSignals(signals);

    // Print new signal to terminal
    const s = signals[Math.floor(Math.random() * signals.length)];
    const color = s.direction === 'BUY' ? pc.green : pc.red;
    const arrow = s.direction === 'BUY' ? '▲' : '▼';
    process.stdout.write(
      `  ${color(arrow + ' ' + s.symbol.padEnd(10))} ${pc.bold(color(s.direction.padEnd(5)))} ${pc.dim(s.timeframe.padEnd(4))} ${pc.yellow(s.confidence + '%')} ${pc.dim('entry: ' + s.entry)}\n`
    );
  }, 5000);

  server.listen(port, '127.0.0.1', async () => {
    const url = `http://localhost:${port}`;
    console.log(pc.green('  ✓ Server started') + pc.dim(` → ${url}`));
    console.log('');
    console.log(pc.bold('  📊 Live Dashboard: ') + pc.cyan(url));
    console.log(pc.bold('  🔌 REST API:       ') + pc.cyan(`${url}/api/signals`));
    console.log(pc.bold('  📡 Live Stream:    ') + pc.cyan(`${url}/api/signals/stream`) + pc.dim(' (SSE)'));
    console.log(pc.bold('  💚 Health:         ') + pc.cyan(`${url}/api/health`));
    console.log('');
    console.log(pc.bold('  🐙 GitHub:         ') + pc.cyan('https://github.com/naimkatiman/tradeclaw'));
    console.log(pc.bold('  🌐 Full platform:  ') + pc.cyan('https://tradeclaw.win'));
    console.log('');
    console.log(pc.dim('  Signals updating every 5s below. Press Ctrl+C to stop.'));
    console.log(pc.dim('  ─────────────────────────────────────────────────────'));
    console.log('');

    if (!noOpen) {
      try {
        const { default: open } = await import('open');
        await open(url);
        console.log(pc.dim('  ✓ Browser opened automatically'));
      } catch {
        console.log(pc.dim('  ℹ  Open manually: ' + url));
      }
    }
  });

  process.on('SIGINT', () => {
    console.log('');
    console.log(pc.yellow('  👋 Shutting down TradeClaw demo...'));
    console.log(pc.green('  ⭐ Liked it? Star us: https://github.com/naimkatiman/tradeclaw'));
    console.log('');
    clearInterval(liveInterval);
    server.close();
    process.exit(0);
  });
}

module.exports = { startServer };
