# TradeClaw — Awesome Lists Submission Kit

> Last updated: 2026-03-28
> GitHub: https://github.com/naimkatiman/tradeclaw

Use the templates below to submit TradeClaw to awesome-lists. Copy the PR title and body exactly — each list has its own format requirements.

---

## 1. awesome-selfhosted

**Repo:** https://github.com/awesome-selfhosted/awesome-selfhosted
**Category:** `Money, Budgeting & Management`
**Status:** Planned

### Entry to add

```
- [TradeClaw](https://github.com/naimkatiman/tradeclaw) - AI-powered trading signal platform with real-time RSI/MACD/EMA analysis, backtesting, paper trading, and Telegram alerts. Self-hostable via Docker. ([Source Code](https://github.com/naimkatiman/tradeclaw)) `AGPL-3.0` `Docker/Nodejs`
```

### PR Title

```
Add TradeClaw — self-hosted AI trading signal platform
```

### PR Description Body

```markdown
## Description

This PR adds [TradeClaw](https://github.com/naimkatiman/tradeclaw) to the **Money, Budgeting & Management** section.

## Why it belongs here

TradeClaw is a fully self-hostable, open-source trading signal platform that anyone can run on their own server via Docker Compose. It generates real AI-powered buy/sell signals using RSI, MACD, EMA, and Bollinger Band indicators — no proprietary cloud required.

**Key features:**
- 🐳 One-command Docker Compose deployment
- 📊 Real-time signals for 12+ trading pairs
- 🤖 AI-powered signal explanation (OpenAI-compatible)
- 📱 Telegram bot integration for mobile alerts
- 📈 Backtesting engine with historical performance
- 💹 Paper trading for risk-free strategy testing
- 🔌 Plugin system and webhook support
- 🔓 AGPL-3.0 licensed, source code on GitHub

## Checklist

- [x] The software is self-hosted (runs on user's own server)
- [x] Docker deployment documented in README
- [x] AGPL-3.0 license
- [x] Active development (recent commits)
- [x] Demo/docs available
- [x] Entry follows the format: `- [Name](url) - Description. ([Source Code](url)) \`License\` \`Stack\``
- [x] Description is under 200 characters
- [x] No trailing period after the license/stack tags
```

---

## 2. awesome-quant

**Repo:** https://github.com/wilsonfreitas/awesome-quant
**Category:** `JavaScript` (under Trading Systems / Tools section)
**Status:** Planned

### Entry to add

```
- [TradeClaw](https://github.com/naimkatiman/tradeclaw) - Self-hosted AI trading signal platform with RSI/MACD/EMA analysis, backtesting, paper trading, and Telegram alerts. Docker deploy. `AGPL-3.0`
```

### PR Title

```
Add TradeClaw to JavaScript trading tools
```

### PR Description Body

```markdown
## What is being added

[TradeClaw](https://github.com/naimkatiman/tradeclaw) — a self-hosted, open-source AI trading signal platform built with Next.js and Node.js.

## Category

**JavaScript** section (or Trading Systems, depending on list structure at time of submission)

## Why it fits awesome-quant

TradeClaw implements quantitative trading concepts that are core to this list:
- Multi-indicator signal generation: RSI, MACD, EMA-20/50/200, Bollinger Bands
- Backtesting engine with win rate / profit factor metrics
- Paper trading with virtual portfolio P&L tracking
- Signal accuracy tracking per instrument over time
- REST API for programmatic signal retrieval
- Correlation matrix across trading pairs

It is actively maintained, MIT/AGPL licensed, and ships with Docker Compose for easy self-hosting.

## Links

- GitHub: https://github.com/naimkatiman/tradeclaw
- Quickstart: https://github.com/naimkatiman/tradeclaw/blob/main/docs/QUICKSTART.md
- License: AGPL-3.0

## Checklist

- [x] Related to quantitative finance
- [x] Open source
- [x] Active development
- [x] Correct section placement
- [x] Short, accurate description
```

---

## 3. awesome-trading (search results)

**Likely repos to target:**
- https://github.com/je-suis-tm/quant-trading
- https://github.com/0xbigz/awesome-algo-trading

> Search GitHub for `awesome trading` to find the highest-star repo in this category at time of submission. Target the one with the most recent activity.

### Generic Entry format

```
- [TradeClaw](https://github.com/naimkatiman/tradeclaw) - Open-source, self-hosted AI trading signal platform. RSI/MACD/EMA signals, backtesting, paper trading, Telegram alerts. Docker. `AGPL-3.0` `Node.js`
```

### PR Title

```
Add TradeClaw — open-source self-hosted trading signal platform
```

### PR Description Body

```markdown
## Addition: TradeClaw

[TradeClaw](https://github.com/naimkatiman/tradeclaw) is an open-source, self-hosted trading signal platform.

**What it does:**
- Generates BUY/SELL signals using RSI, MACD, EMA-20/50/200, Bollinger Bands
- Backtesting with historical win rate and profit factor stats
- Paper trading with virtual portfolio tracking
- Telegram bot for real-time mobile alerts
- AI-powered signal explanations
- Plugin system and webhook delivery
- REST API for custom integrations

**Tech stack:** Next.js, TypeScript, Node.js, Docker Compose
**License:** AGPL-3.0
**GitHub:** https://github.com/naimkatiman/tradeclaw

## Checklist

- [x] Open source (AGPL-3.0)
- [x] Related to algorithmic / systematic trading
- [x] Self-hostable via Docker
- [x] Active development
- [x] Description is concise and accurate
```

---

## 4. awesome-nodejs

**Repo:** https://github.com/sindresorhus/awesome-nodejs
**Category:** `Command-line apps` or `Node.js frameworks / Full-stack` (confirm current structure before submitting)
**Status:** Planned

> Note: awesome-nodejs is very selective. Only submit if TradeClaw gains significant GitHub stars (500+) or community traction. The list maintainer (sindresorhus) requires battle-tested, widely-used packages.

### Entry to add

```
- [TradeClaw](https://github.com/naimkatiman/tradeclaw) - Self-hosted AI trading signal platform with RSI/MACD/EMA analysis, backtesting, and Telegram alerts.
```

### PR Title

```
Add TradeClaw to Node.js apps — self-hosted trading signal platform
```

### PR Description Body

```markdown
## Addition Request

[TradeClaw](https://github.com/naimkatiman/tradeclaw) is a full-stack Node.js application for self-hosted AI trading signals.

**Why it belongs in awesome-nodejs:**
- Built entirely on Node.js / Next.js ecosystem
- Demonstrates advanced Node.js patterns: streaming APIs, background jobs, webhooks, Telegram bot integration
- Self-hostable with Docker Compose — a real production Node.js application
- AGPL-3.0 open source

**Category suggestion:** `Applications` or `Trading / Finance`

## Links

- GitHub: https://github.com/naimkatiman/tradeclaw
- License: AGPL-3.0

## Checklist

- [x] Node.js application
- [x] Open source
- [x] Stars / community traction documented in PR comments
- [x] Description under 100 characters
- [x] No period at end of description
```

---

## Quick Reference: Submission Checklist

Before opening any PR, verify:

- [ ] Fork the target awesome-list repo
- [ ] Add entry in alphabetical order within the category
- [ ] Entry format matches other entries in the section exactly
- [ ] Run any lint scripts the repo provides (`npm test`, `awesome-lint`)
- [ ] PR title follows the repo's conventions
- [ ] Link the PR in `apps/web/app/awesome/page.tsx` to update the status badge

## Upvoting / Community Support

Once PRs are open, share them in:
- TradeClaw GitHub Discussions
- r/algotrading
- r/selfhosted
- Hacker News (Show HN when appropriate)
- Telegram group
