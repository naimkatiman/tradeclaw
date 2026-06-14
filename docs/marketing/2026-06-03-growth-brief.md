I have everything. The `ab-stats` surface is a real, existing A/B harness (hero variant impressions + GitHub CTA clicks, localStorage). The paid-funnel plan confirms the real funnel mechanics and proof surfaces. Now I have grounded, real file paths for every claim.

For B-S-S-C-R-S-L-F: no in-repo definition exists, so I'll map the eight initials onto the standard recognizable persuasion principles and attach each to a real surface, clearly labeling it as a framework mapping (not a fabricated repo construct). Writing the brief now.

# TradeClaw Growth Brief: Edge to Conversion

One cohesive chain — chain edge to proof to persuasion to conversion — built only on measured numbers. Every metric below is a LOCAL scanner/dev sample (`scripts/signals.db` for the scanner strategies, `apps/web/data/signal-history.json` for the web-app strategy), not the production Railway Postgres verified record. Production rolling metrics resolve via the Writer B cron once wired (see `CLAUDE.md` "Signal Generation Architecture"). Wherever a number does not exist yet, it is labeled "pending real data" and never invented.

---

## 1. The Edge — what is real, what decayed

TradeClaw runs a core-and-satellite strategy library. Three strategies have real resolved outcomes. The library is honest about which one earns its keep and which one is dying.

### Core: `zaky_strategy` — healthy

Operator-authored proprietary TradingView method, ported to H1/H4 multi-timeframe confluence (premium tier). It is a discretionary book codified into code, not a textbook indicator.

- All-sample win rate: **61.5% (128 wins / 208 resolved)**, date range 2026-04-07 to 2026-06-02
- Rolling 90d: **61.5% (128 / 208)**
- Rolling 30d: **58.9% (73 / 124)**
- Realized RR: **0.26R mean over n=140** (TP1/SL exits only; EXPIRED outcomes excluded)
- Decay status: **healthy** — 90d 61.5% sits above both the 50.8% historical baseline and the 25.4% decay floor (0.5x baseline)
- Sleeve: **core**, regime fit **both** (a discretionary method trades trend continuation, ranges, and reversals)
- Kill-date review: 2026-07-20 — KEEP in core if rolling-90d holds >= 50.8%; demote to satellite if it drops below 50.8%; kill if it breaks the 25.4% floor

Provenance: LOCAL scanner/dev sample (`scripts/signals.db`), not production-verified. RR is computed from signal-time TP1/SL prices only — no execution fills recorded, so realized RR excludes slippage (slippage: pending real data).

### Satellite: `tradingview_screener` — watch

TradingView screener bulk-scan, confluence-gated on MACD/EMA/RSI across timeframes. Aggressive, high-throughput candidate generation.

- All-sample win rate: **45.2% (80 wins / 177 resolved)**, date range 2026-04-02 to 2026-06-02
- Rolling 90d: **45.2% (80 / 177)**; Rolling 30d: **62.5% (30 / 48)**
- Realized RR: **0.71R mean over n=21** (thin sample; TP1/SL exits only)
- Decay status: **watch** — all-sample 45.2% is below the 50.8% baseline but the 90d 45.2% stays above the 25.4% decay floor, so no auto-demote
- Sleeve: **satellite-only** — it can never sit in core even with `auto_demote=false`; looser conviction than the core engine by design. Regime fit **trending** (MACD/EMA are trend filters)
- Kill-date review: 2026-07-25 — KEEP in satellite if rolling-90d recovers to >= 50.8% (promotion candidate); demote/kill if rolling-90d falls below 25.4%

Provenance: LOCAL scanner/dev sample (`scripts/signals.db`), not production-verified. Slippage: pending real data.

### On watch: `hmm-top3` — below baseline, satellite-only

Hidden Markov regime classifier selecting the top-3 confluence setups per scan (web app `strategyId=hmm-top3`, Writer A/B path).

- All-sample win rate: **33.7% (112 wins / 332 resolved)**, date range 2026-04-14 to 2026-06-02
- Rolling 90d: **33.7% (112 / 332)**; Rolling 30d: **30.8% (62 / 201)**
- by_mode split: scalp **36.0% (114 resolved)** vs swing **32.6% (218 resolved)** — both below baseline
- Realized return: mean **-0.12% pnl / median -0.45%** — this id reports a pnl percent, not an R-multiple
- Decay status: **WATCH** — all-sample 33.7% is below the 50.8% baseline, but 90d 33.7% stays above the 25.4% floor (0.5x baseline), so `auto_demote=false`; confined to satellite-only by discipline, not by an auto-trigger
- Kill-date review: 2026-07-18 — keep on watch; demote/KILL if rolling-90d crosses below the 25.4% floor; promotion-review only if rolling-90d recovers toward the 50.8% baseline on n>=20

Mechanism note (explains, does not soften): the measured split is scalp 36.0% vs swing 32.6%, both below the 50.8% baseline; the 24h outcome horizon (4h fallback) may still understate slower swing setups. The verdict stands: WATCH, below baseline, kept satellite-only. Provenance: LOCAL scanner/dev sample (`apps/web/data/signal-history.json`), not production-verified.

### Sleeving the edge (risk control as part of the product)

The library is allocated by risk profile, so the decayed strategy can never sink a portfolio. Allowed satellite strategies and drawdown brakes per profile:

| Profile | Core % | Satellite % (max) | Per-trade risk | Allowed satellite |
|---|---|---|---|---|
| Conservative | 90 | 10 | 0.25% | `tradingview_screener` |
| Moderate | 75 | 25 | 0.50% | `tradingview_screener`, scalp variants |
| Aggressive | 60 | 40 | 1.00% | `tradingview_screener`, scalp variants, `hmm-top3` (decayed, reduced size) |

Drawdown rules cut satellite size first, then pause the satellite sleeve, then cut core, then halt all new entries — scaled per profile. Examples:

- **Conservative:** -3% from high-water mark cuts satellite size 50%; -5% pauses satellite; -8% cuts core (`zaky_strategy`) 50%; -10% halts all new entries until recovery above the -5% line.
- **Moderate:** -5% cuts satellite 50%; -8% pauses satellite; -12% cuts core 50%; -15% halts all entries until recovery above the -8% line.
- **Aggressive:** -7% cuts satellite 50% and halves the already-reduced `hmm-top3`; -12% pauses the satellite sleeve including `hmm-top3`; -18% cuts core 50%; -22% halts all entries until recovery above the -12% line.

The edge narrative is therefore not "we win"; it is "we measure what wins, size it, and retire what doesn't." That is the believable claim.

### Expansion pipeline (cited, pending real data)

Seventeen academically grounded candidates are queued for the same measure-then-sleeve treatment. None has measured edge in TradeClaw yet — every one is **pending real data** until it accumulates resolved outcomes (n>=20) under the same decay rule:

Time Series Momentum (Moskowitz, Ooi & Pedersen 2012); Faber 10-Month SMA trend-timing (Faber 2007, SSRN 962461); Donchian Channel Breakout, Turtle-style (Original Turtle Rules via Alchemy Markets); Short-Term Reversal (Quantpedia, citing Nagel 2012); RSI(2) Mean Reversion (Connors, via StockCharts); Pairs Trading / relative-value arbitrage (Gatev, Goetzmann & Rouwenhorst 2006); Cross-sectional momentum (Jegadeesh & Titman 1993); 52-week high momentum (George & Hwang 2004); Overnight drift (Haghani, Ragulin & Dewey 2022/2024, SSRN 4139328); Betting Against Beta (Frazzini & Pedersen 2014); Volatility risk premium (Quantpedia, citing Coval & Shumway); Dual Moving Average Crossover (StockCharts ChartSchool); MACD Signal-Line Crossover (Li 2025, arXiv:2509.21326); ADX / Directional Movement System (Wilder 1978, via StockCharts); Bollinger Band mean reversion (Bollinger, via TrendSpider); Internal Bar Strength mean reversion (Pandey & Joshi 2023, arXiv:2306.12434); Halloween / Sell-in-May seasonality (Bouman & Jacobsen 2002).

Each ships only after it clears the same floor `zaky_strategy` clears today. No candidate gets a win-rate in marketing copy before it has one in the database.

---

## 2. The Proof — making the edge believable

The product's credibility rests on instrumentation, not adjectives.

**The decay dashboard makes the kill-switch visible.** The strategy-decay metrics (`apps/web/data/strategy-decay-metrics.json`, computed by `scripts/compute-strategy-decay.py`) publish the mechanism, not just a headline: a 50.8% historical baseline, a 25.4% decay floor (rolling-90d < 0.5x baseline), a 20-resolved minimum sample per window, and a canonical win definition. The dashboard's job is to flag any strategy whose rolling-90d crosses the floor and auto-set its status. That `hmm-top3` is shown on **watch** at 33.7% — below baseline, satellite-only, instead of buried — is the proof: a vendor willing to publish its weakest strategy's 33.7% is more credible on its 61.5% core. The 33.7%/watch reading here is the repo-canonical LOCAL sample computation (excludes auto-expire sentinels, win = outcome.hit); the dashboard's provenance line carries the caveat that these are illustrative local samples that resolve to production values via Writer B once wired.

**Public outcomes close the loop.** Real, audit-grade surfaces already exist in the app:

- `apps/web/app/track-record` — resolved win-rate and outcome history
- `apps/web/app/consensus` and `apps/web/app/premium-signals` — live signal state
- `apps/web/app/share` — shareable signal cards (organic distribution that doubles as proof)
- The Pro tier copy commits to it in writing: "Audit every entry, exit, and outcome in our public Postgres archive" and "Backtest your edge against unlimited real outcomes and audit trails" (`apps/web/lib/stripe-tiers.ts`)

The persuasion principle: the proof is falsifiable. A skeptic can pull the archive, count resolved outcomes, and check the math against the published 50.8% baseline and 25.4% floor. The framing of `zaky_strategy` as 61.5% over 208 resolved signals is always labeled a LOCAL dev sample, never a verified production record — which is precisely what makes the claim survive scrutiny.

**What is still pending:** production-verified rolling metrics (resolve via Writer B cron once wired), slippage / execution-fill data (none recorded; signal-time prices only), and any "% of weeks closed green" figure — all **pending real data**, none fabricated.

---

## 3. The Persuasion — levers mapped to real surfaces

Two layers operate on the pricing surface. Layer one is the nine applied pricing levers, already implemented in `apps/web/lib/stripe-tiers.ts` and `apps/web/app/pricing/PricingCards.tsx`. Layer two is a higher-level B-S-S-C-R-S-L-F persuasion sequence mapped onto those same surfaces. No in-repo definition of the acronym exists, so it is mapped here onto standard, recognizable persuasion principles and attached to real surfaces — it is a mapping, not a repo construct.

### Nine applied pricing levers (implemented)

1. **Framing Effect** — result framing kept truthful: `zaky_strategy` 61.5% over 208 resolved signals as the headline frame, always a LOCAL dev sample, never a verified production record. Raw risk is not the headline; the win-rate is. No invented "% of weeks green."
2. **Affordability Illusion** — annual price re-expressed per day: Pro $290/yr → "$0.79/day billed annually"; Elite $990/yr → "$2.71/day billed annually" (`perDayLabel` in `stripe-tiers.ts`).
3. **Rule of 3 + Anchor the Middle** — exactly three tiers (Free / Pro / Elite). Pro is the highlighted, recommended middle tier (`highlighted=true` only on Pro), retaining the "Most Popular" badge and emerald ring (`PricingCards.tsx`).
4. **IKEA Effect** — Free keeps a user-built watchlist (6 symbols across crypto/FX/commodities/indices); Pro keeps "the whole market you actually watch." Users assemble their own symbol set and risk profile.
5. **Power of Free** — Free leads with one concrete recurring asset: "One free signal class — the daily regime card, yours forever."
6. **Contrast Effect** — Pro ($29) renders immediately left of Elite ($99) in the same 3-up grid, so $29 reads small next to $99. No layout change needed.
7. **Paradox of Choice** — no 4th tier. The `custom` Tier type exists in the union but is not in `TIER_DEFINITIONS` and never renders. Exactly three visible plans.
8. **Anchoring Bias** — visible truthful struck-through anchor "Comparable SaaS dashboards: $200-500/mo" above the price on Pro and Elite (`anchorLabel`, rendered with `line-through`). A real market anchor cited in pre-launch content, not a fake former price for this product. Free has no anchor.
9. **Endowment Effect** — preserved 7-day free trial ("Start 7-Day Trial" on Pro): "Card required. Charged on day 8. Cancel anytime before then — no charge." Full ownership of the signal sheet before billing.

### B-S-S-C-R-S-L-F sequence, mapped to surfaces

| Initial | Principle (mapped) | Surface it lives on |
|---|---|---|
| **B** | Belief — make the edge credible before the ask | Decay dashboard + `track-record` public outcomes (Section 2) |
| **S** | Social proof — visible, shareable real outcomes | `apps/web/app/share` signal cards; public Postgres archive line in Pro copy |
| **S** | Scarcity / live-window — the move is still tradable | Pro feature "Catch the move while it is still tradable — alerts land instantly, not 30 minutes late" (`stripe-tiers.ts`); Free is "30-minute delayed" |
| **C** | Commitment — small free asset that creates a habit | Free "daily regime card, yours forever" (Power of Free lever) |
| **R** | Reciprocity — give a real free signal class first | Same Free regime card; one free signal class before any payment |
| **S** | Status / access — private rooms and priority | Pro "private Telegram group"; Elite "1-on-1 Telegram group with Zaky" and "Priority alerts — signals reach you before Pro users" |
| **L** | Loss aversion — frame the cost of delay, not the price | Anchor "$200-500/mo" struck through; "$0.79/day"; trial "no charge before day 8" |
| **F** | Framing — truthful result framing as the headline | Win-rate (61.5%, LOCAL) as the frame, risk and provenance disclosed, never hidden |

The two layers reinforce: the levers operate at the price grid, the B-S-S-C-R-S-L-F sequence operates across the visit (belief → proof → live-window → free habit → access → loss framing). Every surface cited is a real file, not a planned one.

---

## 4. The Conversion — the funnel and the tests that de-risk it

### Funnel

```
Free signal (daily regime card, yours forever)
        │  reciprocity + commitment
        ▼
Telegram connect (private Pro group preview / sample alerts)
        │  status + live-window scarcity
        ▼
Pro 7-day trial (card required, charged day 8, cancel anytime)
        │  endowment — full signal sheet before billing
        ▼
Paid Pro ($29/mo or $290/yr — "$0.79/day") → Elite ($99/mo) upsell via contrast
```

Stage mechanics, all grounded in real surfaces and the approved funnel design (`docs/plans/2026-04-20-paid-funnel-and-proof.md`):

- **Free → Telegram:** the free regime card and 30-minute-delayed signals create the habit; rendered sample Telegram alerts show the buyer exactly what Pro delivers before paying.
- **Telegram → Trial:** direct POST to `/api/stripe/checkout` from `/pricing` (no `/signin` bounce), monthly/annual toggle live, real `NEXT_PUBLIC_STRIPE_*` priceIds set so the CTA never degrades.
- **Trial → Paid:** endowment via the 7-day trial; the signal sheet is owned before day-8 billing.
- **Pro → Elite:** contrast effect in the 3-up grid; priority alerts and 1-on-1 access are the status upgrade.

### A/B tests that de-risk it

A real A/B harness already exists: `apps/web/app/ab-stats` (`ABStatsClient.tsx`) tracks hero-variant impressions and GitHub CTA clicks per variant (currently localStorage, single-browser). The following are **proposed experiments** on that surface — any lift number is pending real data and is not fabricated:

1. **Hero proof framing** — headline win-rate frame (61.5%, LOCAL-labeled) vs decay-transparency frame ("we publish our worst strategy"). Metric: pricing-page reach / GitHub CTA clicks. Result: pending real data.
2. **Per-day vs annual price label** — "$0.79/day billed annually" vs "$290/yr — save $58" on the Pro card. Metric: trial-start rate. Result: pending real data.
3. **Anchor presence** — struck-through "$200-500/mo" shown vs hidden on Pro. Metric: Pro CTA click-through. Result: pending real data.
4. **Free-asset prominence** — "daily regime card, yours forever" above vs below the fold on Free. Metric: Telegram connect rate. Result: pending real data.
5. **Trial wording** — "Start 7-Day Trial" vs an outcome-led variant. Metric: checkout completion. Result: pending real data.

Each test isolates one lever from Section 3 so a win is attributable, and none ships a claimed conversion lift until `ab-stats` has recorded real impressions and clicks.

---

## 5. Risks and Integrity — the anti-fabrication posture

The growth chain only holds if the proof is honest. The discipline:

- **Three strategies, three real numbers.** Only `hmm-top3`, `zaky_strategy`, and `tradingview_screener` have measured data. Every figure here is echoed verbatim from the deterministic library entries — none recomputed.
- **Provenance always labeled.** Every metric is a LOCAL scanner/dev sample (`scripts/signals.db` or `apps/web/data/signal-history.json`), explicitly not the production Railway Postgres verified record. Production rolling metrics resolve via Writer B cron once wired.
- **The decayed strategy stays visible.** `hmm-top3` at 33.7% (on watch, below baseline, satellite-only) is published, not hidden. Transparency on the worst case is what underwrites the best case.
- **No fabricated anchors or testimonials.** The only price anchor is the real, cited "$200-500/mo comparable SaaS dashboards." No fake "was $X" former price. No invented testimonial, win-rate, RR, or decay number.
- **Pending real data, named explicitly:** slippage / execution fills (none recorded — signal-time TP1/SL prices only); production-verified rolling metrics; "% of weeks closed green"; all 17 expansion candidates' in-product edge; every proposed A/B lift number. None of these is filled with an invented figure.

The growth thesis in one line: a measured 61.5% LOCAL-sample core, a satellite sleeve under hard drawdown brakes, a publicly falsifiable decay dashboard that retires its own losers, and a price framed truthfully at $0.79/day against a real $200-500/mo market anchor. The persuasion is strong precisely because nothing in it is faked.
