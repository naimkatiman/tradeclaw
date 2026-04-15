#!/usr/bin/env node
/**
 * Screenshot /track-record and post to Telegram.
 *
 * Env:
 *   TRACK_RECORD_URL      default https://tradeclaw.win/track-record
 *   TELEGRAM_BOT_TOKEN    required
 *   TELEGRAM_CHANNEL_ID   required (chat id or @channel)
 *   DRY_RUN               "1" to skip Telegram post
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = process.env.TRACK_RECORD_URL || "https://tradeclaw.win/track-record";
const BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHANNEL_ID;
const DRY = process.env.DRY_RUN === "1";

async function screenshot() {
  const outDir = path.join(__dirname, "..", "data", "track-record-shots");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const file = path.join(outDir, `track-record-${stamp}.png`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1600 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60_000 });
  // let charts finish animating
  await page.waitForTimeout(2500);
  await page.screenshot({ path: file, fullPage: true });
  await browser.close();
  return file;
}

async function extractCaption() {
  // Tiny second visit to read headline numbers from the DOM for the caption.
  // Keeps the script self-contained — no separate API call.
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();
    const pick = (re) => (text.match(re) || [])[0] || null;
    const winrate = pick(/\b\d{1,3}(?:\.\d+)?\s*%\s*win/i);
    const trades = pick(/\b\d+\s*(?:signals?|trades?)\b/i);
    return [winrate, trades].filter(Boolean).join(" · ");
  } catch {
    await browser.close().catch(() => {});
    return "";
  }
}

async function postTelegram(file, caption) {
  if (DRY) {
    console.log("[DRY] would post", file, "caption:", caption);
    return;
  }
  if (!BOT || !CHAT) throw new Error("Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID");

  const form = new FormData();
  form.append("chat_id", CHAT);
  form.append("caption", caption);
  form.append("parse_mode", "Markdown");
  form.append(
    "photo",
    new Blob([fs.readFileSync(file)], { type: "image/png" }),
    path.basename(file),
  );

  const res = await fetch(`https://api.telegram.org/bot${BOT}/sendPhoto`, {
    method: "POST",
    body: form,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram error: ${JSON.stringify(json)}`);
  console.log("posted:", json.result.message_id);
}

(async () => {
  const file = await screenshot();
  console.log("shot:", file);
  const stats = await extractCaption();
  const date = new Date().toISOString().slice(0, 10);
  const caption =
    `📊 *TradeClaw Track Record — ${date}*\n` +
    (stats ? `${stats}\n\n` : "\n") +
    `Live, auditable. Every signal logged.\n` +
    `🔗 https://tradeclaw.win/track-record`;
  await postTelegram(file, caption);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
