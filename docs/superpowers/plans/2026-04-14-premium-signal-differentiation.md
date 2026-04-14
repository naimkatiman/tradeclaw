# Premium Signal Differentiation — Plan (D + B)

**Date:** 2026-04-14
**Goal:** Make premium licenses functionally meaningful. Today the gating layer filters by `strategy_id` label, but all 5 strategies emit identical signals because `signal-generator.ts` doesn't dispatch by preset. Premium = same signals with a different tag.

This plan delivers two changes that fix that:

- **Track B (fast win, ~half day):** Per-preset confidence thresholds. Premium presets see signals that the free `classic` preset filters out. Zero new infra — just a lookup table.
- **Track D (the real product, ~3–4 days):** A webhook ingest that lets Zaky's TradingView Pine Script alerts populate a `premium_signals` table. Those signals merge into the read path under their own `strategy_id`s and are gated by the existing license system.

Tracks B and D are independent and ship in that order. B unblocks "premium has visible value today"; D delivers the actual differentiator.

---

## Track B — Per-Preset Confidence Thresholds

### Motivation
`apps/web/lib/signal-thresholds.ts` exports a single `PUBLISHED_SIGNAL_MIN_CONFIDENCE = 70`. `getTrackedSignals` filters everything below 70 before recording. Lower the threshold for premium presets and they immediately see more signals — without changing generator logic.

### Data model
None. Pure code change.

### Files

**Modify [apps/web/lib/signal-thresholds.ts](apps/web/lib/signal-thresholds.ts)**
```ts
export const PUBLISHED_SIGNAL_MIN_CONFIDENCE = 70;
export const WATCHLIST_MIN_CONFIDENCE = 60;

// Per-strategy floor. Anything missing falls back to the published default.
// Premium strategies get a lower floor → more signals reach the user.
export const STRATEGY_MIN_CONFIDENCE: Record<string, number> = {
  classic: 70,
  'regime-aware': 60,
  'hmm-top3': 55,
  'vwap-ema-bb': 60,
  'full-risk': 50,
};

export function minConfidenceFor(strategyId: string): number {
  return STRATEGY_MIN_CONFIDENCE[strategyId] ?? PUBLISHED_SIGNAL_MIN_CONFIDENCE;
}
```

**Modify [apps/web/lib/tracked-signals.ts](apps/web/lib/tracked-signals.ts)**

Today line 36–40 filters with the single global threshold. Replace with a per-strategy filter that uses the *active preset's* floor for the recording side, and the *caller's unlocked strategies* for the response side.

Concretely — keep recording behavior identical (use active preset floor, since that's what stamps `strategyId` on rows), but after the existing read-time license filter at line 111–114, drop signals whose confidence is below the floor for *their own* `strategyId`:

```ts
import { minConfidenceFor, PUBLISHED_SIGNAL_MIN_CONFIDENCE } from './signal-thresholds';

// existing filter at line 36 stays at PUBLISHED_SIGNAL_MIN_CONFIDENCE — that's
// the floor for the recording pipeline, which uses the active preset id.

// AFTER the license filter at line 111–114, add:
result.signals = result.signals.filter((s) => {
  const sid = s.strategyId ?? FREE_STRATEGY;
  return s.confidence >= minConfidenceFor(sid);
});
```

Wait — this doesn't actually deliver more signals to premium users, because the recording-side filter at line 36 already dropped everything below 70 before the strategyId was assigned. Need to restructure:

**Real change:** drop the line-36 filter entirely. Move confidence filtering *after* `strategyId` is stamped on each signal in the `recordPayload` map, using `minConfidenceFor(strategyId)`. For the response side, do the same filter post-license-filter using each signal's own strategyId.

Currently `strategyId` is computed once (`getActivePreset().id`) and applied to all rows in `recordPayload`. That's fine for recording — the active preset is the "source" tag. For the response side, signals come back from `getSignals` *without* a strategyId and inherit `FREE_STRATEGY` in the license filter. To make per-strategy floors meaningful on the response side, we need the response signals to also carry the active preset's id (or some strategyId) before the license filter runs.

**Resolution:** stamp `strategyId = getActivePreset().id` onto every `result.signals` entry early, before any filtering. Then:
- Recording filter uses `minConfidenceFor(strategyId)` per row.
- License filter uses the same `strategyId`.
- A premium user with `regime-aware` unlocked sees signals tagged `regime-aware` (because the active preset is `regime-aware` for them? no — active preset is global).

This exposes the real architectural gap: a single active preset means there is no way for a free user and a premium user hitting the same endpoint at the same time to get *different* signals from the *same* generator output. Track B alone can't do this without per-request preset selection.

**Revised Track B scope:** Add a per-request preset override. `getTrackedSignals` accepts an optional `strategyId` param (defaults to active preset). Caller derives it from the license context: pick the highest-tier strategy the user has unlocked, fall back to `classic`. The recording pipeline still uses the global active preset (don't pollute the historical record). Only the *response* gets the per-user view.

```ts
// In getTrackedSignals, after license context is resolved:
const userStrategyId = pickHighestUnlocked(ctx);  // 'full-risk' > 'hmm-top3' > … > 'classic'
const userFloor = minConfidenceFor(userStrategyId);

// Refilter the response (which already has license filtering applied):
result.signals = result.signals.filter((s) => s.confidence >= userFloor);
```

This needs the *unfiltered* signal set — meaning the line-36 recording filter must stay (to keep recording clean) but we need to call `getSignals` with `minConfidence: 0` or rely on the fact that it already returns everything ≥0 by default. Verified: `getSignals` doesn't drop on confidence unless params.minConfidence is set, so the response set already includes signals as low as the generator emits.

**Net change for Track B:**
1. Add `STRATEGY_MIN_CONFIDENCE` + `minConfidenceFor` to `signal-thresholds.ts`.
2. Add `pickHighestUnlocked(ctx)` helper to `licenses.ts` (priority order: `full-risk`, `hmm-top3`, `vwap-ema-bb`, `regime-aware`, `classic`).
3. In `tracked-signals.ts`, after the license filter, apply `s.confidence >= minConfidenceFor(pickHighestUnlocked(ctx))`.
4. Leave recording-side behavior untouched.

Visible result: an unlocked `full-risk` user sees signals down to confidence 50 from the generator's full output. Free users see only ≥70.

### Tests
- Unit: `pickHighestUnlocked` priority order, including empty/anonymous context.
- E2E: hit `/api/signals` anonymously, count signals; hit again with an `X-License-Key` header for a `full-risk` license, expect strictly more rows (or at minimum, rows with confidence < 70 present).

### Risks
- Lowering thresholds means more low-quality signals reach premium users. This is *the point* — they're paying for raw access, not curation. Document this in the unlock UI ("Premium presets see signals down to confidence 50 — interpret accordingly.").

---

## Track D — TradingView Webhook Ingest

### Motivation
Zaky has personal Pine Script strategies on TradingView. Memory note: those are what he actually wants to monetize. TV alerts can POST to a webhook URL with a JSON payload. Ingest those into a `premium_signals` table, surface them through the existing read path, gate by license.

### Data model

**New migration: [apps/web/migrations/007_premium_signals.sql](apps/web/migrations/007_premium_signals.sql)**

```sql
CREATE TABLE IF NOT EXISTS premium_signals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     VARCHAR(128) UNIQUE,           -- TV alert id for dedupe
  strategy_id   VARCHAR(64)  NOT NULL,         -- e.g. 'tv-zaky-momentum'
  symbol        VARCHAR(32)  NOT NULL,
  timeframe     VARCHAR(8)   NOT NULL,
  direction     VARCHAR(8)   NOT NULL CHECK (direction IN ('BUY','SELL')),
  confidence    NUMERIC(5,2) NOT NULL DEFAULT 90,
  entry         NUMERIC(18,8) NOT NULL,
  stop_loss     NUMERIC(18,8),
  take_profit_1 NUMERIC(18,8),
  take_profit_2 NUMERIC(18,8),
  raw_payload   JSONB NOT NULL,
  signal_ts     TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_premium_signals_strategy_ts
  ON premium_signals(strategy_id, signal_ts DESC);
CREATE INDEX IF NOT EXISTS idx_premium_signals_symbol_ts
  ON premium_signals(symbol, signal_ts DESC);
```

`source_id` UNIQUE handles TV retry storms (alerts can fire multiple times for the same bar).

### New strategy ids
Add to `ALLOWED_PREMIUM_STRATEGIES` in [apps/web/lib/licenses.ts](apps/web/lib/licenses.ts):
- `tv-zaky-momentum`
- `tv-zaky-reversal`

(Names come from Zaky's actual Pine scripts — TBC with him before merging the migration. Keep the set in code so admin-issue forms validate against it.)

### Ingest endpoint

**New file: [apps/web/app/api/webhooks/tradingview/route.ts](apps/web/app/api/webhooks/tradingview/route.ts)**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { execute } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

const payloadSchema = z.object({
  source_id:   z.string().min(1).max(128),
  strategy_id: z.string().min(1).max(64),
  symbol:      z.string().min(1).max(32),
  timeframe:   z.string().min(1).max(8),
  direction:   z.enum(['BUY','SELL']),
  confidence:  z.number().min(0).max(100).optional(),
  entry:       z.number().positive(),
  stop_loss:   z.number().positive().optional(),
  take_profit_1: z.number().positive().optional(),
  take_profit_2: z.number().positive().optional(),
  signal_ts:   z.string().datetime(),
});

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-tv-secret');
  if (!secret || secret !== process.env.TV_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 400 });
  }

  const p = parsed.data;
  await execute(
    `INSERT INTO premium_signals
       (source_id, strategy_id, symbol, timeframe, direction, confidence,
        entry, stop_loss, take_profit_1, take_profit_2, raw_payload, signal_ts)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (source_id) DO NOTHING`,
    [
      p.source_id, p.strategy_id, p.symbol, p.timeframe, p.direction,
      p.confidence ?? 90, p.entry, p.stop_loss ?? null,
      p.take_profit_1 ?? null, p.take_profit_2 ?? null,
      JSON.stringify(p), p.signal_ts,
    ],
  );

  return NextResponse.json({ ok: true });
}
```

**Auth:** shared secret in `TV_WEBHOOK_SECRET` env var. TV alerts include it as `X-TV-Secret` (TV supports custom headers in webhook config). Document the URL + header for Zaky's TV setup.

### Read-path integration

**New file: [apps/web/lib/premium-signals.ts](apps/web/lib/premium-signals.ts)**

```ts
import 'server-only';
import { query } from './db-pool';
import type { TradingSignal } from '@tradeclaw/signals';
import type { LicenseContext } from './licenses';
import { FREE_STRATEGY } from './licenses';

interface Row {
  id: string;
  strategy_id: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: string;
  entry: string;
  stop_loss: string | null;
  take_profit_1: string | null;
  signal_ts: string;
}

export async function getPremiumSignalsFor(
  ctx: LicenseContext,
  params: { symbol?: string; timeframe?: string; direction?: string; limit?: number } = {},
): Promise<TradingSignal[]> {
  const unlocked = [...ctx.unlockedStrategies].filter((s) => s !== FREE_STRATEGY);
  if (unlocked.length === 0) return [];

  const conds: string[] = ['strategy_id = ANY($1)'];
  const args: unknown[] = [unlocked];
  if (params.symbol) {
    args.push(params.symbol.toUpperCase());
    conds.push(`symbol = $${args.length}`);
  }
  if (params.timeframe) {
    args.push(params.timeframe.toUpperCase());
    conds.push(`timeframe = $${args.length}`);
  }
  if (params.direction) {
    args.push(params.direction.toUpperCase());
    conds.push(`direction = $${args.length}`);
  }
  const limit = Math.min(params.limit ?? 50, 200);

  const rows = await query<Row>(
    `SELECT id, strategy_id, symbol, timeframe, direction, confidence,
            entry, stop_loss, take_profit_1, signal_ts
     FROM premium_signals
     WHERE ${conds.join(' AND ')}
     ORDER BY signal_ts DESC
     LIMIT ${limit}`,
    args,
  );

  return rows.map((r) => ({
    id: r.id,
    strategyId: r.strategy_id,
    symbol: r.symbol,
    timeframe: r.timeframe,
    direction: r.direction,
    confidence: parseFloat(r.confidence),
    entry: parseFloat(r.entry),
    stopLoss: r.stop_loss ? parseFloat(r.stop_loss) : 0,
    takeProfit1: r.take_profit_1 ? parseFloat(r.take_profit_1) : 0,
    timestamp: new Date(r.signal_ts).getTime(),
    source: 'real',
    dataQuality: 'real',
  } as TradingSignal));
}
```

**Modify [apps/web/lib/tracked-signals.ts](apps/web/lib/tracked-signals.ts):**

After the license filter (line 111–114), merge in premium signals for the caller's unlocked strategies, then re-sort:

```ts
import { getPremiumSignalsFor } from './premium-signals';

// after the license filter:
const premium = await getPremiumSignalsFor(ctx, {
  symbol: params.symbol,
  timeframe: params.timeframe,
  direction: params.direction,
});
result.signals = [...result.signals, ...premium]
  .sort((a, b) => b.confidence - a.confidence);
```

**Important:** premium signals must NOT be recorded into `signal_history` by `recordSignalsAsync`. They live in their own table. The merge happens *after* the recording branch. Verify no code path tries to reinsert them.

### Admin visibility

**New page: [apps/web/app/admin/premium-signals/page.tsx](apps/web/app/admin/premium-signals/page.tsx)**

Server component. Lists last 50 rows from `premium_signals` with strategy filter dropdown. No mutations — display only. Reuses existing admin middleware gating.

This lets Zaky verify his TV webhooks are landing without hitting `psql` directly.

### Tests

**Unit / integration**
- `getPremiumSignalsFor` with anonymous ctx → empty array.
- `getPremiumSignalsFor` with `tv-zaky-momentum` unlocked → filters by strategy_id.

**E2E ([apps/web/tests/e2e/premium/](apps/web/tests/e2e/premium/))**
- POST to `/api/webhooks/tradingview` without secret → 401.
- POST with secret + valid payload → 200, row in DB.
- POST same `source_id` twice → still 200, only one row (idempotent).
- GET `/api/signals` anonymously → no `tv-zaky-*` rows.
- GET `/api/signals` with `tv-zaky-momentum` license header → row appears.

### Deployment
1. Migration applies idempotently on Railway via existing migration runner (or manual `psql`).
2. Add `TV_WEBHOOK_SECRET` to Railway env vars (long random string).
3. Push, `railway up --detach` (no GitHub auto-deploy — see project memory).
4. Configure TV alert webhook: URL `https://tradeclaw.win/api/webhooks/tradingview`, header `X-TV-Secret: <secret>`, body the JSON template matching `payloadSchema`. Document this template in `docs/tradingview-webhook-setup.md`.
5. Issue Zaky a license with `tv-zaky-momentum` + `tv-zaky-reversal` grants via `/admin/licenses`.

### Risks
- **TV payload format drift.** Zaky's Pine scripts must emit JSON matching `payloadSchema`. If he changes the alert message, ingest 400s silently from his side. Mitigation: send 400 responses to a small alert log table or just `console.error`, and document the exact template he must paste into TV.
- **Replay / timing attacks.** Shared secret in a header is fine for v1. Future: HMAC over body + timestamp. Out of scope.
- **No backfill story.** Old TV signals don't exist in the DB until they fire forward. Acceptable — premium subscribers start seeing value from day 1, not retroactive.
- **TradingView free tier limits webhooks to a small number of alerts.** Zaky may need TV Pro. Flag before launch.

---

## Build sequence

1. **Track B end-to-end** (half day): thresholds + `pickHighestUnlocked` + tracked-signals filter + unit + E2E. Ship + verify on production with an existing test license.
2. **Track D, migration + webhook + admin page** (1 day): migration, route, admin viewer.
3. **Track D, read-path merge + tests** (1 day): `premium-signals.ts`, integrate into `tracked-signals.ts`, full E2E pass.
4. **Track D, TV configuration + Zaky walkthrough** (half day): docs, secret, alert template, end-to-end with a real TV alert.

Total ~3 days assuming no surprises. Track B alone is shippable in an afternoon if Zaky needs something visible immediately.

## Out of scope
- Genuinely different generators per preset (Track C from the prior discussion). Track D obsoletes the need.
- HMAC-signed webhooks.
- Per-user TV webhook URLs (one shared secret is enough at this scale).
- Premium signal backfill from TV alert history.
- Historical performance tracking for premium signals (`signal_history` join). Add later when there's data to track.
