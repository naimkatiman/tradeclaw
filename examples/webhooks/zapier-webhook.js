#!/usr/bin/env node
/**
 * Poll TradeClaw /api/signals and POST each new signal to a Zapier
 * "Catch Hook" webhook.
 *
 * Zapier prefers flat top-level keys (no nested objects) for easy field
 * mapping in the Zap editor, so this script flattens the signal payload
 * before posting.
 *
 *   TRADECLAW_URL=https://demo.tradeclaw.win \
 *   ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/... \
 *     node zapier-webhook.js
 */

const fs = require('fs');
const path = require('path');

const TRADECLAW_URL = process.env.TRADECLAW_URL || 'https://demo.tradeclaw.win';
const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;
const SEEN_FILE = process.env.SEEN_FILE || path.join('/tmp', 'tc-zapier-seen.json');

if (!ZAPIER_WEBHOOK_URL) {
  console.error('ZAPIER_WEBHOOK_URL is required');
  process.exit(1);
}

function loadSeen() {
  try { return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))); }
  catch { return new Set(); }
}
function saveSeen(seen) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify(Array.from(seen).slice(-500)));
}

function flatten(signal) {
  return {
    id: signal.id,
    symbol: signal.symbol,
    direction: signal.direction,
    confidence: signal.confidence,
    timeframe: signal.timeframe,
    entry: signal.entry,
    stop_loss: signal.stopLoss,
    take_profit_1: signal.takeProfit?.[0] ?? null,
    take_profit_2: signal.takeProfit?.[1] ?? null,
    take_profit_3: signal.takeProfit?.[2] ?? null,
    rsi: signal.indicators?.rsi?.value ?? null,
    macd_signal: signal.indicators?.macd?.signal ?? null,
    macd_histogram: signal.indicators?.macd?.histogram ?? null,
    ema20: signal.indicators?.ema?.ema20 ?? null,
    ema50: signal.indicators?.ema?.ema50 ?? null,
    timestamp: signal.timestamp,
    url: `${TRADECLAW_URL}/signal/${signal.id}`,
  };
}

async function main() {
  const res = await fetch(`${TRADECLAW_URL}/api/signals`);
  if (!res.ok) throw new Error(`signals fetch failed: ${res.status}`);
  const { signals = [] } = await res.json();

  const seen = loadSeen();
  let posted = 0;

  for (const signal of signals) {
    if (seen.has(signal.id)) continue;
    const r = await fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flatten(signal)),
    });
    if (!r.ok) {
      console.error(`zapier post failed for ${signal.id}: ${r.status}`);
      continue;
    }
    seen.add(signal.id);
    posted++;
  }

  saveSeen(seen);
  console.log(`done — posted ${posted} new signal(s)`);
}

main().catch(err => { console.error(err); process.exit(1); });
