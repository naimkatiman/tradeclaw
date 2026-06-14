# UX / Conversion Polish — 2026-06-11

Goal: make the core journey (landing → pricing → screener → signin) complete, lovable, and honest, without architecture rewrites. Branch `ux-polish`, one concern per commit, build gate `npm run build` (330 pages) after each.

## Finding 1 — Marketing surfaces show losing stats computed with the wrong denominator (CRITICAL)

Production today:

- Landing ProofHero: `Cumulative P&L (30d) -195.67%`, `Profit factor 0.85`, `Recent win rate 26%`
- Pricing stat bar: `37.9% win rate`, `-38.2% cumulative PnL`

Two distinct causes:

1. **Denominator bug.** `lib/pricing-stats.ts` and `lib/landing-stats.ts` do not exclude `gate_blocked` rows. The canonical predicate `isCountedResolved` (lib/signal-history.ts:37) excludes simulated, gate-blocked, and zero-pnl placeholder rows, and its doc comment says to use it for every public denominator (`/api/signals/history`, `/api/signals/equity`, `/api/leaderboard` already do). Verified against production API: canonical all-time = 3,256 resolved, 38.8% WR, +86.1% summed 24h PnL (+107.5% equity return), break-even WR 36.9%. The landing's -195.67% becomes -60.9% under the canonical 30d computation — the rest of the gap is gate-blocked rows the engine refused to trade.
2. **Framing defect.** The 30d window is genuinely red right now (canonical 30d: 34.4% WR, -60.9%); all profit came from the earlier period. The entire history is <90 days old. Leading marketing surfaces with a transient red window while the true all-time record is profitable is self-sabotage; hiding red entirely would be dishonest. Honest middle: show clearly-labeled all-time canonical stats with break-even/payoff context, keep /track-record as the full-transparency surface (equity curve includes the recent drawdown).

Fix (layered commits):

- `fix(stats)`: add `AND COALESCE(gate_blocked, false) = FALSE` to all queries in `lib/pricing-stats.ts` and `lib/landing-stats.ts`; switch both to all-time window; add payoff/break-even aggregates. Extend `lib/__tests__/pricing-stats.test.ts`.
- `feat(pricing)`: stat bar shows all-time canonical WR / resolved count / cumulative PnL + one caption line: wins-vs-losses payoff and break-even win rate, linking to /track-record.
- `feat(landing)`: ProofHero tiles use all-time canonical stats, relabel "(30d)" → since-launch framing, replace `Recent win rate` tile (recent-100 window) with all-time WR + break-even subtext.

Product call flagged for review: marketing surfaces switch from 30d to all-time framing. Decided autonomously because the 30d framing currently shows engine-refused trades as losses and contradicts /track-record's own math.

## Findings 2–11 — confirmed by audit agents and fixed (one commit each)

2. **Onboarding checklist blocked sign-in on mobile (CRITICAL).** 340px panel, no auth/route guard, covered 100% of the sign-in form at 390px. Now authenticated-only, pill-by-default on small screens, 36px touch targets; PWA banner yields to it.
3. **Share/SEO URLs pointed at tradeclaw.com (HIGH, top ROI).** A stale openresty mirror — every /today share, OG footer, hreflang alternate, and email CTA sent traffic off the live product. 45 occurrences → tradeclaw.win (self-hoster placeholder `your-tradeclaw.com` untouched). Ops follow-up: 301 the .com mirror at the server level.
4. **/free-signals frozen at build time (HIGH).** No revalidate on an SEO page promising real-time alerts → `export const revalidate = 300`.
5. **Screener rescue buttons were dead + errors blamed the user (CRITICAL).** Filter changes now trigger a debounced rescan; failed scans clear stale stat tiles and show "Scan failed — retry" instead of "your criteria are too restrictive". Copy said 12 assets; engine scans 37 (`SYMBOLS.length`).
6. **Double footers on 12 money pages (HIGH).** Global layout footer + a second landing footer back-to-back. Per-page renders deleted; dead component removed.
7. **Raw magic-link error codes (MEDIUM).** "Sign-in failed (consumed)" → human copy steering users to request a fresh link; auth buttons no longer hidden behind the session round-trip.
8. **Nav label mismatch (MEDIUM).** "Signals" → /screener ("Asset Screener") renamed to "Screener" in navbar, mobile nav, footer.
9. **/today dead page states (HIGH).** No nav, no freshness despite "updated every 5 minutes", lone spinner, empty drought state. Now: PageNavBar, "Generated Xm ago", card skeleton, empty state links to track-record/free-signals/GitHub.
10. **Writer A side-effects unthrottled (HIGH, scale).** Every anonymous signal request fired INSERT attempts + per-signal self-HTTP + social enqueues (no-ops after DB dedup, full cost anyway). 60s in-process throttle keyed on the signal set.
11. **Money APIs uncacheable (MEDIUM).** `private, s-maxage` is self-contradictory; /api/screener had no header. Anonymous: `public, max-age=60, swr=240`; signed-in: `private, no-store`. /live poll 10s → 60s (engine cadence is 5 min).

## ⚠️ Deferred (logged, not implemented)

- Tools dropdown trim (16 entries incl. vendor deploy pages) + promoting Pricing into primary nav — IA opinion call for Naim.
- Static skeleton for /screener dynamic-import fallback (LOW; in-table skeletons already good).
- 301 redirect of the tradeclaw.com mirror — server/ops task outside this repo.
- /free-signals client always-refetch on mount (ISR at 300s judged sufficient).
- Audit praised and untouched: checkout-intent threading through OAuth, Stripe webhook race handling on /welcome, Redis/OHLCV cache layering, screener scan-sequence guard.

## Verification

- `npm run build` green, 330 pages, after every commit.
- Jest: `pricing-stats` suite green (DB-latency flake in paper-trading-db is known, not a gate).
- Post-deploy: curl tradeclaw.win/pricing + / and confirm rendered stats match the canonical API numbers; screenshot before/after.

## Deploy

GitHub auto-deploy is OFF. PR to naimkatiman/tradeclaw, then `railway up --detach` from repo root (linked to tradeclaw/production/web).
