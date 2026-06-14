# Honesty Contract — public measurement surfaces

Phase 6a standard. Every public surface that renders a performance number must satisfy ALL of the following. A surface passes only when every rendered number satisfies 1–7.

1. **Provenance label.** Each number is one of: `live-measured`, `synthetic`, `illustrative`. The label is visible without hover, at skim distance — adjacent to the value, not only in a section heading or page footer.

2. **Sample size + window.** Every win-rate / return / Sharpe / accuracy figure shows N (resolved signals) and the date range it covers. A 5-signal Sharpe must not look identical to a 500-signal one.

3. **No fabricated curve.** No simulated or hand-authored equity curve, monthly heatmap, or axis is presented as if it were real measured performance. Illustrative charts are watermarked.

4. **Win-rate context.** A win-rate is shown alongside its break-even win-rate; "above / below break-even" is explicit. Loss% is computed from `losses / resolved`, never as a `100 − winRate` residual that hides pending/expired rows.

5. **Cost honesty.** Returns are net of the stated round-trip cost (currently 2bps); the cost is disclosed near the number.

6. **Claim backing.** Any headline word like "verified" maps to a named recorded source that INCLUDES losses and no-edge periods. If the data cannot back the word, the word is softened to what the data supports (Phase 6 decision 4) — never the reverse. Outcomes resolved against an external price source are described as "resolved against <provider> OHLCV", not "verified".

7. **Fallback labeling.** Synthetic-fallback or estimated data (shown when an upstream API fails, or when an indicator is algorithmically derived rather than measured) is visibly marked "simulated / estimated — not measured". Real-but-thin data (e.g. 1–19 resolved signals) is labeled "insufficient live data (N=<n>)", NOT mislabeled as simulated.

## Cross-surface consistency

Two surfaces that present the same metric for the same window (e.g. the track-record page body, its OG social card, and its embed) must compute that metric the same way — same resolved-signal filter, same denominator. They must never show different numbers under the same claim.

## Source of findings

`docs/plans/2026-06-13-phase6a-audit-findings.md` — the 151-item audit this contract remediates.
