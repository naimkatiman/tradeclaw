# Awesome Lists Submission Checklist

Step-by-step guide for submitting TradeClaw to each awesome-list. Complete in order — each list has different requirements and review timelines.

---

## Before You Start (one-time setup)

- [ ] Fork all target repositories on GitHub
- [ ] Clone your forks locally
- [ ] Create a feature branch per submission (e.g. `add-tradeclaw`)
- [ ] Verify demo URL is live: https://tradeclaw.win
- [ ] Verify GitHub repo is public: https://github.com/naimkatiman/tradeclaw
- [ ] Confirm star count (maintainers sometimes check this)

---

## 1. awesome-selfhosted

**Repo:** https://github.com/awesome-selfhosted/awesome-selfhosted
**Estimated review time:** 2–6 weeks
**Priority:** HIGH (200k+ stars, massive discovery impact)

### Steps

- [ ] Read [CONTRIBUTING.md](https://github.com/awesome-selfhosted/awesome-selfhosted/blob/master/CONTRIBUTING.md) carefully
- [ ] Find alphabetical position under `Money, Budgeting & Management`
- [ ] Add entry (copy from `awesome-selfhosted.md`):
  ```
  - [TradeClaw](https://github.com/naimkatiman/tradeclaw) - AI-powered trading signal platform with real-time signals, backtesting, paper trading, and Telegram alerts. Self-hostable with Docker. ([Demo](https://tradeclaw.win), [Source Code](https://github.com/naimkatiman/tradeclaw)) `MIT` `Nodejs`
  ```
- [ ] Run their validation script (if available): `./bin/validate.py`
- [ ] Open PR with title: `Add TradeClaw - self-hosted AI trading signal platform`
- [ ] Use PR body from `awesome-selfhosted.md`
- [ ] Watch for maintainer feedback and respond within 48h
- [ ] Update `apps/web/app/awesome/page.tsx` status to `Submitted` with PR URL

### Common rejection reasons to avoid

- Description starts with "A" or "An" — ours doesn't ✓
- Description over 250 characters — check ✓
- Missing demo URL — we have https://tradeclaw.win ✓
- Wrong license tag — use `MIT` ✓
- Not truly self-hostable — Docker Compose, no required cloud ✓

---

## 2. awesome-quant

**Repo:** https://github.com/wilsonfreitas/awesome-quant
**Estimated review time:** 1–3 weeks
**Priority:** HIGH (quantitative finance audience, highly targeted)

### Steps

- [ ] Fork https://github.com/wilsonfreitas/awesome-quant
- [ ] Find the **JavaScript** section
- [ ] Add entry (copy from `awesome-quant.md`):
  ```
  * [TradeClaw](https://github.com/naimkatiman/tradeclaw) - Self-hosted AI trading signal platform with RSI/MACD/EMA/Bollinger Bands analysis, backtesting, paper trading, and Telegram alerts.
  ```
- [ ] Open PR with title: `Add TradeClaw - self-hosted AI trading signal platform (JavaScript)`
- [ ] Use PR body from `awesome-quant.md`
- [ ] Update status to `Submitted` after PR is opened

---

## 3. awesome-trading

**Repo:** https://github.com/je-suis-tm/quant-trading
**Estimated review time:** 1–4 weeks
**Priority:** MEDIUM (algorithmic trading community)

### Steps

- [ ] Fork https://github.com/je-suis-tm/quant-trading
- [ ] Find appropriate section (Platforms / Tools)
- [ ] Add entry (copy from `awesome-trading.md`)
- [ ] Open PR with title: `Add TradeClaw - open source self-hosted trading signal platform`
- [ ] Use PR body from `awesome-trading.md`
- [ ] Update status after submission

---

## 4. awesome-nodejs (stretch goal)

**Repo:** https://github.com/sindresorhus/awesome-nodejs
**Estimated review time:** 4–8 weeks (high bar, slow review)
**Priority:** LOW (submit after 500+ GitHub stars)

### Steps

- [ ] Wait until TradeClaw has significant community traction (500+ stars recommended)
- [ ] Read [CONTRIBUTING.md](https://github.com/sindresorhus/awesome-nodejs/blob/main/contributing.md) — Sindre has strict quality requirements
- [ ] Find `Applications` section
- [ ] Open PR once requirements are met

---

## After Each Submission

1. **Update status** in `apps/web/app/awesome/page.tsx` — change `Planned` → `Submitted` and add `prUrl`
2. **Share the PR** on Discord/Twitter/Reddit to get community upvotes
3. **Respond to feedback** within 48 hours — fast responses = faster merges
4. **Update to `Listed`** once merged

---

## Tracking

| List | Status | PR URL | Submitted | Merged |
|------|--------|--------|-----------|--------|
| awesome-selfhosted | Planned | — | — | — |
| awesome-quant | Planned | — | — | — |
| awesome-trading | Planned | — | — | — |
| awesome-nodejs | Planned | — | — | — |
