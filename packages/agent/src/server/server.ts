#!/usr/bin/env node
import { createServer } from 'node:http';
import { Gateway } from '../gateway/gateway.js';
import { fetchLivePrices } from '../signals/prices.js';
import { getHistory } from '../signals/tracker.js';
import { formatNumber } from '@tradeclaw/signals';
import type { TradingSignal } from '@tradeclaw/signals';

const PORT = parseInt(process.env.PORT || '8080', 10);
const gateway = new Gateway();
let lastSignals: TradingSignal[] = [];
let lastScanTime: string | null = null;
let isReady = false;

async function boot() {
  console.log('[server] Starting tradeclaw-agent server...');
  try {
    lastSignals = await gateway.scanOnce();
    lastScanTime = new Date().toISOString();
    isReady = true;
    console.log(`[server] Initial scan done: ${lastSignals.length} signals`);
  } catch (e) {
    console.error('[server] Initial scan failed:', e);
    isReady = true;
  }

  setInterval(async () => {
    try {
      lastSignals = await gateway.scanOnce();
      lastScanTime = new Date().toISOString();
      console.log(`[server] Scan refreshed: ${lastSignals.length} signals`);
    } catch (e) {
      console.error('[server] Scan refresh failed:', e);
    }
  }, 5 * 60 * 1000);
}

function cors(res: import('node:http').ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function jsonResponse(res: import('node:http').ServerResponse, data: unknown, status = 200) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function htmlResponse(res: import('node:http').ServerResponse, body: string) {
  cors(res);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(body);
}

function fmtPrice(v: number): string {
  return v > 100 ? v.toFixed(2) : v.toFixed(5);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (path === '/health' || path === '/api/health') {
    return jsonResponse(res, {
      status: 'healthy',
      ready: isReady,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }

  if (path === '/api/prices') {
    try {
      const prices = await fetchLivePrices();
      const out: Record<string, number> = {};
      prices.forEach((v, k) => { out[k] = v; });
      return jsonResponse(res, { timestamp: new Date().toISOString(), prices: out });
    } catch {
      return jsonResponse(res, { error: 'Failed to fetch prices' }, 500);
    }
  }

  if (path === '/api/signals') {
    const sym = url.searchParams.get('symbol')?.toUpperCase();
    const tf = url.searchParams.get('timeframe')?.toUpperCase();
    const dir = url.searchParams.get('direction')?.toUpperCase();
    const minConf = parseInt(url.searchParams.get('minConfidence') || '0');

    let sigs: TradingSignal[] = lastSignals;
    if (sym) sigs = sigs.filter(s => s.symbol === sym);
    if (tf) sigs = sigs.filter(s => s.timeframe === tf);
    if (dir) sigs = sigs.filter(s => s.direction === dir);
    if (minConf > 0) sigs = sigs.filter(s => s.confidence >= minConf);

    return jsonResponse(res, {
      count: sigs.length,
      lastScanTime,
      timestamp: new Date().toISOString(),
      signals: sigs,
    });
  }

  if (path === '/api/history') {
    try {
      const history = await getHistory();
      return jsonResponse(res, { count: history.totalSignals, history });
    } catch {
      return jsonResponse(res, { count: 0, history: null });
    }
  }

  if (path === '/' || path === '/status') {
    const buys = lastSignals.filter(s => s.direction === 'BUY').length;
    const sells = lastSignals.filter(s => s.direction === 'SELL').length;
    const avgConf = lastSignals.length > 0
      ? Math.round(lastSignals.reduce((a, s) => a + s.confidence, 0) / lastSignals.length)
      : 0;
    const bias = buys > sells ? 'BULLISH' : sells > buys ? 'BEARISH' : 'NEUTRAL';

    const signalCards = lastSignals.slice(0, 12).map(s => `
      <div class="card ${s.direction.toLowerCase()}">
        <div class="card-header">
          <span class="dir ${s.direction.toLowerCase()}">${s.direction}</span>
          <span class="sym">${s.symbol}</span>
          <span class="tf">${s.timeframe}</span>
          <span class="conf">${s.confidence}%</span>
        </div>
        <div class="levels">
          <div><span class="lbl">Entry</span><span class="val">${fmtPrice(s.entry)}</span></div>
          <div><span class="lbl">SL</span><span class="val sl">${fmtPrice(s.stopLoss)}</span></div>
          <div><span class="lbl">TP1</span><span class="val tp">${fmtPrice(s.takeProfit1)}</span></div>
        </div>
        <div class="inds">
          <span>RSI ${s.indicators?.rsi?.value?.toFixed(1) ?? '\u2014'}</span>
          <span>MACD ${s.indicators?.macd?.signal ?? '\u2014'}</span>
          <span>EMA ${s.indicators?.ema?.trend ?? '\u2014'}</span>
        </div>
      </div>
    `).join('');

    const page = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>TradeClaw Agent</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#050505;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh}header{background:#0f1629;border-bottom:1px solid #1e2d4a;padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}.logo{font-size:1.1rem;font-weight:700;color:#fff}.logo span{color:#10b981}.live{display:flex;align-items:center;gap:.5rem;font-size:.75rem;color:#64748b}.dot{width:8px;height:8px;background:#22c55e;border-radius:50%;animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}.container{max-width:1200px;margin:0 auto;padding:1.5rem}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.75rem;margin-bottom:1.5rem}.stat{background:#0f1629;border:1px solid #1e2d4a;border-radius:12px;padding:1rem;text-align:center}.stat .v{font-size:1.5rem;font-weight:700;font-family:monospace}.stat .l{font-size:.65rem;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-top:.25rem}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:.75rem}.card{background:#0f1629;border:1px solid #1e2d4a;border-radius:12px;padding:1rem;border-left:3px solid #1e2d4a}.card.buy{border-left-color:#22c55e}.card.sell{border-left-color:#f43f5e}.card-header{display:flex;align-items:center;gap:.5rem;margin-bottom:.75rem}.dir{font-size:.7rem;font-weight:700;padding:.2rem .5rem;border-radius:4px}.dir.buy{background:#052e16;color:#4ade80}.dir.sell{background:#1f0a0a;color:#fb7185}.sym{font-weight:700;font-size:.95rem}.tf{margin-left:auto;font-size:.65rem;background:#1e2d4a;padding:.15rem .4rem;border-radius:4px;color:#94a3b8}.conf{font-size:.8rem;font-weight:700;font-family:monospace;color:#94a3b8}.levels{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.4rem;font-size:.72rem;margin-bottom:.6rem}.levels div{text-align:center}.lbl{display:block;color:#64748b;font-size:.6rem;margin-bottom:.1rem}.val{font-family:monospace;font-weight:600}.sl{color:#fb7185}.tp{color:#4ade80}.inds{display:flex;gap:.75rem;font-size:.65rem;color:#64748b;border-top:1px solid #1e2d4a;padding-top:.5rem}.api-section{margin-top:2rem;background:#0f1629;border:1px solid #1e2d4a;border-radius:12px;padding:1.25rem}.api-section h3{font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.75rem}.api-links{display:flex;flex-wrap:wrap;gap:.5rem}.api-link{background:#0a0e1a;border:1px solid #1e2d4a;border-radius:8px;padding:.4rem .8rem;font-size:.75rem;color:#4ade80;text-decoration:none;font-family:monospace}.api-link:hover{border-color:#22c55e}footer{text-align:center;padding:2rem;font-size:.7rem;color:#334155}footer a{color:#475569;text-decoration:none}</style></head><body><header><div class="logo">\u{1F43E} TradeClaw<span>Agent</span></div><div class="live"><span class="dot"></span> Live \u00B7 ${lastSignals.length} signals \u00B7 ${lastScanTime ? new Date(lastScanTime).toLocaleTimeString() : '\u2014'}</div></header><div class="container"><div class="stats"><div class="stat"><div class="v">${lastSignals.length}</div><div class="l">Active Signals</div></div><div class="stat"><div class="v" style="color:#fff">${buys} / ${sells}</div><div class="l">Buy / Sell</div></div><div class="stat"><div class="v">${avgConf}%</div><div class="l">Avg Confidence</div></div><div class="stat"><div class="v" style="font-size:1rem;color:${bias === 'BULLISH' ? '#4ade80' : bias === 'BEARISH' ? '#fb7185' : '#94a3b8'}">${bias}</div><div class="l">Market Bias</div></div><div class="stat"><div class="v" style="font-size:1rem">${Math.floor(process.uptime() / 60)}m</div><div class="l">Uptime</div></div></div><div class="grid">${signalCards || '<p style="color:#475569;text-align:center;padding:2rem;grid-column:1/-1">No signals yet \u2014 scanning...</p>'}</div><div class="api-section"><h3>REST API</h3><div class="api-links"><a class="api-link" href="/api/signals">/api/signals</a><a class="api-link" href="/api/signals?minConfidence=80">/api/signals?minConfidence=80</a><a class="api-link" href="/api/prices">/api/prices</a><a class="api-link" href="/api/history">/api/history</a><a class="api-link" href="/api/health">/api/health</a></div></div></div><footer><p>\u{1F43E} <a href="https://tradeclaw.win" target="_blank">tradeclaw.win</a> &nbsp;\u00B7&nbsp; <a href="https://github.com/naimkatiman/tradeclaw" target="_blank">github</a> &nbsp;\u00B7&nbsp; Self-hosted \u00B7 Free forever \u00B7 Open source</p></footer></body></html>`;
    return htmlResponse(res, page);
  }

  jsonResponse(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);
  boot();
});
