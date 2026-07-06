# Free Open-Source Transparency Pivot

Date: 2026-07-07
Owner: Naim
Status: PROPOSED — awaiting owner confirmation + Stripe settlement (Phase 0) before any code lands.
Audit basis: 6-agent workflow audit 2026-07-07 (Stripe/tier surface, EarningsEdge, branding/copy, evidence assets, live tradeclaw.win, external literature).

## Goal

Remove all monetization (Stripe, tiers, paywalls) and rebrand TradeClaw as a fully free,
open-source transparency engine. The product's message becomes its own production finding:
short-term signal trading has no net edge after real costs; long-term holding is the rational
default for small traders. Quarantine the legacy paid-signals product in `legacy/`.

## Why (one paragraph)

The repo already proved the thesis. PR #136 recost 3,796 production trades at their real
recorded cost: net expectancy −0.4317R/trade, avg cost 0.4466R (22.3x the old flat charge),
no asset-class × band cell net-positive at n≥100. Every candidate edge was killed under
pre-registered specs (single-asset timing, daily momentum, regime routing, funding carry,
cross-sectional momentum). The live equity API honestly reports ~−100% total return. Yet
tradeclaw.win/pricing still sells Pro $29/Elite $99 with "+59.2% Historical PnL" and "Stop
renting your edge" — a claim the owner's own data disproves, next to a paid CTA. Removing
Stripe is not only the mission change; it removes an active liability.

## Honest-framing constraint (non-negotiable)

The internal evidence proves **anti-timing**, not **pro-any-asset**:
- We CAN say: after real costs, our engine — and by the literature, most short-term retail
  trading — is net-negative. Turnover is a certain cost; holding minimizes it.
- We CANNOT say: "buy and hold X and you will profit." The same research shows the crypto
  basket itself lost ~50% in the 2024-06→ window. The affirmative holding case uses external
  literature (below) + a same-window benchmark computed honestly, both directions disclosed.
- Copy accuracy notes from the citation audit:
  - PDT rule: eliminated effective 2026-06-04 (FINRA Notice 26-10). Use past tense —
    "for 25 years small accounts were bound by…" — never present tense.
  - "74–89% of retail CFD accounts lose money" is EU national regulators' analyses cited by
    ESMA (2018), not a single ESMA study. Attribute accordingly.

## External citation pack (verified 2026-07-07, primary sources)

| Claim | Source | Number |
|---|---|---|
| Active funds lose to index long-run | SPIVA U.S. Scorecard (YE2024/YE2025) | 89.5% of active US large-cap funds underperformed S&P 500 over 15yr; 0/22 categories majority-beat |
| Frequent traders underperform | Barber & Odean, J. Finance 2000 | Most-active quintile 11.4%/yr vs market 17.9%/yr (66,465 households) |
| Retail losses are institutions' gains | Barber, Lee, Liu & Odean, RFS 2009 (Taiwan) | Individual losses = 2.2% of GDP; institutions +1.5pp/yr from the other side |
| Day trading for a living fails | Chague, De-Losso & Giovannetti (Brazil), SSRN 3423101 | 97% of 300+-day day traders lost money; 1.1% beat minimum wage |
| Behavior gap | DALBAR QAIB 2025/2026 | 2024: investor 16.54% vs S&P 25.02%; ~9.8% vs ~13%/yr over decade (pair with SPIVA; methodology has critics) |
| CFD retail loss rates | EU regulators via ESMA 2018; FCA CP16/40 | 74–89% lose (avg €1.6k–29k); FCA: 82% lose, avg £2,200 |
| Options retail losses | Bryzgalova, Pavlova & Sikorskaya, J. Finance 2023 | −$2.1B Nov 2019–Jun 2021; weeklies avg 12.6% bid-ask spread |
| Crypto retail losses | BIS WP 1049 | 73–81% of retail crypto-app users lost money 2015–2022; whales sold into retail buying |
| Hidden execution cost | SEC order vs Robinhood, 2020-321 | $34.1M customer harm net of free commissions; $65M penalty |
| Rules asymmetry (historical) | FINRA PDT rule 2001–2026-06-04 | $25k minimum equity bound only small accounts for 25 years |

URLs are in the audit output archived with this plan's session; embed them when the public
citations page is built.

## Assumptions

1. Repo work branches off `origin/main` — NOT the stale `loop/standup-2026-06-26` checkout
   (main has the honest equity route, migration 052, the BTC-kill JSON; this checkout does not).
2. TradeClaw name stays; positioning, tagline, and funnel change. No new domain.
3. Prod DB is Railway Postgres; web deploys via manual `railway up` (not GitHub autodeploy).
4. Existing paying subscribers exist until proven otherwise (admin page counts them live).
5. `legacy/` at repo root is the quarantine folder. Moving app-route code out of
   `apps/web/app` is what disables it — that is intended.
6. Historical plan/audit docs under `docs/` stay in place (they ARE the transparency record);
   only live product code and misleading assets move or die.

## Phase 0 — Operator actions (Naim, outside the repo; blocks everything)

1. Stripe dashboard (main account): list active/trialing subscriptions. Cancel (prorate/refund
   per your policy), archive Pro/Elite products + prices, disable the `/api/stripe/webhook`
   endpoint, remove Billing Portal config. Active 7-day trials will silently convert if left.
2. Stripe dashboard (EE): same for subscriptions with metadata `product=earningsedge`;
   delete the EE webhook endpoint.
3. DB exports BEFORE any drops: `ee_users`, `referral_revenue`, `referral_rewards`
   (rev-share obligations are keyed on stripe_invoice_id), `elite_interest`,
   `contact_sales_inquiries`, `subscriptions`.
4. Find and disable the external scheduler hitting `/api/cron/trial-reminders`
   (not in repo; Railway cron or external service with CRON_SECRET).
5. Decide: Telegram Pro/Elite private groups — archive, or open to public. (Gate removal
   silently opens them otherwise.)
6. Decide: TradingView partner strategies (tv-zaky-classic, tv-hafiz-synergy,
   tv-impulse-hunter) + PREMIUM_SIGNAL_SOURCE feed — exposing them free is a partner
   decision, not a code decision.

## Phase 1 — Kill the false-claims funnel (first PR; small, urgent)

Branch: `feat/oss-pivot-1-stop-selling` off origin/main.
- Remove checkout entry points: pricing page + PricingCards, `/api/stripe/checkout`,
  auto-checkout in signin/OAuth callback, Upgrade CTAs in nav/footer/UserMenu/heroes.
- Kill the contradicting claims: pricing "+59.2% Historical PnL" block, "Stop renting your
  edge" H1, OG title "Stop Renting Your Trading Edge", tier taglines in stripe-tiers.ts.
- Remove fabricated signal assets everywhere they appear: ab-hero SIGNAL_TEMPLATE
  (hardcoded 87%/74% "live" cards), `/api/og` default image (fake XAU BUY 87%),
  readme-banner.svg static signal card, how-it-works "XAU/USD BUY @ 87%" example.
- Update the E2E specs that pin this copy (pricing.spec, tier-journey heading assertion).
Verification: web typecheck + jest green; e2e pricing specs removed/updated; deploy;
`/pricing` 404s or redirects to `/track-record`; homepage has zero paid CTAs.

## Phase 2 — De-tier: everything free (split into ≤15-file commits by layer)

Branch: `feat/oss-pivot-2-detier`.
Commit axes (each with its tests in the same commit):
1. **Core canon**: delete lib/tier.ts, tier-client.ts, stripe.ts, stripe-tiers.ts; rewrite
   lib/hooks/use-user-tier.ts into a plain session hook (it is the app-wide auth hook —
   ClientSession loses tier/subscriptionStatus/trialEnd/cancelAtPeriodEnd); rewrite
   `/api/auth/session`, oauth-state, signin. These must move in lockstep.
2. **API gates**: strip tier gating from ~20 routes (signals, history, public, equity band,
   v1, prices/stream, consensus, signal-of-the-day, strategy-breakdown, explain, alert-rules,
   keys, demo/telegram, premium-signals*). Response shape change: `lockedSignals` array goes;
   DashboardClient updates in the same commit as `/api/signals`.
3. **UI**: delete locked/upsell components (LockedTP, DelayCountdown, UpgradeModal, TierBadge,
   banners, TrialCTA, EliteInterestForm); rewrite dashboard/track-record/settings/navbars.
4. **Telegram**: remove join-request tier gate, invite mint/revoke, pro-broadcast; decide
   group disposition per Phase 0.5. Keep bot commands + free-channel broadcast.
5. **ws-server**: drop tier claim parsing + symbol gate (ships with web — same deploy).
6. **Stripe/webhook/billing plumbing**: delete webhook, portal, trial-reminder cron,
   transactional emails, missed-pnl, referrals (UI+API), pro-grants admin, contact-sales,
   elite-interest; rewrite admin page.
7. **Migrations**: new forward drop-migration (do NOT retro-edit applied files) dropping
   monetization tables/columns after Phase 0 exports: subscriptions, pro_email_grants,
   telegram_invites, contact_sales_inquiries, elite_interest, referral_*, users.tier/
   stripe_customer_id/tier_expires_at/referred_by/referral_code, signal_history
   .telegram_pro_message_id. KEEP processed_stripe_events until EE is retired (shared,
   ee:-prefixed rows). Rewrite 001_monetization for fresh installs (it creates core `users`);
   verify the fresh-Docker migration chain end-to-end. Update supabase/schema.sql +
   public/schema.sql + check-schema.mjs.
8. **deps/env**: drop `stripe` from package.json; .env.example / .env.docker.example cleanup.
   Railway env removal AFTER the new code deploys (NEXT_PUBLIC_STRIPE_* are build-time
   inlined — needs a rebuild).
Verification per commit: web tsc + jest; after the batch: full e2e suite, fresh-install
migration run in Docker, `railway up`, smoke `/api/signals` (no locked array), ws prices on
a previously-Pro symbol.

## Phase 3 — Legacy quarantine (`legacy/`)

Branch: `feat/oss-pivot-3-legacy`.
- `legacy/earningsedge/` ← apps/web/app/earningsedge, app/api/earningsedge,
  lib/earningsedge, earningsedge migrations. Delete outright: lib/earningsedge/supabase.ts
  (dead), earningsedge_001.sql (superseded), @supabase/supabase-js dep. Add a redirect/410
  for /earningsedge. Only after EE Stripe settlement (Phase 0.2).
- `legacy/premium-signal-server/` ← examples/premium-signal-server.
- `legacy/README.md`: one page stating what this was, why it was retired, linking the
  recost evidence. The legacy folder is itself a transparency artifact.
- Localized READMEs (ja/ko/zh) → `legacy/i18n/` until retranslated (they'd silently keep
  the old pitch).
- run-migrations.mjs: remove the earningsedge special-case.

## Phase 4 — Rebrand to the transparency thesis

Branch: `feat/oss-pivot-4-rebrand`.
New positioning (draft, owner to approve wording):
- Hero: "We built a signal engine and measured it honestly. It loses." /
  "Every short-term edge we tested died at real cost. We publish the bodies."
- Tagline: "Trade transparency, not signals."
- The rules-asymmetry line, sourced: "The most active retail traders underperform the market
  by 6.5pp/yr. Short-term traders play by rules written for bigger money. Holding is the
  rational default."
Surfaces: README (+ banner SVG), layout.tsx metadata/OG/JSON-LD, heroes (keep proof-hero's
live-API pattern — zero hardcoded numbers), FAQ, email digest, lib/translations.ts (5 locales
in the same pass or route them to EN), manifest.json, telegram bot welcome/broadcast copy
(gross "Profit: X%" replies get cost context or die), ThreadsClient viral copy → flip to the
no-edge honesty thread, blog TrialCTA remove + audit 4 MDX posts, STATE.yaml description,
free-signals/premium-signals SEO pages → fold into track-record/research.
Terms/Privacy: strip subscription/billing/refund + Stripe processor clauses.

## Phase 5 — The affirmative product (transparency engine)

Branch: `feat/oss-pivot-5-research-pages`. The evidence-audit gap list becomes the backlog:
1. `/research` — "What we tested and killed": the two FINAL verdicts, BTC-sleeve kill,
   carry decay, REGISTRY.md rendered; already spec'd twice (phase 6b.2, reposition Track A).
2. Same-window buy-and-hold benchmark from the existing candle store (candle-db.ts) next to
   the −100% engine curve — both directions disclosed (basket −50% in the recent window).
3. `/methodology` — one lay-reader page: R-multiples, isCountedResolved rules, per-asset
   cost table (crypto 0.40% / metals 0.10% / FX 0.04% RT, funding excluded-and-why),
   resolution provenance. Content already exists scattered in stat-hints.ts,
   honesty-contract.md, backtest-options.ts.
4. `/why-long-term` — the external citation pack, correctly attributed.
5. Commit dated machine-readable artifacts: recost-segment JSON export, equity API snapshot;
   add the missing REGISTRY.md lines (recost run + 2026-06-26 BTC re-run).
6. Calibration panel consuming `/api/calibration` (exists, unconsumed).
7. Decay auto-demotion enforcement + public retirement ledger (weekly-research P1).

## Open decisions (owner)

| # | Decision | Default recommendation |
|---|---|---|
| 1 | Subscriber wind-down: refund policy + notice email | Immediate cancel + prorated refund + email pointing at the pivot post |
| 2 | EarningsEdge: legacy/ or delete | legacy/ (it's also evidence of the era) |
| 3 | Telegram Pro/Elite groups | Merge into the public channel |
| 4 | Partner strategies going public-free | Needs Zaky/partner sign-off before Phase 2.2 exposes them |
| 5 | Pivot announcement (blog post + pinned Telegram + README) | Yes — the announcement IS the marketing |
| 6 | Data licensing exposure (TradingView scraping, Binance/Stooq redistribution) rises with a high-visibility transparency launch | Review before Phase 5 goes wide |

## Risks

- Branch drift: repo runs concurrent /loop standup sessions; every phase branches off fresh
  origin/main and re-verifies HEAD before commit (see concurrent-session discipline).
- Revenue goes to zero by design. The strategy-audit pilot (PR #150, propose-only) remains
  the only revenue experiment; it is transparency-aligned but its sample report is not
  cost-adjusted — do not market it as "cost-adjusted verified".
- SEO: layout keywords + /free-signals + /premium-signals target "trading signals" intent;
  traffic mix will change. Acceptable — that intent is the audience to convert to the thesis.
- Migration-chain breakage for fresh self-hosts: mitigated by rewriting 001 + end-to-end
  fresh-Docker verification in Phase 2.7.

## Verification gate (every phase)

Type-check + jest green stated explicitly; e2e for touched flows; fresh Docker install after
migration changes; `railway up` + live smoke on tradeclaw.win; no commit >15 files unless
generated; one concern per commit.
