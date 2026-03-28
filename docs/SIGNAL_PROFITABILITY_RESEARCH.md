# Signal Profitability Research

Last updated: 2026-03-28
Owner: pm-tradeclaw

## Question

Can users make money by following TradeClaw signals?

## Short answer

Not as a general product claim.

The honest answer is:

- Some users may make money in some periods.
- The broader evidence does not support a blanket claim that signal followers reliably make money.
- Most retail traders in leveraged products lose money.
- TradeClaw does not yet have an audited live track record that would justify a profitability claim.

So the safe positioning today is:

> TradeClaw helps users discover structured technical signals and test them with paper trading, backtests, and their own risk rules.

Not:

> Follow these signals and make money.

## What the external evidence says

### 1. Most retail traders in CFD-style products lose money

The UK FCA said its analysis of a representative sample of CFD client accounts found that 82% of clients lost money on these products.

Why this matters:

- TradeClaw covers markets and workflows that overlap heavily with speculative retail trading behavior.
- If we market profitability too aggressively, we would be fighting against strong regulator-documented base rates.

Source:

- FCA, 2016: https://www.fca.org.uk/news/press-releases/fca-proposes-stricter-rules-contract-difference-products

### 2. Copy trading and social trading do not reliably produce positive abnormal returns

An empirical study of social trading platforms found:

- simple follower strategies can lead to large losses
- more sophisticated selection can improve outcomes
- but followers still did not achieve positive abnormal returns after transaction costs

Why this matters:

- "Signal following" is economically very close to copy trading, even if the UI is different.
- Gross wins are not enough. Costs, spreads, slippage, and selection bias can erase them.

Source:

- Dorfleitner et al., 2018, *The Quarterly Review of Economics and Finance*: https://www.sciencedirect.com/science/article/abs/pii/S106297691730248X

### 3. Social trading can increase risk-taking and worsen behavior

Management Science research found that copy trading increased investor risk-taking, and the authors concluded that copy trading leads to excessive risk taking.

Why this matters:

- Even if signal UX boosts engagement, that can be harmful if it pushes users to overtrade.
- Product design should reduce impulsive trading, not intensify it.

Source:

- Apesteguia, Oechssler, Weidenholzer, 2020: https://bse.eu/research/publications/copy-trading

### 4. Peer performance can reduce performance and increase volatility

A 2025 open-access paper on social trading found that when investors react to their peers' performance, trading activity goes up, performance goes down, and return volatility goes up.

Why this matters:

- Leaderboards, public wins, and social proof can unintentionally make outcomes worse.
- Viral product mechanics and user profitability goals can conflict.

Source:

- Klocke et al., 2025, *Journal of Behavioral and Experimental Finance*: https://www.sciencedirect.com/science/article/pii/S2214635025000383

### 5. Regulators explicitly warn against trusting signal sellers, bots, or social tips

Recent regulator guidance is very clear:

- the CFTC warns that AI, bots, and trade-signal strategies promising very high or guaranteed returns are a red flag, and reminds investors that AI cannot predict the future
- the SEC warns investors not to make investment decisions based solely on information from social media platforms or apps

Why this matters:

- TradeClaw should avoid "AI money machine" wording
- any public growth copy should be careful with promises, screenshots, testimonials, and influencer-style claims

Sources:

- CFTC, 2024: https://www.cftc.gov/sites/default/files/2024/01/AITradingBots_0.pdf
- SEC / Investor.gov, 2024: https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/social-media-stock-scams

### 6. Active trading itself tends to hurt retail performance

Barber and Odean's classic study found that the households that traded most earned 11.4% annually while the market returned 17.9%.

Why this matters:

- Even before asking whether a signal has edge, user behavior can destroy that edge.
- More trades does not mean better outcomes.

Source:

- Barber and Odean, 2000: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=219830

## TradeClaw-specific audit

## Current conclusion

TradeClaw cannot currently support the claim that users who follow its signals make money.

### Why

1. Live signals are not being recorded into an audited performance log.

`recordSignal()` exists in the history library, but there are currently no call sites wiring live signal generation into that storage path.

2. Seed history is simulated.

`apps/web/lib/signal-history.ts` generates seed records with `isSimulated: true` and uses `simulateOutcome()` to create outcomes.

3. The paper trading seed portfolio is also simulated with favorable drift.

`apps/web/lib/paper-trading.ts` seeds historical trades and explicitly bakes in an approximately 62% win rate for the initial demo experience.

4. That means current UI performance surfaces are not the same thing as an audited live follower P&L record.

So the right statement is:

- TradeClaw generates signals from technical indicators.
- TradeClaw does not yet prove that following those signals yields durable, net-of-cost profitability for users.

## What we can safely claim right now

- Open-source self-hosted signal platform
- Technical-analysis driven signals
- Paper trading and backtesting workflow
- Structured risk levels: entry, stop, TP targets
- Useful for research, monitoring, experimentation, and alerting

## What we should avoid claiming right now

- "Users make money following TradeClaw signals"
- "Profitable signals"
- "Beat the market"
- "High win-rate AI trading"
- "Passive income from our signals"
- "Guaranteed returns"

## What would be needed before making a profitability claim

1. Persist every published signal to an append-only log.
2. Resolve outcomes from market data using fixed, public rules.
3. Measure net returns after spreads, fees, slippage, and latency.
4. Separate in-sample backtests from out-of-sample forward performance.
5. Publish per-asset, per-timeframe, per-regime results.
6. Track user-followable model portfolios with fixed sizing rules.
7. Keep a public disclaimer that past performance does not guarantee future results.

## Recommended PM stance

Best messaging:

- "TradeClaw helps traders evaluate signals faster."
- "TradeClaw helps you test ideas before risking capital."
- "TradeClaw gives you structured entries, exits, and confluence data."

Best next product task if we want stronger proof:

- Build an audited forward-performance tracker for every emitted signal and show net results transparently.

Until then, the answer to "if users follow the signal, can they make money?" should be:

> Possibly sometimes, but we do not have enough evidence to claim that reliably, and the broader evidence says many retail traders lose money.
