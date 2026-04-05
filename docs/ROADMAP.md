# TradeClaw Roadmap: Q2 2026 - Q4 2027

> **Goal:** Go from "cool open-source demo" to "users pay for premium signals" in 18 months.
> **North Star Metric:** Monthly Recurring Revenue (MRR) from premium signal subscribers.

---

## Current State (April 2026)

**What exists:**
- 30+ symbol coverage (crypto, forex, metals) with 7 real TA indicators
- 190+ page Next.js dashboard (signals, backtest, paper trading, leaderboard)
- Docker Compose self-host + Vercel live demo at tradeclaw.win
- Telegram + Discord bot infrastructure
- Stripe billing scaffolding (Pro/Elite tiers)
- WebSocket live price streaming
- SSE price endpoint, OG images, badges, API docs

**What's broken / missing:**
- Signals always show "pending" — no outcome tracker (TP/SL hit detection)
- No win rate tracking = no proof of signal quality
- No premium tier actually gated behind paywall
- No TradingView webhook integration (Zaky's personal strategies can't feed in)
- No user accounts / portfolios for free users
- No social proof (no public track record page)

---

## Phase 1: Signal Credibility Engine (Q2 2026 — Apr-Jun)

> **Theme:** Make signals trustworthy. Nobody pays for signals with no track record.

| # | Task | Priority | Target |
|---|------|----------|--------|
| 1.1 | **Outcome Tracker** — auto-check if signals hit TP1/TP2/TP3 or SL using live price feeds | P0 | Apr W2 |
| 1.2 | **Win Rate Calculator** — rolling 7d/30d/90d win rates per symbol and overall | P0 | Apr W3 |
| 1.3 | **Public Track Record Page** — `/track-record` showing historical performance with charts | P0 | Apr W4 |
| 1.4 | **Signal Close Flow** — signals transition: active → hit_tp1 → hit_tp2 → stopped → expired | P0 | Apr W2 |
| 1.5 | **Candle-Close Validation** — only emit signals on candle close (not mid-bar noise) | P1 | May W1 |
| 1.6 | **Multi-Timeframe Confluence Score** — upgrade confidence scoring with 4-TF agreement | P1 | May W2 |
| 1.7 | **Telegram Alerts on High-Confidence Signals** — auto-push when confidence >= 80% | P1 | May W3 |
| 1.8 | **Backtest Validation** — run signals engine against 6 months of historical data, publish results | P1 | Jun W1 |

**Milestone:** Public track record showing 60%+ win rate across 30+ symbols. This is the foundation for everything else.

---

## Phase 2: TradingView Webhook Bridge (Q2-Q3 2026 — Jun-Jul)

> **Theme:** Connect Zaky's personal Pine Script strategies as a premium signal source.

| # | Task | Priority | Target |
|---|------|----------|--------|
| 2.1 | **TradingView Webhook Receiver** — `POST /api/webhooks/tradingview` accepting TV alert JSON | P0 | Jun W2 |
| 2.2 | **Signal Source Tagging** — distinguish "algo signals" (built-in TA) vs "premium signals" (TV/manual) | P0 | Jun W3 |
| 2.3 | **Pine Script → Signal Mapper** — parse TV webhook payload into TradeClaw signal format | P0 | Jun W3 |
| 2.4 | **Premium Signal Dashboard** — separate view for TV-sourced signals with Zaky's strategies | P1 | Jul W1 |
| 2.5 | **Multi-Strategy Support** — tag signals by strategy name (Scalper/Intraday/Swing from trading-strategies repo) | P1 | Jul W2 |
| 2.6 | **Signal Delay for Free Tier** — premium signals show immediately for paid users, 30-min delay for free | P0 | Jul W3 |
| 2.7 | **Strategy Performance Comparison** — which strategy has best win rate, best R:R, best Sharpe | P2 | Jul W4 |

**Milestone:** Zaky's TradingView alerts flow into TradeClaw as "Premium Signals" with separate performance tracking.

---

## Phase 3: Monetization & Paywall (Q3 2026 — Aug-Sep)

> **Theme:** Turn signal quality into revenue.

| # | Task | Priority | Target |
|---|------|----------|--------|
| 3.1 | **User Auth System** — email/Google/Telegram login with NextAuth | P0 | Aug W1 |
| 3.2 | **Free vs Pro vs Elite Tier Implementation** | P0 | Aug W2 |
| 3.3 | **Stripe Checkout Flow** — monthly/yearly subscriptions | P0 | Aug W3 |
| 3.4 | **Gated Premium Signals** — Pro users see all signals instantly, Free sees delayed/limited | P0 | Aug W4 |
| 3.5 | **Telegram Premium Channel** — separate bot channel for paying subscribers only | P1 | Sep W1 |
| 3.6 | **API Key Tier Limits** — rate limits per tier (Free: 10/hr, Pro: 100/hr, Elite: unlimited) | P1 | Sep W2 |
| 3.7 | **Trial Period** — 7-day free trial of Pro tier | P1 | Sep W3 |

### Pricing Model

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | $0 | Algo signals (delayed 30min), 5 symbols, basic dashboard |
| **Pro** | $29/mo | All algo signals (real-time) + premium TV signals, 30 symbols, Telegram alerts, API access |
| **Elite** | $99/mo | Everything in Pro + priority alerts, strategy builder, 1-on-1 Telegram group, webhook forwarding |
| **API** | $49/mo | Programmatic access only, 1000 req/hr, WebSocket stream |

**Milestone:** First paying subscriber. Target: 10 Pro subscribers by end of September = $290 MRR.

---

## Phase 4: Growth & Virality (Q4 2026 — Oct-Dec)

> **Theme:** Scale from 10 to 100+ subscribers through proof and distribution.

| # | Task | Priority | Target |
|---|------|----------|--------|
| 4.1 | **Public Leaderboard** — rank signals by ROI, show top performers | P0 | Oct W1 |
| 4.2 | **Signal Sharing Cards** — shareable images for X/Twitter with entry/result | P0 | Oct W2 |
| 4.3 | **Affiliate/Referral Program** — give 20% revenue share for referrals | P1 | Oct W3 |
| 4.4 | **TradingView Profile Integration** — publish track record to TV profile | P1 | Nov W1 |
| 4.5 | **Content Pipeline** — weekly performance reports, trade recaps on X and YouTube | P1 | Nov ongoing |
| 4.6 | **GitHub Stars Campaign** — ProductHunt launch, HN Show, Reddit r/algotrading | P0 | Nov W2 |
| 4.7 | **Mobile App (Expo)** — push notifications for premium signals | P2 | Dec W1-4 |
| 4.8 | **Copy Trading Preview** — paper-trade mirroring premium signals automatically | P2 | Dec W2 |
| 4.9 | **SEO Content** — "best crypto signals 2027", "free trading signals" landing pages | P1 | Nov-Dec |

**Milestone:** 100 Pro subscribers ($2,900 MRR), 1,000+ GitHub stars, ProductHunt top 5.

---

## Phase 5: Platform & Scale (Q1-Q2 2027 — Jan-Jun)

> **Theme:** From signal provider to trading platform.

| # | Task | Priority | Target |
|---|------|----------|--------|
| 5.1 | **Multi-Provider Signals** — allow other traders to publish signals (marketplace) | P1 | Jan-Feb |
| 5.2 | **Broker Integration** — connect to MetaTrader 5 / cTrader for one-click execution | P1 | Feb-Mar |
| 5.3 | **Copy Trading (Live)** — auto-execute premium signals on connected broker accounts | P0 | Mar-Apr |
| 5.4 | **Risk Management Engine** — position sizing, max drawdown limits, correlation checks | P1 | Apr |
| 5.5 | **Community Features** — trade chat, signal discussions, trader profiles | P2 | May |
| 5.6 | **White-Label API** — let other apps embed TradeClaw signals | P2 | Jun |
| 5.7 | **Compliance Prep** — disclaimers, risk warnings, terms of service | P0 | Jan (ongoing) |

**Milestone:** 500 subscribers ($15K+ MRR), broker integration live, copy trading beta.

---

## Phase 6: Maturity & Expansion (Q3-Q4 2027)

> **Theme:** Sustainable business with diversified revenue.

| # | Task | Priority | Target |
|---|------|----------|--------|
| 6.1 | **Signal Marketplace** — other traders sell signals, TradeClaw takes 30% cut | P1 | Jul-Aug |
| 6.2 | **Institutional API Tier** — hedge fund / prop desk pricing ($500+/mo) | P2 | Aug |
| 6.3 | **Advanced Analytics** — portfolio heat maps, correlation matrix, sector rotation | P2 | Sep |
| 6.4 | **AI Signal Enhancement** — use LLM to generate trade narratives + market context | P1 | Oct |
| 6.5 | **Regional Expansion** — localized for Asia (BM/ID/TH), MENA, LatAm | P2 | Q4 |
| 6.6 | **Fund Performance Dashboard** — for traders managing others' capital | P2 | Nov-Dec |

**Milestone:** 1,000+ subscribers ($30K+ MRR), marketplace with 10+ signal providers, copy trading GA.

---

## Revenue Projection

```
          Q3 2026    Q4 2026    Q1 2027    Q2 2027    Q3 2027    Q4 2027
          --------   --------   --------   --------   --------   --------
Free        500       2,000      5,000     10,000     15,000     20,000
Pro ($29)    10         100        250        400        600        800
Elite($99)    0          10         30         60        100        150
API ($49)     0           5         20         40         60         80
          --------   --------   --------   --------   --------   --------
MRR        $290      $4,135    $10,730    $19,510    $30,340    $42,120
```

*Conservative estimates. Assumes organic growth + content marketing. No paid ads.*

---

## Premium Signal Monetization Strategy (Zaky's Personal Signals)

### The Asset
Zaky's TradingView strategies (EMA21 + VWAP + RSI + Supertrend) across 3 timeframes:
- **Scalper** (1m-5m) — quick trades, London/NY sessions
- **Intraday** (5m-15m) — 1-4 hour holds
- **Swing** (4H/Daily) — multi-day positions

Currently running on XAUUSD via the `trading-strategies` Telegram bot (Cloudflare Worker + AI chart analysis).

### Monetization Path

```
Step 1: PROVE IT (Apr-Jul 2026)
├── Connect TV alerts → TradeClaw webhook receiver
├── Track every signal outcome automatically
├── Build 3-month verified track record
└── Publish results publicly on /track-record

Step 2: GATE IT (Aug-Sep 2026)
├── Premium signals = real-time, Free = 30min delay
├── Stripe paywall: $29/mo Pro, $99/mo Elite
├── Premium Telegram channel for subscribers
└── 7-day free trial to hook users

Step 3: SCALE IT (Oct 2026+)
├── Shareable trade cards for social media
├── Affiliate program (20% rev share)
├── Content: weekly recaps, strategy breakdowns
├── Expand from XAUUSD to all 30 symbols
└── Mobile push notifications

Step 4: PLATFORM IT (2027)
├── Other traders publish signals (marketplace)
├── Copy trading (auto-execute via broker)
├── TradeClaw takes 30% of marketplace revenue
└── Institutional tier for prop desks
```

### Key Principle
> **Track record is the product.** Nobody pays for signals without proof.
> Build 3 months of verified results before turning on the paywall.

---

## Immediate Next Actions (This Week)

1. **Fix the "always pending" bug** — implement outcome tracker (signal close detection)
2. **Add win rate calculation** — rolling 7d/30d/90d metrics
3. **Build `/track-record` page** — public performance dashboard
4. **Set up TradingView webhook endpoint** — `POST /api/webhooks/tradingview`

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low win rate destroys credibility | Fatal | Don't launch paywall until 60%+ win rate proven over 3 months |
| Regulatory issues (financial advice) | High | Always disclaim "not financial advice", no guaranteed returns |
| TradingView API changes | Medium | Abstract webhook format, support multiple alert formats |
| Stripe account restrictions (trading) | Medium | Use Stripe Atlas or Paddle as backup payment processor |
| GitHub DMCA / competitor clones | Low | Move fast, build community moat, premium = Zaky's edge |
| Signal latency (delayed alerts) | Medium | WebSocket + push notifications, monitor alert delivery time |

---

*Last updated: 2026-04-05*
*Owner: Zaky (TradeClaw)*
