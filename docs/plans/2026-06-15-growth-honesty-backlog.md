# Growth + Honesty Backlog — verified plan (2026-06-15)

Source: a 10-item "leverage ÷ effort" recommendation list. Every claim was verified
against live code by a 10-agent read-only workflow (run `wf_528f5f82-079`, 2026-06-15)
before this plan was written. Verdicts below are grounded in `file:line` evidence, not
the audit's assertions. Several items differ materially from how the audit framed them.

## Verification summary

| # | Item | Verified verdict | New dep | Scope | Gate |
|---|------|------------------|---------|-------|------|
| 1 | PRNG-fabricated stats (/wrapped + /api/report + weekly-report.yml) | CONFIRMED (worse) | none | L | caution |
| 2 | Referral `?ref` → checkout metadata | PARTIAL — only inbound capture missing | none | S–M | caution |
| 3 | Server-side PostHog (signed_up / conversion / churn / identify) | gap CONFIRMED | **posthog-node** | M | needs-approval |
| 4 | Navbar CTA (a) + magic-link checkout intent (b) | (a) debatable, (b) CONFIRMED | none | M | caution |
| 5 | Free-alert dispatch off the 403'd GH-Actions path | PARTIAL — only the free alert is on it | none | M | needs-approval |
| 6 | Real web-push subscribe + per-signal fan-out | PARTIAL — API real, dispatch dead, store ephemeral | none | L | caution |
| 7 | Email subs + waitlist → Postgres + lifecycle emails | CONFIRMED — JSON files wiped each deploy | none | L | needs-approval |
| 8 | Cancellation save flow + win-back | CONFIRMED — straight to Stripe, $0 retained | none | M | needs-approval |
| 9 | X auto-posting of daily/weekly card | MISLEADING — already automated via Claude Chrome | none | S | caution |
| 10 | A/B hero + feature flags + activation event | PARTIAL — vanity test, no variant attribution | none (rides #3) | M | caution |

Only **#3** requires a new dependency. **#9 must NOT add an X API client** — that
contradicts the deliberate Claude-Chrome posting architecture.

## Per-item detail

### #1 — Kill PRNG-fabricated stats  (CONFIRMED, brand + legal critical) — DONE in this PR
- Evidence: [WrappedClient.tsx:64-129](../../apps/web/app/wrapped/WrappedClient.tsx) (LCG, no real data loaded);
  [api/report/route.ts:5-75](../../apps/web/app/api/report/route.ts) (mulberry32, never queries DB);
  [.github/workflows/weekly-report.yml:41-62](../../.github/workflows/weekly-report.yml) (same PRNG → public GitHub Discussions weekly).
- Honest pattern already exists: [weekly-digest.ts](../../apps/web/lib/weekly-digest.ts) returns empty under 5 real signals; `/api/demo/signals` is correctly labelled synthetic.
- Fix shipped: new pure aggregators [weekly-pulse.ts](../../apps/web/lib/weekly-pulse.ts) + [wrapped-stats.ts](../../apps/web/lib/wrapped-stats.ts) compute from `signal_history` via `isCountedResolved`, with an `hasEnoughData` gate → honest empty state. `/api/report` + new `/api/wrapped` serve them; WrappedClient/ReportClient consume real data; `/wrapped` reframed platform-wide (no per-user trade ledger exists). `weekly-report.yml` posts only real GitHub metrics + links to the live report.

### #2 — Referral inbound capture  (PARTIAL)
- Built already: referral tables ([migrations 042–044](../../apps/web/migrations)), `/api/referrals` link generation, checkout accepts `referrerId` → Stripe metadata, webhook records it.
- Missing: [PricingCards.tsx](../../apps/web/app/pricing/PricingCards.tsx) never reads `?ref` nor forwards `referrerId`.
- Fix: read `?ref` (useSearchParams; optional cookie), forward `referrerId` to the checkout POST. Add a server-side guard: reject self-referral and validate the code exists.

### #3 — Server-side PostHog  (gap CONFIRMED — NEEDS DEP APPROVAL: `posthog-node`)
- Today: client-only `posthog-js`; the server `trackEvent('trial_started')` is a no-op; the Stripe webhook has zero instrumentation; no `identify()` anywhere.
- Fix: add `posthog-node`, server client, `identify()` on user create, instrument webhook (conversion / churn / renewal). Wrap every call in try/catch so analytics never blocks the webhook.

### #4 — Navbar CTA (a) + magic-link checkout intent (b)
- (a) Debatable: public navbar gives GitHub-star prominence; low confidence it's a bug vs product choice → optional copy tweak.
- (b) CONFIRMED leak: [magic-link/verify/route.ts](../../apps/web/app/api/auth/magic-link/verify/route.ts) always redirects to `/dashboard`; OAuth preserves `priceId/tier/interval`. Fix: thread checkout intent through magic-link start→verify.

### #5 — Free-alert dispatch resilience  (PARTIAL — NEEDS-APPROVAL + operator)
- Only the GH-Actions free Telegram alert dies on the 403; Pro broadcast + per-user rules run in-app. Code fix = move free dispatch into the in-app cron (mirror the Pro broadcast); real 403 root cause is a Cloudflare WAF rule for `/api/cron/*` (operator-side).

### #6 — Web-push fan-out  (PARTIAL)
- Real subscribe (WelcomeClient PushManager + VAPID) but `sendPushToAll()` is dead code; cron sends Expo only; NotificationsClient button is fake; store is ephemeral JSON (same root cause as #7). Fix: wire real per-signal web-push fan-out; move store to Postgres; document VAPID env.

### #7 — Email/waitlist → Postgres + lifecycle  (CONFIRMED — NEEDS-APPROVAL: migration)
- `/data/*.json` via `fs`, wiped every Railway deploy. Only 3 transactional emails. Fix: Postgres tables + migration; welcome / Pro-activation / inactivity emails.

### #8 — Cancellation save flow  (CONFIRMED — NEEDS-APPROVAL: billing)
- Cancel → Stripe portal → immediate downgrade, no retention. Fix: custom cancel endpoint with reason + pause/downsell/discount; win-back sequence.

### #9 — ref/UTM in auto-posted social URLs  (MISLEADING → small real fix)
- Posting is automated via a Claude Chrome agent by design (no X API). Real gap: auto-posted URLs carry UTM but no referral code. Inject `ref` (depends on #2) + UTM. Do NOT add an X API client.

### #10 — Real experiment instrumentation  (PARTIAL — rides on #3)
- Hero A/B assigns via localStorage, tracks impressions/clicks only; no PostHog flag, no variant attribution, no activation event. Fix after #3: variant property on conversion events + define/instrument an activation event.

## Batching & sequencing

- **Batch 1 — no new dep, shippable now**
  - PR A: #1 PRNG honesty (this PR). PR B: #2 referral capture + #9 ref-in-URL. PR C: #4b magic-link checkout-intent.
- **Batch 2 — needs `posthog-node` approval (granted 2026-06-15)**
  - PR D: #3 server-side analytics → PR E: #10 experiment instrumentation.
- **Batch 3 — needs approval (migration / billing / infra + operator)**
  - PR F: #7 email→Postgres + lifecycle. PR G: #6 web-push fan-out + store→Postgres. PR H: #8 cancellation save flow. PR I: #5 free-alert resilience (paired with operator WAF).

## Execution discipline
- One concern per PR; each in an isolated git worktree off `main` (root checkout stays on `main`, integration-target only).
- Type-check + relevant tests green before each PR. Next.js here has breaking changes vs. training data — read the bundled docs before writing Next code (`apps/web/AGENTS.md`).
- `packages/agent/dist` is force-tracked; never `git add -A` — stage explicit source paths only.
- Hard halts: #5/#7/#8 (migration/billing/infra/operator) do not proceed without explicit approval.
