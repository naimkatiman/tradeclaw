#!/usr/bin/env node
// ============================================================================
// TradeClaw — JSON → Supabase Migration Script
// Reads data/*.json files and upserts them into your Supabase project.
//
// Usage:
//   node supabase/migrate.js              # migrate all data
//   node supabase/migrate.js --dry-run    # preview without writing
//   node supabase/migrate.js --seed       # insert seed data only
//
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment or .env
// ============================================================================

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load environment variables from .env if present
// ---------------------------------------------------------------------------
const envPath = path.resolve(__dirname, '..', 'apps', 'web', '.env.local');
const envPathRoot = path.resolve(__dirname, '..', '.env');
for (const p of [envPath, envPathRoot]) {
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w]+)\s*=\s*(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const SEED_ONLY = process.argv.includes('--seed');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set.');
  console.error('Set them in your environment or in apps/web/.env.local');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Minimal Supabase REST client (no dependency on @supabase/supabase-js)
// ---------------------------------------------------------------------------
async function supabaseRequest(table, method, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
  };
  const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${table}: ${res.status} — ${text}`);
  }
  return res;
}

async function upsert(table, rows) {
  if (!rows || rows.length === 0) return 0;
  if (DRY_RUN) return rows.length;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    await supabaseRequest(table, 'POST', rows.slice(i, i + BATCH));
  }
  return rows.length;
}

// ---------------------------------------------------------------------------
// Read a JSON data file (returns null if missing)
// ---------------------------------------------------------------------------
function readJson(filename) {
  const filePath = path.resolve(__dirname, '..', 'apps', 'web', 'data', filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    console.warn(`  Warning: Could not parse ${filename}, skipping.`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Migration map: JSON file → table + row transformer
// ---------------------------------------------------------------------------
const MIGRATIONS = [
  {
    file: 'api-keys.json',
    table: 'api_keys',
    transform(data) {
      const keys = Array.isArray(data) ? data : data?.keys || [];
      return keys.map((k) => ({
        id: k.id,
        key: k.key,
        name: k.name || '',
        email: k.email || '',
        description: k.description || '',
        scopes: k.scopes || [],
        created_at: k.createdAt,
        last_used_at: k.lastUsedAt || null,
        request_count: k.requestCount || 0,
        rate_limit: k.rateLimit || 100,
        status: k.status || 'active',
        active: k.active !== false,
        tier: k.tier || 'free',
      }));
    },
  },
  {
    file: 'users.json',
    table: 'users',
    transform(data) {
      const users = Array.isArray(data) ? data : data?.users || [];
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        use_case: u.useCase || '',
        country: u.country || '',
        created_at: u.createdAt || new Date().toISOString(),
      }));
    },
  },
  {
    file: 'signal-history.json',
    table: 'signal_history',
    transform(data) {
      const signals = Array.isArray(data) ? data : data?.signals || [];
      return signals.map((s) => ({
        id: s.id,
        pair: s.pair,
        timeframe: s.timeframe,
        direction: s.direction,
        confidence: s.confidence,
        entry_price: s.entryPrice,
        timestamp: s.timestamp,
        tp1: s.tp1 || null,
        sl: s.sl || null,
        is_simulated: s.isSimulated || false,
        last_verified: s.lastVerified || null,
        outcomes: s.outcomes || {},
      }));
    },
  },
  {
    file: 'paper-trading.json',
    table: 'paper_positions',
    transform(data) {
      const portfolio = data?.portfolio || data || {};
      return (portfolio.positions || []).map((p) => ({
        id: p.id,
        symbol: p.symbol,
        direction: p.direction,
        entry_price: p.entryPrice,
        quantity: p.quantity,
        opened_at: p.openedAt,
        signal_id: p.signalId || null,
        stop_loss: p.stopLoss || null,
        take_profit: p.takeProfit || null,
      }));
    },
    extra: [
      {
        table: 'paper_trades',
        transform(data) {
          const portfolio = data?.portfolio || data || {};
          return (portfolio.history || []).map((t) => ({
            id: t.id,
            symbol: t.symbol,
            direction: t.direction,
            entry_price: t.entryPrice,
            exit_price: t.exitPrice,
            quantity: t.quantity,
            pnl: t.pnl,
            pnl_percent: t.pnlPercent,
            opened_at: t.openedAt,
            closed_at: t.closedAt,
            signal_id: t.signalId || null,
            exit_reason: t.exitReason || 'manual',
          }));
        },
      },
      {
        table: 'paper_equity',
        transform(data) {
          const portfolio = data?.portfolio || data || {};
          return (portfolio.equityCurve || []).map((e) => ({
            timestamp: e.timestamp,
            equity: e.equity,
            balance: e.balance,
          }));
        },
      },
    ],
  },
  {
    file: 'webhooks.json',
    table: 'webhooks',
    transform(data) {
      const hooks = Array.isArray(data) ? data : data?.webhooks || [];
      return hooks.map((w) => ({
        id: w.id,
        name: w.name,
        url: w.url,
        secret: w.secret || null,
        pairs: w.pairs || 'all',
        min_confidence: w.minConfidence || 0,
        enabled: w.enabled !== false,
        created_at: w.createdAt || new Date().toISOString(),
        last_delivery: w.lastDelivery || null,
        delivery_count: w.deliveryCount || 0,
        fail_count: w.failCount || 0,
      }));
    },
    extra: [
      {
        table: 'webhook_deliveries',
        transform(data) {
          const hooks = Array.isArray(data) ? data : data?.webhooks || [];
          const rows = [];
          for (const w of hooks) {
            for (const d of w.deliveryLog || []) {
              rows.push({
                webhook_id: w.id,
                timestamp: d.timestamp,
                status_code: d.statusCode || null,
                success: d.success,
                attempt: d.attempt || 1,
                response_time: d.responseTime || 0,
                error: d.error || null,
              });
            }
          }
          return rows;
        },
      },
    ],
  },
  {
    file: 'plugins.json',
    table: 'plugins',
    transform(data) {
      const plugins = Array.isArray(data) ? data : data?.plugins || [];
      return plugins.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        version: p.version || '1.0.0',
        author: p.author || '',
        category: p.category || 'custom',
        code: p.code || '',
        params: p.params || [],
        enabled: p.enabled !== false,
        created_at: p.createdAt,
        updated_at: p.updatedAt || p.createdAt,
      }));
    },
  },
  {
    file: 'price-alerts.json',
    table: 'price_alerts',
    transform(data) {
      const alerts = Array.isArray(data) ? data : data?.alerts || [];
      return alerts.map((a) => ({
        id: a.id,
        symbol: a.symbol,
        direction: a.direction,
        target_price: a.targetPrice,
        current_price: a.currentPrice || 0,
        percent_move: a.percentMove || null,
        time_window: a.timeWindow || null,
        status: a.status || 'active',
        triggered_at: a.triggeredAt || null,
        created_at: a.createdAt || new Date().toISOString(),
        note: a.note || null,
      }));
    },
  },
  {
    file: 'waitlist.json',
    table: 'waitlist',
    transform(data) {
      const entries = Array.isArray(data) ? data : data?.entries || [];
      return entries.map((e) => ({
        email: e.email,
        referral_code: e.referralCode,
        referred_by: e.referredBy || null,
        referral_count: e.referralCount || 0,
        joined_at: e.joinedAt || new Date().toISOString(),
      }));
    },
  },
  {
    file: 'email-subscribers.json',
    table: 'email_subscribers',
    transform(data) {
      const subs = Array.isArray(data) ? data : data?.subscribers || [];
      return subs.map((s) => ({
        id: s.id,
        email: s.email,
        pairs: s.pairs || [],
        min_confidence: s.minConfidence || 70,
        frequency: s.frequency || 'daily',
        created_at: s.createdAt || new Date().toISOString(),
        active: s.active !== false,
        token: s.token,
      }));
    },
  },
  {
    file: 'telegram-subscribers.json',
    table: 'telegram_subscribers',
    transform(data) {
      const subs = Array.isArray(data) ? data : data?.subscribers || [];
      return subs.map((s) => ({
        chat_id: s.chatId,
        username: s.username || null,
        first_name: s.firstName || null,
        subscribed_pairs: s.subscribedPairs || 'all',
        min_confidence: s.minConfidence || 70,
        created_at: s.createdAt || new Date().toISOString(),
      }));
    },
  },
  {
    file: 'sms-subscribers.json',
    table: 'sms_subscribers',
    transform(data) {
      const subs = Array.isArray(data) ? data : data?.subscribers || [];
      return subs.map((s) => ({
        id: s.id,
        phone: s.phone,
        pairs: s.pairs || [],
        min_confidence: s.minConfidence || 70,
        created_at: s.createdAt || new Date().toISOString(),
        active: s.active !== false,
      }));
    },
  },
  {
    file: 'votes.json',
    table: 'votes',
    transform(data) {
      const pairs = data?.pairs || {};
      const weekStart = data?.weekStart || new Date().toISOString().slice(0, 10);
      const rows = [];
      for (const [pair, votes] of Object.entries(pairs)) {
        for (const [direction, count] of Object.entries(votes)) {
          if (count > 0) {
            rows.push({ pair, direction, week_start: weekStart, count });
          }
        }
      }
      return rows;
    },
  },
  {
    file: 'pledges.json',
    table: 'pledges',
    transform(data) {
      const pledges = Array.isArray(data) ? data : data?.pledges || [];
      return pledges.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        milestone_stars: p.milestoneStars,
        created_at: p.createdAt || new Date().toISOString(),
      }));
    },
  },
  {
    file: 'tradingview-alerts.json',
    table: 'tradingview_alerts',
    transform(data) {
      const alerts = Array.isArray(data) ? data : data?.alerts || [];
      return alerts.map((a) => ({
        id: a.id,
        symbol: a.symbol,
        exchange: a.exchange || null,
        interval: a.interval || null,
        action: a.action,
        close: a.close || null,
        volume: a.volume || null,
        message: a.message || null,
        received_at: a.receivedAt || new Date().toISOString(),
        normalized_pair: a.normalizedPair,
        normalized_action: a.normalizedAction,
      }));
    },
  },
  {
    file: 'push-subscriptions.json',
    table: 'push_subscriptions',
    transform(data) {
      const subs = Array.isArray(data) ? data : data?.subscriptions || [];
      return subs.map((s) => ({
        id: s.id,
        endpoint: s.endpoint,
        keys: s.keys || {},
        prefs: s.prefs || {},
        created_at: s.createdAt || new Date().toISOString(),
      }));
    },
  },
  {
    file: 'slack-integrations.json',
    table: 'slack_integrations',
    transform(data) {
      const integrations = Array.isArray(data) ? data : data?.integrations || [];
      return integrations.map((s) => ({
        id: s.id,
        name: s.name,
        webhook_url: s.webhookUrl,
        channel: s.channel || '#trading-signals',
        pairs: s.pairs || 'all',
        min_confidence: s.minConfidence || 70,
        direction: s.direction || 'ALL',
        enabled: s.enabled !== false,
        created_at: s.createdAt || new Date().toISOString(),
        last_delivery: s.lastDelivery || null,
        delivery_count: s.deliveryCount || 0,
        fail_count: s.failCount || 0,
      }));
    },
  },
  {
    file: 'telegram-broadcast-state.json',
    table: 'broadcast_state',
    transform(data) {
      if (!data) return [];
      return [
        {
          last_broadcast_time: data.lastBroadcastTime || null,
          last_message_id: data.lastMessageId || null,
          last_error: data.lastError || null,
          broadcast_count: data.broadcastCount || 0,
        },
      ];
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n  TradeClaw → Supabase Migration${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`  Target: ${SUPABASE_URL}\n`);

  if (SEED_ONLY) {
    console.log('  --seed flag: skipping JSON migration, running seed data only.');
    console.log('  Seed data should be inserted via: psql < supabase/seed.sql');
    console.log('  Or paste seed.sql into your Supabase SQL Editor.\n');
    return;
  }

  let totalRows = 0;
  const results = [];

  for (const m of MIGRATIONS) {
    const data = readJson(m.file);
    if (data === null) {
      results.push({ table: m.table, file: m.file, count: 0, skipped: true });
      continue;
    }

    try {
      const rows = m.transform(data);
      const count = await upsert(m.table, rows);
      results.push({ table: m.table, file: m.file, count });
      totalRows += count;

      // Handle extra tables (e.g. webhook_deliveries from webhooks.json)
      if (m.extra) {
        for (const ex of m.extra) {
          const exRows = ex.transform(data);
          const exCount = await upsert(ex.table, exRows);
          results.push({ table: ex.table, file: m.file, count: exCount });
          totalRows += exCount;
        }
      }
    } catch (err) {
      results.push({ table: m.table, file: m.file, count: 0, error: err.message });
    }
  }

  // Print results
  console.log(`  ${'Table'.padEnd(30)} ${'Source'.padEnd(25)} Rows`);
  console.log('  ' + '-'.repeat(70));
  for (const r of results) {
    if (r.skipped) {
      console.log(`  ${r.table.padEnd(30)} ${r.file.padEnd(25)} skipped (no file)`);
    } else if (r.error) {
      console.log(`  ${r.table.padEnd(30)} ${r.file.padEnd(25)} ERROR: ${r.error}`);
    } else {
      console.log(`  ${r.table.padEnd(30)} ${r.file.padEnd(25)} ${r.count}`);
    }
  }

  console.log('\n  ' + '-'.repeat(70));
  console.log(`  Total: ${totalRows} rows ${DRY_RUN ? 'would be ' : ''}migrated.\n`);

  if (DRY_RUN) {
    console.log('  This was a dry run. No data was written to Supabase.');
    console.log('  Run without --dry-run to execute the migration.\n');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
