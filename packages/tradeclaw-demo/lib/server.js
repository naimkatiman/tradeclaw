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
const DIRECTIONS = ['BUY', 'SELL'];

let seed = 42;
function pseudoRand() {
  seed = (seed * 1664525 + 1013904223) & 0xffffffff;
  return (seed >>> 0) / 0xffffffff;
}

function generateSignals() {
  return PAIRS.map((pair) => {
    const dir = pseudoRand() > 0.45 ? 'BUY' : 'SELL';
    const tf = TIMEFRAMES[Math.floor(pseudoRand() * TIMEFRAMES.length)];
    const conf = Math.floor(65 + pseudoRand() * 30);
    const price = pair.price * (1 + (pseudoRand() - 0.5) * pair.vol);
    const atr = price * pair.vol * 2;
    const tp = dir === 'BUY' ? price + atr * 1.5 : price - atr * 1.5;
    const sl = dir === 'BUY' ? price - atr : price + atr;
    const rsi = dir === 'BUY' ? 30 + pseudoRand() * 30 : 55 + pseudoRand() * 25;
    const macd = dir === 'BUY' ? pseudoRand() * 0.005 : -pseudoRand() * 0.005;

    const fmt = (n, d = 2) => {
      if (Math.abs(n) < 0.01) return n.toFixed(5);
      if (Math.abs(n) > 1000) return n.toFixed(0);
      return n.toFixed(d);
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
      timestamp: new Date(Date.now() - Math.floor(pseudoRand() * 3600000)).toISOString(),
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

async function findPort(candidates = [3000, 3001, 3002, 3100]) {
  for (const p of candidates) {
    if (await isPortFree(p)) return p;
  }
  return 3333;
}

async function startServer() {
  const port = await findPort();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname === '/api/signals') {
      seed = Date.now() & 0xffffffff; // vary each call
      const signals = generateSignals();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(JSON.stringify({ signals, count: signals.length, source: 'tradeclaw-demo' }));
    }

    // Serve demo page for all other routes
    const html = getDemoPage(port);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  server.listen(port, '127.0.0.1', async () => {
    const url = `http://localhost:${port}`;
    console.log(pc.green('  ✓ Server started') + pc.dim(` → ${url}`));
    console.log('');
    console.log(pc.bold('  📊 Signals:      ') + pc.cyan(url));
    console.log(pc.bold('  🐙 GitHub:       ') + pc.cyan('https://github.com/naimkatiman/tradeclaw'));
    console.log(pc.bold('  🌐 Live demo:    ') + pc.cyan('https://tradeclaw.win'));
    console.log('');
    console.log(pc.dim('  Press Ctrl+C to stop'));
    console.log('');

    // Auto-open browser
    try {
      const { default: open } = await import('open');
      await open(url);
    } catch {
      // open is optional
    }
  });

  process.on('SIGINT', () => {
    console.log('');
    console.log(pc.yellow('  👋 Shutting down TradeClaw demo...'));
    console.log(pc.green('  ⭐ Liked it? Star us: https://github.com/naimkatiman/tradeclaw'));
    console.log('');
    server.close();
    process.exit(0);
  });
}

module.exports = { startServer };
