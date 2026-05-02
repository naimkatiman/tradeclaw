#!/usr/bin/env node
/**
 * One-shot script to create forum topics in the TradeClaw Pro Telegram group.
 *
 * Prereqs (all done from the Telegram client by a group admin, NOT here):
 *   1. Group must be a supergroup (it already is — chat IDs starting with -100).
 *   2. Topics must be enabled: Group Settings → Topics → toggle on.
 *   3. The TradeClaw bot must be an admin of the group with the
 *      "Manage topics" permission granted.
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=...  TELEGRAM_PRO_GROUP_ID=-100xxxxxxxxxx  \
 *     node scripts/create-pro-group-topics.mjs
 *
 * After running, copy the printed Signals topic id into Railway:
 *   TELEGRAM_PRO_SIGNALS_TOPIC_ID=<id>
 *
 * The script is intentionally NOT idempotent against Telegram (Bot API has
 * no list-topics endpoint). Re-running creates duplicates. To prevent that,
 * it writes a marker file at data/pro-group-topics.json after a successful
 * run and refuses to run again unless --force is passed.
 */

import fs from 'node:fs';
import path from 'node:path';

const API = 'https://api.telegram.org';
const STATE_FILE = path.resolve('data/pro-group-topics.json');

const TOPICS = [
  {
    key: 'signals',
    name: '📡 Signals',
    icon_color: 0x6FB9F0, // light blue
  },
  {
    key: 'general',
    name: '💬 General Chat',
    icon_color: 0x8EEE98, // green
  },
  {
    key: 'ask_admin',
    name: '🙋 Ask Admin & FAQ',
    icon_color: 0xFFD67E, // amber
  },
];

function fail(msg) {
  console.error(`[create-topics] ${msg}`);
  process.exit(1);
}

async function tg(token, method, body) {
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`${method}: ${data.description ?? 'unknown error'}`);
  }
  return data.result;
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_PRO_GROUP_ID;
  const force = process.argv.includes('--force');

  if (!token) fail('TELEGRAM_BOT_TOKEN is not set');
  if (!chatId) fail('TELEGRAM_PRO_GROUP_ID is not set');

  if (fs.existsSync(STATE_FILE) && !force) {
    fail(
      `${STATE_FILE} already exists. Topics were created in a previous run.\n` +
        `Re-running would create duplicates. Pass --force only if you know what you're doing.`,
    );
  }

  // Sanity check: bot must be an admin with manage_topics. We probe by reading
  // chat info; if we can't even read the chat, abort early.
  let chat;
  try {
    chat = await tg(token, 'getChat', { chat_id: chatId });
  } catch (err) {
    fail(`Cannot read chat ${chatId}: ${err.message}\n` +
      `→ Make sure the bot is a member and an admin of the group.`);
  }

  if (!chat.is_forum) {
    fail(
      `Chat "${chat.title}" (${chatId}) does not have Topics enabled.\n` +
        `→ In Telegram: Group settings → Topics → toggle on, then re-run.`,
    );
  }

  console.log(`[create-topics] Target group: "${chat.title}" (${chatId})`);
  console.log(`[create-topics] Forum mode: ON`);
  console.log(`[create-topics] Creating ${TOPICS.length} topics...`);

  const created = {};
  for (const t of TOPICS) {
    try {
      const res = await tg(token, 'createForumTopic', {
        chat_id: chatId,
        name: t.name,
        icon_color: t.icon_color,
      });
      created[t.key] = {
        id: res.message_thread_id,
        name: t.name,
      };
      console.log(`  ✓ ${t.name.padEnd(30)} → thread id ${res.message_thread_id}`);
    } catch (err) {
      console.error(`  ✗ ${t.name}: ${err.message}`);
      fail('Bot likely lacks manage_topics permission. Grant it and re-run with --force.');
    }
  }

  // Persist for re-run protection. Includes group id so a token rotation
  // alone doesn't invalidate the marker.
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ chatId, createdAt: new Date().toISOString(), topics: created }, null, 2),
  );

  console.log('');
  console.log('[create-topics] Done. Now set this on Railway (web service):');
  console.log('');
  console.log(`  TELEGRAM_PRO_SIGNALS_TOPIC_ID=${created.signals.id}`);
  console.log('');
  console.log(`State written to ${STATE_FILE}`);
}

main().catch((err) => {
  console.error(`[create-topics] fatal: ${err.message}`);
  process.exit(1);
});
