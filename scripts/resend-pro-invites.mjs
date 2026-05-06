#!/usr/bin/env node
/**
 * Re-send Pro/Elite Telegram group invites to subscribers whose original
 * invite was issued against the old (broken) Pro group chat id.
 *
 * Why this exists:
 *   The Stripe webhook used to call sendInvite() against a broken
 *   TELEGRAM_PRO_GROUP_ID. createChatInviteLink would 400 with
 *   "chat not found", so those users have an active subscription but
 *   never received a working group invite.
 *
 * What it does:
 *   1. Selects users with tier IN ('pro','elite') AND telegram_user_id NOT NULL
 *   2. Filters to those without an ACTIVE invite for the *current* Pro group
 *   3. For each, mints a fresh 72h single-use invite via createChatInviteLink
 *   4. DMs them via the bot
 *   5. Records the new row in telegram_invites
 *
 * Usage:
 *   railway run node scripts/resend-pro-invites.mjs           # dry-run, no side effects
 *   railway run node scripts/resend-pro-invites.mjs --commit  # actually send + persist
 *
 * Idempotent on re-run: --commit twice in a row will not duplicate invites,
 * because step 2 filters out users who already have an active invite for the
 * current group (which step 5 just inserted).
 */

import pg from 'pg';

const API = 'https://api.telegram.org';

function fail(msg) {
  console.error(`[resend-invites] ${msg}`);
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
  const commit = process.argv.includes('--commit');
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const proGroupId = process.env.TELEGRAM_PRO_GROUP_ID;
  const dbUrl = process.env.DATABASE_URL;

  if (!token) fail('TELEGRAM_BOT_TOKEN not set (run via `railway run`)');
  if (!proGroupId) fail('TELEGRAM_PRO_GROUP_ID not set');
  if (!dbUrl) fail('DATABASE_URL not set');

  const proGroupBig = BigInt(proGroupId);

  console.log(`[resend-invites] mode: ${commit ? 'COMMIT (will DM users)' : 'DRY RUN (no side effects)'}`);
  console.log(`[resend-invites] target Pro group: ${proGroupId}`);
  console.log('');

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  try {
    // Users with paid tier + linked Telegram + no active invite for the
    // CURRENT Pro group. Old invites against the broken chat id are still
    // is_active=TRUE in the table (they were never deactivated since
    // createChatInviteLink threw), but they reference a different chat id,
    // so the LEFT JOIN below correctly excludes them.
    const { rows } = await client.query(
      `
      SELECT u.id, u.email, u.tier, u.telegram_user_id
      FROM users u
      LEFT JOIN telegram_invites ti
        ON ti.user_id = u.id
       AND ti.is_active = TRUE
       AND ti.telegram_chat_id = $1::bigint
       AND (ti.expires_at IS NULL OR ti.expires_at > NOW())
      WHERE u.tier IN ('pro', 'elite')
        AND u.telegram_user_id IS NOT NULL
        AND ti.id IS NULL
      ORDER BY u.created_at DESC
      `,
      [proGroupBig.toString()],
    );

    console.log(`[resend-invites] candidates: ${rows.length}`);
    if (rows.length === 0) {
      console.log('[resend-invites] nothing to do.');
      return;
    }

    // Always show the list (no PII beyond email; user is the operator).
    for (const r of rows) {
      console.log(`  - ${r.id}  tier=${r.tier}  ${r.email}  tg=${r.telegram_user_id}`);
    }
    console.log('');

    if (!commit) {
      console.log('[resend-invites] dry-run done. Re-run with --commit to send DMs.');
      return;
    }

    // Commit path: send one invite per user, sequentially to stay friendly
    // with Telegram rate limits (~30 msgs/sec per bot).
    let sent = 0;
    let failed = 0;
    const expireAt = Math.floor(Date.now() / 1000) + 72 * 60 * 60;

    for (const r of rows) {
      try {
        const link = await tg(token, 'createChatInviteLink', {
          chat_id: proGroupId,
          name: `recover_${r.id.slice(0, 8)}`,
          member_limit: 1,
          expire_date: expireAt,
        });

        const tierLabel = r.tier === 'elite' ? 'Elite' : 'Pro';
        await tg(token, 'sendMessage', {
          chat_id: r.telegram_user_id,
          text:
            `Hi! We had to migrate the TradeClaw ${tierLabel} group to a new ` +
            `private chat. Here's your fresh single-use invite (expires in 72h):\n\n` +
            `${link.invite_link}\n\n` +
            `Sorry for the hiccup — your subscription is fully active.`,
        });

        await client.query(
          `INSERT INTO telegram_invites
             (user_id, tier, invite_link, telegram_chat_id, is_active, expires_at)
           VALUES ($1, $2, $3, $4::bigint, TRUE, NOW() + INTERVAL '72 hours')`,
          [r.id, r.tier, link.invite_link, proGroupBig.toString()],
        );

        sent++;
        console.log(`  ✓ ${r.email}`);
      } catch (err) {
        failed++;
        console.error(`  ✗ ${r.email}: ${err.message}`);
      }
    }

    console.log('');
    console.log(`[resend-invites] sent=${sent}  failed=${failed}  total=${rows.length}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`[resend-invites] fatal: ${err.message}`);
  process.exit(1);
});
