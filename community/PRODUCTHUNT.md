# TradeClaw — Product Hunt Launch Kit

## Launch Target

**Date:** Tuesday or Wednesday (optimal: Tuesday)
**Time:** 12:01 AM PST (Product Hunt resets at midnight PST — earliest submission gets most time)
**URL:** https://www.producthunt.com/posts/tradeclaw

---

## Core Assets

### Tagline (60 chars max)

```
Self-hosted AI trading signals. Free. Open-source.
```

**Alternatives:**
```
Open-source trading signals you actually own
AI trading signals, self-hosted in 60 seconds
The open-source TradingView you can self-host
```

### Short Description (260 chars max)

```
TradeClaw is an open-source, self-hosted trading signal platform. Generates BUY/SELL/HOLD signals for forex, crypto & metals using RSI, MACD, Bollinger Bands. Docker Compose deploy. Free forever. MIT license.
```

### Full Description (for PH listing body)

```markdown
**TradeClaw** is an open-source trading signal platform you can self-host on any VPS in under 60 seconds.

**Why we built it:**
Most trading signal services are expensive, cloud-locked, and opaque. TradeClaw is different — the signal logic is fully visible, you own your data, and it's free forever.

**What it does:**
- 🎯 AI-generated BUY/SELL/HOLD signals for forex, crypto & metals
- 📊 Technical analysis: RSI, MACD, Bollinger Bands, EMA, ATR, VWAP
- 🔁 Backtesting engine with win rate, Sharpe ratio, max drawdown
- 🔔 Push notifications via Telegram & Discord
- 🔌 REST API with OpenAPI 3.0 spec
- 🐳 One-command Docker deploy: `docker compose up`
- 🔓 MIT license — use it, fork it, modify it

**Tech stack:**
Next.js 15 · TypeScript · TimescaleDB · Redis · Docker

**Demo:** https://tradeclaw.win
**Repo:** https://github.com/naimkatiman/tradeclaw
```

---

## Gallery Assets (prepare these before launch)

| # | Asset | Description | Dimensions |
|---|-------|-------------|------------|
| 1 | Hero screenshot | Dashboard with live signals grid | 1270×952 |
| 2 | Signal card closeup | Single BUY signal card showing RSI/MACD/BB | 1270×952 |
| 3 | Backtest results | Backtest table with win rate, Sharpe ratio | 1270×952 |
| 4 | Docker deploy | Terminal screenshot of `docker compose up` | 1270×952 |
| 5 | Mobile view | Dashboard on phone (PWA) | 1270×952 |
| 6 | Architecture diagram | Simple flow: data → signals → dashboard → alerts | 1270×952 |

**Thumbnail/icon:** 240×240 logo (tradeclaw claw mark on dark background)

**Maker video (optional but +30% upvotes):**
- 2–3 min screen recording
- Show: docker deploy → dashboard loading → first signal → Telegram notification
- No fancy editing needed — Loom is fine

---

## First Comment (post immediately after launch)

```markdown
Hey PH! 👋 Maker here.

I built TradeClaw after getting burned by a paid signal service that went dark during a volatile week —
of course that's when you need signals the most.

The core idea: **you should be able to see exactly how your trading signals are generated**, run it on your own
infra, and not pay a monthly fee for it.

A few things that might interest the technical folks here:

- The signal engine is in `packages/core/src/signals/engine.ts` — readable TypeScript, no magic
- TimescaleDB handles OHLCV storage (PostgreSQL extension for time-series)
- Signals update every 5 minutes via cron; push to dashboard via SSE
- The backtester is simple but real — I've included slippage modeling in v0.2

**What I'd love feedback on:**
1. What assets/markets are you missing? (Planning to add equities via Yahoo Finance)
2. Is the mobile PWA experience good enough or do we need a native app?
3. Any signal indicators you'd want to see added?

Happy to answer anything. And if you find TradeClaw useful, a ⭐ on GitHub means a lot:
https://github.com/naimkatiman/tradeclaw
```

---

## Hunter Outreach

Reach out to hunters 1–2 weeks before launch date. DM on Twitter/X or via PH messages.

### Tier 1 (best fit — tech/open-source/fintech hunters)

| Hunter | Profile | Why |
|--------|---------|-----|
| @benln | PH top hunter, open-source friendly | Regularly hunts dev tools |
| @rrhoover | PH founder | Long shot but dream hunt |
| @chrismessina | Hashtag inventor, tech advocate | Hunts interesting OSS |
| @bramk | PH veteran, fintech interest | Has hunted trading tools before |

### Tier 2 (developer tools & fintech)

| Hunter | Profile |
|--------|---------|
| @kevin | PH staff/hunter |
| @nivo | Developer tools focus |
| Any PH hunter with 5+ hunts in dev tools/fintech |

### Outreach DM Template

```
Hi [Name] — I'm launching TradeClaw on Product Hunt next [Tuesday].

It's an open-source, self-hosted AI trading signal platform — think self-hosted TradingView
but with AI-generated BUY/SELL signals and a full REST API. MIT license, Docker deploy.

Live demo: https://tradeclaw.win
Repo: https://github.com/naimkatiman/tradeclaw

Would you be willing to hunt it? Happy to provide any assets you need.
```

---

## Pre-Launch Checklist

### 2 Weeks Before

- [ ] Prepare all 6 gallery screenshots
- [ ] Record 2-min maker video (Loom)
- [ ] Finalize tagline and description (A/B test in Discord)
- [ ] Set up PH maker profile (link to GitHub, add bio)
- [ ] Reach out to 3–5 hunters for hunting
- [ ] Confirm hunter 1 week before

### 1 Week Before

- [ ] Share upcoming launch in:
  - [ ] Discord (TradeClaw community)
  - [ ] Telegram (Alpha Screener channel)
  - [ ] Twitter/X (@naimkatiman)
  - [ ] r/selfhosted, r/algotrading (teaser, not spam)
- [ ] Prepare "notify me" list — ask community to set PH reminders
- [ ] Test demo URL (tradeclaw.win/demo) is live and fast
- [ ] Verify docker compose deploys clean on a fresh VPS

### Day of Launch (12:00 AM PST)

- [ ] Hunter publishes the listing at 12:01 AM PST
- [ ] Maker immediately posts First Comment (template above)
- [ ] Post to all social channels with PH link
- [ ] Message Discord + Telegram community
- [ ] Reply to every comment within 30 min for the first 3 hours
- [ ] DM supporters who engaged with pre-launch teaser

### Post-Launch

- [ ] Thank top commenters on PH
- [ ] Write a post-mortem in 24 hours (share in community)
- [ ] Follow up with anyone who asked questions but didn't upvote

---

## Vote Goal

| Milestone | Target |
|-----------|--------|
| #5 of day | 150+ upvotes |
| #3 of day | 250+ upvotes |
| #1 of day | 500+ upvotes |
| "Product of the Week" | 1000+ upvotes |

---

## Notes

- DO NOT ask friends/family to upvote from the same IP or within 5 min of each other — PH detects this and sandboxes the listing
- Upvotes from accounts with < 7 days old are often discounted by PH algorithm
- Best organic growth: get 10–15 genuine technical users to upvote and comment in first 2 hours
- Comments drive algorithm more than upvotes alone — encourage discussion
