# TradeClaw Trust Loop System

This system exists to make autonomous improvement real, not theatrical.

## Principle
TradeClaw's AI improvement loop is driven by trust, not just capability.

A trust battery represents how much autonomy the system has earned through recent performance.
The battery is specific to this human-AI relationship and this workstream.

## Trust battery behavior
- Range: 0 to 100
- Starts conservative
- Increases when execution is clean, judgment is strong, context is retained, problems are surfaced early, and work creates real leverage
- Decreases when instructions are misunderstood, failures are silent, humans need to repeat themselves, context goes stale, or changes are noisy without value

## Autonomy bands
- 0 to 24: low trust, propose and wait
- 25 to 49: bounded autonomy, small verified changes only
- 50 to 74: normal autonomy, execute one high-leverage verified improvement at a time
- 75 to 100: high autonomy, wider freedom inside the mission with strong self-checks

## Nightly structure
Two separate jobs must run in sequence.

### 1. Judge
A separate judge agent reviews the last 24 hours critically.
It does not optimize prompts or workflows.
It only scores, explains, and recommends.

### 2. Reflection
A separate reflection agent reads the judge output and updates:
- trust battery state
- learned rules
- safeguards
- operating context for the next daily improvement run

## Structural bias
The loop should reward structural improvements over vanity activity.
Examples:
- signal filtering
- calibration
- better proof and measurement
- clearer conversion funnel
- cleaner delivery and alert UX
- safer operating rules

It should not reward busywork, inflated claims, or cosmetic churn.
