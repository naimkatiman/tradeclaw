# IA consolidation — make the front door match the product

Date: 2026-08-05
Branch: `agent/ia-consolidation-20260805`
Base: `origin/main` @ `705c5268` (exact production main)

## Goal

TradeClaw is a free, open-source track record proving with real data that short-term
signals lose after costs — and showing what survives long-term. Every route either
serves that proof or stops being advertised.

The engine, APIs, cron jobs, and admin/operator surfaces stay exactly as they are.
This is a front-door change only: complexity behind, one clear idea in front.

## Problem

The homepage and navbar were reduced to one idea in PR #166 (first-layer simplicity).
The rest of the surface was never brought along:

1. `sitemap.ts` advertises 82 URLs (89 live), including growth-hack pages, at priority
   0.6–0.9. Search traffic lands on pages with no cost-honesty framing.
2. Several route pairs ship two independent implementations of the same concept.
3. Monetization code (Stripe lib, webhook) survives the pivot that dropped the tables.
4. `scope=pro` is the default parameter name on a product with no paid tier.

## Verified mechanism decision

Page-level `redirect()` does **not** produce an HTTP redirect in this deployment.
Observed on production 2026-08-05:

| Route | Idiom | Live response |
|---|---|---|
| `/pricing` | `redirect()` in `page.tsx` | `200` + app-shell HTML, `s-maxage=31536000` |
| `/badges` | `redirect()` in `page.tsx` | `200` |
| `/fly`, `/replit` | `next.config.ts` `redirects()` | `307` → `/start` |
| `/signals` | `next.config.ts` `redirects()` | `308` → `/screener` |

Therefore all new canonicalization goes in `next.config.ts` `redirects()`, which
produces real edge redirects. Existing `redirect()` pages are migrated in the same pass.

## Corrections to the initial read (recorded so the mistake is not repeated)

- `/results` vs `/performance` are **not** duplicates. `/performance` is a system
  latency/throughput dashboard; `/results` is "Strategy Profiles (Illustrative)".
  No redirect between them.
- `/widgets` is richer than `/widget` (66KB vs 54KB, five sections vs one), so the
  canonical direction is `/widget` → `/widgets`, not the reverse.
- The site footer is not two links. It exposes 26 routes via a `COLUMNS` array using
  `href:` object syntax, which a literal `href=` grep misses.

## Test guardrails that already exist

- `apps/web/app/__tests__/sitemap-routes.test.ts` — no sitemap URL may 404; the six
  transparency pages must stay listed; localized landings need complete alternates.
- `apps/web/app/__tests__/nav-routes.test.ts` — `PageNavBar`, `navbar`, `mobile-nav`,
  `site-footer` may only link to routes that exist. Removing a page without updating
  the footer fails this test.
- `apps/web/test-utils/route-exists.ts` — resolves a pathname to a `page.*` file.
  A redirect-only page still counts as existing; a deleted directory does not.

## Phases (one commit each, ≤15 files)

1. **Sitemap diet** — cut `sitemap.ts` to the core proof set; update the sitemap test.
2. **Canonicalize duplicates** — edge redirects + update inbound links.
3. **Quarantine growth-hack routes** — edge redirects to `/`; update any nav/footer refs.
4. **Retire monetization dead code** — delete unreachable Stripe lib/webhook, add
   `scope=full` alias with `pro` kept for backward compatibility.

## Verification per phase

- `npx jest apps/web/app/__tests__/sitemap-routes.test.ts apps/web/app/__tests__/nav-routes.test.ts`
- `npm run typecheck:web`
- `npm run lint`
- `npm run build` (must generate all pages)
- Live probe of each changed route after deploy.

Baseline before any change: 19 tests green in the two route test suites.

## Out of scope (logged, not implemented)

- `AGENTS.md` still describes the pre-pivot product (viral-star goal, "Alpha Screener
  = confirmed SaaS brand / upsell"). Contradicts the pivot. Owner decision.
- `/results` is titled "Strategy Profiles (Illustrative) … Hand-authored examples, not
  engine output" — hand-authored numbers on an evidence-first site. Owner decision.
- 60+ stale git worktrees on this host.
- `STATE.yaml` structural defect (91 misnested task records) — pre-existing.
