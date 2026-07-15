# Honesty Contract — public measurement surfaces

Phase 6a standard. Every public surface that renders a performance number must satisfy all of the following. A surface passes only when every rendered number satisfies 1–8.

1. **Provenance label.** Each number is one of: `recorded-signal`, `OHLCV-resolved`, `modeled`, `synthetic`, or `illustrative`. The label is visible without hover, at skim distance — adjacent to the value, not only in a section heading or page footer. `Recorded` describes a stored signal row; it does not turn an estimated cost into a measured fill.

2. **Sample size + window.** Every win-rate / return / Sharpe / accuracy figure shows N (resolved signals) and the date range it covers. A 5-signal Sharpe must not look identical to a 500-signal one.

3. **No fabricated curve.** No simulated or hand-authored equity curve, monthly heatmap, or axis is presented as measured account performance. A hypothetical path is labeled `sequential simulation` next to its value and states its sizing, ordering, concurrency, margin, funding, and execution limitations. Illustrative charts are watermarked.

4. **Win-rate context.** A win-rate is shown alongside its break-even win-rate; "above / below break-even" is explicit. Loss% is computed from `losses / resolved`, never as a `100 − winRate` residual that hides pending/expired rows.

5. **Cost honesty.** A fee/slippage constant or stored `cost_estimate_pct` is a **modeled cost assumption**, never a recorded execution cost. Cost-adjusted results disclose the per-asset assumptions near the number and state that broker fills, spread, market impact, latency, rebates, funding, and venue basis are not measured. The contract must not hardcode a legacy flat-cost value.

6. **Claim backing.** Any headline word like "verified" maps to a named execution or account source that includes losses and no-edge periods. If the data cannot back the word, the word is softened to what the data supports — never the reverse. Outcomes resolved against an external price source are described as "resolved against <provider> OHLCV", not "verified". They are not broker fills, customer trades, or actual portfolio returns.

7. **Fallback labeling.** Synthetic-fallback or estimated data (shown when an upstream API fails, or when an indicator is algorithmically derived rather than measured) is visibly marked "simulated / estimated — not measured". Recorded-but-thin data (e.g. 1–19 resolved signals) is labeled "insufficient recorded data (N=<n>)", not mislabeled as synthetic or measured execution.

8. **Population scope.** `Full`, `all`, and `complete history` are used only when completeness is technically guaranteed. Otherwise name the population: `eligible recorded signal stream`, `counted OHLCV-resolved rows`, `gate-approved subset since <date>`, or `current archive`. Public copy states material exclusions such as simulated, force-expiry-placeholder, gate-blocked, missing-stop, and pre-migration rows. If nonzero horizon-close rows count, say so rather than calling every `expired` target excluded.

## Cross-surface consistency

Two surfaces that present the same metric for the same window (e.g. the track-record page body, its OG social card, and its embed) must compute that metric the same way — same resolved-signal filter, same denominator. They must never show different numbers under the same claim.

## Source of findings

`docs/plans/2026-06-13-phase6a-audit-findings.md` — the 151-item audit this contract remediates.
