# D1 Slow-Gate Activation Record (2026-08-09)

Status: OWNER APPROVED on 2026-08-09 after the pre-registered walk-forward
returned PASS and PR #203's implementation checks passed.

## Activation boundary

- `D1_SLOW_GATE_MODE=active` promotes only new, newest-closed-bar BTCUSD and
  ETHUSD D1 transitions from `d1-slow-gate-paper` simulated rows to real
  `d1-slow-gate` tracked rows.
- Unset, `paper`, differently-cased, or unknown values remain paper. There is
  no permissive fallback to active.
- Activation never backfills historical rows. The historical study artifact
  remains an immutable simulated result and continues to say that activation
  was not approved at the time of that run.
- The existing data-integrity, closed-bar staleness, cost/risk, and rolling
  frequency ceilings remain unchanged and fail closed.
- Active D1 rows do not receive an implicit broadcast approval. Their
  `broadcast_blocked` decision remains unset, which excludes them from the
  broadcast scope unless a separate real gate decision is added later.
- Broker order execution, exchange credentials, leverage, and allocation are
  unchanged and remain disabled. This is signal-lane activation only.

## Evidence carried forward

The frozen artifact is
`docs/research/experiments/d1-slow-gate-walk-forward-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json`
(SHA-256 `1a6b28e47f218fafd5134cb257e06f966f881bc5154be92135c06867f5026e90`).
It passed all registered conditions: positive net return after modeled costs,
Calmar at least buy-and-hold in 3/4 folds, frequency ceilings held, and all
reconciliation/lookahead/cadence QA gates passed.

## Rollback

Set `D1_SLOW_GATE_MODE=paper` and redeploy. Previously written real rows remain
historical records; the mode change only affects future newest-bar transitions.

## Production activation check

The first authenticated active tick on 2026-08-09 reported `mode=active` but
failed closed for both symbols because production had a recent D1 prefix rather
than the frozen 2017-09-01 boundary. No D1 row was emitted. The repair keeps the
exact frozen-start validator and append-only store: when that prefix is absent,
the lane paginates closed Binance D1 bars from the registered boundary, inserts
with `ON CONFLICT DO NOTHING`, reloads the database stream, and only then runs
the unchanged integrity and strategy gates.
