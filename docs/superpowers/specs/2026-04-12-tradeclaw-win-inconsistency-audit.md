# TradeClaw.win Inconsistency Audit — 2026-04-12

Full audit of tradeclaw.win across content claims, UI/UX, codebase, and API routes.

---

## CRITICAL: Claims vs Reality

### 1. Deployment Time Contradiction
- **Landing page hero**: "Deploy in 5 minutes with Docker"
- **Social proof counter**: Animates to "5 min setup"
- **Landing page body**: "under 2 minutes"
- **Fix**: Pick one number and use it everywhere.

### 2. Asset Count Mismatch
- **Landing page**: "10 pairs, 3 timeframes" in signals section
- **Landing page (elsewhere)**: "12+ asset pairs across crypto, forex, and commodities"
- **Social proof counter**: Animates to "12 Assets Tracked"
- **Dashboard live**: "10 of 12 symbols are using synthetic data (API unavailable)"
- **Pricing page Free tier**: "3 symbols (XAUUSD, BTCUSD, EURUSD)"
- **Fix**: Clarify: 12 symbols configured, X currently live. The "10 pairs" claim contradicts "12+" elsewhere.

### 3. Hero Signal Prices Are Stale/Hardcoded
- **File**: `apps/web/components/landing/ab-hero.tsx` lines 18-25
- XAU/USD @ $2,648.30, BTC/USD @ $94,210.50, ETH/USD @ $3,412.80
- These are static — will be obviously wrong to any trader visiting the site.
- **Fix**: Either fetch live prices or clearly label as "Example signals".

### 4. "92% of traders" Unsourced Statistic
- **File**: `apps/web/components/landing/comparison-table.tsx` line 224
- Claims "92% of traders using generic AI agents for trading lost money in 2025"
- No source, no link, no footnote. Looks like a made-up stat.
- **Fix**: Add source citation or remove.

---

## HIGH: Mock Data Shown as Real

### 5. Risk Dashboard — All Mock Data
- **File**: `apps/web/app/risk/RiskClient.tsx` lines 46-92
- Circuit breakers: hardcoded `-3% daily`, `-10% drawdown`, `5 consecutive losses`
- Current values: `-0.8%`, `-7.2%`, `2 losses` — all fake
- Triggered breaker with hardcoded timestamp `2026-04-11T08:30:00Z`
- Cooldown: hardcoded `47m remaining`
- TODO comment at line 46: `// TODO: replace with real API calls`
- **Impact**: Users see a professional-looking risk dashboard with completely fake numbers.

### 6. Execution Page — All Mock Data
- **File**: `apps/web/app/execution/ExecutionClient.tsx` lines 48-89
- 8 hardcoded mock orders with fake timestamps, prices, fill data
- Mock broker: "Alpaca" with $100,684.52 equity
- Mock stats: 247 total orders, 89.5% fill rate, 0.03% slippage
- TODO comment at line 46: `// TODO: replace with real API calls`
- **Impact**: Users see fake order history presented as real execution data.

### 7. Allocation Page — Mock Portfolio
- **File**: `apps/web/app/allocation/AllocationClient.tsx` line 99
- TODO: `// TODO: replace with real portfolio allocation from API`
- Shows mock 60% exposure as if it's a real portfolio allocation.
- Note: The regime table itself (Crash/Bear/Neutral/Bull/Euphoria rules) is real config, but the "current allocation" is fake.

### 8. Sponsors Page — Entirely Fake
- **File**: `apps/web/app/api/sponsors/route.ts` lines 7-58
- `MOCK_SPONSORS` array with fake profiles: alex_quant, sarah_trades, etc.
- Returns hardcoded sponsor data permanently — never fetches GitHub Sponsors.
- **Impact**: Misleading to potential backers who think others are sponsoring.

### 9. Sentiment Page — Mock Fallbacks
- **File**: `apps/web/app/api/sentiment/route.ts` lines 54-110
- Hardcoded Fear & Greed Index (value: 65, "Greed")
- Hardcoded trending coins with fake prices
- Falls back to mock if CoinGecko API fails (which it often does)
- **Impact**: Users may see stale fear/greed readings and make decisions on fake data.

### 10. News Trending — Fake Prices
- **File**: `apps/web/app/api/news/route.ts` lines 49-55
- Hardcoded: BTC $67,000, ETH $3,400 — obviously wrong
- Falls back to this mock data when CoinGecko is down.

---

## MEDIUM: Features Advertised but Not Working

### 11. Push Notifications — Never Sent
- **File**: `apps/web/app/api/notifications/test/route.ts` lines 3-6
- TODO: `// TODO: Integrate web-push library`
- Test endpoint returns success but nothing is delivered.
- **Impact**: Users configure notifications, test them, see "success", but never receive anything.

### 12. Slack Integration — "Coming Soon" But Shown
- **File**: `apps/web/app/slack/SlackClient.tsx` line 242
- Shows "Add to Slack" button with tiny "Coming Soon" badge.
- OAuth endpoint URL is hardcoded but non-functional.
- **Impact**: Users click the button expecting it to work.

### 13. Stripe Payment Failure — No Dunning
- **File**: `apps/web/app/api/stripe/webhook/route.ts` line 209
- TODO: `// TODO: trigger dunning email via your email provider`
- When payments fail, customers aren't notified.
- **Impact**: Subscriptions go to past_due silently — churn risk.

### 14. Webhook Test — False Positive
- **File**: `apps/web/app/api/webhooks/test/route.ts` lines 5-33
- Returns success regardless of actual delivery outcome.
- **Impact**: Users think their webhook integration works when it might not.

### 15. Leaderboard — Empty State
- Live site shows "Loading..." then "0 pairs" tracked.
- No data displayed. Page exists but serves no purpose currently.
- Should either show data or be hidden from nav.

### 16. Track Record — Empty Tables
- Headers visible but no data rows rendered on live site.
- Claims "No cherry-picking, no hidden losses" but shows nothing to verify.

---

## LOW: Minor Inconsistencies

### 17. Consensus Votes — Synthetic Data
- **File**: `apps/web/app/api/consensus/route.ts` lines 36-82
- Generates deterministic fake votes using character codes when no real signals exist.
- Response includes `hasSynthetic` flag, but UI may not surface this clearly.

### 18. Vote Seeding
- **File**: `lib/votes.ts` lines 42-58
- Initial vote counts are hardcoded seed data, not real community votes.

### 19. Badges Default to NEUTRAL
- **File**: `apps/web/app/api/badges/route.ts` lines 46-48
- When signal data is missing: direction=NEUTRAL, confidence=0, RSI=50.
- Embeds on third-party sites show a neutral badge even when no data exists.

### 20. Social Proof Counters — Hardcoded
- **File**: `apps/web/components/landing/social-proof.tsx` lines 16-35
- "7 TA Indicators", "12 Assets", "$0 Cost", "5 Min Setup" — all hardcoded animation targets.
- Not dynamic, but also not misleading since these are factual feature counts.

### 21. API Usage "Pro Tier" — Coming Soon
- **File**: `apps/web/app/api-usage/APIUsageClient.tsx` line 350
- Pro tier pricing displayed with "Coming Soon" badge but full feature list visible.

### 22. Earnings Edge "Batch Processing" — Coming Soon
- **File**: `apps/web/app/earningsedge/pricing/page.tsx` line 54
- Listed in Pro plan features but marked as coming soon.

---

## What's Actually Working Well

- **Signal engine cron routes** — all functional (signals, telegram, SMS, daily digest, position monitor)
- **Accuracy stats bar** — fetches real data from `/api/v1/win-rates`, shows honest fallback message when empty
- **Data provenance badges** — labels data as live/mixed/simulated/empty
- **Pricing + Stripe integration** — real Stripe price IDs, actual payment flow
- **How It Works page** — transparent algorithm explanation with real formula details
- **Dashboard** — shows real signals with honest "synthetic data" notice for unavailable APIs
- **Signal history API** — fetches real resolved signals from database

---

## Recommended Priority

| Priority | Items | Action |
|----------|-------|--------|
| P0 - Fix now | #1-4 | Content contradictions visible on landing page |
| P1 - Fix soon | #5-10 | Mock data pages — either wire to real APIs or add clear "Demo Data" badges |
| P2 - Plan | #11-16 | Features that don't work — hide or implement |
| P3 - Low | #17-22 | Minor inconsistencies, cosmetic |
