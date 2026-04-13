# Premium Strategy Licenses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate non-`classic` signal strategies behind admin-issued license keys, with an admin dashboard for issuing/revoking keys and a client `/unlock` page for redemption.

**Architecture:** New `strategy_licenses` + `strategy_license_grants` tables in Postgres. `resolveLicense(req)` returns a `LicenseContext` from header/query/cookie. `getTrackedSignals` (the canonical read path per [workspace CLAUDE.md](../../../CLAUDE.md)) takes the context and filters returned signals by `unlockedStrategies`. Admin API lives under `/api/admin/licenses` (auto-gated by existing middleware). Client unlock flow stores the key in `localStorage` + a mirror cookie so SSR and client fetches both see it.

**Tech Stack:** Next.js 16.2 (App Router), TypeScript, `pg` via [lib/db-pool.ts](../../../apps/web/lib/db-pool.ts), `crypto` (node built-in), Playwright for E2E.

**Spec:** [docs/superpowers/specs/2026-04-14-premium-strategy-licenses-design.md](../specs/2026-04-14-premium-strategy-licenses-design.md)

---

## File Map

**Create:**
- `apps/web/migrations/006_licenses.sql`
- `apps/web/lib/licenses.ts` — core: types, keygen, SHA-256, CRUD, `resolveLicense`
- `apps/web/lib/__tests__/licenses.test.ts` — unit tests (jest-style, matches existing convention)
- `apps/web/lib/license-client.ts` — browser-side helpers + `fetchWithLicense`
- `apps/web/app/api/licenses/verify/route.ts`
- `apps/web/app/api/admin/licenses/route.ts` — POST issue / GET list
- `apps/web/app/api/admin/licenses/[id]/route.ts` — GET / PATCH
- `apps/web/app/api/admin/licenses/[id]/revoke/route.ts` — POST
- `apps/web/app/unlock/page.tsx`
- `apps/web/app/unlock/unlock-client.tsx`
- `apps/web/app/admin/licenses/page.tsx`
- `apps/web/app/admin/licenses/licenses-client.tsx`
- `apps/web/app/admin/licenses/issue-modal.tsx`
- `apps/web/app/components/StrategyAccessBar.tsx`
- `apps/web/tests/e2e/licenses/premium-licenses.spec.ts`

**Modify:**
- `apps/web/lib/tracked-signals.ts` — accept optional `ctx`, apply filter, add `getTrackedSignalsForRequest` helper
- All 25 call sites of `getTrackedSignals` — switch to context-aware variant where a `Request` is available
- `apps/web/app/dashboard/page.tsx` — mount `<StrategyAccessBar />`
- `apps/web/app/track-record/*` — hide locked strategies from per-strategy breakdown
- Client fetches to signal endpoints — migrate to `fetchWithLicense`

**Unchanged (explicitly):**
- `apps/web/app/lib/signal-generator.ts`, `ta-engine.ts`
- Signal *recording* path inside `tracked-signals.ts`
- `scripts/scanner-engine.py` (local-only)
- Existing admin secret / `tc_admin` cookie

---

## Task 1: Database migration

**Files:**
- Create: `apps/web/migrations/006_licenses.sql`

- [ ] **Step 1: Write the migration SQL**

Create `apps/web/migrations/006_licenses.sql`:

```sql
-- Premium strategy licenses (v1: admin-issued, no billing)
-- See docs/superpowers/specs/2026-04-14-premium-strategy-licenses-design.md

CREATE TABLE IF NOT EXISTS strategy_licenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash     VARCHAR(64) UNIQUE NOT NULL,   -- SHA-256 hex of plaintext key
  key_prefix   VARCHAR(16) NOT NULL,          -- first 12 chars of plaintext, for display
  issued_to    VARCHAR(255),                  -- free-text label (customer, note)
  status       VARCHAR(16) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'revoked')),
  expires_at   TIMESTAMPTZ,                   -- NULL = lifetime
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_strategy_licenses_status
  ON strategy_licenses(status);

CREATE TABLE IF NOT EXISTS strategy_license_grants (
  license_id   UUID NOT NULL REFERENCES strategy_licenses(id) ON DELETE CASCADE,
  strategy_id  VARCHAR(64) NOT NULL,          -- matches signal_history.strategy_id
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (license_id, strategy_id)
);

CREATE INDEX IF NOT EXISTS idx_license_grants_strategy
  ON strategy_license_grants(strategy_id);
```

- [ ] **Step 2: Apply the migration to local Postgres**

Run:
```bash
psql "$DATABASE_URL" -f apps/web/migrations/006_licenses.sql
```
Expected: `CREATE TABLE`, `CREATE INDEX`, `CREATE TABLE`, `CREATE INDEX` (no errors). Idempotent — safe to re-run.

- [ ] **Step 3: Verify schema**

Run:
```bash
psql "$DATABASE_URL" -c "\d strategy_licenses" -c "\d strategy_license_grants"
```
Expected: both tables listed with the columns above.

- [ ] **Step 4: Commit**

```bash
git add apps/web/migrations/006_licenses.sql
git commit -m "feat(licenses): add strategy_licenses + grants tables"
```

---

## Task 2: Core licenses module — types, keygen, hash

**Files:**
- Create: `apps/web/lib/licenses.ts`
- Create: `apps/web/lib/__tests__/licenses.test.ts`

- [ ] **Step 1: Write failing test for `generateKey`**

Create `apps/web/lib/__tests__/licenses.test.ts`:

```typescript
import { generateKey, hashKey } from '../licenses';

describe('licenses — key generation', () => {
  it('generateKey returns a plaintext, hash, and prefix', () => {
    const { plaintext, hash, prefix } = generateKey();
    expect(plaintext).toMatch(/^tck_live_[a-f0-9]{32}$/);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(prefix).toBe(plaintext.slice(0, 12));
  });

  it('generateKey produces unique keys', () => {
    const a = generateKey();
    const b = generateKey();
    expect(a.plaintext).not.toBe(b.plaintext);
    expect(a.hash).not.toBe(b.hash);
  });

  it('hashKey is deterministic and matches generateKey hash', () => {
    const { plaintext, hash } = generateKey();
    expect(hashKey(plaintext)).toBe(hash);
  });

  it('hashKey produces a 64-char hex string', () => {
    expect(hashKey('anything')).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

- [ ] **Step 2: Write minimal `licenses.ts` with types, `generateKey`, `hashKey`**

Create `apps/web/lib/licenses.ts`:

```typescript
import 'server-only';
import { randomBytes, createHash } from 'node:crypto';

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export const FREE_STRATEGY = 'classic' as const;

export interface LicenseContext {
  licenseId: string | null;
  unlockedStrategies: Set<string>; // always includes FREE_STRATEGY
  expiresAt: Date | null;
  issuedTo: string | null;
}

export interface StrategyLicense {
  id: string;
  keyPrefix: string;
  issuedTo: string | null;
  status: 'active' | 'revoked';
  expiresAt: Date | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  notes: string | null;
}

export interface StrategyLicenseWithGrants extends StrategyLicense {
  strategies: string[];
}

// ──────────────────────────────────────────────────────────────────────────
// Key generation + hashing
// ──────────────────────────────────────────────────────────────────────────

export interface GeneratedKey {
  plaintext: string;
  hash: string;
  prefix: string;
}

export function generateKey(): GeneratedKey {
  const plaintext = 'tck_live_' + randomBytes(16).toString('hex');
  const hash = hashKey(plaintext);
  const prefix = plaintext.slice(0, 12);
  return { plaintext, hash, prefix };
}

export function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

// ──────────────────────────────────────────────────────────────────────────
// Anonymous context helper (used by fall-through cases)
// ──────────────────────────────────────────────────────────────────────────

export function anonymousContext(): LicenseContext {
  return {
    licenseId: null,
    unlockedStrategies: new Set([FREE_STRATEGY]),
    expiresAt: null,
    issuedTo: null,
  };
}
```

- [ ] **Step 3: Verify the unit tests would pass logically**

Read through the test file and the implementation. Confirm:
- `generateKey()` → plaintext matches `/^tck_live_[a-f0-9]{32}$/` ✓
- `hashKey(plaintext)` deterministic ✓
- `prefix = plaintext.slice(0, 12)` → `"tck_live_" + first 3 hex chars` → 12 chars total ✓

Note: because no test runner is wired in [apps/web/package.json](../../../apps/web/package.json), the `.test.ts` file is written in the existing jest-style convention (matching [apps/web/app/api/cron/signals/__tests__/preset-dispatch.test.ts](../../../apps/web/app/api/cron/signals/__tests__/preset-dispatch.test.ts)) but is not executed by CI. Real execution-time verification lives in the Playwright E2E tests in Task 15.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/licenses.ts apps/web/lib/__tests__/licenses.test.ts
git commit -m "feat(licenses): add core types, keygen, and hash helpers"
```

---

## Task 3: Licenses module — DB CRUD functions

**Files:**
- Modify: `apps/web/lib/licenses.ts`
- Modify: `apps/web/lib/__tests__/licenses.test.ts`

- [ ] **Step 1: Add CRUD tests**

Append to `apps/web/lib/__tests__/licenses.test.ts`:

```typescript
import {
  issueLicense,
  listLicenses,
  getLicenseById,
  addGrants,
  updateExpiry,
  updateIssuedTo,
  revokeLicense,
} from '../licenses';

describe('licenses — CRUD', () => {
  it('issueLicense returns plaintext once and persists hashed row', async () => {
    const { license, plaintextKey } = await issueLicense({
      issuedTo: 'test@example.com',
      strategies: ['hmm-top3'],
    });
    expect(plaintextKey).toMatch(/^tck_live_[a-f0-9]{32}$/);
    expect(license.keyPrefix).toBe(plaintextKey.slice(0, 12));
    expect(license.status).toBe('active');

    const fetched = await getLicenseById(license.id);
    expect(fetched?.strategies).toEqual(['hmm-top3']);
  });

  it('addGrants is idempotent', async () => {
    const { license } = await issueLicense({ strategies: ['hmm-top3'] });
    await addGrants(license.id, ['hmm-top3']); // duplicate
    await addGrants(license.id, ['vwap-ema-bb']);
    const fetched = await getLicenseById(license.id);
    expect(fetched?.strategies.sort()).toEqual(['hmm-top3', 'vwap-ema-bb']);
  });

  it('revokeLicense flips status to revoked', async () => {
    const { license } = await issueLicense({ strategies: ['hmm-top3'] });
    await revokeLicense(license.id);
    const fetched = await getLicenseById(license.id);
    expect(fetched?.status).toBe('revoked');
  });

  it('updateExpiry accepts null for lifetime', async () => {
    const { license } = await issueLicense({ strategies: ['hmm-top3'] });
    await updateExpiry(license.id, new Date('2099-01-01'));
    await updateExpiry(license.id, null);
    const fetched = await getLicenseById(license.id);
    expect(fetched?.expiresAt).toBeNull();
  });
});
```

- [ ] **Step 2: Implement CRUD functions in `licenses.ts`**

Append to `apps/web/lib/licenses.ts`:

```typescript
import { query, queryOne, execute } from './db-pool';

// ──────────────────────────────────────────────────────────────────────────
// Row types + mappers
// ──────────────────────────────────────────────────────────────────────────

interface LicenseRow {
  id: string;
  key_prefix: string;
  issued_to: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  last_seen_at: string | null;
  notes: string | null;
}

function toLicense(row: LicenseRow): StrategyLicense {
  return {
    id: row.id,
    keyPrefix: row.key_prefix,
    issuedTo: row.issued_to,
    status: row.status as 'active' | 'revoked',
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdAt: new Date(row.created_at),
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : null,
    notes: row.notes,
  };
}

async function fetchGrants(licenseId: string): Promise<string[]> {
  const rows = await query<{ strategy_id: string }>(
    `SELECT strategy_id FROM strategy_license_grants WHERE license_id = $1
     ORDER BY strategy_id`,
    [licenseId],
  );
  return rows.map((r) => r.strategy_id);
}

// ──────────────────────────────────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────────────────────────────────

export async function issueLicense(input: {
  issuedTo?: string;
  strategies: string[];
  expiresAt?: Date | null;
  notes?: string;
}): Promise<{ license: StrategyLicense; plaintextKey: string }> {
  const { plaintext, hash, prefix } = generateKey();

  const row = await queryOne<LicenseRow>(
    `INSERT INTO strategy_licenses
       (key_hash, key_prefix, issued_to, expires_at, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, key_prefix, issued_to, status, expires_at,
               created_at, last_seen_at, notes`,
    [hash, prefix, input.issuedTo ?? null, input.expiresAt ?? null, input.notes ?? null],
  );
  if (!row) {
    throw new Error('issueLicense: insert returned no row');
  }

  if (input.strategies.length > 0) {
    await addGrants(row.id, input.strategies);
  }

  return { license: toLicense(row), plaintextKey: plaintext };
}

export async function addGrants(licenseId: string, strategies: string[]): Promise<void> {
  // ON CONFLICT DO NOTHING makes this idempotent
  for (const strategyId of strategies) {
    await execute(
      `INSERT INTO strategy_license_grants (license_id, strategy_id)
       VALUES ($1, $2)
       ON CONFLICT (license_id, strategy_id) DO NOTHING`,
      [licenseId, strategyId],
    );
  }
}

export async function updateExpiry(
  licenseId: string,
  expiresAt: Date | null,
): Promise<void> {
  await execute(
    `UPDATE strategy_licenses SET expires_at = $1 WHERE id = $2`,
    [expiresAt, licenseId],
  );
}

export async function updateIssuedTo(
  licenseId: string,
  issuedTo: string | null,
): Promise<void> {
  await execute(
    `UPDATE strategy_licenses SET issued_to = $1 WHERE id = $2`,
    [issuedTo, licenseId],
  );
}

export async function revokeLicense(licenseId: string): Promise<void> {
  await execute(
    `UPDATE strategy_licenses SET status = 'revoked' WHERE id = $1`,
    [licenseId],
  );
}

export async function getLicenseById(
  id: string,
): Promise<StrategyLicenseWithGrants | null> {
  const row = await queryOne<LicenseRow>(
    `SELECT id, key_prefix, issued_to, status, expires_at,
            created_at, last_seen_at, notes
     FROM strategy_licenses WHERE id = $1`,
    [id],
  );
  if (!row) return null;
  const strategies = await fetchGrants(row.id);
  return { ...toLicense(row), strategies };
}

export async function listLicenses(): Promise<StrategyLicenseWithGrants[]> {
  const rows = await query<LicenseRow>(
    `SELECT id, key_prefix, issued_to, status, expires_at,
            created_at, last_seen_at, notes
     FROM strategy_licenses
     ORDER BY created_at DESC`,
  );
  const out: StrategyLicenseWithGrants[] = [];
  for (const row of rows) {
    const strategies = await fetchGrants(row.id);
    out.push({ ...toLicense(row), strategies });
  }
  return out;
}
```

- [ ] **Step 3: Typecheck**

Run:
```bash
cd apps/web && npx tsc --noEmit
```
Expected: no errors in `lib/licenses.ts`. Fix any type issues before continuing.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/licenses.ts apps/web/lib/__tests__/licenses.test.ts
git commit -m "feat(licenses): add issue/list/update/revoke CRUD"
```

---

## Task 4: `resolveLicense` — header/query/cookie resolution

**Files:**
- Modify: `apps/web/lib/licenses.ts`
- Modify: `apps/web/lib/__tests__/licenses.test.ts`

- [ ] **Step 1: Add resolve tests**

Append to `apps/web/lib/__tests__/licenses.test.ts`:

```typescript
import { resolveLicense, FREE_STRATEGY } from '../licenses';

function mockRequest(init: {
  headers?: Record<string, string>;
  url?: string;
  cookies?: Record<string, string>;
}): Request {
  const headers = new Headers(init.headers ?? {});
  if (init.cookies) {
    const cookieStr = Object.entries(init.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    headers.set('cookie', cookieStr);
  }
  return new Request(init.url ?? 'http://localhost/test', { headers });
}

describe('licenses — resolveLicense', () => {
  it('returns anonymous when no key is present', async () => {
    const ctx = await resolveLicense(mockRequest({}));
    expect(ctx.licenseId).toBeNull();
    expect([...ctx.unlockedStrategies]).toEqual([FREE_STRATEGY]);
  });

  it('returns anonymous for an unknown key (header)', async () => {
    const ctx = await resolveLicense(
      mockRequest({ headers: { 'x-license-key': 'tck_live_unknown' } }),
    );
    expect(ctx.licenseId).toBeNull();
    expect([...ctx.unlockedStrategies]).toEqual([FREE_STRATEGY]);
  });

  it('returns unlocked strategies ∪ classic for a valid key via header', async () => {
    const { plaintextKey } = await issueLicense({ strategies: ['hmm-top3'] });
    const ctx = await resolveLicense(
      mockRequest({ headers: { 'x-license-key': plaintextKey } }),
    );
    expect(ctx.unlockedStrategies.has('hmm-top3')).toBe(true);
    expect(ctx.unlockedStrategies.has(FREE_STRATEGY)).toBe(true);
  });

  it('resolves key from query string', async () => {
    const { plaintextKey } = await issueLicense({ strategies: ['hmm-top3'] });
    const ctx = await resolveLicense(
      mockRequest({ url: `http://localhost/test?key=${plaintextKey}` }),
    );
    expect(ctx.unlockedStrategies.has('hmm-top3')).toBe(true);
  });

  it('resolves key from cookie', async () => {
    const { plaintextKey } = await issueLicense({ strategies: ['hmm-top3'] });
    const ctx = await resolveLicense(
      mockRequest({ cookies: { tc_license_key: plaintextKey } }),
    );
    expect(ctx.unlockedStrategies.has('hmm-top3')).toBe(true);
  });

  it('treats revoked key as anonymous', async () => {
    const { license, plaintextKey } = await issueLicense({ strategies: ['hmm-top3'] });
    await revokeLicense(license.id);
    const ctx = await resolveLicense(
      mockRequest({ headers: { 'x-license-key': plaintextKey } }),
    );
    expect(ctx.licenseId).toBeNull();
    expect([...ctx.unlockedStrategies]).toEqual([FREE_STRATEGY]);
  });

  it('treats expired key as anonymous', async () => {
    const { license, plaintextKey } = await issueLicense({
      strategies: ['hmm-top3'],
      expiresAt: new Date(Date.now() - 1000), // already past
    });
    const ctx = await resolveLicense(
      mockRequest({ headers: { 'x-license-key': plaintextKey } }),
    );
    expect(ctx.licenseId).toBeNull();
  });
});
```

- [ ] **Step 2: Implement `resolveLicense` + `resolveLicenseByKey`**

Append to `apps/web/lib/licenses.ts`:

```typescript
// ──────────────────────────────────────────────────────────────────────────
// Key extraction + resolution
// ──────────────────────────────────────────────────────────────────────────

const LICENSE_HEADER = 'x-license-key';
const LICENSE_COOKIE = 'tc_license_key';
const LICENSE_QUERY = 'key';

function extractKeyFromRequest(req: Request): string | null {
  const headerKey = req.headers.get(LICENSE_HEADER);
  if (headerKey && headerKey.length > 0) return headerKey;

  try {
    const url = new URL(req.url);
    const queryKey = url.searchParams.get(LICENSE_QUERY);
    if (queryKey && queryKey.startsWith('tck_live_')) return queryKey;
  } catch {
    // req.url not parseable — skip
  }

  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${LICENSE_COOKIE}=`));
    if (match) {
      return decodeURIComponent(match.slice(LICENSE_COOKIE.length + 1));
    }
  }

  return null;
}

export async function resolveLicense(req: Request): Promise<LicenseContext> {
  const plaintext = extractKeyFromRequest(req);
  if (!plaintext) return anonymousContext();
  return resolveLicenseByKey(plaintext);
}

export async function resolveLicenseByKey(plaintext: string): Promise<LicenseContext> {
  const hash = hashKey(plaintext);
  const row = await queryOne<LicenseRow>(
    `SELECT id, key_prefix, issued_to, status, expires_at,
            created_at, last_seen_at, notes
     FROM strategy_licenses
     WHERE key_hash = $1
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [hash],
  );
  if (!row) return anonymousContext();

  const strategies = await fetchGrants(row.id);

  // Fire-and-forget last_seen_at update
  execute(
    `UPDATE strategy_licenses SET last_seen_at = NOW() WHERE id = $1`,
    [row.id],
  ).catch(() => undefined);

  return {
    licenseId: row.id,
    unlockedStrategies: new Set([FREE_STRATEGY, ...strategies]),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    issuedTo: row.issued_to,
  };
}
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/licenses.ts apps/web/lib/__tests__/licenses.test.ts
git commit -m "feat(licenses): add resolveLicense with header/query/cookie sources"
```

---

## Task 5: Integrate filter into `getTrackedSignals`

**Files:**
- Modify: `apps/web/lib/tracked-signals.ts`

- [ ] **Step 1: Read current file state**

Confirm the current signature:
```typescript
export async function getTrackedSignals(params: {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  minConfidence?: number;
}) { ... }
```

- [ ] **Step 2: Add `ctx` to `getTrackedSignals` and create `getTrackedSignalsForRequest`**

Replace the top of `apps/web/lib/tracked-signals.ts` (keep the existing recording/gate logic intact):

```typescript
import 'server-only';

import { getSignals } from '../app/lib/signals';
import { recordSignalsAsync } from './signal-history';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from './signal-thresholds';
import { getActivePreset } from '../app/api/cron/signals/preset-dispatch';
import { fetchGateState, getGateMode } from './full-risk-gates';
import { logGateDecision, buildGateLogEntry, type SignalForLog } from './gate-log';
import {
  resolveLicense,
  anonymousContext,
  FREE_STRATEGY,
  type LicenseContext,
} from './licenses';

export interface GetTrackedSignalsParams {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  minConfidence?: number;
  /** License context for read-time strategy filtering. Defaults to anonymous ({classic}). */
  ctx?: LicenseContext;
}

export async function getTrackedSignals(params: GetTrackedSignalsParams) {
  const result = await getSignals(params);
  const ctx = params.ctx ?? anonymousContext();

  // ... existing recording + gate logic stays here exactly as-is ...
```

Then, at the very end of the function (after the existing `if (mode === 'active' && blockedSignals.length > 0) { ... }` block and before `return result`), add the license filter:

```typescript
  // Read-time license filter — keep free classic, drop anything the caller
  // doesn't have a grant for. Recording above was not filtered, so the DB
  // retains the full historical set for backtests.
  result.signals = result.signals.filter((s) => {
    const strategyId = s.strategyId ?? FREE_STRATEGY;
    return ctx.unlockedStrategies.has(strategyId);
  });

  return result;
}

/**
 * Convenience wrapper: resolves the license context from the Request,
 * then delegates to getTrackedSignals. Preferred for any API route or
 * server component that has a Request in hand.
 */
export async function getTrackedSignalsForRequest(
  req: Request,
  params: Omit<GetTrackedSignalsParams, 'ctx'> = {},
) {
  const ctx = await resolveLicense(req);
  return getTrackedSignals({ ...params, ctx });
}
```

Note: `Signal` type may not currently have `strategyId` — if TypeScript complains, coerce via `(s as { strategyId?: string }).strategyId ?? FREE_STRATEGY`. The filter is forgiving: no strategyId → treated as `classic` → always kept.

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: zero errors. If `Signal` type is missing `strategyId`, apply the coercion above.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/tracked-signals.ts
git commit -m "feat(licenses): apply read-time strategy filter in getTrackedSignals"
```

---

## Task 6: Thread context through `getTrackedSignals` call sites

**Files:**
- Modify (25 call sites): `apps/web/app/alert/[id]/page.tsx`, `apps/web/app/dashboard/page.tsx`, `apps/web/app/signal/[id]/page.tsx`, `apps/web/app/api/votes/route.ts`, `apps/web/app/api/signals/route.ts`, `apps/web/app/api/badges/route.ts`, `apps/web/app/api/explain/route.ts`, `apps/web/app/api/consensus/route.ts`, `apps/web/app/api/news/route.ts`, `apps/web/app/api/v1/badge/[pair]/route.ts`, `apps/web/app/api/v1/signals/route.ts`, `apps/web/app/api/signal-of-the-day/route.ts`, `apps/web/app/api/telegram/webhook/route.ts`, `apps/web/app/api/screener/route.ts`, `apps/web/app/api/heatmap/route.ts`, `apps/web/app/api/og/signal/[id]/route.tsx`, `apps/web/app/api/live-feed/route.ts`, `apps/web/app/api/digest/daily/route.ts`, `apps/web/app/api/widget/profile/route.ts`, `apps/web/app/api/badge/route.ts`, `apps/web/app/api/badge/[pair]/route.ts`, `apps/web/app/api/badge/[pair]/json/route.ts`, `apps/web/lib/telegram-broadcast.ts`

- [ ] **Step 1: API routes that have a `Request` — switch to `getTrackedSignalsForRequest`**

For every `/api/.../route.ts` file that already takes `(req: NextRequest)` as its handler, replace:

```typescript
import { getTrackedSignals } from '@/lib/tracked-signals';
// ...
const { signals } = await getTrackedSignals({ ... });
```

With:

```typescript
import { getTrackedSignalsForRequest } from '@/lib/tracked-signals';
// ...
const { signals } = await getTrackedSignalsForRequest(req, { ... });
```

Check each of these and add the `req` parameter to the handler if missing:
- `app/api/votes/route.ts`
- `app/api/signals/route.ts`
- `app/api/badges/route.ts`
- `app/api/explain/route.ts` (both call sites)
- `app/api/consensus/route.ts` (both call sites — share a single resolved ctx, see below)
- `app/api/news/route.ts`
- `app/api/v1/badge/[pair]/route.ts`
- `app/api/v1/signals/route.ts`
- `app/api/signal-of-the-day/route.ts`
- `app/api/screener/route.ts`
- `app/api/heatmap/route.ts`
- `app/api/og/signal/[id]/route.tsx`
- `app/api/live-feed/route.ts`
- `app/api/digest/daily/route.ts`
- `app/api/widget/profile/route.ts`
- `app/api/badge/route.ts`
- `app/api/badge/[pair]/route.ts`
- `app/api/badge/[pair]/json/route.ts`

For `consensus/route.ts` which calls twice with different timeframes, resolve the ctx once and share:

```typescript
import { resolveLicense } from '@/lib/licenses';
import { getTrackedSignals } from '@/lib/tracked-signals';
// ...
const ctx = await resolveLicense(req);
const [h1, h4] = await Promise.all([
  getTrackedSignals({ timeframe: 'H1', minConfidence: 0, ctx }),
  getTrackedSignals({ timeframe: 'H4', minConfidence: 0, ctx }),
]);
```

- [ ] **Step 2: Server-component pages — resolve via `next/headers` cookies**

For server component pages that don't have a `Request`:
- `app/dashboard/page.tsx`
- `app/alert/[id]/page.tsx`
- `app/signal/[id]/page.tsx`

Add a small helper to `lib/licenses.ts`:

```typescript
// Server-component helper — reads the license cookie via next/headers
// and resolves a LicenseContext. Use this in RSC paths that don't have
// a Request object.
export async function resolveLicenseFromCookies(): Promise<LicenseContext> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const plaintext = store.get(LICENSE_COOKIE)?.value;
  if (!plaintext) return anonymousContext();
  return resolveLicenseByKey(plaintext);
}
```

Then in each page:

```typescript
import { resolveLicenseFromCookies } from '@/lib/licenses';
// ...
const ctx = await resolveLicenseFromCookies();
const result = await getTrackedSignals({ ... , ctx });
```

- [ ] **Step 3: Non-request callers — keep defaulting to anonymous**

These callers have no request and should keep their current behavior (anonymous = classic only):
- `lib/telegram-broadcast.ts` — server-side broadcast, no user context
- `app/api/telegram/webhook/route.ts` — telegram bot callbacks, no per-user licensing

Leave these as `getTrackedSignals({ ... })` — they'll default to `anonymousContext()` and only emit `classic` signals. That's the correct behavior (we don't want the public Telegram bot broadcasting premium signals).

Add a code comment on each of these two calls:
```typescript
// Intentionally no license ctx — Telegram broadcasts are public, so only
// the free classic strategy is emitted.
const { signals } = await getTrackedSignals({ ... });
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 5: Build to catch runtime wiring issues**

```bash
cd apps/web && npm run build
```
Expected: successful build.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app apps/web/lib
git commit -m "feat(licenses): thread license context through getTrackedSignals callers"
```

---

## Task 7: `/api/licenses/verify` route

**Files:**
- Create: `apps/web/app/api/licenses/verify/route.ts`

- [ ] **Step 1: Write the route**

Create `apps/web/app/api/licenses/verify/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { resolveLicenseByKey, FREE_STRATEGY } from '@/lib/licenses';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { key?: unknown };
    const key = typeof body.key === 'string' ? body.key : null;
    if (!key || !key.startsWith('tck_live_')) {
      return NextResponse.json({ valid: false, reason: 'invalid_format' }, { status: 200 });
    }

    const ctx = await resolveLicenseByKey(key);
    if (ctx.licenseId === null) {
      return NextResponse.json({ valid: false, reason: 'unknown_or_revoked' }, { status: 200 });
    }

    // Exclude FREE_STRATEGY from the response — clients care about what the
    // *key* unlocks, not the always-free baseline.
    const unlocked = [...ctx.unlockedStrategies].filter((s) => s !== FREE_STRATEGY);

    return NextResponse.json({
      valid: true,
      unlockedStrategies: unlocked,
      expiresAt: ctx.expiresAt?.toISOString() ?? null,
      issuedTo: ctx.issuedTo,
    });
  } catch {
    return NextResponse.json({ valid: false, reason: 'bad_request' }, { status: 400 });
  }
}
```

- [ ] **Step 2: Typecheck + build**

```bash
cd apps/web && npx tsc --noEmit && npm run build
```

- [ ] **Step 3: Manual smoke test**

Start dev: `npm run dev -w apps/web`. In another shell:
```bash
curl -X POST http://localhost:3000/api/licenses/verify \
  -H 'content-type: application/json' \
  -d '{"key":"tck_live_nope"}'
```
Expected: `{"valid":false,"reason":"unknown_or_revoked"}`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/licenses/verify/route.ts
git commit -m "feat(licenses): add POST /api/licenses/verify"
```

---

## Task 8: Admin API — issue, list, update, revoke

**Files:**
- Create: `apps/web/app/api/admin/licenses/route.ts`
- Create: `apps/web/app/api/admin/licenses/[id]/route.ts`
- Create: `apps/web/app/api/admin/licenses/[id]/revoke/route.ts`

All three routes sit under `/api/admin/*` and are automatically gated by [middleware.ts](../../../apps/web/middleware.ts) — no per-route auth boilerplate needed.

- [ ] **Step 1: Create `POST /api/admin/licenses` + `GET /api/admin/licenses`**

Create `apps/web/app/api/admin/licenses/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { issueLicense, listLicenses } from '@/lib/licenses';

const ALLOWED_STRATEGIES = new Set([
  'regime-aware',
  'hmm-top3',
  'vwap-ema-bb',
  'full-risk',
]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      issuedTo?: string;
      strategies?: unknown;
      expiresAt?: string | null;
      notes?: string;
    };

    if (!Array.isArray(body.strategies) || body.strategies.length === 0) {
      return NextResponse.json(
        { error: 'strategies must be a non-empty array' },
        { status: 400 },
      );
    }

    const strategies = body.strategies.filter(
      (s): s is string => typeof s === 'string' && ALLOWED_STRATEGIES.has(s),
    );
    if (strategies.length === 0) {
      return NextResponse.json(
        { error: 'no valid strategies in payload' },
        { status: 400 },
      );
    }

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: 'invalid expiresAt' }, { status: 400 });
    }

    const result = await issueLicense({
      issuedTo: body.issuedTo,
      strategies,
      expiresAt,
      notes: body.notes,
    });

    return NextResponse.json({
      license: result.license,
      plaintextKey: result.plaintextKey,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}

export async function GET() {
  const licenses = await listLicenses();
  return NextResponse.json({ licenses });
}
```

- [ ] **Step 2: Create `GET /api/admin/licenses/[id]` + `PATCH /api/admin/licenses/[id]`**

Create `apps/web/app/api/admin/licenses/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  getLicenseById,
  addGrants,
  updateExpiry,
  updateIssuedTo,
} from '@/lib/licenses';

const ALLOWED_STRATEGIES = new Set([
  'regime-aware',
  'hmm-top3',
  'vwap-ema-bb',
  'full-risk',
]);

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const license = await getLicenseById(id);
  if (!license) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ license });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const existing = await getLicenseById(id);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = (await req.json()) as {
    addStrategies?: unknown;
    expiresAt?: string | null;
    issuedTo?: string | null;
  };

  if (Array.isArray(body.addStrategies)) {
    const toAdd = body.addStrategies.filter(
      (s): s is string => typeof s === 'string' && ALLOWED_STRATEGIES.has(s),
    );
    if (toAdd.length > 0) await addGrants(id, toAdd);
  }

  if (body.expiresAt !== undefined) {
    const dt = body.expiresAt === null ? null : new Date(body.expiresAt);
    if (dt && Number.isNaN(dt.getTime())) {
      return NextResponse.json({ error: 'invalid expiresAt' }, { status: 400 });
    }
    await updateExpiry(id, dt);
  }

  if (body.issuedTo !== undefined) {
    await updateIssuedTo(id, body.issuedTo);
  }

  const updated = await getLicenseById(id);
  return NextResponse.json({ license: updated });
}
```

- [ ] **Step 3: Create `POST /api/admin/licenses/[id]/revoke`**

Create `apps/web/app/api/admin/licenses/[id]/revoke/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getLicenseById, revokeLicense } from '@/lib/licenses';

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const existing = await getLicenseById(id);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await revokeLicense(id);
  const updated = await getLicenseById(id);
  return NextResponse.json({ license: updated });
}
```

- [ ] **Step 4: Build**

```bash
cd apps/web && npm run build
```
Expected: zero errors.

- [ ] **Step 5: Manual smoke test (admin routes)**

With `ADMIN_SECRET` set and dev running:
```bash
curl -X POST http://localhost:3000/api/admin/licenses \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ADMIN_SECRET" \
  -d '{"strategies":["hmm-top3"],"issuedTo":"smoke test"}'
```
Expected: JSON containing `plaintextKey` starting with `tck_live_`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/admin/licenses
git commit -m "feat(licenses): add admin CRUD routes for licenses"
```

---

## Task 9: Client-side license helpers — `license-client.ts`

**Files:**
- Create: `apps/web/lib/license-client.ts`

- [ ] **Step 1: Create client helper module**

Create `apps/web/lib/license-client.ts`:

```typescript
// Browser-side helpers for reading/writing the stored license key and
// injecting it into fetch calls. NEVER imported from server code.

const STORAGE_KEY = 'tc_license_key';
const COOKIE_NAME = 'tc_license_key';
const LICENSE_HEADER = 'X-License-Key';
const COOKIE_MAX_AGE_DAYS = 365;

export function getStoredKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // localStorage blocked — fall through to cookie only
  }
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  // Non-HttpOnly so the SSR cookie mirror works via next/headers.
  document.cookie =
    `${COOKIE_NAME}=${encodeURIComponent(key)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function clearStoredKey(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

export async function fetchWithLicense(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const key = getStoredKey();
  const headers = new Headers(init.headers ?? {});
  if (key) {
    headers.set(LICENSE_HEADER, key);
  }
  return fetch(url, { ...init, headers });
}

export interface VerifyResponse {
  valid: boolean;
  reason?: string;
  unlockedStrategies?: string[];
  expiresAt?: string | null;
  issuedTo?: string | null;
}

export async function verifyKey(key: string): Promise<VerifyResponse> {
  const res = await fetch('/api/licenses/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  return (await res.json()) as VerifyResponse;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/license-client.ts
git commit -m "feat(licenses): add browser-side license helpers"
```

---

## Task 10: `/unlock` page

**Files:**
- Create: `apps/web/app/unlock/page.tsx`
- Create: `apps/web/app/unlock/unlock-client.tsx`

- [ ] **Step 1: Create the server component page**

Create `apps/web/app/unlock/page.tsx`:

```typescript
import UnlockClient from './unlock-client';

interface PageProps {
  searchParams: Promise<{ key?: string }>;
}

export default async function UnlockPage({ searchParams }: PageProps) {
  const { key } = await searchParams;
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-2 text-3xl font-bold">Unlock premium strategies</h1>
      <p className="mb-6 text-neutral-400">
        Paste your license key to unlock premium signal strategies on this device.
      </p>
      <UnlockClient initialKey={key ?? ''} />
    </main>
  );
}
```

- [ ] **Step 2: Create the client component**

Create `apps/web/app/unlock/unlock-client.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getStoredKey,
  setStoredKey,
  clearStoredKey,
  verifyKey,
  type VerifyResponse,
} from '@/lib/license-client';

interface Props {
  initialKey: string;
}

export default function UnlockClient({ initialKey }: Props) {
  const router = useRouter();
  const [key, setKey] = useState(initialKey);
  const [state, setState] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    'idle',
  );
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [stored, setStored] = useState<string | null>(null);

  useEffect(() => {
    setStored(getStoredKey());
  }, []);

  // Auto-verify when ?key= is present
  useEffect(() => {
    if (initialKey) {
      void handleVerify(initialKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  async function handleVerify(rawKey: string) {
    setState('verifying');
    const res = await verifyKey(rawKey);
    setResult(res);
    if (res.valid) {
      setStoredKey(rawKey);
      setStored(rawKey);
      setState('success');
      setTimeout(() => router.push('/dashboard'), 1200);
    } else {
      setState('error');
    }
  }

  function handleRemove() {
    clearStoredKey();
    setStored(null);
    setResult(null);
    setState('idle');
  }

  return (
    <div className="space-y-6">
      {stored && (
        <div className="rounded border border-emerald-700 bg-emerald-950/40 p-4">
          <p className="text-sm text-emerald-300">
            A key is stored on this device:{' '}
            <code className="font-mono">{stored.slice(0, 12)}…</code>
          </p>
          <button
            type="button"
            onClick={handleRemove}
            className="mt-2 text-xs text-emerald-400 underline"
          >
            Remove stored key
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleVerify(key);
        }}
        className="space-y-3"
      >
        <input
          type="text"
          autoComplete="off"
          placeholder="tck_live_..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-900 p-3 font-mono text-sm text-neutral-100"
        />
        <button
          type="submit"
          disabled={state === 'verifying' || key.length === 0}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {state === 'verifying' ? 'Verifying…' : 'Unlock'}
        </button>
      </form>

      {state === 'success' && result?.valid && (
        <div className="rounded border border-emerald-700 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          <p>Key accepted. Redirecting to dashboard…</p>
          <p className="mt-2">
            Unlocked: {result.unlockedStrategies?.join(', ') || 'none'}
          </p>
          {result.expiresAt && (
            <p className="mt-1 text-xs text-emerald-400">
              Expires: {new Date(result.expiresAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {state === 'error' && (
        <div className="rounded border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">
          Key not accepted ({result?.reason ?? 'unknown'}). Check the key or
          contact support.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build and manually verify**

```bash
cd apps/web && npm run build && npm run dev
```
Visit `http://localhost:3000/unlock`. Confirm the form renders. Paste a fake key → error state. Issue a real key via admin API, paste it → success + redirect.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/unlock
git commit -m "feat(licenses): add /unlock page with verify + store flow"
```

---

## Task 11: Admin dashboard — `/admin/licenses`

**Files:**
- Create: `apps/web/app/admin/licenses/page.tsx`
- Create: `apps/web/app/admin/licenses/licenses-client.tsx`
- Create: `apps/web/app/admin/licenses/issue-modal.tsx`

- [ ] **Step 1: Server component page**

Create `apps/web/app/admin/licenses/page.tsx`:

```typescript
import { listLicenses } from '@/lib/licenses';
import LicensesClient from './licenses-client';

export const dynamic = 'force-dynamic';

export default async function LicensesAdminPage() {
  const licenses = await listLicenses();
  const serialized = licenses.map((l) => ({
    ...l,
    expiresAt: l.expiresAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    lastSeenAt: l.lastSeenAt?.toISOString() ?? null,
  }));
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Strategy Licenses</h1>
      <LicensesClient initialLicenses={serialized} />
    </main>
  );
}
```

- [ ] **Step 2: Issue modal component**

Create `apps/web/app/admin/licenses/issue-modal.tsx`:

```typescript
'use client';

interface IssueModalProps {
  plaintextKey: string;
  onClose: () => void;
}

export default function IssueModal({ plaintextKey, onClose }: IssueModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-lg border border-amber-600 bg-neutral-900 p-6">
        <h2 className="mb-2 text-lg font-bold text-amber-400">
          Copy this key now
        </h2>
        <p className="mb-4 text-sm text-neutral-300">
          This key will <strong>not</strong> be shown again. Copy it to your
          clipboard and deliver it to the customer. If lost, you must issue a new key.
        </p>
        <div className="mb-4 rounded border border-neutral-700 bg-neutral-950 p-3">
          <code className="break-all font-mono text-sm text-emerald-300">
            {plaintextKey}
          </code>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(plaintextKey)}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Licenses client component (table + issue form)**

Create `apps/web/app/admin/licenses/licenses-client.tsx`:

```typescript
'use client';

import { useState } from 'react';
import IssueModal from './issue-modal';

const STRATEGY_OPTIONS = [
  'regime-aware',
  'hmm-top3',
  'vwap-ema-bb',
  'full-risk',
] as const;

interface SerializedLicense {
  id: string;
  keyPrefix: string;
  issuedTo: string | null;
  status: 'active' | 'revoked';
  expiresAt: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  notes: string | null;
  strategies: string[];
}

interface Props {
  initialLicenses: SerializedLicense[];
}

export default function LicensesClient({ initialLicenses }: Props) {
  const [licenses, setLicenses] = useState(initialLicenses);
  const [issuedTo, setIssuedTo] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [strategies, setStrategies] = useState<string[]>([]);
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch('/api/admin/licenses');
    const json = (await res.json()) as { licenses: SerializedLicense[] };
    setLicenses(json.licenses);
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    if (strategies.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          issuedTo: issuedTo || undefined,
          strategies,
          expiresAt: expiresAt || null,
          notes: notes || undefined,
        }),
      });
      const json = (await res.json()) as { plaintextKey?: string; error?: string };
      if (!res.ok || !json.plaintextKey) {
        alert(json.error ?? 'Failed to issue key');
        return;
      }
      setPlaintextKey(json.plaintextKey);
      setIssuedTo('');
      setExpiresAt('');
      setNotes('');
      setStrategies([]);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this key? This cannot be undone.')) return;
    await fetch(`/api/admin/licenses/${id}/revoke`, { method: 'POST' });
    await refresh();
  }

  async function handleAddStrategy(id: string) {
    const s = prompt(`Add strategy (one of: ${STRATEGY_OPTIONS.join(', ')})`);
    if (!s || !STRATEGY_OPTIONS.includes(s as typeof STRATEGY_OPTIONS[number])) return;
    await fetch(`/api/admin/licenses/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ addStrategies: [s] }),
    });
    await refresh();
  }

  const active = licenses.filter((l) => l.status === 'active').length;
  const revoked = licenses.filter((l) => l.status === 'revoked').length;

  return (
    <div className="space-y-8">
      <div className="flex gap-4 text-sm text-neutral-300">
        <div>Active: <strong className="text-emerald-400">{active}</strong></div>
        <div>Revoked: <strong className="text-red-400">{revoked}</strong></div>
        <div>Total: <strong>{licenses.length}</strong></div>
      </div>

      <form onSubmit={handleIssue} className="space-y-3 rounded border border-neutral-700 p-4">
        <h2 className="font-semibold">Issue new key</h2>
        <input
          type="text"
          placeholder="Issued to (optional label)"
          value={issuedTo}
          onChange={(e) => setIssuedTo(e.target.value)}
          className="w-full rounded bg-neutral-900 p-2 text-sm"
        />
        <div className="flex flex-wrap gap-3">
          {STRATEGY_OPTIONS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={strategies.includes(s)}
                onChange={(e) =>
                  setStrategies((prev) =>
                    e.target.checked ? [...prev, s] : prev.filter((x) => x !== s),
                  )
                }
              />
              {s}
            </label>
          ))}
        </div>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full rounded bg-neutral-900 p-2 text-sm"
          placeholder="Expires at (empty = lifetime)"
        />
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded bg-neutral-900 p-2 text-sm"
          rows={2}
        />
        <button
          type="submit"
          disabled={busy || strategies.length === 0}
          className="rounded bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Issuing…' : 'Issue key'}
        </button>
      </form>

      <div className="overflow-x-auto rounded border border-neutral-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="p-2">Key</th>
              <th className="p-2">Issued to</th>
              <th className="p-2">Strategies</th>
              <th className="p-2">Status</th>
              <th className="p-2">Expires</th>
              <th className="p-2">Last seen</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((l) => (
              <tr key={l.id} className="border-t border-neutral-800">
                <td className="p-2 font-mono">{l.keyPrefix}…</td>
                <td className="p-2">{l.issuedTo ?? '—'}</td>
                <td className="p-2">{l.strategies.join(', ') || '—'}</td>
                <td className="p-2">
                  {l.status === 'active' ? (
                    <span className="text-emerald-400">active</span>
                  ) : (
                    <span className="text-red-400">revoked</span>
                  )}
                </td>
                <td className="p-2">
                  {l.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : 'lifetime'}
                </td>
                <td className="p-2">
                  {l.lastSeenAt ? new Date(l.lastSeenAt).toLocaleString() : '—'}
                </td>
                <td className="p-2 space-x-2">
                  {l.status === 'active' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAddStrategy(l.id)}
                        className="text-xs text-emerald-400 underline"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevoke(l.id)}
                        className="text-xs text-red-400 underline"
                      >
                        Revoke
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plaintextKey && (
        <IssueModal plaintextKey={plaintextKey} onClose={() => setPlaintextKey(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Build + manual smoke test**

```bash
cd apps/web && npm run build && npm run dev
```
Visit `http://localhost:3000/admin/licenses` (log in via `/admin/login` first). Issue a key → modal appears → table refreshes → revoke a key → status flips. Typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/licenses
git commit -m "feat(licenses): add /admin/licenses dashboard"
```

---

## Task 12: `<StrategyAccessBar />` + dashboard integration

**Files:**
- Create: `apps/web/app/components/StrategyAccessBar.tsx`
- Modify: `apps/web/app/dashboard/page.tsx`

- [ ] **Step 1: Create `StrategyAccessBar`**

Create `apps/web/app/components/StrategyAccessBar.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStoredKey, verifyKey } from '@/lib/license-client';

export default function StrategyAccessBar() {
  const [unlocked, setUnlocked] = useState<string[] | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const key = getStoredKey();
    setHasKey(!!key);
    if (!key) {
      setUnlocked([]);
      return;
    }
    void verifyKey(key).then((res) => {
      if (res.valid) {
        setUnlocked(res.unlockedStrategies ?? []);
      } else {
        setUnlocked([]);
      }
    });
  }, []);

  if (unlocked === null) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded border border-neutral-800 bg-neutral-900 p-3 text-xs">
      <span className="text-neutral-400">Access:</span>
      <span className="rounded bg-neutral-800 px-2 py-0.5 text-neutral-300">
        classic (free)
      </span>
      {unlocked.map((s) => (
        <span
          key={s}
          className="rounded bg-emerald-900/60 px-2 py-0.5 text-emerald-300"
        >
          {s}
        </span>
      ))}
      <Link
        href="/unlock"
        className="ml-auto text-emerald-400 underline"
      >
        {hasKey ? 'Manage key' : 'Unlock premium →'}
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Mount on dashboard**

In `apps/web/app/dashboard/page.tsx`, add the import and render the bar above the main dashboard content:

```typescript
import StrategyAccessBar from '@/app/components/StrategyAccessBar';
// ... inside the rendered JSX, at the top of the main content ...
<StrategyAccessBar />
```

- [ ] **Step 3: Build**

```bash
cd apps/web && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/StrategyAccessBar.tsx apps/web/app/dashboard/page.tsx
git commit -m "feat(licenses): add StrategyAccessBar to dashboard"
```

---

## Task 13: Migrate client fetches to `fetchWithLicense`

**Files:**
- Modify: client components that call signal APIs via raw `fetch`

- [ ] **Step 1: Identify client-side signal fetch call sites**

Run:
```bash
cd apps/web && grep -rn "fetch(.*'/api/\(signals\|consensus\|badges\|badge\|news\|explain\|signal-of-the-day\|live-feed\|screener\|heatmap\|v1/signals\|v1/badge\)" app components --include='*.tsx' --include='*.ts' | grep -v 'fetchWithLicense'
```
Record each file and line.

- [ ] **Step 2: For each match, migrate to `fetchWithLicense`**

Example transformation:

```typescript
// Before
const res = await fetch('/api/signals?timeframe=H1');

// After
import { fetchWithLicense } from '@/lib/license-client';
const res = await fetchWithLicense('/api/signals?timeframe=H1');
```

Do this for every match from Step 1. Keep non-signal fetches (auth, admin, telemetry) unchanged.

- [ ] **Step 3: Build**

```bash
cd apps/web && npm run build
```
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app apps/web/components 2>/dev/null || true
git commit -m "feat(licenses): route client signal fetches through fetchWithLicense"
```

---

## Task 14: Hide locked strategies in `/track-record` breakdown

**Files:**
- Modify: `apps/web/app/track-record/*` and `apps/web/app/api/strategy-breakdown/route.ts` (if it exists)

- [ ] **Step 1: Locate the breakdown query path**

Run:
```bash
cd apps/web && grep -rn "strategy_id\|strategyId" app/track-record app/api/strategy-breakdown 2>/dev/null
```

- [ ] **Step 2: Apply license context filter**

In whichever route/server component builds the per-strategy breakdown, resolve the license context (via `resolveLicense(req)` for route handlers or `resolveLicenseFromCookies()` for RSC) and filter the result before returning:

```typescript
import { resolveLicense, FREE_STRATEGY } from '@/lib/licenses';
// ...
const ctx = await resolveLicense(req);
// After fetching breakdown rows from DB:
const visible = rows.filter((r) =>
  ctx.unlockedStrategies.has(r.strategy_id ?? FREE_STRATEGY),
);
```

This hides locked strategies from the per-strategy breakdown. Aggregate totals across strategies should also exclude locked rows — adjust the SUM/AVG logic accordingly.

- [ ] **Step 3: Build + manual verify**

```bash
cd apps/web && npm run build && npm run dev
```
Visit `/track-record` anonymously → only `classic` row shown in per-strategy breakdown. Unlock a key with `hmm-top3` → row appears.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/track-record apps/web/app/api/strategy-breakdown 2>/dev/null || true
git commit -m "feat(licenses): hide locked strategies from track-record breakdown"
```

---

## Task 15: Playwright E2E tests

**Files:**
- Create: `apps/web/tests/e2e/licenses/premium-licenses.spec.ts`

- [ ] **Step 1: Write the E2E spec**

Create `apps/web/tests/e2e/licenses/premium-licenses.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'dev-admin-secret';

test.describe('Premium strategy licenses', () => {
  test('anonymous visitor sees no license keys stored', async ({ page }) => {
    await page.goto('/dashboard');
    const stored = await page.evaluate(() =>
      window.localStorage.getItem('tc_license_key'),
    );
    expect(stored).toBeNull();
  });

  test('admin can issue a key and it verifies', async ({ request }) => {
    // Issue via admin API (Bearer auth path)
    const issueRes = await request.post('/api/admin/licenses', {
      headers: { authorization: `Bearer ${ADMIN_SECRET}` },
      data: { strategies: ['hmm-top3'], issuedTo: 'e2e-test' },
    });
    expect(issueRes.ok()).toBe(true);
    const { plaintextKey, license } = await issueRes.json();
    expect(plaintextKey).toMatch(/^tck_live_[a-f0-9]{32}$/);
    expect(license.status).toBe('active');

    // Verify the key
    const verifyRes = await request.post('/api/licenses/verify', {
      data: { key: plaintextKey },
    });
    const verifyJson = await verifyRes.json();
    expect(verifyJson.valid).toBe(true);
    expect(verifyJson.unlockedStrategies).toContain('hmm-top3');

    // Revoke it
    const revokeRes = await request.post(
      `/api/admin/licenses/${license.id}/revoke`,
      { headers: { authorization: `Bearer ${ADMIN_SECRET}` } },
    );
    expect(revokeRes.ok()).toBe(true);

    // Verify again — should now be invalid
    const reVerify = await request.post('/api/licenses/verify', {
      data: { key: plaintextKey },
    });
    const reVerifyJson = await reVerify.json();
    expect(reVerifyJson.valid).toBe(false);
  });

  test('unlock page auto-redirects after valid key via ?key=', async ({
    page,
    request,
  }) => {
    const issueRes = await request.post('/api/admin/licenses', {
      headers: { authorization: `Bearer ${ADMIN_SECRET}` },
      data: { strategies: ['hmm-top3'], issuedTo: 'e2e-unlock' },
    });
    const { plaintextKey } = await issueRes.json();

    await page.goto(`/unlock?key=${plaintextKey}`);
    await expect(page.getByText('Key accepted')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL('/dashboard', { timeout: 5000 });

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('tc_license_key'),
    );
    expect(stored).toBe(plaintextKey);
  });

  test('verify endpoint rejects malformed keys', async ({ request }) => {
    const res = await request.post('/api/licenses/verify', {
      data: { key: 'not-a-key' },
    });
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.reason).toBe('invalid_format');
  });
});
```

- [ ] **Step 2: Run the E2E suite**

```bash
cd apps/web && npm run test:e2e -- tests/e2e/licenses/premium-licenses.spec.ts
```
Expected: all 4 tests pass. If any fail, debug the underlying route/UI before moving on — do not mark the task complete until green.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/e2e/licenses
git commit -m "test(licenses): add Playwright E2E spec for premium licenses"
```

---

## Task 16: Final verification + push

**Files:**
- None (verification only)

- [ ] **Step 1: Full build**

```bash
cd apps/web && npm run build
```
Expected: clean build, zero errors.

- [ ] **Step 2: Full typecheck**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Full E2E suite**

```bash
cd apps/web && npm run test:e2e
```
Expected: all tests pass (existing suites + new licenses spec).

- [ ] **Step 4: Push to remote**

```bash
git push origin main
```
Expected: push succeeds. Railway auto-deploys from `main`.

- [ ] **Step 5: Post-deploy sanity check**

After Railway finishes deploying, run against production:
```bash
curl -X POST https://tradeclaw.win/api/licenses/verify \
  -H 'content-type: application/json' \
  -d '{"key":"tck_live_deadbeef"}'
```
Expected: `{"valid":false,"reason":"unknown_or_revoked"}` (200 OK).

And a production dashboard check: `https://tradeclaw.win/dashboard` loads, anonymous user sees only `classic` in `StrategyAccessBar` chips, `/unlock` page renders.

---

## Self-Review

**Spec coverage check:**
- ✅ Data model (Tasks 1, 2, 3) — tables + types match spec §2
- ✅ Core module with `resolveLicense` (Task 4) — header/query/cookie sources, spec §3
- ✅ Read-path integration (Tasks 5, 6) — `getTrackedSignals` filter, spec §4
- ✅ Admin API (Task 8) — issue/list/patch/revoke, spec §5
- ✅ Verify route (Task 7) — spec §5
- ✅ Admin dashboard (Task 11) — page + form + modal + table, spec §6
- ✅ Unlock flow (Task 10) — `/unlock` page + client, spec §7
- ✅ Client plumbing (Task 9) — `license-client.ts` with `fetchWithLicense`, spec §7
- ✅ Dashboard `StrategyAccessBar` (Task 12) — spec §7
- ✅ Client fetch migration (Task 13) — spec §7
- ✅ Track-record hide locked (Task 14) — spec §7
- ✅ Tests (Tasks 2, 3, 4, 15) — unit + E2E, spec §8
- ✅ Out-of-scope items stay out (no Stripe, no email, no teaser, no auth rework)

**Placeholder scan:** None. Every code step has concrete code.

**Type consistency:**
- `LicenseContext.unlockedStrategies` is a `Set<string>` everywhere
- `StrategyLicense.keyPrefix` is a string everywhere
- `resolveLicense(req)` and `resolveLicenseByKey(plaintext)` are distinct; routes use the former, `/api/licenses/verify` uses the latter
- `FREE_STRATEGY = 'classic'` is the single source of truth — referenced consistently in filter, bar, verify
- `X-License-Key` header name is consistent (header const in `licenses.ts`, matching string in `license-client.ts`)
- `tc_license_key` cookie name is consistent across server (`licenses.ts`) and client (`license-client.ts`)

**Scope:** Single feature, ~14 new files + ~25 call-site updates. Fits one plan.
