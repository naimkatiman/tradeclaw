#!/usr/bin/env node
/**
 * Poll TradeClaw /api/signals and append each new signal as a row in a
 * Google Sheet via an Apps Script Web App deployment.
 *
 * Setup:
 *  1. Create a Google Sheet with header row:
 *     id | symbol | direction | confidence | entry | stop_loss | tp1 | tp2 | tp3 | timeframe | timestamp
 *  2. Tools → Apps Script. Paste the script at the bottom of this file
 *     and deploy as a Web App (execute as me, accessible to anyone).
 *  3. Copy the Web App URL into SHEETS_WEBHOOK_URL below.
 *
 *   TRADECLAW_URL=https://demo.tradeclaw.win \
 *   SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec \
 *     node log-to-google-sheets.js
 *
 * ---
 *
 * Apps Script (paste into Tools → Apps Script):
 *
 *   function doPost(e) {
 *     const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
 *     const data = JSON.parse(e.postData.contents);
 *     sheet.appendRow([
 *       data.id, data.symbol, data.direction, data.confidence,
 *       data.entry, data.stop_loss, data.tp1, data.tp2, data.tp3,
 *       data.timeframe, data.timestamp,
 *     ]);
 *     return ContentService.createTextOutput(JSON.stringify({ ok: true }));
 *   }
 */

const fs = require('fs');
const path = require('path');

const TRADECLAW_URL = process.env.TRADECLAW_URL || 'https://demo.tradeclaw.win';
const SHEETS_WEBHOOK_URL = process.env.SHEETS_WEBHOOK_URL;
const SEEN_FILE = process.env.SEEN_FILE || path.join('/tmp', 'tc-sheets-seen.json');

if (!SHEETS_WEBHOOK_URL) {
  console.error('SHEETS_WEBHOOK_URL is required');
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
    const row = {
      id: signal.id,
      symbol: signal.symbol,
      direction: signal.direction,
      confidence: signal.confidence,
      entry: signal.entry,
      stop_loss: signal.stopLoss,
      tp1: signal.takeProfit?.[0] ?? null,
      tp2: signal.takeProfit?.[1] ?? null,
      tp3: signal.takeProfit?.[2] ?? null,
      timeframe: signal.timeframe,
      timestamp: signal.timestamp,
    };

    const r = await fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      console.error(`sheets post failed for ${signal.id}: ${r.status}`);
      continue;
    }
    seen.add(signal.id);
    posted++;
  }

  saveSeen(seen);
  console.log(`done — appended ${posted} new row(s)`);
}

main().catch(err => { console.error(err); process.exit(1); });
