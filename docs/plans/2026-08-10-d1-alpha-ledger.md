# D1 Prospective Alpha Ledger — Frozen Protocol

Date frozen: 2026-08-10

## Objective

Measure whether the already-approved BTCUSD + ETHUSD D1 slow-gate candidate
produces prospective, modeled-cost excess performance after the ledger is
deployed. This protocol does not alter the strategy and does not convert its
historical simulation into a live-performance claim.

## Frozen strategy identity

- Strategy version: `d1-slow-gate-v1-2026-08-09`
- Symbols: `BTCUSD`, `ETHUSD`
- Timeframe: UTC daily bars
- OHLCV source: Binance spot (`BTCUSDT`, `ETHUSDT`), stored as `binance`
- Portfolio: fixed 50/50 independent sleeves, no cross-rebalancing
- Rule: close above EMA200, long/flat
- Stop: ATR14 × 2.5 with a 4.0% minimum distance
- Fee: 0.05% per side
- Slippage: 0.15% per side
- Funding: fixed 0.01% per eight hours while long
- Frequency ceiling: 30 direction changes in any rolling 365 days
- Normalized strategy-source SHA-256:
  `a9c222a33f3e1e0c70e8fb5f0bfa930dc6433297d9dcb27ef2b825f08da3b171`
- Canonical frozen-artifact SHA-256:
  `1a6b28e47f218fafd5134cb257e06f966f881bc5154be92135c06867f5026e90`

Changing any strategy input, rule source, cost assumption, symbol, timeframe,
or portfolio weight requires a new version and a new prospective ledger. It
must never rewrite this version.

## Observation boundary

The observation epoch is the first successfully committed daily snapshot after
the ledger migration is deployed. The ledger starts both strategy sleeves flat,
even when the historical state machine is already long at that moment. It does
not replay or manufacture positions from bars that predate the first snapshot.
Collection runs in the isolated research ledger whether the signal lane is in
`paper` or `active` mode; it does not change that mode or promote the strategy.

Only a transition observed after the first snapshot may open or close a tracked
position. An exit seen while the prospective sleeve is flat is recorded for
audit but cannot create a trade or change NAV. Missing historical snapshots are
never inserted later.

The benchmark enters a fixed 50/50 BTCUSD + ETHUSD long portfolio at the first
snapshot, pays the same per-side entry cost, and accrues the same fixed funding
assumption. It is a modeled comparator, not a broker account.

## Append-only daily snapshot

One row is eligible for each common, provably closed UTC-D1 bar after the
observation epoch. Both symbols must be present, source-backed, cadence-aligned,
and evaluated by the frozen state machine. Otherwise the entire date fails
closed and no partial portfolio row is written.

Each row records:

- strategy version and rule/artifact fingerprints
- bar timestamp and committed-at timestamp
- source-backed BTCUSD and ETHUSD closes
- observed transition action and price for each sleeve
- prospective position state for each sleeve
- per-sleeve and portfolio strategy NAV
- per-sleeve and portfolio benchmark NAV
- modeled cost and funding increments
- closed-trade increment
- a deterministic row hash chained to the previous row

Rows use `INSERT ... ON CONFLICT DO NOTHING`. An existing row must byte-match
the recomputed snapshot or the writer fails closed. Updates and deletes are
rejected by a database trigger.

## Predeclared observation gate

Status remains exactly `collecting-evidence` until every minimum is true:

- at least 365 calendar days since the first snapshot
- at least 365 consecutive daily snapshots
- at least 12 prospectively closed sleeve trades across BTCUSD and ETHUSD
- zero unresolved cadence gaps
- every stored row passes rule fingerprint, source, finite-value, and hash-chain
  integrity checks

The gate is based on time, sample size, and integrity—not return.

## Performance gate after the minimum

Passing the observation minimum is necessary but not sufficient. The candidate
is `eligible-for-review` only when all prospective modeled-cost conditions are
also true:

- strategy net return is positive
- active return versus the benchmark is positive
- strategy maximum drawdown is no worse than the benchmark
- strategy Calmar is at least the benchmark Calmar

If the observation minimum is complete and any performance condition fails,
status is `failed-gate`. Neither state promotes the strategy automatically.
Promotion to `current` requires a separate owner decision and code/config
change after reviewing the frozen evidence.

## Public surface

`/track-record/alpha` must show the status, gate progress, start boundary,
current positions, modeled strategy and benchmark NAV, active return, drawdown,
Calmar, closed trades, integrity state, recent append-only rows, raw JSON link,
and frozen fingerprints. Empty evidence renders as an em dash, never `+0%`.

The page must link to both the immutable observed archive at `/track-record` and
the retrospective modeled studies at `/track-record/study`. Neither existing
surface is deleted or relabeled as this prospective ledger.

## Out of scope

- D1 rule or parameter changes
- new strategy search or optimization
- historical position or NAV backfill
- deletion or rewriting of the losing observed archive
- broker execution or broker-return claims
- signal broadcast eligibility
- portfolio allocation outside the frozen research ledger
- automatic promotion
