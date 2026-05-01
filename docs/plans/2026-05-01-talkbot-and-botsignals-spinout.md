# talkbot.win + bot-signals.com — Spinout Plan

**Date:** 2026-05-01
**Owner:** Zaky / TradeClaw
**Status:** PROPOSAL — awaiting decisions before scaffolding (see Open Questions)
**New repos to create (private):** `naimkatiman/talkbot`, `naimkatiman/bot-signals`
**New domains:** `talkbot.win`, `bot-signals.com`
**Source repos (private, exist):** `naimkatiman/Roboforex` → talkbot, `naimkatiman/ImpulsePipHunters` → bot-signals
**Supersedes:** `2026-05-01-bot-signals-com-spinout.SUPERSEDED.md` (single-repo version, abandoned because Roboforex deserves its own brand)

## Why three domains, not one

Two of the three products have fundamentally different audiences:

- **tradeclaw.win** — traders who want signals + dashboard. Stays as-is.
- **talkbot.win** — community admins (TG/Discord) who want an AI bot in their group. Customers are NOT primarily traders — they're community owners. Could be crypto admins, broker IB managers, course creators, NFT communities. **Larger TAM than tradeclaw.** Trading communities are just the first vertical.
- **bot-signals.com** — Telegram chart-AI signals bot. Customers ARE traders. Tighter sibling to tradeclaw.

Bundling all three under one brand caps the upside on talkbot. "Community bot for your TG group" sells to a 10× wider audience than "chatbot for traders." Three domains lets each pitch land cleanly.

The interconnection is at the **billing + identity** layer (one Stripe account, shared customer object), not at the brand or marketing layer.

## Product definitions

### talkbot.win — AI community-bot SaaS

**Pitch:** "Drop an AI co-host into your Telegram or Discord community. It learns your docs, matches your brand voice, detects when members are frustrated, runs polls, manages onboarding, and answers questions 24/7."

**Source code:** Existing `naimkatiman/Roboforex` repo.

**Whitelabel work:** strip RoboForex broker-specific branding/seeds, generalize tenant onboarding flow ("paste your docs URL or upload markdown"), generic persona library instead of broker-specific personas.

**Already in the codebase (moat):**
- Multi-tenant from day one (`tenant_id` columns, tenant-scoped D1)
- Persona modifiers (bro-overconfident, police-angry, leha-dynamic-topics — already a system, not a hack)
- Mood + frustration detection per tenant
- Trust battery (per-user trust score across messages)
- Daily limits, rate limiting via Durable Objects
- Group buffer DO for batched group messages
- Community polls
- RAG via Cloudflare Vectorize + hybrid lexical
- Auto-learning loop (improves answers from user feedback)
- 36 D1 migrations, production-grade

This is a much more sophisticated product than "generic RAG chatbot." The community-engagement layer is what makes it monetizable separately from generic LLM wrappers.

**Existing tenants become first paying customers:**
- `tca-indonesia` (TCA Asia broker community)
- `impulse-my` (ImpulsePip Malaysia trading community)

Both already use the bot in production — flipping them to "paid talkbot.win tenants" is a billing migration, not a product migration.

**Pricing (proposal):**

| Tier | $/mo | Members | Queries/mo | Personas | Custom voice | White-label |
|---|---|---|---|---|---|---|
| Solo | $19 | up to 500 | 2,000 | 1 preset | ❌ | ❌ |
| Community | $49 | up to 5,000 | 20,000 | 3 presets + custom | ✅ | ❌ |
| Network | $149 | unlimited | 100,000 | unlimited custom | ✅ | ✅ branded URL |
| Enterprise | custom | unlimited | unlimited | unlimited | ✅ | ✅ + on-prem D1 |

Volume bands feel right; numbers are starting points. Adjust before Stripe products created.

**Domain layout:**
- `talkbot.win` → marketing
- `app.talkbot.win` → tenant dashboard (configure persona, upload docs, view query logs)
- `api.talkbot.win` → bot API (Telegram/Discord webhooks land here)

### bot-signals.com — Telegram chart-AI signals

**Pitch:** "A Telegram bot you can DM. Send a chart screenshot or a symbol; it returns AI-analyzed entry/SL/TP with reasoning grounded in real recent TradeClaw signals."

**Source code:** Existing `naimkatiman/ImpulsePipHunters` repo.

**Port work:** JS → TS, file-by-file with `--allowJs` (incremental, not full rewrite). Strip MT5 Python autotrade bridge from v1 (defer, see Open Question 2).

**Trader-focused, tighter sibling to tradeclaw:**
- Heavy interconnection: chart-AI prompt is enriched with tradeclaw `/api/v1/signals` upstream context
- Same target customer as tradeclaw Pro
- Bundle deal makes obvious sense (see pricing below)

**Pricing (proposal):**

| Tier | $/mo | What |
|---|---|---|
| Free | $0 | 5 chart analyses/day, no upstream context |
| Pro | $19 | Unlimited charts, tradeclaw signal context injected, priority queue |

Single paid tier. Simpler than talkbot's multi-tier because the value isn't volume-bounded the same way.

**Domain layout:**
- `bot-signals.com` → marketing + Telegram bot link
- `bot.bot-signals.com` → bot API (Telegram webhook)

## The interconnection layer (single shared piece)

One Stripe account. Three product catalogs. One canonical `customers` table living in tradeclaw Postgres (existing data plane, lowest friction).

```
                ┌──────────────────────────┐
                │        Stripe (one)      │
                │   Products: tradeclaw_*  │
                │             talkbot_*    │
                │             botsig_*     │
                └─────────────┬────────────┘
                              │ webhooks
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     ┌────────────┐    ┌────────────┐    ┌────────────┐
     │ tradeclaw  │    │  talkbot   │    │ bot-signals│
     │  webhook   │    │  webhook   │    │  webhook   │
     │  handler   │    │  bridge    │    │  bridge    │
     └─────┬──────┘    └─────┬──────┘    └─────┬──────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             ▼
            ┌──────────────────────────────────┐
            │  tradeclaw Postgres `customers`  │
            │  one row per Stripe customer     │
            │  products: ['tradeclaw_pro',     │
            │             'talkbot_community', │
            │             'botsig_pro']        │
            └──────────────────────────────────┘
                             ▲
                             │ key-authed read
                ┌────────────┼────────────┐
                ▼            ▼            ▼
            tradeclaw   talkbot.win   bot-signals
            (direct)    (HTTP)        (HTTP)
```

**Bundle SKUs (Stripe products):** see Open Question 1.

## Repos and code layout

### `naimkatiman/talkbot` (new private)

```
talkbot/
├── apps/
│   ├── marketing/              # talkbot.win — Next.js or Workers Sites; pricing, landing
│   ├── dashboard/              # app.talkbot.win — tenant dashboard
│   ├── bot/                    # api.talkbot.win — Worker (Telegram + Discord webhooks)
│   └── billing-bridge/         # Stripe webhook receiver, mirrors customer to tradeclaw
├── packages/
│   ├── core/                   # ported from Roboforex/src — RAG, personas, trust battery, mood
│   ├── shared-types/
│   └── tradeclaw-customer-sdk/ # typed client to fetch customer state from tradeclaw
├── infra/
│   └── wrangler.toml (per app)
├── migrations/                 # ported from Roboforex/migrations — D1
├── package.json (pnpm workspace)
├── turbo.json
└── README.md
```

**Migration from Roboforex:**
- Copy source (no subtree merge unless user asks for git history preservation).
- Keep all 36 migrations including tenant ones.
- `tca-indonesia` and `impulse-my` migrations stay (they're real tenants, not test data).
- Strip seed migration `0022_seed_tca_indonesia.sql` content that's RoboForex-broker-specific (FAQs about RoboForex deposits etc.) — replace with empty seed; the actual broker data goes back into the tenant via the dashboard.
- Rename CF resources: `roboforex-support-db` → `talkbot-prod-db`, `roboforex-content` R2 → `talkbot-content`, etc.

### `naimkatiman/bot-signals` (new private)

```
bot-signals/
├── apps/
│   ├── marketing/              # bot-signals.com — landing
│   └── bot/                    # bot.bot-signals.com — Worker
├── packages/
│   ├── shared-types/
│   └── tradeclaw-signals-sdk/  # typed client to /api/v1/signals
├── infra/wrangler.toml
├── migrations/                 # ported from ImpulsePipHunters/migrations
├── package.json
└── README.md
```

**Port from ImpulsePipHunters:**
- `index.js` → `index.ts`, `aiAnalyzer.js` → `.ts`, `chartFetcher.js` → `.ts`, `telegramBot.js` → `.ts`, `config.js` → `.ts`
- `tsconfig.json` with `allowJs: true` initially so partial port still builds; flip to `false` when all files migrated.
- MT5 Python bridge: NOT ported. See Open Question 2.

### tradeclaw side (additions)

```
tradeclaw/apps/web/
├── app/
│   ├── api/v1/customer-mirror/route.ts    # NEW — accepts signed POSTs from talkbot/bot-signals bridges
│   ├── api/v1/customer/me/route.ts        # NEW — talkbot/bot-signals fetch customer state
│   └── pricing/
│       └── page.tsx                       # EDIT — add 2 cards linking to talkbot.win, bot-signals.com
├── lib/
│   └── customers.ts                       # NEW — customer table CRUD, signed JWT helpers
├── migrations/
│   └── 019_customers_cross_domain.sql     # NEW — `customers` table
└── ...
```

`customers` table schema:
```sql
CREATE TABLE customers (
  stripe_customer_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  products JSONB NOT NULL DEFAULT '[]',  -- array of active SKU IDs across all 3 domains
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX customers_email_idx ON customers (email);
```

## Tasks (sequential, one commit per layer)

### Task 0 — Decisions

Resolve Open Questions 1, 2, 3 below. Without them, Stripe + repo + tenant migration shape is wrong.

### Task 1 — Create both private repos

`gh repo create naimkatiman/talkbot --private` and `gh repo create naimkatiman/bot-signals --private`. Initial commit with `README`, `LICENSE` (proprietary), `.gitignore`, monorepo scaffold.

**Gated on:** explicit user `proceed task 1` (creating repos = shared state action).

### Task 2 — Port Roboforex into talkbot

- Copy source from Roboforex (decision on history preservation in Open Q3).
- Rename CF resources, update wrangler.toml.
- `pnpm install`, `wrangler dev` boots, `/health` returns 200 against the new D1.

### Task 3 — Whitelabel pass on talkbot

- Strip RoboForex-broker copy from migrations, persona configs, default prompts.
- Generic onboarding flow on `app.talkbot.win`: "paste docs URL → we crawl + embed → here's your bot token."
- Update README, LICENSE.
- Smoke test: a fresh tenant can onboard from zero in `wrangler dev`.

### Task 4 — Port ImpulsePip → TS into bot-signals

- File-by-file `.js`→`.ts` with `allowJs:true`.
- Snapshot tests on 5 fixed chart inputs — output must match current JS prod for the port to land.
- MT5 bridge stripped (per Open Q2).

### Task 5 — Stripe products + billing bridges

- Create Stripe products per Open Q1's answer.
- `apps/billing-bridge/` Worker in each new repo.
- Both bridges POST to `tradeclaw.win/api/v1/customer-mirror` on subscription events.

### Task 6 — Tradeclaw cross-domain plumbing

- Migration `019_customers_cross_domain.sql`.
- New `/api/v1/customer-mirror` route (signed POST from bridges).
- New `/api/v1/customer/me` route (key-authed read for the other domains).
- Pricing page gets two cross-product cards.
- Daily reconciler cron (defensive belt — fetches Stripe customer.list, rewrites table).

### Task 7 — Marketing sites for both domains

- `talkbot.win`: landing + pricing + /tenants/onboard signup. Brand voice: community-bot, not enterprise FAQ.
- `bot-signals.com`: landing + pricing + Telegram bot deeplink.

### Task 8 — DNS + deploy

- Buy `talkbot.win` and `bot-signals.com` (manual user action, flagged).
- DNS records.
- `wrangler deploy` per Worker.
- Smoke test all subdomains externally.

### Task 9 — Migrate live tenants

- TCA Indonesia and ImpulsePip MY: cut over to talkbot.win deployment.
- Either: (a) migrate D1 data to new namespace, (b) keep them on Roboforex deploy until comfort, (c) free grandfathered tenants on talkbot to thank for early use.

## Out of scope (deferred)

- ⚠️ True SSO across all three domains. v1 = Stripe customer portal as cross-product identity.
- ⚠️ MT5 autotrade in bot-signals.com (per Open Q2).
- ⚠️ Discord-side of talkbot.win. Telegram first; Discord is Phase 2 (codebase already supports group abstraction, so the lift is small but not v1).
- ⚠️ White-label-as-a-service tier beyond the `Network` price tier (full reseller dashboards). Defer.
- ⚠️ Mobile apps for any of the three.
- ⚠️ Combined analytics / one PostHog spanning all domains.
- ⚠️ Aggregating bot-signals chart-AI signals into tradeclaw `signal_history`. Different shape, would pollute moat data.

## Risk register

| Risk | Mitigation |
|---|---|
| Existing TCA/ImpulsePip tenants confused by domain change | Email + in-bot announcement before cutover; offer free Community tier for N months |
| Stripe webhook race (customer pays → tenant not yet provisioned → welcome page broken) | Bridge writes tenant row in <500ms; welcome page polls `/api/me` for up to 10s |
| ImpulsePip TS port introduces regressions | Snapshot tests on 5 fixed inputs; port only lands when output matches current JS |
| talkbot whitelabel work mid-deploy: existing tenants see broken UI | Whitelabel pass happens before cutover; existing tenants stay on Roboforex deploy until migration |
| Cross-domain customer table drifts (one webhook silently drops) | Daily Stripe reconciler cron writes truth back |
| Domain not yet purchased | Use `*.pages.dev` staging URLs until domain bought (Task 8) |
| Shared Stripe account = blast radius (test mode mistake nukes both products' billing) | Strict test-mode-only API keys in dev; production keys behind Doppler/Vault, separate per surface |
| Roboforex code references `roboforex` everywhere | Whitelabel pass (Task 3) does mass rename; `grep -r 'roboforex'` post-Task-3 returns zero |

## Open Questions (need answers before Task 1)

### Q1 — Bundle SKU shape

Three options:
- **A. À la carte only** (3 standalone subscriptions, no bundle). Simplest. Customer can buy any combination.
- **B. À la carte + one bundle SKU** (bundle = all three at $59-69/mo, single Stripe product). Customer support handles "I bought the bundle, why do I have 3 invoices" by issuing only one invoice for the bundle. More billing-bridge logic.
- **C. Bundle replaces individual SKUs at top tier** (only Tradeclaw Pro / Talkbot Community / BotSig Pro can be bundled; lower tiers à la carte only). Cleaner pricing story but more complex Stripe catalog.

**Default if no answer: A** (à la carte only for v1; bundle as same-week follow-up after both products live).

### Q2 — MT5 Python autotrade bridge in bot-signals.com

ImpulsePipHunters has `mt5_bridge/` Python service for sending trades to MT5 broker accounts. Three options:
- **A. Strip from v1 entirely.** Bot-signals = signals/analysis only. Simpler ship.
- **B. Keep, deploy as separate Railway service.** More infra; bot-signals = full autotrade product. Higher value to traders willing to give the bot order authority.
- **C. Defer to v1.1** as a paid add-on. Keeps v1 simple, monetizes later.

**Default if no answer: A** (strip from v1 — chart-AI standalone is still a clean product, autotrade is its own scope).

### Q3 — Roboforex git history into talkbot

- **A. Plain copy** (clean slate, talkbot starts at commit 1).
- **B. `git subtree add`** preserves Roboforex history under `apps/bot/`. Useful for `git blame` continuity but mixes branding history.

**Default if no answer: A** (plain copy; archive Roboforex repo).

### Q4 — TCA Indonesia and ImpulsePip MY migration timing

- **A. Cutover with Task 9** (migrate live data when talkbot.win goes live; Roboforex deploy retired same day).
- **B. Parallel for N weeks** (both deploys live; tenants opt-in to migrate).
- **C. Free Community tier for early tenants** as thanks for being beta.

**Default if no answer: B+C** (parallel for 2 weeks, free Community tier for current tenants).

## Verification gates (final review)

After all tasks: dispatch `code-reviewer` against each new repo's full diff. They confirm:

- talkbot: no `roboforex` strings outside historical migration filenames; multi-tenant onboarding works for a fresh tenant; existing tenants migrate cleanly.
- bot-signals: no `.js` files in `apps/bot/src/`; snapshot tests pass; tradeclaw-signals-sdk fetches and parses without runtime type errors.
- tradeclaw: `customers` table exists; `/api/v1/customer-mirror` accepts signed POSTs; pricing page renders 2 new cards; existing tier flow unbroken.
