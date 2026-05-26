#!/usr/bin/env node
/**
 * Poll TradeClaw /api/signals and forward new BUY/SELL signals to a
 * Discord channel via webhook.
 *
 *   TRADECLAW_URL=https://demo.tradeclaw.win \
 *   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/.../... \
 *     node forward-to-discord.js
 */

const fs = require('fs');
const path = require('path');

const TRADECLAW_URL = process.env.TRADECLAW_URL || 'https://demo.tradeclaw.win';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const MIN_CONFIDENCE = parseInt(process.env.MIN_CONFIDENCE || '70', 10);
const SEEN_FILE = process.env.SEEN_FILE || path.join('/tmp', 'tc-discord-seen.json');

if (!DISCORD_WEBHOOK_URL) {
  console.error('DISCORD_WEBHOOK_URL is required');
  process.exit(1);
}

function loadSeen() {
  try { return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))); }
  catch { return new Set(); }
}
function saveSeen(seen) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify(Array.from(seen).slice(-500)));
}

function buildEmbed(signal) {
  const isBuy = signal.direction === 'BUY';
  return {
    embeds: [{
      title: `${isBuy ? '▲' : '▼'} ${signal.symbol} ${signal.direction} — ${signal.confidence}%`,
      url: `${TRADECLAW_URL}/signal/${signal.id}`,
      color: isBuy ? 0x10b981 : 0xef4444,
      fields: [
        { name: 'Entry', value: String(signal.entry), inline: true },
        { name: 'Stop Loss', value: String(signal.stopLoss ?? '—'), inline: true },
        { name: 'Take Profit', value: (signal.takeProfit || []).join(' / ') || '—', inline: true },
        { name: 'Timeframe', value: signal.timeframe, inline: true },
        { name: 'RSI', value: signal.indicators?.rsi?.value?.toFixed?.(1) ?? '—', inline: true },
        { name: 'MACD', value: signal.indicators?.macd?.signal ?? '—', inline: true },
      ],
      footer: { text: 'TradeClaw signal alert' },
      timestamp: signal.timestamp ?? new Date().toISOString(),
    }],
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
    if ((signal.confidence ?? 0) < MIN_CONFIDENCE) continue;
    if (signal.direction !== 'BUY' && signal.direction !== 'SELL') continue;

    const r = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildEmbed(signal)),
    });
    if (!r.ok) {
      console.error(`discord post failed for ${signal.id}: ${r.status}`);
      continue;
    }
    seen.add(signal.id);
    posted++;
  }

  saveSeen(seen);
  console.log(`done — posted ${posted} new signal(s)`);
}

main().catch(err => { console.error(err); process.exit(1); });
