# Strategy Audit — pilot operations pack

Operational reference for running the TradeClaw Strategy Audit paid pilot. This file links to existing assets; it does not duplicate them.

## Existing assets (canonical, do not fork)

- Sample report (what the customer receives): [`packages/strategy-audit-agent/examples/sample-report.md`](../../packages/strategy-audit-agent/examples/sample-report.md)
- Intake shape (machine-readable audit request): [`packages/strategy-audit-agent/examples/audit-request.json`](../../packages/strategy-audit-agent/examples/audit-request.json)
- Offer research and pricing rationale: [`docs/tradeclaw-strategy-audit-patch/docs/MONETIZATION_STRATEGY_AUDIT.md`](../tradeclaw-strategy-audit-patch/docs/MONETIZATION_STRATEGY_AUDIT.md)
- Experiment record (pass/fail criteria, dates): [`.experiments/2026-07-04-strategy-audit-pilot.md`](../../.experiments/2026-07-04-strategy-audit-pilot.md)

## Intake checklist

Do not start an audit until the customer has supplied all of the following:

- [ ] Written strategy rules — entry, exit, and position-sizing rules in plain language. "I buy dips" is not enough; rules must be precise enough to backtest.
- [ ] Market and timeframe — which instrument(s) and which candle timeframe the strategy trades (e.g. BTC/USD on 4h).
- [ ] Assumptions — starting capital, fee/slippage assumptions if the customer has them, and any constraints (long-only, max concurrent positions, session hours).
- [ ] The date range they care about, or explicit agreement to the default lookback used in the sample report.

Anything missing: ask once, in one message, before doing any work. The intake maps onto the fields in `audit-request.json` above.

## Delivery message template

Plain text, sent with the finished report:

```
Hi <name>,

Your TradeClaw Strategy Audit is attached.

It covers: <strategy name> on <market/timeframe>, tested over <date range>,
under the assumptions you provided (<capital / fees / constraints>).

How to read it: start with the verdict section, then the trade-by-trade
table if you want to dig into specific entries and exits.

Important: this audit is a historical analysis only. It is not financial
advice, and past performance does not guarantee or predict future results.
No live trading was performed, and nothing in the report is a recommendation
to trade.

If any rule in the report does not match what you meant, reply within 7 days
and I will re-run that part once at no charge.

Thanks,
<sender>
```

## Public-repo rule

No prospect names, no contact info, no lead lists, and no per-customer revenue detail in this directory or anywhere else in this repo. Aggregate pilot outcomes belong in the experiment record only.
