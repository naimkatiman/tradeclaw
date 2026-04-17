# Unified Alert Rule Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single alert rule setup screen where users configure one rule and choose which channels (Telegram, Email, Discord) receive it — turning TradeClaw into the notification hub rather than requiring separate setups per channel.

**Architecture:** The channel adapters (`TelegramChannel`, `DiscordChannel`, `WebhookChannel`) already exist in `packages/agent/src/channels/`. The existing `AlertRuleBuilder` is localStorage-only with browser-push only. This plan: (1) adds a `user_alert_rules` Postgres table to persist rules server-side, (2) adds a `user_channel_configs` table for per-user channel credentials (bot token, webhook URL), (3) creates a `/api/alert-rules` CRUD API, (4) creates a `/api/alert-rules/dispatch` route that the signal cron calls to fan out signals matching active rules to their configured channels, (5) builds a new `UnifiedAlertSetup` page that replaces the localStorage-only builder for authenticated users.

**Tech Stack:** Next.js API routes, PostgreSQL (Supabase), existing `packages/agent/src/channels/` adapters, React client component, Zod for input validation.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260416_alert_rules.sql` | Add `user_alert_rules` + `user_channel_configs` tables |
| Create | `apps/web/lib/alert-rules-db.ts` | DB read/write for alert rules and channel configs |
| Create | `apps/web/app/api/alert-rules/route.ts` | GET (list), POST (create) |
| Create | `apps/web/app/api/alert-rules/[id]/route.ts` | PATCH (update), DELETE |
| Create | `apps/web/app/api/alert-rules/dispatch/route.ts` | POST: fan out a signal to matching rules |
| Create | `apps/web/app/settings/alerts/page.tsx` | New unified alert setup page |
| Create | `apps/web/app/settings/alerts/UnifiedAlertSetup.tsx` | Client component: rule builder + channel config |
| Create | `apps/web/lib/__tests__/alert-rules-dispatch.test.ts` | Unit tests for dispatch matching logic |
| Modify | `apps/web/lib/tracked-signals.ts` | Call dispatch API after recording signals |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260416_alert_rules.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260416_alert_rules.sql

-- Channel credentials per user (one row per channel type)
CREATE TABLE IF NOT EXISTS user_channel_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  channel     TEXT NOT NULL CHECK (channel IN ('telegram', 'discord', 'email', 'webhook')),
  config      JSONB NOT NULL DEFAULT '{}',
  -- telegram: { botToken, chatId }
  -- discord:  { webhookUrl }
  -- email:    { address }
  -- webhook:  { url }
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, channel)
);

-- Alert rules: what to match, which channels to notify
CREATE TABLE IF NOT EXISTS user_alert_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  name            TEXT NOT NULL,
  symbol          TEXT,            -- NULL = all symbols
  timeframe       TEXT,            -- NULL = all timeframes
  direction       TEXT CHECK (direction IN ('BUY', 'SELL', NULL)),
  min_confidence  INTEGER NOT NULL DEFAULT 70,
  channels        TEXT[] NOT NULL DEFAULT '{}',
  -- array of channel names: 'telegram', 'discord', 'email', 'webhook'
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_user ON user_alert_rules (user_id);
CREATE INDEX IF NOT EXISTS idx_channel_configs_user ON user_channel_configs (user_id);
```

- [ ] **Step 2: Apply migration locally**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
psql $DATABASE_URL -f supabase/migrations/20260416_alert_rules.sql
```
Expected: `CREATE TABLE`, `CREATE INDEX` — no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260416_alert_rules.sql
git commit -m "feat(alerts): add user_alert_rules and user_channel_configs tables"
```

---

### Task 2: DB Access Layer + Dispatch Logic Tests

**Files:**
- Create: `apps/web/lib/alert-rules-db.ts`
- Test: `apps/web/lib/__tests__/alert-rules-dispatch.test.ts`

- [ ] **Step 1: Write failing tests for the matching logic**

```typescript
// apps/web/lib/__tests__/alert-rules-dispatch.test.ts
import { signalMatchesRule } from '../alert-rules-db';

const baseRule = {
  id: 'r1',
  user_id: 'u1',
  name: 'Test',
  symbol: null,
  timeframe: null,
  direction: null,
  min_confidence: 70,
  channels: ['telegram'],
  enabled: true,
};

const baseSignal = {
  symbol: 'BTCUSD',
  timeframe: 'H1',
  direction: 'BUY' as const,
  confidence: 75,
};

describe('signalMatchesRule', () => {
  it('matches when rule has no filters', () => {
    expect(signalMatchesRule(baseSignal, baseRule)).toBe(true);
  });

  it('respects symbol filter', () => {
    const rule = { ...baseRule, symbol: 'XAUUSD' };
    expect(signalMatchesRule(baseSignal, rule)).toBe(false);
    expect(signalMatchesRule({ ...baseSignal, symbol: 'XAUUSD' }, rule)).toBe(true);
  });

  it('respects direction filter', () => {
    const rule = { ...baseRule, direction: 'SELL' as const };
    expect(signalMatchesRule(baseSignal, rule)).toBe(false);
    expect(signalMatchesRule({ ...baseSignal, direction: 'SELL' }, rule)).toBe(true);
  });

  it('respects min_confidence filter', () => {
    const rule = { ...baseRule, min_confidence: 80 };
    expect(signalMatchesRule(baseSignal, rule)).toBe(false);
    expect(signalMatchesRule({ ...baseSignal, confidence: 85 }, rule)).toBe(true);
  });

  it('rejects disabled rules', () => {
    const rule = { ...baseRule, enabled: false };
    expect(signalMatchesRule(baseSignal, rule)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest apps/web/lib/__tests__/alert-rules-dispatch.test.ts --no-cache`
Expected: FAIL with "Cannot find module '../alert-rules-db'"

- [ ] **Step 3: Write the DB access layer with signalMatchesRule**

```typescript
// apps/web/lib/alert-rules-db.ts
import 'server-only';
import { sql } from './db'; // existing db helper — same used in signal-history.ts

export interface AlertRule {
  id: string;
  user_id: string;
  name: string;
  symbol: string | null;
  timeframe: string | null;
  direction: 'BUY' | 'SELL' | null;
  min_confidence: number;
  channels: string[];
  enabled: boolean;
}

export interface ChannelConfig {
  id: string;
  user_id: string;
  channel: 'telegram' | 'discord' | 'email' | 'webhook';
  config: Record<string, string>;
  enabled: boolean;
}

interface SignalInput {
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
}

/** Pure function — no I/O. Exported for testing. */
export function signalMatchesRule(signal: SignalInput, rule: AlertRule): boolean {
  if (!rule.enabled) return false;
  if (rule.symbol && rule.symbol.toUpperCase() !== signal.symbol.toUpperCase()) return false;
  if (rule.timeframe && rule.timeframe !== signal.timeframe) return false;
  if (rule.direction && rule.direction !== signal.direction) return false;
  if (signal.confidence < rule.min_confidence) return false;
  return true;
}

export async function getAlertRulesForUser(userId: string): Promise<AlertRule[]> {
  const rows = await sql<AlertRule[]>`
    SELECT * FROM user_alert_rules
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows;
}

export async function getAllEnabledRules(): Promise<AlertRule[]> {
  const rows = await sql<AlertRule[]>`
    SELECT * FROM user_alert_rules WHERE enabled = true
  `;
  return rows;
}

export async function getChannelConfigsForUser(userId: string): Promise<ChannelConfig[]> {
  const rows = await sql<ChannelConfig[]>`
    SELECT * FROM user_channel_configs WHERE user_id = ${userId}
  `;
  return rows;
}

export async function upsertChannelConfig(
  userId: string,
  channel: ChannelConfig['channel'],
  config: Record<string, string>,
  enabled: boolean,
): Promise<void> {
  await sql`
    INSERT INTO user_channel_configs (user_id, channel, config, enabled)
    VALUES (${userId}, ${channel}, ${JSON.stringify(config)}, ${enabled})
    ON CONFLICT (user_id, channel)
    DO UPDATE SET config = EXCLUDED.config, enabled = EXCLUDED.enabled, updated_at = NOW()
  `;
}

export async function createAlertRule(
  userId: string,
  rule: Omit<AlertRule, 'id' | 'user_id'>,
): Promise<AlertRule> {
  const [row] = await sql<AlertRule[]>`
    INSERT INTO user_alert_rules
      (user_id, name, symbol, timeframe, direction, min_confidence, channels, enabled)
    VALUES
      (${userId}, ${rule.name}, ${rule.symbol ?? null}, ${rule.timeframe ?? null},
       ${rule.direction ?? null}, ${rule.min_confidence}, ${rule.channels}, ${rule.enabled})
    RETURNING *
  `;
  return row;
}

export async function updateAlertRule(
  id: string,
  userId: string,
  patch: Partial<Omit<AlertRule, 'id' | 'user_id'>>,
): Promise<AlertRule | null> {
  const [row] = await sql<AlertRule[]>`
    UPDATE user_alert_rules
    SET
      name = COALESCE(${patch.name ?? null}, name),
      symbol = COALESCE(${patch.symbol ?? null}, symbol),
      timeframe = COALESCE(${patch.timeframe ?? null}, timeframe),
      direction = COALESCE(${patch.direction ?? null}, direction),
      min_confidence = COALESCE(${patch.min_confidence ?? null}, min_confidence),
      channels = COALESCE(${patch.channels ?? null}, channels),
      enabled = COALESCE(${patch.enabled ?? null}, enabled),
      updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return row ?? null;
}

export async function deleteAlertRule(id: string, userId: string): Promise<void> {
  await sql`
    DELETE FROM user_alert_rules WHERE id = ${id} AND user_id = ${userId}
  `;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/naim/.openclaw/workspace/tradeclaw && npx jest apps/web/lib/__tests__/alert-rules-dispatch.test.ts --no-cache`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/alert-rules-db.ts apps/web/lib/__tests__/alert-rules-dispatch.test.ts
git commit -m "feat(alerts): add alert-rules-db with signalMatchesRule and CRUD helpers"
```

---

### Task 3: API Routes

**Files:**
- Create: `apps/web/app/api/alert-rules/route.ts`
- Create: `apps/web/app/api/alert-rules/[id]/route.ts`
- Create: `apps/web/app/api/alert-rules/dispatch/route.ts`

- [ ] **Step 1: Write the list/create route**

```typescript
// apps/web/app/api/alert-rules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAlertRulesForUser, createAlertRule } from '@/lib/alert-rules-db';
import { getSessionUser } from '@/lib/session'; // existing session helper

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  symbol: z.string().nullable().default(null),
  timeframe: z.string().nullable().default(null),
  direction: z.enum(['BUY', 'SELL']).nullable().default(null),
  min_confidence: z.number().int().min(0).max(100).default(70),
  channels: z.array(z.enum(['telegram', 'discord', 'email', 'webhook'])).min(1),
  enabled: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rules = await getAlertRulesForUser(user.id);
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const rule = await createAlertRule(user.id, parsed.data);
  return NextResponse.json({ rule }, { status: 201 });
}
```

- [ ] **Step 2: Write the update/delete route**

```typescript
// apps/web/app/api/alert-rules/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateAlertRule, deleteAlertRule } from '@/lib/alert-rules-db';
import { getSessionUser } from '@/lib/session';

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  symbol: z.string().nullable().optional(),
  timeframe: z.string().nullable().optional(),
  direction: z.enum(['BUY', 'SELL']).nullable().optional(),
  min_confidence: z.number().int().min(0).max(100).optional(),
  channels: z.array(z.enum(['telegram', 'discord', 'email', 'webhook'])).min(1).optional(),
  enabled: z.boolean().optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const rule = await updateAlertRule(id, user.id, parsed.data);
  if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ rule });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await deleteAlertRule(id, user.id);
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Write the dispatch route**

```typescript
// apps/web/app/api/alert-rules/dispatch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllEnabledRules, getChannelConfigsForUser, signalMatchesRule } from '@/lib/alert-rules-db';
import { createChannel } from '@tradeclaw/agent/channels/base';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  // Guard: only callable by internal cron (same CRON_SECRET pattern used elsewhere)
  const auth = req.headers.get('authorization');
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { signal } = body as { signal: {
    symbol: string; timeframe: string; direction: 'BUY' | 'SELL';
    confidence: number; [key: string]: unknown;
  }};

  if (!signal?.symbol) {
    return NextResponse.json({ error: 'signal is required' }, { status: 400 });
  }

  const rules = await getAllEnabledRules();
  const matching = rules.filter((r) => signalMatchesRule(signal, r));

  const results: { ruleId: string; channel: string; success: boolean }[] = [];

  for (const rule of matching) {
    const configs = await getChannelConfigsForUser(rule.user_id);
    const configsByChannel = new Map(configs.map((c) => [c.channel, c]));

    for (const channelName of rule.channels) {
      const cfg = configsByChannel.get(channelName);
      if (!cfg || !cfg.enabled) continue;

      const channelConfig = {
        type: channelName as 'telegram' | 'discord' | 'webhook',
        enabled: true,
        telegramBotToken: cfg.config.botToken,
        telegramChatId: cfg.config.chatId,
        discordWebhookUrl: cfg.config.webhookUrl,
        webhookUrl: cfg.config.url,
      };

      const channel = await createChannel(channelConfig);
      if (!channel) continue;

      const validationError = channel.validate();
      if (validationError) {
        results.push({ ruleId: rule.id, channel: channelName, success: false });
        continue;
      }

      const ok = await channel.sendSignal(signal as any);
      results.push({ ruleId: rule.id, channel: channelName, success: ok });
    }
  }

  return NextResponse.json({ dispatched: results.length, results });
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/alert-rules/route.ts apps/web/app/api/alert-rules/[id]/route.ts apps/web/app/api/alert-rules/dispatch/route.ts
git commit -m "feat(alerts): add alert-rules CRUD and dispatch API routes"
```

---

### Task 4: Call Dispatch From Signal Pipeline

**Files:**
- Modify: `apps/web/lib/tracked-signals.ts`

- [ ] **Step 1: Read tracked-signals.ts lines 80 onward to find where recordSignalsAsync is called**

The existing `recordSignalsAsync(toRecord)` call is the point to fan out dispatch. Add an async fan-out call after it.

- [ ] **Step 2: Add dispatch call after recording**

After the `recordSignalsAsync(toRecord)` line, add:

```typescript
// Fan out to user alert rules — fire and forget, no await
if (toRecord.length > 0) {
  const dispatchUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/alert-rules/dispatch`
    : null;
  if (dispatchUrl) {
    for (const sig of toRecord) {
      fetch(dispatchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}`,
        },
        body: JSON.stringify({ signal: sig }),
      }).catch(() => undefined);
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/tracked-signals.ts
git commit -m "feat(alerts): dispatch signals to alert rules after recording in tracked-signals"
```

---

### Task 5: Unified Alert Setup UI

**Files:**
- Create: `apps/web/app/settings/alerts/page.tsx`
- Create: `apps/web/app/settings/alerts/UnifiedAlertSetup.tsx`

- [ ] **Step 1: Write the page shell**

```tsx
// apps/web/app/settings/alerts/page.tsx
import type { Metadata } from 'next';
import UnifiedAlertSetup from './UnifiedAlertSetup';

export const metadata: Metadata = {
  title: 'Alert Rules — TradeClaw',
  description: 'Configure signal alerts for Telegram, Discord, and Email from one screen.',
};

export default function AlertSettingsPage() {
  return <UnifiedAlertSetup />;
}
```

- [ ] **Step 2: Write the UnifiedAlertSetup client component**

```tsx
// apps/web/app/settings/alerts/UnifiedAlertSetup.tsx
'use client';

import { useState, useEffect } from 'react';

type Channel = 'telegram' | 'discord' | 'email' | 'webhook';

interface AlertRule {
  id: string;
  name: string;
  symbol: string | null;
  timeframe: string | null;
  direction: 'BUY' | 'SELL' | null;
  min_confidence: number;
  channels: Channel[];
  enabled: boolean;
}

const SYMBOLS = ['', 'BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'AUDUSD', 'XRPUSD'];
const TIMEFRAMES = ['', 'M15', 'H1', 'H4', 'D1'];
const CHANNELS: { id: Channel; label: string; placeholder: string }[] = [
  { id: 'telegram', label: 'Telegram', placeholder: 'Bot token & Chat ID' },
  { id: 'discord', label: 'Discord', placeholder: 'Webhook URL' },
  { id: 'email', label: 'Email', placeholder: 'Email address' },
  { id: 'webhook', label: 'Webhook', placeholder: 'HTTPS URL' },
];

function defaultRule(): Omit<AlertRule, 'id'> {
  return {
    name: 'My Alert',
    symbol: null,
    timeframe: null,
    direction: null,
    min_confidence: 70,
    channels: ['telegram'],
    enabled: true,
  };
}

export default function UnifiedAlertSetup() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [draft, setDraft] = useState(defaultRule());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/alert-rules')
      .then((r) => r.json())
      .then((d) => setRules(d.rules ?? []))
      .catch(() => {});
  }, []);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/alert-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(JSON.stringify(d.error));
        return;
      }
      const d = await res.json();
      setRules((prev) => [d.rule, ...prev]);
      setDraft(defaultRule());
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/alert-rules/${id}`, { method: 'DELETE' });
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleToggle(id: string, enabled: boolean) {
    const res = await fetch(`/api/alert-rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) {
      const d = await res.json();
      setRules((prev) => prev.map((r) => r.id === id ? d.rule : r));
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white font-mono">Alert Rules</h1>
        <p className="text-sm text-zinc-500 mt-1">
          One rule, multiple channels — get notified on Telegram, Discord, and Email simultaneously.
        </p>
      </div>

      {/* Create Form */}
      <section className="bg-[#111] border border-white/10 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white font-mono">New Rule</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">Name</label>
            <input
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">Symbol</label>
            <select
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30"
              value={draft.symbol ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, symbol: e.target.value || null }))}
            >
              {SYMBOLS.map((s) => <option key={s} value={s}>{s || 'All symbols'}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">Timeframe</label>
            <select
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30"
              value={draft.timeframe ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, timeframe: e.target.value || null }))}
            >
              {TIMEFRAMES.map((t) => <option key={t} value={t}>{t || 'All timeframes'}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">Direction</label>
            <select
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30"
              value={draft.direction ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, direction: (e.target.value as 'BUY' | 'SELL') || null }))}
            >
              <option value="">Both</option>
              <option value="BUY">BUY only</option>
              <option value="SELL">SELL only</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">
            Min Confidence: {draft.min_confidence}%
          </label>
          <input
            type="range" min={50} max={95} step={5}
            className="mt-1 w-full accent-emerald-500"
            value={draft.min_confidence}
            onChange={(e) => setDraft((d) => ({ ...d, min_confidence: Number(e.target.value) }))}
          />
        </div>

        <div>
          <label className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider mb-2 block">
            Notify via
          </label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => {
              const active = draft.channels.includes(ch.id);
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      channels: active
                        ? d.channels.filter((c) => c !== ch.id)
                        : [...d.channels, ch.id],
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                    active
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={saving || draft.channels.length === 0}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-mono font-semibold text-sm py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Create Rule'}
        </button>
      </section>

      {/* Existing Rules */}
      {rules.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-400 font-mono">Active Rules</h2>
          {rules.map((rule) => (
            <div key={rule.id} className="bg-[#111] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-mono font-medium text-white">{rule.name}</p>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  {[rule.symbol ?? 'all', rule.timeframe ?? 'all TF', rule.direction ?? 'both', `≥${rule.min_confidence}%`].join(' · ')}
                  {' → '}
                  {rule.channels.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggle(rule.id, !rule.enabled)}
                  className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
                    rule.enabled
                      ? 'text-emerald-400 border-emerald-500/30'
                      : 'text-zinc-600 border-white/10'
                  }`}
                >
                  {rule.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none"
                  aria-label="Delete rule"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/settings/alerts/page.tsx apps/web/app/settings/alerts/UnifiedAlertSetup.tsx
git commit -m "feat(alerts): add UnifiedAlertSetup page at /settings/alerts"
```

---

### Task 6: Build & Verify

- [ ] **Step 1: Run full build**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && npm run build
```

- [ ] **Step 2: Smoke test in browser**

Navigate to `http://localhost:3000/settings/alerts` — form renders, create a rule, verify it appears in list with ON/OFF toggle.

- [ ] **Step 3: Verify dispatch path**

Check `apps/web/lib/tracked-signals.ts` correctly imports and calls dispatch without breaking type checking.

- [ ] **Step 4: Final commit if any build fixes needed**

```bash
git add -A && git commit -m "fix(alerts): resolve build issues"
```
