#!/usr/bin/env node

import { createServer } from 'node:http';
import { Gateway } from '../gateway/gateway.js';
import { SIGNAL_SCAN_AVAILABILITY } from '../signals/engine.js';
import { fetchLivePrices } from '../signals/prices.js';
import { getHistory } from '../signals/tracker.js';

const PORT = parseInt(process.env.PORT || '8080', 10);
const gateway = new Gateway();
let lastScanAttemptAt: string | null = null;
let isReady = false;

async function attemptScan(): Promise<void> {
  try {
    await gateway.scanOnce();
  } catch (error) {
    console.error('[server] Scan attempt failed:', error);
  } finally {
    lastScanAttemptAt = new Date().toISOString();
    isReady = true;
  }
}

async function boot(): Promise<void> {
  console.log('[server] Starting tradeclaw-agent server...');
  await attemptScan();
  console.warn(`[server] Signal scan unavailable: ${SIGNAL_SCAN_AVAILABILITY.reason}`);

  setInterval(async () => {
    await attemptScan();
  }, 5 * 60 * 1000);
}

function cors(res: import('node:http').ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function jsonResponse(
  res: import('node:http').ServerResponse,
  data: unknown,
  status = 200,
): void {
  cors(res);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function htmlResponse(res: import('node:http').ServerResponse, body: string): void {
  cors(res);
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function statusPage(): string {
  const attempt = lastScanAttemptAt
    ? new Date(lastScanAttemptAt).toLocaleString()
    : 'not attempted';
  const uptimeMinutes = Math.floor(process.uptime() / 60);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TradeClaw Agent Status</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #050505; color: #e4e4e7; font-family: system-ui, sans-serif; }
    main { width: min(720px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { color: #a1a1aa; line-height: 1.6; }
    .notice { margin: 24px 0; padding: 16px; border: 1px solid #854d0e; border-radius: 8px; background: #42200655; color: #fde047; }
    dl { display: grid; grid-template-columns: 1fr auto; gap: 12px 24px; padding: 16px 0; border-top: 1px solid #27272a; border-bottom: 1px solid #27272a; }
    dt { color: #a1a1aa; }
    dd { margin: 0; font-family: ui-monospace, monospace; }
    nav { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
    a { color: #34d399; }
    code { color: #f4f4f5; }
  </style>
</head>
<body>
  <main>
    <h1>TradeClaw Agent</h1>
    <p>Process status for the standalone self-hosted agent.</p>
    <div class="notice">
      Signal candidates are unavailable. No observed OHLCV provider is configured, so the agent does not synthesize candles, deliver candidates, or write signal history.
    </div>
    <dl>
      <dt>Availability</dt><dd>false</dd>
      <dt>Reason</dt><dd>${SIGNAL_SCAN_AVAILABILITY.reason}</dd>
      <dt>Last scan attempt</dt><dd>${attempt}</dd>
      <dt>Process uptime</dt><dd>${uptimeMinutes} min</dd>
    </dl>
    <nav>
      <a href="/api/health">Health API</a>
      <a href="/api/signals">Signals API</a>
      <a href="/api/prices">Provider prices</a>
      <a href="/api/history">Observed history</a>
    </nav>
    <p>Research software only. No broker orders, fills, portfolio returns, or investment advice are represented here.</p>
  </main>
</body>
</html>`;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (path === '/health' || path === '/api/health') {
    jsonResponse(res, {
      status: 'degraded',
      ready: isReady,
      ...SIGNAL_SCAN_AVAILABILITY,
      uptime: process.uptime(),
      generatedAt: new Date().toISOString(),
    });
    return;
  }

  if (path === '/api/prices') {
    const prices = await fetchLivePrices();
    const values = Object.fromEntries(prices);

    if (prices.size === 0) {
      jsonResponse(res, {
        available: false,
        dataQuality: 'unavailable',
        reason: 'price-providers-unavailable',
        prices: values,
      }, 503);
      return;
    }

    jsonResponse(res, {
      available: true,
      dataQuality: 'provider-observed',
      retrievedAt: new Date().toISOString(),
      prices: values,
    });
    return;
  }

  if (path === '/api/signals') {
    jsonResponse(res, {
      ...SIGNAL_SCAN_AVAILABILITY,
      count: 0,
      lastScanAttemptAt,
      signals: [],
    }, 503);
    return;
  }

  if (path === '/api/history') {
    try {
      const history = await getHistory();
      jsonResponse(res, {
        available: true,
        dataQuality: 'real',
        count: history.totalSignals,
        history,
      });
    } catch {
      jsonResponse(res, {
        available: false,
        dataQuality: 'unavailable',
        reason: 'observed-history-unavailable',
        count: 0,
        history: null,
      }, 503);
    }
    return;
  }

  if (path === '/' || path === '/status') {
    htmlResponse(res, statusPage());
    return;
  }

  jsonResponse(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);
  void boot();
});
