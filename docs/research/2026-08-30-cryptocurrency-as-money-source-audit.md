# Cryptocurrency as Money - Source Audit

Date: 2026-08-30

Task: TC-263

Candidate: `cryptocurrency-as-money-a-trading-strategy-solution`

Stage: source-audited

Disposition: verified no-go; do not preregister an exact replay of the published study

TradeClaw backtest run: no

## Decision

Do not calculate returns for an exact TradeClaw replication. The primary paper
describes a long-only two-cryptocurrency grid concept and publishes default
settings, but it does not define a deterministic trading rule or a replayable
evaluation protocol.

The paper says to buy two competing cryptocurrencies in equal cash values, place
limit orders above and below the market inside a selected range, increase order
quantities linearly on both sides, and reset after the application again divides
the funds equally with a profit. Its defaults are a 30% range and seven steps.
It does not specify the grid formula, exact order sizes, reset inequality,
reference price, quote/base accounting, venue, timestamps, market-data source,
partial fills, order priority, minimums, fees, rebates, spreads, slippage, or
latency.

The published illustration is an LTC/BTC grid from 31 July 2018 through 31 July
2019, while the live Papers With Backtest clone labels the idea weekly and shows
a 1992-2026 daily-price backtest. Those are not the same rule or sample. The
clone output and subscription-only implementation are not accepted as source
specification or TradeClaw evidence.

This is a source-audit no-go, not a TradeClaw replication FAIL. No local return
series, proxy substitution, preregistration, result artifact, marketing draft,
or prospective claim was created. A venue-specific grid study could be a new
hypothesis only after its rules, event data, costs, controls, and holdout are
frozen under a later receipt before any return is observed.

## Provenance

- Discovery catalog: `paperswithbacktest/awesome-systematic-trading`
- Pinned catalog commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Pinned README SHA-256:
  `67f4c4963ce10ab5ebdc7a0b1eb578c179cf151e1ddaad990cd428a231b2b29a`
- Pinned catalog treatment: gross-of-trading-costs discovery metadata only
- One-based catalog row: `39`
- Catalog metadata: gross Sharpe `0.47`, t-statistic `2.8`, volatility `15.4%`,
  and `35` years tested; none of these fields was used to select or judge TC-263
- Discovery page:
  <https://paperswithbacktest.com/strategies/cryptocurrency-as-money-a-trading-strategy-solution>
- Observed discovery HTML: `200,335` bytes, SHA-256
  `bd3e9da782e1a20789184874bd0f4ffb5f0776d96f7f5df06eb662d81d502bb2`
- Primary paper: Marko Ogorevc, "Cryptocurrency As Money: A Trading Strategy
  Solution"
- SSRN record:
  <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3436041>
- DOI: <https://doi.org/10.2139/ssrn.3436041>
- Stable document route:
  <https://papers.ssrn.com/sol3/Delivery.cfm/SSRN_ID3436041_code3654339.pdf?abstractid=3436041>
- Audited PDF: `453,903` bytes and `9` pages, SHA-256
  `0b3c8344b8f28ccd17ac3902eb4532d7dd0d179e2a64859533a9239432e743c0`
- Machine-readable local extraction used only for the audit: `21,068` bytes,
  SHA-256 `845711105bd224321042b7fad2680b93a4e4ca4d0e4536aee88eb2caa4b80a97`

The SSRN record states that all rights are reserved and reuse requires
permission. The paper, discovery HTML, rendered pages, and temporary extraction
are therefore not vendored in the MIT repository.

## Published specification

The paper's proposed method can be summarized without filling its gaps:

1. Select two competing cryptocurrencies, with Bitcoin and Litecoin given as an
   example.
2. Split the starting funds equally between the two coins in cash-value terms.
3. Place a series of limit buy and sell orders above and below the current market
   price inside a selected trading range.
4. Use a default 30% trading range and seven steps; users may change the pair,
   number of steps, and range.
5. Increase order quantities linearly on both sides of the grid.
6. When the application can again split the funds equally with a profit, reset
   the cycle and place a new set of orders.

Figure 1 illustrates the defaults on LTC/BTC from 31 July 2018 to 31 July 2019
with an assumed initial investment of one Bitcoin. Figure 2 shows weekly candles,
yearly and three-month average prices, and a one-year price-duration histogram as
decision aids. Those charts do not supply the underlying bytes, calculation
code, order ledger, or executable formulas.

The paper also reports an ongoing application experiment: 191 accounts used 235
active pairs, users could alter the settings, the average active duration was
142.5 days, and 41% of accounts remained active after the test period. These are
descriptive user observations, not a controlled fixed-rule backtest or a frozen
TradeClaw result.

## Source/clone mismatch

The observed Papers With Backtest page describes weekly rebalancing, one daily
cryptocurrency price dataset, a 1992-2026 clone window, and current long BTC and
LTC positions. The primary paper instead describes standing limit orders, a
user-adjustable event-driven grid, and a single 2018-2019 LTC/BTC illustration.
It supplies no weekly rebalance rule and no source history supporting the clone's
1992 start.

Cadence, fill mechanics, sample, source inputs, and portfolio accounting affect
every trade, cost, benchmark, and return. The clone cannot be treated as a
reproduction of the paper, and its displayed performance was not used in this
decision.

## Inputs and cost treatment

The paper does not identify the online application's exchange, API, symbol
mapping, price or trade feed, time zone, raw source bytes, revision policy, or
software version. A daily OHLC series cannot causally determine which standing
limit orders filled first when both sides trade inside one bar. Exact replay
would require event-level trades or order-book data plus an explicit queue and
partial-fill model.

No trading-cost model is published for the illustrated backtest or user-account
statistics. Maker and taker fees, rebates, bid-ask spread, adverse selection,
slippage, order cancellation, latency, market impact, minimum order sizes, tick
sizes, withdrawal or transfer costs, and venue downtime are not frozen. The
paper therefore gives no break-even side cost, realized friction ledger, or net
headroom that TradeClaw can independently reproduce.

## Reproducibility blockers

- The seven grid levels are not defined by an exact price-spacing formula.
- "Linearly increasing" order quantity has no intercept, slope, normalization,
  rounding, or balance-reservation rule.
- The reset event has no exact equality or inequality, valuation price, timing,
  or tie-breaking convention.
- The initial market or limit split, reference price, order submission sequence,
  cancellations, replacements, and behavior after a gap are unspecified.
- The exchange, pair identifiers, event timestamps, source data, application
  code, configuration history, and raw order/fill ledger are not supplied.
- The source does not define fees, rebates, spread, slippage, queue priority,
  partial fills, market impact, minimums, latency, or outages.
- User-selected settings and pairs make the reported account averages a changing
  observational mixture rather than one fixed strategy.
- The single one-year illustration supplies no chronological folds, untouched
  holdout, same-window identically costed benchmark, or external venue/pair
  falsification.
- The Papers With Backtest clone contradicts the source cadence and sample and
  cannot fill missing rules through hidden pseudo-code.

## Gate outcome

- Rule clarity: fail; the concept and defaults are understandable, but the grid,
  sizing, reset, accounting, and fill rules are not executable.
- Data provenance and rights: fail for exact replication; no venue or immutable
  source bytes are identified, and the SSRN paper may not be redistributed.
- Turnover: fail pending a new hypothesis; standing two-sided grids can fill
  repeatedly, but the source supplies no deterministic trade ledger or bounded
  transition count.
- Cost evidence: fail; no complete or replayable friction model is published.
- Chronological falsification: possible only for a materially new venue-specific
  protocol with a pre-frozen post-2019 holdout.
- Bounded implementation: fail for exact replication because essential formulas,
  event data, venue mechanics, and costs would have to be invented.
- Preregistration permitted: no for an exact replay of the source.
- Exact replication permitted: no.
- Next action: archive this source-audited no-go and screen another untouched
  candidate in a later UTC window.

## Requirements for a new hypothesis

A later, explicitly new grid-liquidity hypothesis would need all of the following
before any return calculation:

- one named venue and exact base/quote pair with immutable event-level source
  bytes and redistribution terms;
- exact grid anchors, spacing, sizes, reserved balances, rounding, reset trigger,
  cancellation, replacement, partial-fill, gap, and outage rules;
- maker/taker fees, rebates, spread and queue assumptions, slippage, latency,
  minimums, tick sizes, market impact, and stress costs;
- identically timed and costed 50/50 hold, individual-coin hold, and cash controls;
- chronological folds, a genuinely untouched holdout, and at least one external
  pair or venue falsification;
- a small deterministic assembly with byte-identical replay and no connection to
  live orders, signals, allocation, broadcast, broker, or execution systems.

That would test a new TradeClaw protocol, not reproduce the paper or validate the
Papers With Backtest clone.

## Safety receipt

No push, merge, deployment, publication, social post, marketing handoff, signal,
allocation, broadcast, broker or execution action, billing change, or trading
activation occurred.
