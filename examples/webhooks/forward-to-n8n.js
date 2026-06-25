#!/usr/bin/env node
/**
 * Poll TradeClaw /api/signals and POST each new signal to an n8n webhook.
 * The payload is the raw signal object — wire up your n8n workflow to
 * branch on `direction`, `symbol`, `confidence`, etc.
 *
 *   TRADECLAW_URL=https://demo.tradeclaw.win \
 *   N8N_WEBHOOK_URL=https://n8n.example.com/webhook/tradeclaw \
 *     node forward-to-n8n.js
 */

const fs = require('fs');
const path = require('path');

const TRADECLAW_URL = process.env.TRADECLAW_URL || 'https://demo.tradeclaw.win';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const SEEN_FILE = process.env.SEEN_FILE || path.join('/tmp', 'tc-n8n-seen.json');

if (!N8N_WEBHOOK_URL) {
  console.error('N8N_WEBHOOK_URL is required');
  process.exit(1);
}

function loadSeen() {
  try { return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))); }
  catch { return new Set(); }
}
function saveSeen(seen) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify(Array.from(seen).slice(-500)));
}

async function main() {
  const res = await fetch(`${TRADECLAW_URL}/api/signals`);
  if (!res.ok) throw new Error(`signals fetch failed: ${res.status}`);
  const { signals = [] } = await res.json();

  const seen = loadSeen();
  let posted = 0;

  for (const signal of signals) {
    if (seen.has(signal.id)) continue;
    const r = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'tradeclaw', signal }),
    });
    if (!r.ok) {
      console.error(`n8n post failed for ${signal.id}: ${r.status}`);
      continue;
    }
    seen.add(signal.id);
    posted++;
  }

  saveSeen(seen);
  console.log(`done — posted ${posted} new signal(s)`);
}

main().catch(err => { console.error(err); process.exit(1); });
