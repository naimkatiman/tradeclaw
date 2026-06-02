/**
 * One-shot verification of the Pro broadcast catch-up fix (commit 25b58f7).
 *
 * Inserts a synthetic tradable signal into prod `signal_history` with
 * `gate_blocked=false` and `telegram_pro_message_id=NULL`, manually triggers
 * the cron once, polls for `telegram_pro_message_id` to be populated, then
 * cleans up by deleting the Telegram message and the DB row.
 *
 * Required env (via railway run -- with both Postgres + web vars merged):
 *   DATABASE_PUBLIC_URL
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_PRO_GROUP_ID
 *   CRON_SECRET
 *   APP_URL (defaults to https://tradeclaw.win)
 *
 * Cleanup is always attempted in the finally block — if the script crashes
 * before deletion, run cleanup manually:
 *   DELETE FROM signal_history WHERE id LIKE 'SIG-TEST-CATCHUP-%';
 */

/* eslint-disable no-console */

const { Client } = require('pg');

const APP_URL = process.env.APP_URL || 'https://tradeclaw.win';
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 30_000;

function need(env, name) {
  const v = env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function main() {
  // The script is invoked via:
  //   railway variables --service web --json | railway run --service Postgres -- node THIS
  //
  // process.env carries Postgres-service vars (DATABASE_PUBLIC_URL).
  // stdin carries web-service vars (TELEGRAM_*, CRON_SECRET).
  // Neither ever lands in a shell variable.
  const webVars = await readStdinJson();
  const merged = { ...process.env, ...webVars };

  const databaseUrl = need(merged, 'DATABASE_PUBLIC_URL');
  const botToken = need(merged, 'TELEGRAM_BOT_TOKEN');
  const proGroupId = need(merged, 'TELEGRAM_PRO_GROUP_ID');
  const cronSecret = need(merged, 'CRON_SECRET');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const testId = `SIG-TEST-CATCHUP-${Date.now()}`;
  let telegramMessageId = null;
  let inserted = false;

  try {
    // 1. Insert synthetic row
    console.log('[1/6] Inserting synthetic row:', testId);
    // DOGEUSD/M15/BUY mirrors the recent gate_blocked=false sample
    // (SIG-DOGEUSD-M15-BUY-MOUAFP40 at 2026-05-06T16:45). Using a pair the
    // winning-cells filter currently permits — XAUUSD/BUY would be blocked
    // by isWinningCell at the catch-up re-curation step.
    await client.query(
      `INSERT INTO signal_history (
         id, pair, timeframe, direction, confidence, entry_price, tp1, sl,
         created_at, strategy_id, mode, gate_blocked, gate_reason, is_simulated
       ) VALUES ($1, 'DOGEUSD', 'M15', 'BUY', 75, 0.16500, 0.16800, 0.16300,
                 NOW(), 'classic', 'scalper', false, NULL, true)`,
      [testId],
    );
    inserted = true;

    // 2. Trigger cron — catches up the row we just inserted (gate_blocked=false,
    //    telegram_pro_message_id=NULL, created_at within 10-min window)
    console.log('[2/6] Triggering cron at', `${APP_URL}/api/cron/signals`);
    const cronRes = await fetch(`${APP_URL}/api/cron/signals`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const cronBody = await cronRes.text();
    console.log('       Cron status:', cronRes.status, cronBody.slice(0, 400));
    try {
      const parsed = JSON.parse(cronBody);
      if (parsed.catchup) {
        console.log('       catchup:', JSON.stringify(parsed.catchup));
      } else {
        console.log('       catchup: <field absent — old code still deployed>');
      }
    } catch {
      // non-JSON response — already logged above
    }

    // 3. Poll for telegram_pro_message_id (broadcast is fire-and-forget after cron)
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const sel = await client.query(
        `SELECT telegram_pro_message_id FROM signal_history WHERE id = $1`,
        [testId],
      );
      const raw = sel.rows[0]?.telegram_pro_message_id;
      if (raw) {
        telegramMessageId = Number(raw);
        break;
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    if (telegramMessageId) {
      console.log('[3/6] PASS — telegram_pro_message_id populated:', telegramMessageId);
    } else {
      console.error('[3/6] FAIL — telegram_pro_message_id still NULL after', POLL_TIMEOUT_MS, 'ms');
    }
  } catch (err) {
    console.error('FATAL during test:', err.message);
  } finally {
    // 4. Delete the Telegram message (if it was posted)
    if (telegramMessageId) {
      try {
        const delRes = await fetch(
          `https://api.telegram.org/bot${botToken}/deleteMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: proGroupId,
              message_id: telegramMessageId,
            }),
          },
        );
        const delBody = await delRes.json();
        console.log('[4/6] Telegram deleteMessage:', JSON.stringify(delBody));
      } catch (e) {
        console.error('[4/6] Telegram delete failed:', e.message);
      }
    } else {
      console.log('[4/6] Skip Telegram delete — no message_id to remove');
    }

    // 5. Delete the synthetic row
    if (inserted) {
      try {
        const delRow = await client.query(
          `DELETE FROM signal_history WHERE id = $1 RETURNING id`,
          [testId],
        );
        console.log('[5/6] Deleted synthetic row:', delRow.rows[0]?.id ?? '(not found)');
      } catch (e) {
        console.error('[5/6] DB row delete failed:', e.message);
      }
    }

    // 6. Best-effort cleanup of any stragglers from prior failed runs
    try {
      const stale = await client.query(
        `DELETE FROM signal_history
         WHERE id LIKE 'SIG-TEST-CATCHUP-%' AND id <> $1
         RETURNING id`,
        [testId],
      );
      if (stale.rows.length > 0) {
        console.log(
          '[6/6] Reaped stale test rows from prior runs:',
          stale.rows.map((r) => r.id).join(', '),
        );
      } else {
        console.log('[6/6] No stale test rows to reap');
      }
    } catch (e) {
      console.error('[6/6] Stale reap failed:', e.message);
    }

    await client.end();
  }

  if (!telegramMessageId) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('FATAL outer:', err);
  process.exit(1);
});
