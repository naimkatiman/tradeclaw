# Experiment — TradeClaw Strategy Audit paid pilot

## Definition

| Field | Value |
|---|---|
| Experiment name | TradeClaw Strategy Audit paid pilot |
| Lane | trading |
| Repo | naimkatiman/tradeclaw |
| Owner | naimkatiman |
| Feature flag (if any) | none |
| Start date | 2026-07-04 |
| Stop date (hard stop — decide even if inconclusive) | 2026-07-18 |

## Hypothesis

If we sell fixed-price historical strategy-audit reports (5 pilot slots at $79–$199), then retail strategy owners will pay for them without live execution existing, because the audit's value is in the historical evidence and written verdict, not in automated trade placement.

Offer research and pricing rationale: see `docs/tradeclaw-strategy-audit-patch/docs/MONETIZATION_STRATEGY_AUDIT.md` (not restated here).

## Metrics

- Primary metric (one only): paid pilots (count of pilot slots paid for within the window)
- Pass threshold (exact number): 3 paid
- Guardrail metric (what must NOT get worse): human production time per report stays under 45 minutes
- Segment (who is measured): pilot customers who pay for a slot between start and stop date (max 5 slots)

## Result

<!-- TODO:
Required Data:
- Observed primary metric: Count of paid pilot slots.
  Verification arithmetic: Sum of payments received / price per slot ($79-$199) = total paid.
- Guardrail status: Human production time per report.
  Verification arithmetic: Total human production time / total reports generated = average time (must be < 45 minutes).
Examples & Narrative:
- E.g., "Observed primary metric: 4 paid slots ($556 total revenue). Guardrail status: 35 minutes average production time."
-->

- Observed primary metric:
- Guardrail status:
- Evidence links (dashboards, exports, screenshots):

## Decision

One of: **ship** / **iterate** / **kill**. State the decision and the single next action.
