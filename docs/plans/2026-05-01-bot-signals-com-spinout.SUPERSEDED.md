# bot-signals.com — Spinout Repo + TradeClaw Interconnection

**Date:** 2026-05-01
**Owner:** Zaky / TradeClaw
**Status:** PROPOSAL — awaiting one decision (Q1 below) before scaffolding
**New repo (to create):** `naimkatiman/bot-signals` (private)
**New domain:** `bot-signals.com`

## Why

Two existing private products are mature enough to monetize but don't belong inside `tradeclaw/apps/web`:

- `naimkatiman/Roboforex` — Cloudflare Workers RAG support chatbot (TS, multi-tenant, 36 D1 migrations, persona/mood/trust-battery infra). Currently serves `tca-indonesia` and `impulse-my` tenants.
- `naimkatiman/ImpulsePipHunters` — Cloudflare Workers Telegram bot (Node JS) that pulls TradingView charts → OpenRouter AI analysis → returns annotated signals. Has MT5 Python autotrade bridge.

Forcing them into `apps/web` (Next.js on Railway, Postgres) means rewriting both to drop Cloudflare-native primitives (D1, R2, Vectorize, Durable Objects, Queues, Workers AI). That's months of work for zero new product surface.

Forcing them to live as orphan repos with their own marketing means duplicate billing, duplicate auth, duplicate brand. Customer can't see "I have TradeClaw Pro + Bot-Signals Chart-AI" in one place.

**Spinout repo + shared Stripe + cross-domain customer object** is the smallest architecture that ships revenue without merging two stacks.

## Architecture

```
                   ┌────────────────────────┐
                   │   Stripe (one acct)    │
                   │  Customers shared by   │
                   │   email + metadata     │
                   └─────────┬──────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌─────────────────┐
│ tradeclaw.win │    │ bot-signals.com│    │  signals API    │
│  (Next.js,    │    │ (Workers, new  │    │  /api/v1/...    │
│   Railway)    │◄───┤  private repo) │    │  served by      │
│               │    │                │    │  tradeclaw.win  │
│  Pro tier     │    │  Chatbot tier  │    │                 │
│  Free tier    │    │  Chart-AI tier │    │  consumed by    │
└──────┬────────┘    └──────┬─────────┘    │  bot-signals    │
       │                    │              │  chart-ai for   │
       │                    │              │  upstream signal│
       │ shared Stripe webhook events      │  context        │
       └────────┬───────────┘              └─────────────────┘
                ▼
   ┌─────────────────────────┐
   │  shared customer record │
   │  (in tradeclaw Postgres │
   │  `customers` table —    │
   │   one row per Stripe    │
   │   customer, lists       │
   │   subs across domains)  │
   └─────────────────────────┘
```

## bot-signals.com repo layout

Cloudflare Workers monorepo, pnpm + Turborepo (matches existing tradeclaw monorepo conventions).

```
bot-signals/
├── apps/
│   ├── marketing/          # static landing, pricing, /chatbot, /chart-ai (Workers Sites or Pages)
│   ├── chatbot/            # ported from Roboforex — RAG support bot Worker
│   ├── chart-ai/           # ported from ImpulsePipHunters — TG chart-analysis Worker
│   └── billing-bridge/     # Worker that handles Stripe webhooks, provisions tenants, mirrors customer to tradeclaw
├── packages/
│   ├── shared-types/       # tenant, customer, subscription types — shared shape with tradeclaw
│   ├── stripe-client/      # shared Stripe init, webhook signature verify
│   └── tradeclaw-sdk/      # typed client for tradeclaw.win signals API (rate-limited, key-authed)
├── infra/
│   ├── wrangler-chatbot.toml
│   ├── wrangler-chart-ai.toml
│   └── wrangler-billing.toml
├── scripts/
│   └── port-impulse-to-ts.ts  # one-shot migration helper, deleted after
├── docs/
│   ├── plans/
│   └── ARCHITECTURE.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

DNS:
- `bot-signals.com` → marketing (CF Pages or Workers Sites)
- `app.bot-signals.com` → chatbot Worker (RAG endpoint)
- `chart.bot-signals.com` → chart-ai Worker (TG webhook + dashboard)
- `api.bot-signals.com` → billing-bridge

## Interconnection with tradeclaw — 4 concrete touchpoints

1. **One Stripe account, two products in the catalog**
   - Existing tradeclaw Stripe products: `pro_monthly`, `pro_yearly`, `elite_monthly`, etc.
   - New products: `botsig_chatbot_monthly`, `botsig_chatbot_yearly`, `botsig_chartai_monthly`, `botsig_chartai_yearly`.
   - Customer can hold any combination. Stripe `customer.metadata.products` lists all active SKUs.

2. **Shared customer object, mirrored both directions**
   - Source of truth: `tradeclaw.customers` table (Postgres). One row per Stripe customer.
   - On any Stripe webhook (either domain): billing-bridge updates this table, then publishes a signed JWT to the other side describing the new state.
   - Read path:
     - `tradeclaw.win` reads tier directly from its Postgres (existing).
     - `bot-signals.com` reads tier via `GET /api/v1/customer/me` on `tradeclaw.win` (new endpoint, key-authed by signed JWT cookie).

3. **Cross-product upsell cards** (low-lift, high-value)
   - `tradeclaw.win/pricing` adds two cards: "Telegram Chart-AI bot" and "RAG Support Chatbot for your trading group" — outbound CTA to `bot-signals.com`.
   - `bot-signals.com/pricing` adds one card: "Get TradeClaw Pro" — inbound CTA.
   - No SSO yet; v1 just bounces to the other domain's pricing page with `?ref=tradeclaw` UTM.

4. **chart-ai consumes tradeclaw signal API as upstream context**
   - When chart-ai runs AI analysis on a chart, it can optionally fetch the latest tracked signals from `tradeclaw.win/api/v1/signals?symbol=XAUUSD` and pass them into the OpenRouter prompt as ground-truth recent activity.
   - Auth: server-to-server API key, scoped, rate-limited.
   - This makes the chart-ai output materially better than ImpulsePip stand-alone — it knows "TradeClaw flagged a BUY 4h ago at 2387.50 with 78% confidence" instead of analyzing the chart in isolation. Direct moat reuse.

**What's explicitly NOT shared:**
- Postgres / D1 schemas. Each domain owns its own data plane.
- User passwords / sessions. Each domain has its own session cookie. Cross-product UX is via Stripe customer portal until v2.
- Signal generation engine. tradeclaw's TA engine stays in `apps/web/app/lib/signal-generator.ts`. chart-ai uses LLM-on-screenshot, different category.

## Pricing (proposal — adjust before scaffolding)

| Product | Monthly | Yearly | Bundle? |
|---|---|---|---|
| TradeClaw Pro | $29 | $290 | (existing) |
| Bot-Signals Chatbot | $19 | $190 | — |
| Bot-Signals Chart-AI | $19 | $190 | — |
| **All-Access bundle** | $49 | $490 | unlocks all three |

Bundle is the upsell hook for tradeclaw Pro customers (only $20/mo more for the two new products).

## Tasks

Sequential. One commit per layer. Each task gated on previous task's verification.

### Task 0 — Decision lock

Resolve Q1 below (bundle SKU vs à la carte only). Without it, Stripe product setup in Task 3 has the wrong shape.

### Task 1 — Create private repo `naimkatiman/bot-signals`

**Action:** `gh repo create naimkatiman/bot-signals --private --description "Bot-Signals.com — chatbot + AI chart analysis SaaS"` then `git init` locally at `/home/naim/.openclaw/workspace/bot-signals/`.

**Gated on:** explicit user approval (creating a repo affects shared state).

**Files committed:** root `README.md`, `LICENSE` (proprietary), `.gitignore`, `pnpm-workspace.yaml`, `turbo.json`, `package.json`, `CLAUDE.md` (workspace-level).

**Verification:** `gh repo view naimkatiman/bot-signals` resolves; `git ls-remote` works.

### Task 2 — Port Roboforex chatbot into `apps/chatbot/`

**Action:** Copy source from existing `naimkatiman/Roboforex` repo into `bot-signals/apps/chatbot/`. Already TS, no port needed.

**Mechanics:**
- `git subtree add` from Roboforex main into `apps/chatbot/` to preserve history, OR plain copy if history isn't load-bearing (TBD with user).
- Update `wrangler.toml` paths, namespace `bot-signals` prefix on D1/R2/Vectorize/Queue resources.
- Strip tenant-specific seed migrations (`0022_seed_tca_indonesia.sql`, `0034_seed_impulse_my_tenant.sql`) — those become per-customer provisioning calls, not in the base schema.

**Verification:** `pnpm --filter chatbot dev` works locally; `wrangler dev` boots; `/health` returns 200.

### Task 3 — Port ImpulsePipHunters → TS into `apps/chart-ai/`

**Action:** Port the existing JS Workers code to TS. The MT5 Python bridge (`mt5_bridge/`) stays Python, deploys separately on Railway as a second service of `bot-signals.com`.

**Mechanics:**
- Mode: `tsc --allowJs` incremental — rename `.js`→`.ts` file by file, fix types, add `tsconfig.json`. NOT a full rewrite. Saves an order of magnitude over rewrite.
- Files to port: `index.js`, `aiAnalyzer.js`, `chartFetcher.js`, `telegramBot.js`, `config.js` → all `.ts`.
- D1 migrations stay as-is, namespace prefixed.
- MT5 bridge: separate `apps/mt5-bridge/` with own deploy story (Railway), Python kept.

**Verification:** `pnpm --filter chart-ai build` passes TS; `wrangler dev` runs; existing test fixtures still pass.

### Task 4 — Stripe products + billing-bridge Worker

**Action:** Create the new Stripe products (Q1 decides shape). Stand up `apps/billing-bridge/` Worker that:
- Receives Stripe webhooks for bot-signals products.
- Mirrors `customer.subscription.updated` events to tradeclaw via signed POST to `tradeclaw.win/api/v1/customer-mirror` (new endpoint).
- Provisions tenant rows in chatbot/chart-ai D1s on `customer.subscription.created`.

**Verification:** Stripe CLI `stripe trigger customer.subscription.created` against the bridge → tenant row appears in chatbot D1 → tradeclaw `customers` table updates.

### Task 5 — tradeclaw side: cross-product surface

**Action (in `tradeclaw/apps/web`):**
- New endpoint `apps/web/app/api/v1/customer-mirror/route.ts` — accepts signed POSTs from bot-signals billing-bridge.
- New table `customers` (or extend `subscription_status` if it already exists — needs grep): one row per Stripe customer, `products` JSONB array of SKU IDs across both domains.
- Migration: `apps/web/migrations/019_customers_cross_domain.sql`.
- Pricing page (`apps/web/app/pricing/`) gets two new cards linking to `bot-signals.com/chatbot` and `bot-signals.com/chart-ai`.

**Verification:** Migration runs clean; pricing page renders the two new cards; webhook-mirror endpoint returns 200 on signed test payload.

### Task 6 — Marketing site for bot-signals.com

**Action:** `apps/marketing/` — Workers Sites or CF Pages, simple TS/HTML. Three pages: `/` (landing), `/chatbot` (RAG support bot pitch), `/chart-ai` (TG chart-AI pitch). Stripe Checkout buttons → bot-signals.com/api/checkout → Stripe → return to bot-signals.com/welcome with provisioning status.

**Verification:** `bot-signals.com` resolves; Stripe Checkout test mode completes end-to-end; tenant provisioned in correct D1.

### Task 7 — DNS + deploy

**Action:**
- Buy `bot-signals.com` (manual user step — flag this).
- CF DNS: A/AAAA for apex, CNAMEs for `app.`, `chart.`, `api.`.
- `wrangler deploy --env production` for each Worker.
- Smoke test all four endpoints from external curl.

**Verification:** All four subdomains return 200 from external network.

## Out of scope (deferred)

- ⚠️ True SSO across `tradeclaw.win` and `bot-signals.com` (cookie-share via subdomain trick, or shared OAuth provider). v1 uses Stripe customer portal as the cross-product identity surface.
- ⚠️ Multi-region Worker deploy. CF default global is fine for v1.
- ⚠️ White-label tenant offering (let agencies resell chatbot under their own domain). Architecture supports it (already multi-tenant), but no UI for it.
- ⚠️ Mobile apps. Web/Telegram only for v1.
- ⚠️ Shared analytics (one Plausible/PostHog spanning both domains). Each domain has its own for v1.
- ⚠️ Integration of bot-signals chart-AI signals into tradeclaw's `signal_history` table — chart-AI signals are LLM-on-screenshot, not the same shape as TA-engine signals. Don't pollute the moat data without a separate strategy_id namespace and clear UI labeling.

## Risk register

| Risk | Mitigation |
|---|---|
| Stripe webhook race: subscription created → bridge slow → user lands on welcome page before tenant exists | Welcome page polls `/api/me` for up to 10s with friendly loader; bridge writes tenant row in <500ms typically |
| Roboforex history rewrite if we use subtree merge | Do plain copy (no subtree) unless user wants history. Decide in Task 2. |
| ImpulsePip JS→TS port introduces regressions | Snapshot tests against current prod JS responses for 5 fixed inputs. Port passes only when output matches. |
| MT5 Python bridge orphaned — no clear deploy story | Decide in Task 3: Railway service of bot-signals project, OR strip it from v1 entirely (chart-AI without autotrade is still a product). User call. |
| Cross-domain customer mirror gets out of sync (one side updates, the other misses webhook) | Daily reconciler cron on tradeclaw side fetches Stripe `customer.list` and rewrites `customers` rows. Belt-and-braces. |
| Domain not yet purchased | Flagged in Task 7. User must buy `bot-signals.com` before deploy. Use `bot-signals.pages.dev` for staging until then. |

## One open question for the user (Q1)

**Do we ship a bundle SKU at $49/mo (tradeclaw Pro + chatbot + chart-AI) in v1, or à la carte only?**

- **Bundle in v1:** four Stripe products instead of two; customer.metadata logic must handle "the bundle SKU implicitly grants access to all three products" — slightly more billing-bridge code. Higher ARPU per customer; better headline pricing.
- **À la carte only:** simpler. Defer the bundle to v1.1. Faster to ship.

I'll default to **à la carte only for v1** if no answer — bundle math can be a same-week follow-up once two products are live.
