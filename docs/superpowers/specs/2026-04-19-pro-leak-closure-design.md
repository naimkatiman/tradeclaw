# Pro-Tier Leak Closure — Design Spec

**Date:** 2026-04-19
**Status:** Draft
**Parent:** `docs/superpowers/specs/2026-04-19-tier-segregation-delta-design.md`
**Goal:** Close three concrete leaks where Pro value bleeds to free-tier callers, and convert each leak into a clearly-communicated Pro value prop.

---

## 1. The three leaks

| Surface | Leak today | Fix |
|---|---|---|
| `/api/explain` | No auth, no tier gate, no rate limit. Every anon call burns LLM $. | Rate-limit anon/free to 10 calls / 24h by IP. Pro unlimited. |
| `/api/keys` POST | No session check, no tier check. Anyone passing any email creates a key. Keys bypass every UI gate. | Require session + `tier !== 'free'` to create. Free gets 402 with upgrade CTA. |
| `/api/alert-rules` POST | Auth'd but uncapped. Free can create unlimited rules — delivery spam + Pro value leak. | Cap free at 3 active rules. Pro unlimited. |

Each fix returns **HTTP 402 Payment Required** with a structured body the UI can render without string-matching.

## 2. Shared contract

### 402 response body

```ts
interface PaymentRequiredBody {
  error: 'upgrade_required';
  reason: string;              // human-readable, safe to show in UI
  limit?: {                    // present when the gate is quota-based
    kind: 'rate' | 'count';
    used: number;
    max: number;
    windowHours?: number;      // for rate-kind
  };
  upgradeUrl: string;          // always '/pricing?from=<source>'
}
```

Callers (UI or curl) get a stable shape. Status 402 is the semantically-correct "you need to pay" signal.

### Tier resolution helper

Add one helper to `lib/tier.ts`:

```ts
export async function getTierFromRequest(req: Request): Promise<Tier> {
  const session = readSessionFromRequest(req as NextRequest);
  if (!session?.userId) return 'free';
  try {
    return await getUserTier(session.userId);
  } catch {
    return 'free';  // fail-closed
  }
}
```

DRYs the `session?.userId ? await getUserTier(session.userId) : 'free'` pattern that already appears in two routes and is about to appear in three more.

## 3. Leak 1 — `/api/explain` rate limit

### Decisions

- **Quota:** 10 requests per **rolling 24-hour window** per client key.
- **Client key precedence:** `session.userId` if authenticated, else the trust-boundary IP from `x-forwarded-for` (first hop) with `request.ip` fallback. Never trust `request.headers.get('host')`.
- **Storage:** in-memory `Map<key, number[]>` keyed by client key, storing call timestamps. Cheap, single-process, resets on deploy. DB-backed rate limiting is over-engineering for 10/day caps.
- **Scope:** Applies to `POST /api/explain` (the expensive call). `GET` requests (if any) pass.
- **Pro users:** bypass entirely. `tier !== 'free'` → no check.

### New module

`apps/web/lib/rate-limit.ts` — tiny pure module:

```ts
interface RateWindow {
  max: number;
  windowMs: number;
}

export function check(key: string, window: RateWindow): {
  allowed: boolean;
  used: number;
  remaining: number;
};
```

Keeps the rate-limit store outside `explain/route.ts` so it's testable and reusable when we gate the next LLM endpoint (`/api/commentary`, likely Q3).

### Response

- **Allowed:** existing 200 payload, plus `X-RateLimit-Remaining` header for transparency.
- **Denied:** HTTP 402 with body per §2 — `reason: 'AI Analysis is limited to 10 calls/day on Free. Upgrade to Pro for unlimited.'`, `limit: { kind: 'rate', used: 10, max: 10, windowHours: 24 }`, `upgradeUrl: '/pricing?from=explain-quota'`.

### Test coverage

- 11th call within 24h returns 402 for free/anon
- Pro caller bypasses limit (100 sequential calls all 200)
- Different IPs tracked independently
- Window rolls: a call at T=0 falls out of the window after 24h + 1ms

## 4. Leak 2 — `/api/keys` POST gate

### Decisions

- **Require session.** Delete the email-from-body path — that's the root of the leak. Derive email from session.
- **Require `tier !== 'free'`.** Return 402 otherwise.
- **GET stays open** — free users can still see their (empty) key list and marketing copy on `/api-keys`.
- **Email mismatch guard:** if the request tries to create a key for a different email than the session's, reject 403. This isn't tier-related but it's a closely-related auth bug that shipping a tier gate without fixing would leave exposed.

### Response

- **Free user POST:** 402 `{ reason: 'API access requires Pro. Free dashboards remain available.', upgradeUrl: '/pricing?from=api-keys' }`.
- **No session POST:** 401 `{ error: 'Unauthorized' }` (unchanged pattern).
- **Pro POST:** existing 200 + created key.

### Test coverage

- POST without session → 401
- POST as free user → 402 + correct body shape
- POST as Pro with matching email → 200 + key
- POST as Pro with mismatched email → 403

## 5. Leak 3 — `/api/alert-rules` POST count cap

### Decisions

- **Free cap:** 3 active rules per user. "Active" = `enabled = true`. Disabled rules don't count.
- **Enforcement:** on POST, count existing rules for `session.userId`. If tier is free and count ≥ 3 and the new rule would be active, return 402.
- **Pro:** unlimited.
- **Existing rules preserved:** if a Pro user downgrades and has 7 rules, we don't auto-disable. They just can't CREATE a 4th until they delete existing ones or re-upgrade. (Principle: never quietly change user state on tier transitions.)
- **`PUT /api/alert-rules/[id]`** that flips a disabled rule to enabled also counts — re-check the cap there. Out of scope for v1 if nontrivial; document as a known path.

### Response

- **At cap + free:** 402 `{ reason: 'Free accounts can have 3 active alert rules. You have 3. Upgrade to Pro for unlimited.', limit: { kind: 'count', used: 3, max: 3 }, upgradeUrl: '/pricing?from=alert-rules' }`.
- **Pro create:** existing 201.

### Test coverage

- Pro user: 10 rules sequentially all 201
- Free user: 3 rules 201, 4th is 402 with correct body
- Free user creating a disabled rule (`enabled: false`) — passes even at cap (design decision: disabled rules don't consume quota)

## 6. UI disclaimer surfaces

Each fix has a matching UI hint so free users see the boundary *before* hitting it, not only in an error modal:

| Page | Disclaimer |
|---|---|
| `/api-keys` | When `tier === 'free'` OR anonymous: banner "API access is a Pro feature. Free dashboards stay free." + pricing CTA. POST button disabled with tooltip. |
| Alert rules form (wherever it lives) | When `tier === 'free'`, show "3 of 3 rules used" badge when at cap; form submit displays upgrade CTA on 402. |
| Signal explainer UI (wherever `/api/explain` is consumed) | On 402 response, render upgrade card inline. No preemptive banner — 9/10 users never hit the limit. |

**v1 enforcement:** banners are nice-to-have. The 402 body is enough for the UI to render a good error. Ship banners in the same commit as each backend gate where cheap; skip where it requires a component I have to build from scratch.

## 7. Non-goals

- **Not** moving rate-limiting to Redis/DB. In-memory per-process is fine for 10/day caps.
- **Not** rate-limiting `/api/signals` — already tier-gated on delay + symbols. Adding a hit count on top is noise.
- **Not** retroactively disabling alert rules for downgraded users.
- **Not** adding separate Elite/Custom quotas in this pass. Those tiers meet `tier !== 'free'` and inherit Pro's unlimited bucket. Differentiate later if needed.
- **Not** charging per-request (metered billing). That's a whole separate design.

## 8. Implementation sequence

Three commits, one per leak. Each ships independently; each has its own tests.

1. `feat(tier): getTierFromRequest helper + 402 body type` — shared plumbing, no behavior change
2. `feat(api/explain): rate-limit free to 10/24h, Pro unlimited` — Leak 1
3. `feat(api/keys): gate creation to Pro, delete email-from-body path` — Leak 2
4. `feat(alerts): cap free accounts at 3 active rules` — Leak 3

Optional 5th commit for UI banners on `/api-keys` and the alert-rules form if they exist — skipped in v1 otherwise.

## 9. Rollback

Each commit is independent. Revert any single one without affecting the others. The only shared piece is `lib/tier.ts`'s new `getTierFromRequest` helper — harmless on its own if no caller uses it.
