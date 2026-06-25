#!/usr/bin/env node
/**
 * Poll TradeClaw /api/signals and forward new BUY/SELL signals to Slack.
 *
 *   TRADECLAW_URL=https://demo.tradeclaw.win \
 *   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T0/B0/abc \
 *     node forward-to-slack.js
 *
 * Dedupes by signal.id stored in /tmp/tc-slack-seen.json. Designed to be
 * run from cron every 1–5 minutes.
 */

const fs = require('fs');
const path = require('path');

const TRADECLAW_URL = process.env.TRADECLAW_URL || 'https://demo.tradeclaw.win';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const MIN_CONFIDENCE = parseInt(process.env.MIN_CONFIDENCE || '70', 10);
const SEEN_FILE = process.env.SEEN_FILE || path.join('/tmp', 'tc-slack-seen.json');

if (!SLACK_WEBHOOK_URL) {
  console.error('SLACK_WEBHOOK_URL is required');
  process.exit(1);
}

function loadSeen() {
  try {
    return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')));
  } catch {
    return new Set();
  }
}

function saveSeen(seen) {
  // Keep the seen set bounded.
  const arr = Array.from(seen).slice(-500);
  fs.writeFileSync(SEEN_FILE, JSON.stringify(arr));
}

function buildSlackPayload(signal) {
  const isBuy = signal.direction === 'BUY';
  const arrow = isBuy ? ':arrow_up:' : ':arrow_down:';
  const tp = (signal.takeProfit || []).join(' / ') || '—';
  return {
    text: `${arrow} *${signal.symbol}* ${signal.direction} — ${signal.confidence}% (${signal.timeframe})`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `${arrow} *${signal.symbol}* ${signal.direction} — *${signal.confidence}%* confidence (${signal.timeframe})` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Entry*\n${signal.entry}` },
          { type: 'mrkdwn', text: `*Stop Loss*\n${signal.stopLoss ?? '—'}` },
          { type: 'mrkdwn', text: `*Take Profit*\n${tp}` },
          { type: 'mrkdwn', text: `*RSI*\n${signal.indicators?.rsi?.value?.toFixed(1) ?? '—'}` },
        ],
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `<${TRADECLAW_URL}/signal/${signal.id}|View on TradeClaw>` }],
      },
    ],
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

    const slackRes = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSlackPayload(signal)),
    });
    if (!slackRes.ok) {
      console.error(`slack post failed for ${signal.id}: ${slackRes.status}`);
      continue;
    }
    seen.add(signal.id);
    posted++;
    console.log(`posted ${signal.symbol} ${signal.direction} (${signal.confidence}%)`);
  }

  saveSeen(seen);
  console.log(`done — posted ${posted} new signal(s)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
