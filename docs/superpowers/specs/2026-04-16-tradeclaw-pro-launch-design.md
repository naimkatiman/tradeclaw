# TradeClaw Pro Launch — Design Spec

**Date:** 2026-04-16
**Status:** Draft
**Goal:** Collapse monetization to Free + Pro ($29/mo), build automated social GTM pipeline, and launch TradeClaw Pro on tradeclaw.win within ~2 weeks.

---

## 1. Strategic Context

### Current state
- **Pre-launch:** Zero paying users, no free signups, no community traction.
- **Signal engine is live and dogfooded.** The TA engine in `apps/web/app/lib/signal-generator.ts` + `ta-engine.ts` is the same logic the founder trades personally. 2-week track record shows genuine edge on the free signal set.
- **Open-source repo:** `tradeclaw` on GitHub (MIT). Full scaffold: Next.js, signal engine, backtester, Docker Compose.
- **Stripe integration wired:** 4-tier pricing page exists but is over-engineered for pre-launch.

### Core insight
The signal engine works. The problem is distribution, not product. The 2-week verifiable track record is the most valuable marketing asset — it proves the signals are real. Every piece of GTM should link back to this track record.

### Branding
- **TradeClaw** = the open-source framework (GitHub repo, MIT license)
- **TradeClaw Pro** = the paid hosted tier on `tradeclaw.win`
- **No rebrand.** Same domain, same repo, same brand. Pro is just a tier.

### Positioning
Transparent automated bot-as-brand: "TradeClaw is a fully automated open-source signal system. Every trade is published live. Read the code." No human face; the receipts are the marketing.

---

## 2. Pricing Structure

### Tier collapse: 4 → 2

| Tier | Price | Annual |
|------|-------|--------|
| **Free** | $0 | — |
| **Pro** | $29/mo | $290/yr (17% off) |

**Killed:** Elite, Custom. Bring back only after 50+ Pro customers indicate demand.

**Why $29:** Dogfooded real edge = premium positioning. $19 attracts price-sensitive churn. $29 aligns with retail signal service market ($20–50 range). Can discount; can't easily raise.

### Feature gating

| Feature | Free | Pro |
|---------|------|-----|
| Signal delivery | 15-min delayed | Real-time |
| Symbols | 3 (XAUUSD, BTCUSD, EURUSD) | All traded symbols |
| TP/SL levels | TP1 only | TP1/TP2/TP3 + SL + trailing |
| Signal quality | Standard confidence | Premium: higher threshold + MTF confluence |
| Signal history | 24h window | Full history + CSV export |
| Telegram | Public `@tradeclawwin` (delayed) | Private Pro group (real-time) |
| Track record | Public page (marketing) | + per-symbol breakdown |
| Customization dashboard | — | Post-launch (deferred) |
| API access | — | Post-launch (deferred) |
| Auto-trade (MT5/cTrader) | — | Post-launch (deferred) |

### Moat (for an open-source product)
Code is fully public (MIT). The moat is **operational**:
1. Hosted reliability (Railway, no self-hosting hassle)
2. Telegram delivery (real-time private group for Pro)
3. Premium signal tier (higher confidence + MTF confluence — same code, gated by subscription)
4. Pro customization features (post-launch)

Self-hosters get the framework and can build their own edge. They cannot clone the operated service, community, or track record.

---

## 3. Automated Social GTM Pipeline

### Strategy
No human face. No content-creator dependency. Automated track-record broadcasting — the "face" of the brand is verifiable receipts.

### The core loop

```
Signal fires in production (getTrackedSignals)
      |
      v
Signal card PNG generated (satori / @vercel/og)
      |
      +---> social_post_queue (status: pending)
      |
      v
Admin approval at /admin/social-queue (1-click approve/reject)
      |
      v
Claude Chrome agent polls /api/social/next
      |
      +---> Posts to X (with image)
      +---> Reports back to /api/social/posted
      |
      v
Public Telegram @tradeclawwin (auto-push, 15-min delay, no gate)
```

### Three content types

1. **Per-signal posts** (human-gated via approval queue)
   - Template: "[BUY/SELL] [SYMBOL] @ [PRICE] | TP1 [X] | SL [Y] | [Reason]. Track live: tradeclaw.win/track-record"
   - Attached: auto-generated signal card PNG
   - Channels: X (after approval), Public Telegram (auto, 15-min delay)
   - Volume: ~5–15/day depending on market

2. **Daily EOD summary** (fully automated, no human gate)
   - Fires at 00:00 UTC via cron
   - Template: "Today on TradeClaw: [N] signals, [W] winners, [+/-X]R. Weekly running: [+/-Y]R. tradeclaw.win/track-record"
   - Attached: summary card PNG
   - Channels: X, Public Telegram
   - Inserted as pre-approved in social_post_queue

3. **Weekly summary** (fully automated, no human gate)
   - Fires Sunday 18:00 UTC via cron
   - Template: X thread — best trade, worst trade, strategy breakdown, weekly stats, link to track record
   - Attached: weekly card PNG
   - Channels: X thread, Public Telegram
   - Inserted as pre-approved in social_post_queue

### Approval model (hybrid — Approach C)
- **Per-signal posts:** Human-gated. Signal fires → queued as pending → admin approves/rejects at `/admin/social-queue` → Claude Chrome posts approved items.
- **Daily/weekly summaries:** Fully automated. Cron computes stats from `signal_history`, generates card, inserts as pre-approved. Claude Chrome posts without human intervention.
- **Rationale:** Signal-level posts carry risk of misfires (wrong symbol, stale data, duplicates) in early weeks. Summaries are safe because they only read from recorded history. Drop to full-auto for signals after 4 weeks without incident.

### Channels (launch set)

| Channel | Role | Launch priority |
|---------|------|-----------------|
| X/Twitter | Primary growth — post signals + daily/weekly summaries | Phase 3 |
| Public Telegram `@tradeclawwin` | Delayed signal feed — funnel top + free tier delivery | Phase 5 |
| GitHub README | Passive — dev/quant top-of-funnel | Phase 5 |
| Reddit (`r/algotrading`, `r/Forex`) | Weekly track-record post only (1/week, manual or semi-auto) | Post-launch |
| TradingView Ideas | Manual, linking to tradeclaw.win | Post-launch |

**Deferred channels:** YouTube Shorts, Discord, Instagram, TikTok — each is a full-time commitment. Add only after Pro has traction.

### Posting tooling
- **Claude Chrome (browser agent)** replaces X API v2. No OAuth, no rate-limit client, no paid API tier.
- Claude Chrome polls `GET /api/social/next` every 60s for approved posts, posts to X with image, reports back via `POST /api/social/posted`.
- A playbook markdown file defines the posting template and instructions for Claude Chrome.

---

## 4. Code Changes

### A. Paywall & tier collapse

| ID | Change | File(s) | Effort |
|----|--------|---------|--------|
| A1 | Remove Elite + Custom from `TIER_DEFINITIONS` | `apps/web/lib/stripe.ts` | S |
| A2 | Update `/pricing` to 2 cards: Free + Pro ($29/mo, $290/yr) | `apps/web/app/pricing/page.tsx` | S |
| A3 | Archive Elite price IDs in Stripe dashboard | Stripe dashboard | S |
| A4 | Trim `FEATURES` comparison table to Free vs Pro | `apps/web/app/pricing/page.tsx` | S |

### B. Tier gating

| ID | Change | File(s) | Effort |
|----|--------|---------|--------|
| B1 | 15-min delay on signal payloads for Free; real-time for Pro | `apps/web/lib/tracked-signals.ts`, API routes | M |
| B2 | Symbol whitelist: 3 for Free, all for Pro | `apps/web/lib/tracked-signals.ts` | S |
| B3 | Mask TP2/TP3 + trailing SL for Free users | Signal response shaping | S |
| B4 | Signal history window: 24h Free, full Pro | Signal history queries | S |
| B5 | Premium signal tier: higher confidence + MTF confluence, gated by `if tier === 'pro'` | `apps/web/app/lib/signal-generator.ts` | M |
| B6 | Session-based tier lookup for gated queries | `apps/web/lib/user-session.ts` | S |

### C. Track record page polish

| ID | Change | File(s) | Effort |
|----|--------|---------|--------|
| C1 | Audit for honesty: show losses as prominently as wins | `apps/web/app/track-record/` | S |
| C2 | Daily / weekly / monthly / all-time toggles | Same | M |
| C3 | Per-symbol P/L breakdown table | Same | M |
| C4 | OG image for social shares of `/track-record` | `apps/web/app/api/og/` (new) | S |

### D. Signal card generator (OG images)

| ID | Change | File(s) | Effort |
|----|--------|---------|--------|
| D1 | `GET /api/og/signal?id=<signalId>` → branded PNG via `@vercel/og` | `apps/web/app/api/og/signal/route.ts` (new) | M |
| D2 | `GET /api/og/summary?period=daily\|weekly&date=YYYY-MM-DD` → PNG | `apps/web/app/api/og/summary/route.ts` (new) | M |
| D3 | Shared brand template (logo, colors, typography) | `apps/web/app/api/og/_template.tsx` (new) | S |

### E. Approval queue + Claude Chrome bridge

| ID | Change | File(s) | Effort |
|----|--------|---------|--------|
| E1 | `social_post_queue` table: id, kind (signal/daily/weekly), payload (JSON), image_url, status (pending/approved/posted/rejected), created_at, approved_at, posted_at, post_url | Migration | S |
| E2 | Signal recording writes pending row to queue | `apps/web/lib/tracked-signals.ts` | S |
| E3 | Admin dashboard at `/admin/social-queue`: list pending, preview card, approve/reject/edit copy | `apps/web/app/admin/social-queue/` (new) | M |
| E4 | `GET /api/social/next` — returns next approved post (JSON + image URL), auth via bearer token | `apps/web/app/api/social/next/route.ts` (new) | S |
| E5 | `POST /api/social/posted` — Claude Chrome reports post URL + timestamp, marks row as posted | `apps/web/app/api/social/posted/route.ts` (new) | S |
| E6 | Claude Chrome playbook file | `docs/claude-chrome-playbook.md` (new) | S |

### F. Cron jobs for summaries

| ID | Change | File(s) | Effort |
|----|--------|---------|--------|
| F1 | Daily EOD cron at 00:00 UTC: compute P/L, generate card, insert pre-approved row | `apps/web/app/api/cron/social/daily/route.ts` (new) | M |
| F2 | Weekly cron Sunday 18:00 UTC: broader stats, generate card, insert pre-approved row | `apps/web/app/api/cron/social/weekly/route.ts` (new) | M |
| F3 | Register crons in `instrumentation.ts` or Railway cron service | `apps/web/instrumentation.ts` | S |

### G. Telegram

| ID | Change | File(s) | Effort |
|----|--------|---------|--------|
| G1 | Public `@tradeclawwin`: extend bot to auto-post delayed signal + card | Agent service | M |
| G2 | Private Pro group: auto-invite flow after Stripe checkout completes (Stripe webhook + Telegram bot API) | Stripe webhook handler + bot | M |

### H. Open-source positioning

| ID | Change | File(s) | Effort |
|----|--------|---------|--------|
| H1 | Rewrite `README.md`: "TradeClaw — open-source AI signal framework. Hosted as TradeClaw Pro at tradeclaw.win" + track record link | `README.md` | S |
| H2 | Add `ARCHITECTURE.md`: signal pipeline diagram for credibility + Show HN | `ARCHITECTURE.md` (new) | M |
| H3 | Landing page copy: lead with "open-source, transparent, verifiable track record" | Homepage | M |

---

## 5. Build Sequence

Five phases. Each ships independently. ~2–4 days per phase of focused work.

### Phase 1 — Paywall Foundation
**Ships:** A1–A4, B1–B6
**Dependencies:** None
**Exit criteria:** Pricing page live with 2 tiers. Free user sees delayed 3-symbol feed. Pro user (test Stripe sub) sees real-time all-symbol with full TP/SL. Gate logic verified end-to-end. Nothing leaks.

### Phase 2 — Track Record Page
**Ships:** C1–C4
**Dependencies:** Phase 1
**Exit criteria:** `/track-record` shows honest W/L with daily/weekly/monthly toggles and per-symbol breakdown. OG image renders cleanly when shared on X/Telegram.

### Phase 3 — Card Generator + Approval Queue
**Ships:** D1–D3, E1–E6
**Dependencies:** Phase 2
**Exit criteria:** Signal fires → row queued → `/admin/social-queue` shows card preview → 1-click approve → `/api/social/next` returns it → manual end-to-end test with Claude Chrome on test X account works.

### Phase 4 — Automated Summaries
**Ships:** F1–F3
**Dependencies:** Phase 3
**Exit criteria:** Daily cron fires at 00:00 UTC, inserts pre-approved summary row with card. Weekly cron fires Sunday 18:00 UTC. Claude Chrome picks them up and posts without human intervention.

### Phase 5 — Telegram + OSS Polish
**Ships:** G1, G2, H1–H3
**Dependencies:** Phase 4
**Exit criteria:** Public TG auto-receives delayed signals with cards. Pro checkout → auto-invite to private TG group. README + landing page updated. Ready for Show HN / public launch.

### Post-Phase 5: Launch Week
- Point Claude Chrome at production queue (real X account)
- Post Show HN + first X thread + first Reddit `r/algotrading` post in the same week
- Run for 4 weeks minimum before evaluating conversion metrics
- Target: 500 public Telegram members + 10 Pro subscriptions in first 8 weeks

---

## 6. Explicitly Deferred (NOT in v1)

| Feature | Why deferred |
|---------|-------------|
| Pro customization dashboard (symbol picker, threshold tuning) | No demand signal yet. Ship with sensible defaults; add after 10+ Pro customers request specific things. |
| Elite / Custom tiers | No demand signal. Keep types in code, hide from pricing page. |
| MT5 / cTrader auto-execution | Complex broker integration. Only after Pro revenue validates demand. |
| API access tier | Same — no demand signal. |
| YouTube Shorts generator | Too much tooling cost for launch. |
| Reddit / TradingView auto-posting | Manual is fine at 1/week volume. |
| Blog / journal system on tradeclaw.win | X threads + Telegram enough for v1. Add for SEO post-launch. |
| A/B pricing tests | Need ~500 weekly visits for stats to mean anything. |
| Stripe webhook TG invite automation | Manual invite fine for first ~10 customers. Automate in Phase 5. |

---

## 7. Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Public Telegram members | 500 | 8 weeks post-launch |
| Pro subscriptions | 10 | 8 weeks post-launch |
| X followers | 1,000 | 12 weeks post-launch |
| GitHub stars | 100 | 12 weeks post-launch |
| MRR | $290 (10 Pro) | 8 weeks post-launch |
| Signal win rate (maintained) | >55% | Ongoing |

---

## 8. Risks

| Risk | Mitigation |
|------|-----------|
| Signal engine misfires get auto-posted | Hybrid approval model: human gate on signal posts for first 4 weeks |
| Free self-hosters copy everything, nobody pays | Moat is operational (reliability, Telegram delivery, community) not code. Self-hosters are evangelists, not competitors. |
| $29 too high for pre-launch, zero conversion | $29 with 7-day free trial. Can drop to $19 after 8 weeks if conversion data warrants it. |
| Track record turns negative, kills trust | Publish losses honestly. Transparent bad weeks build more long-term credibility than hiding them. |
| Claude Chrome posting unreliable | Approval queue + posted-status tracking means missed posts are retried. No data loss. |
| Railway uptime issues affect signal recording | Signal recording is fire-and-forget side effect of API requests. If Railway is down, signals aren't generated either — consistent behavior, not data loss. |
