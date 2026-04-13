# Premium Strategy Licenses — Design

**Date:** 2026-04-14
**Status:** Draft → awaiting user approval before plan
**Scope:** Monetize access to non-`classic` signal strategies via admin-issued license keys, with admin + client dashboards for management and redemption.

## 1. Motivation

TradeClaw already tags every recorded signal with a `strategy_id` (see [apps/web/migrations/005_strategy_id.sql](../../../apps/web/migrations/005_strategy_id.sql) and [apps/web/lib/tracked-signals.ts](../../../apps/web/lib/tracked-signals.ts)). Today every visitor sees every strategy. We want to keep `classic` free and gate the four premium strategies (`regime-aware`, `hmm-top3`, `vwap-ema-bb`, `full-risk`) behind access tokens that the admin can issue, extend, and revoke.

Constraints that shaped the design:

- **TradeClaw is open-source and self-hostable.** A full user-auth system (email verification, sessions, password reset) is heavier than the product needs and inappropriate for self-hosted deployments where every operator is the admin.
- **The existing "auth" is a shared-secret admin cookie** ([apps/web/app/api/auth/login/route.ts](../../../apps/web/app/api/auth/login/route.ts)). There is no real per-user login, so per-user entitlements have no identity layer today.
- **Billing is out of scope for v1.** Admin issues keys manually; a future Stripe webhook can call the same `issueLicense` function without any schema change.
- **Signal generation is not being changed.** Every strategy currently resolves to the same output (see CLAUDE.md — `SIGNAL_ENGINE_PRESET` is a tag only). This spec gates access to the *labels*; making presets generate genuinely different signals is separate work.

## 2. Data Model

New migration `apps/web/migrations/006_licenses.sql`:

```sql
CREATE TABLE IF NOT EXISTS strategy_licenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash     VARCHAR(64) UNIQUE NOT NULL,       -- SHA-256 of full plaintext key
  key_prefix   VARCHAR(16) NOT NULL,              -- e.g. "tck_live_a1b2" for display
  issued_to    VARCHAR(255),                      -- free-text label (name/email/note)
  status       VARCHAR(16) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','revoked')),
  expires_at   TIMESTAMPTZ,                       -- NULL = lifetime
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  notes        TEXT
);

CREATE TABLE IF NOT EXISTS strategy_license_grants (
  license_id   UUID NOT NULL REFERENCES strategy_licenses(id) ON DELETE CASCADE,
  strategy_id  VARCHAR(64) NOT NULL,
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (license_id, strategy_id)
);

CREATE INDEX idx_license_grants_strategy ON strategy_license_grants(strategy_id);
CREATE INDEX idx_strategy_licenses_status ON strategy_licenses(status);
```

**Key format:** `tck_live_` + 32 random hex chars (128 bits of entropy). Generated with `crypto.randomBytes(16).toString('hex')`. The plaintext key is returned from `issueLicense` **exactly once** and never stored — only the SHA-256 hash and the first 12 chars for display.

**The `classic` strategy is always accessible without a key** (free baseline, matches the à-la-carte-with-free-taste model).

**`strategy_licenses.status`** has two values: `active`, `revoked`. Expiry is computed at read time via `expires_at < NOW()` rather than stored as a status, so lifetime extensions are a single `UPDATE expires_at`.

## 3. Core Module — `apps/web/lib/licenses.ts`

```ts
export interface LicenseContext {
  licenseId: string | null;        // null = anonymous
  unlockedStrategies: Set<string>; // always includes 'classic'
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

export async function resolveLicense(req: Request): Promise<LicenseContext>;

export async function issueLicense(input: {
  issuedTo?: string;
  strategies: string[];
  expiresAt?: Date | null;
  notes?: string;
}): Promise<{ license: StrategyLicense; plaintextKey: string }>;

export async function addGrants(licenseId: string, strategies: string[]): Promise<void>;
export async function updateExpiry(licenseId: string, expiresAt: Date | null): Promise<void>;
export async function updateIssuedTo(licenseId: string, issuedTo: string | null): Promise<void>;
export async function revokeLicense(licenseId: string): Promise<void>;
export async function listLicenses(): Promise<StrategyLicenseWithGrants[]>;
export async function getLicenseById(id: string): Promise<StrategyLicenseWithGrants | null>;
```

### `resolveLicense` behavior

Resolution order (first non-empty wins):

1. `X-License-Key` request header
2. `?key=` URL query param (supports email/share links)
3. `tc_license_key` cookie (for SSR paths after client-side unlock sets it)
4. None → anonymous

When a plaintext key is found:

1. SHA-256 hash the key
2. `SELECT ... FROM strategy_licenses WHERE key_hash = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())`
3. If miss → return anonymous context (unlocked = `{'classic'}`)
4. If hit → fetch grants, union with `{'classic'}`, return
5. Fire-and-forget `UPDATE strategy_licenses SET last_seen_at = NOW() WHERE id = $1` (do not await)

`resolveLicense` never throws on a bad/unknown key — unknown keys silently degrade to anonymous. This prevents timing oracles and keeps the dashboard usable if a user's key is revoked mid-session.

### Key generation

```ts
import { randomBytes, createHash } from 'node:crypto';

function generateKey(): { plaintext: string; hash: string; prefix: string } {
  const plaintext = 'tck_live_' + randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(plaintext).digest('hex');
  const prefix = plaintext.slice(0, 12); // "tck_live_a1b"
  return { plaintext, hash, prefix };
}
```

## 4. Read-Path Integration

The canonical read path per the project's CLAUDE.md is `getTrackedSignals` in [apps/web/lib/tracked-signals.ts](../../../apps/web/lib/tracked-signals.ts). Every production endpoint that surfaces signals flows through it.

**Change:** `getTrackedSignals` accepts an optional `LicenseContext` parameter. Callers that have a `Request` resolve the context first and pass it in. A helper wrapper `getTrackedSignalsForRequest(req)` handles the common case.

```ts
// apps/web/lib/tracked-signals.ts (sketch)
export async function getTrackedSignals(
  options: { ctx?: LicenseContext } = {}
): Promise<TrackedSignal[]> {
  const signals = await /* existing generation path */;
  const unlocked = options.ctx?.unlockedStrategies ?? new Set(['classic']);
  return signals.filter(s => unlocked.has(s.strategyId ?? 'classic'));
}

export async function getTrackedSignalsForRequest(req: Request) {
  const ctx = await resolveLicense(req);
  return getTrackedSignals({ ctx });
}
```

**Important:** the signal *recording* path (`recordSignalsAsync`) is untouched. Licensing is a read-time filter only. This keeps `signal_history` complete for backtests and avoids coupling billing state to historical accuracy data.

## 5. Admin API Routes

All routes live under `apps/web/app/api/admin/licenses/` and are gated by the existing `requireAdmin()` pattern used by the rest of `/api/admin/*` (see [commit c31cbdcd](../../../apps/web/app/api/admin)). Fail-closed: no admin secret → 503.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/admin/licenses` | Issue new key — body: `{ issuedTo?, strategies: string[], expiresAt?, notes? }`; returns `{ license, plaintextKey }` (plaintext shown once) |
| `GET`  | `/api/admin/licenses` | List all licenses with grants |
| `GET`  | `/api/admin/licenses/[id]` | Fetch single license |
| `PATCH` | `/api/admin/licenses/[id]` | Update — body can contain `addStrategies?`, `expiresAt?`, `issuedTo?`, `notes?` |
| `POST` | `/api/admin/licenses/[id]/revoke` | Flip status to `revoked` |

**Client-facing verify route** (not admin-gated):

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/licenses/verify` | Body: `{ key }`. Returns `{ valid: true, unlockedStrategies, expiresAt, issuedTo }` or `{ valid: false }`. Used by the unlock page for immediate feedback. |

The verify route uses the same `resolveLicense` logic but takes the key from the body instead of header/query.

## 6. Admin Dashboard — `/admin/licenses`

**Files:**
- [apps/web/app/admin/licenses/page.tsx](../../../apps/web/app/admin/licenses/page.tsx) — server component, initial data fetch, admin-gated
- [apps/web/app/admin/licenses/licenses-client.tsx](../../../apps/web/app/admin/licenses/licenses-client.tsx) — client component with table, issue form, mutations
- [apps/web/app/admin/licenses/issue-modal.tsx](../../../apps/web/app/admin/licenses/issue-modal.tsx) — one-time plaintext reveal

**Layout (single page, three zones):**

1. **Stats strip (top):** Active keys, total issued, revoked count
2. **Issue form:**
   - `Issued to` — free text (optional)
   - `Strategies` — multi-select checkboxes: `regime-aware`, `hmm-top3`, `vwap-ema-bb`, `full-risk` (hardcoded list; `classic` omitted because it's always free)
   - `Expires at` — date picker, empty = lifetime
   - `Notes` — textarea
   - **[Issue key]** button → POST → on success opens **one-time reveal modal** with plaintext key, copy button, and warning
3. **Licenses table:**
   - Columns: Key prefix, Issued to, Strategies (chips), Status, Expires, Last seen, Created, Actions
   - Row actions: `Add strategy`, `Edit expiry`, `Revoke` (confirm), `Copy unlock URL` (copies `/unlock` URL **without** the key — admin pastes the key separately)
   - Filters: status (active / revoked / expired), strategy chip click, free-text search on `issued_to`

**One-time reveal rule:** once the modal closes, the plaintext key is unrecoverable. Admin must issue a new key. This is a deliberate security trade-off consistent with how real license systems work and keeps the attack surface small (no "show key" endpoint anywhere).

## 7. Client Dashboard & Unlock Flow

### Unlock page — `/unlock`

File: `apps/web/app/unlock/page.tsx`

Behavior:
- `GET /unlock?key=tck_live_xxx` — auto-stores in `localStorage.tc_license_key` and in a same-origin cookie `tc_license_key` (non-httpOnly, for SSR reads), then `POST /api/licenses/verify` to confirm, then redirects to `/dashboard` with a success toast
- Manual form: user pastes key, click submit → same flow
- Invalid/revoked/expired key → human-readable error, does not store
- `/unlock` also shows currently-stored key status + "Remove key" button

### Client key plumbing — `apps/web/lib/license-client.ts`

```ts
export function getStoredKey(): string | null;
export function setStoredKey(key: string): void;   // writes localStorage + cookie
export function clearStoredKey(): void;
export async function fetchWithLicense(url: string, init?: RequestInit): Promise<Response>;
```

`fetchWithLicense` auto-injects `X-License-Key` header when a key is stored. All existing client-side signal calls (dashboard widgets, track-record, consensus, badges) migrate to it. This is a mechanical replacement — every `fetch('/api/...')` that hits a signal endpoint becomes `fetchWithLicense('/api/...')`.

### Dashboard surface changes

- **New `<StrategyAccessBar />`** — a strip at the top of `/dashboard` showing unlocked-strategy chips and a "Manage keys" button linking to `/unlock`. Anonymous users see "classic (free)" and a "Unlock premium strategies" CTA.
- **Strategy picker UI** — locked strategies render grayed with a small lock icon and a tooltip linking to a sell page (sell page is out of scope; this spec only creates the link target `/pricing#strategies` as a placeholder).
- **Per-strategy breakdown on `/track-record`** — locked strategies are **hidden entirely** from the breakdown (simpler than a teaser state; teaser can come later).

### Free-tier experience

A visitor with no key sees exactly the dashboard that exists today, minus the four premium strategies — i.e., just `classic` signals and the usual charts / history. The dashboard remains fully useful; the funnel to paid is the "Unlock premium" CTA in `<StrategyAccessBar />`.

## 8. Testing Strategy

### Unit — `apps/web/lib/__tests__/licenses.test.ts`
- `resolveLicense` returns anonymous ({'classic'}) for: no key, unknown key, revoked key, expired key
- `resolveLicense` returns grants ∪ {'classic'} for a valid key via each source: header, query, cookie
- `issueLicense` returns plaintext once, persists only hash + prefix, prefix matches plaintext
- `addGrants` is idempotent (duplicate strategy → no error, no duplicate row thanks to composite PK)
- `updateExpiry` with `null` sets lifetime; with a past date causes subsequent `resolveLicense` to return anonymous
- `revokeLicense` flips status and causes subsequent `resolveLicense` to return anonymous
- Key generator produces 128-bit entropy and the hash round-trips

### Integration (real Postgres via existing `db-pool.ts`)
- `getTrackedSignals({ ctx })` filters signals by unlocked set end-to-end
- Recording path (`recordSignalsAsync`) is unaffected — signal history writes still include all strategy ids regardless of caller context
- Admin route flow: issue → list → add grant → update expiry → revoke against real DB
- `POST /api/licenses/verify` with plaintext key returns correct shape for valid and invalid cases

### E2E (Playwright)
- Anonymous visitor at `/dashboard` sees only classic strategy chips, no `hmm-top3` etc.
- Admin (with `tc_admin` cookie) issues a key with `hmm-top3` selected → plaintext revealed once → modal closes → table shows the new row
- User visits `/unlock?key=<plaintext>` → auto-redirects to `/dashboard` → sees `classic` + `hmm-top3`
- Admin revokes → user's next dashboard request returns only `classic` (without reload the user keeps the cached page, but the next API refresh drops the locked signals)

## 9. Out of Scope (YAGNI)

- Stripe / Crypto / any real billing — admin issues keys by hand for v1
- Email delivery of keys — admin copies plaintext from the modal and emails it themselves
- Teaser previews for locked signals — locked strategies are simply hidden
- Per-key usage analytics beyond `last_seen_at` timestamp
- Multi-admin RBAC — the existing single-secret admin cookie stays
- Wiring `SIGNAL_ENGINE_PRESET` into `apps/web/app/lib/signal-generator.ts` so that different strategies produce different signals — this spec gates access to the *labels*; real per-strategy generation is a separate project (and correctly called out as non-trivial in CLAUDE.md)
- Migration to real per-user auth — license keys serve as the identity layer; a future auth system can map keys to users without schema changes

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Admin loses plaintext key before delivering to customer | Reissue flow is cheap and idempotent; document the one-time reveal clearly in the modal |
| User copies key across devices — no device binding | Accepted; keys are bearer tokens by design. Revocation is the mitigation. |
| Timing attack on `resolveLicense` via `key_hash` lookup | SHA-256 then constant-time DB lookup by unique index; unknown keys return the same anonymous shape silently |
| Client-side storage (`localStorage`) wiped by user | Share-link-by-URL allows re-unlock; cookie mirror reduces dependency on localStorage alone |
| `fetchWithLicense` migration misses a call site → user sees locked strategies anyway | Server-side `getTrackedSignals` is the authoritative filter. If a client call forgets the header, the server defaults to anonymous and filters locked strategies out. The migration is for correctness of client UX, not security. |
| Key leaked publicly (pasted into a gist, screenshot) | Admin revokes + reissues. `last_seen_at` helps detect unexpected usage. |

## 11. Files Touched / Created

**New:**
- `apps/web/migrations/006_licenses.sql`
- `apps/web/lib/licenses.ts`
- `apps/web/lib/__tests__/licenses.test.ts`
- `apps/web/lib/license-client.ts`
- `apps/web/app/api/admin/licenses/route.ts`
- `apps/web/app/api/admin/licenses/[id]/route.ts`
- `apps/web/app/api/admin/licenses/[id]/revoke/route.ts`
- `apps/web/app/api/licenses/verify/route.ts`
- `apps/web/app/admin/licenses/page.tsx`
- `apps/web/app/admin/licenses/licenses-client.tsx`
- `apps/web/app/admin/licenses/issue-modal.tsx`
- `apps/web/app/unlock/page.tsx`
- E2E spec(s) under existing Playwright test directory

**Modified:**
- `apps/web/lib/tracked-signals.ts` — add `LicenseContext` parameter + `getTrackedSignalsForRequest` helper, apply the read-time filter
- Callers of `getTrackedSignals` across the codebase — pass through a resolved context (grep `getTrackedSignals` for the list — roughly: `/api/signals`, `/api/consensus`, `/api/news`, `/api/badges`, `/alert/[id]`, `/track-record`, `/api/strategy-breakdown`)
- Client components that currently call signal APIs via raw `fetch` — migrate to `fetchWithLicense`
- `/dashboard` page — add `<StrategyAccessBar />` and the locked-strategy lock state in the strategy picker
- `/track-record` — hide locked strategies from the per-strategy breakdown

**Unchanged (explicitly):**
- `apps/web/app/lib/signal-generator.ts`, `ta-engine.ts` — generation untouched
- `apps/web/lib/tracked-signals.ts` *recording* path — signal history writes unaffected
- `apps/web/app/api/cron/signals/*` — the empty `live_signals` dead path stays dead
- `scripts/scanner-engine.py` — unchanged (local-only, not production)
- Existing auth (`tc_admin` cookie) — unchanged

## 12. Open Questions

None blocking. Noted for future discussion but not part of this implementation:

- When Stripe gets wired, will each strategy be a separate Product/Price, or one Product with metadata? (Either fits the schema as-is.)
- Should `/pricing#strategies` become a real page in this project or wait for a proper marketing surface?
- Eventually we may want to wire `SIGNAL_ENGINE_PRESET` into `signal-generator.ts` so premium strategies actually produce different signals — that's a separate spec.
