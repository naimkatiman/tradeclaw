# Product Hunt Launch Playbook - TradeClaw

Use the publishable copy in `community/PRODUCTHUNT.md`. This playbook keeps the release process evidence-based.

## Listing

**Product name:** TradeClaw

**Tagline:**

```text
Audit and self-host rule-scored trading research
```

**Short description:**

> TradeClaw is an MIT-licensed, self-hostable platform for generating and auditing rule-scored trading candidates. Its historical statistics are counted OHLCV-resolved outcomes, not broker fills or portfolio returns.

**Links:**

- Project: `https://tradeclaw.win`
- Source: `https://github.com/naimkatiman/tradeclaw`
- Methodology: `https://tradeclaw.win/methodology`

Do not publish a demo or hosted URL until it has been checked during the launch release. Do not promise a fixed deployment time.

## Required Disclosures

Every long-form listing or maker comment must state:

1. MIT applies to repository source, not third-party infrastructure or provider fees.
2. Rule scores are engine scores, not calibrated profit probabilities.
3. Counted historical outcomes use later OHLCV observations and disclosed exclusions.
4. OHLCV outcomes are not broker orders, fills, fees, slippage, or portfolio returns.
5. Candidate generation, alert delivery, paper ledgers, and broker execution are distinct capabilities.

## Gallery

Prepare screenshots from the release candidate, not mockups. Keep provenance labels in frame.

1. Candidate dashboard and data-source state.
2. Candidate detail and rule-score explanation.
3. Counted outcome methodology, window, sample, and exclusions.
4. Self-hosting prerequisites and Docker Compose commands.
5. Alert adapter status with secrets removed.
6. Architecture boundaries, including optional execution adapters.

If a required state is empty or unavailable, show that state honestly. Do not substitute seeded metrics or synthetic candidates.

## Maker Comment

```markdown
Hi Product Hunt, I am Naim, the maker of TradeClaw.

TradeClaw is an MIT-licensed project for inspecting rule-scored trading candidates and their later OHLCV-resolved outcomes. The goal is auditable research, not a promise that a score or candidate will make money.

The public methodology identifies which persisted outcomes count and excludes simulated, gate-blocked, unresolved, and force-expired placeholder rows. Those measurements are not broker fills or portfolio performance.

Self-hosters control their deployment, but hosting and external data, messaging, model, or broker providers may have separate costs and terms. I would especially value review of the methodology and provenance labels.
```

## Pre-Launch Checks

- [ ] `npm run build` passes for the release commit.
- [ ] Focused and full tests pass, or every exception is documented.
- [ ] Docker Compose starts from a clean environment with documented prerequisites.
- [ ] All public APIs fail closed when their source is unavailable.
- [ ] Screenshots contain no synthetic values labeled as live or real.
- [ ] Static copy contains no fixed provider prices, setup times, user counts, or performance rates.
- [ ] The current execution-adapter state matches public copy.
- [ ] Secrets and personal data are absent from assets.

## Response Guide

**How is this different from charting products?**

Describe TradeClaw on its own implemented capabilities. Do not assert competitor limitations or prices without current primary-source evidence.

**Is it free?**

The source is MIT licensed. Operators remain responsible for infrastructure and external-provider costs.

**Are the candidates profitable?**

Do not answer with a static win rate. Link to the current methodology and result surface, explain the sample and exclusions, and state that OHLCV outcomes are not execution or portfolio returns.

**Can it trade for me?**

Explain the exact implemented adapter state. A generated candidate or delivered alert is not a broker fill.

## After Launch

- Archive the exact listing copy and screenshots tied to the release commit.
- Record corrections if any published claim becomes stale.
- Turn feedback into issues without promising delivery dates.
- Report launch metrics only from their authoritative source and with an as-of timestamp.
