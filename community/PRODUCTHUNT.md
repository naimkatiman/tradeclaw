# TradeClaw Product Hunt Launch Kit

This file contains publishable copy. Re-check every linked surface immediately before launch.

## Approved Claim Boundary

- TradeClaw source code is MIT licensed.
- Self-hosting requires infrastructure and may require paid market-data, messaging, model, or broker providers.
- The engine publishes rule-scored signal candidates. A score is not a probability of profit.
- Historical statistics cover counted 24-hour outcomes resolved from OHLCV data. They are not broker fills or portfolio returns.
- Simulated, gate-blocked, unresolved, and force-expired placeholder rows are excluded from counted results.
- Broker execution is not a universal product capability. Do not imply that a candidate was executed unless a broker fill proves it.
- Do not promise setup times, uptime, profitability, user counts, or provider availability.

## Listing Copy

### Tagline

```text
Audit and self-host rule-scored trading research
```

### Short Description

```text
TradeClaw is an MIT-licensed, self-hostable platform for generating and auditing rule-scored trading candidates across configured data providers. It publishes methodology and counted OHLCV-resolved outcomes; it does not claim broker execution or portfolio profit.
```

### Full Description

```markdown
**TradeClaw** is an open-source platform for inspecting how trading candidates are generated and evaluated.

What the repository includes:

- rule-based indicator and multi-timeframe analysis
- a signal-candidate API and dashboard
- persisted signal history with explicit data provenance
- counted 24-hour OHLCV outcome studies with exclusions disclosed
- alert adapters and self-hosting configuration
- Docker Compose configuration for operators who meet the documented prerequisites

The source is MIT licensed. Running it is not necessarily cost-free: hosting, market data, messaging, model APIs, and broker services may charge separately.

TradeClaw does not promise profitability. A rule score is not a calibrated probability, OHLCV studies are not broker fills, and the repository does not provide universal live trade execution.

Project site: https://tradeclaw.win
Source: https://github.com/naimkatiman/tradeclaw
```

## Gallery Checklist

Only capture a feature after verifying the displayed state and provenance.

1. Signal-candidate dashboard with its source/status labels visible.
2. Signal detail showing rule score and methodology, not a profit probability.
3. Counted outcome page showing sample size, window, exclusions, and data source.
4. Docker Compose documentation, including prerequisites and provider costs.
5. Alert configuration with secrets removed and delivery status stated accurately.
6. Architecture diagram separating data, analysis, outcome resolution, alerts, and optional execution adapters.

Never use synthetic fixtures in a gallery without a prominent `ILLUSTRATIVE` label. Never title an OHLCV study "portfolio performance."

## First Comment

```markdown
Hi Product Hunt, I am Naim, the maker of TradeClaw.

I built TradeClaw so the rules behind a trading candidate can be inspected instead of hidden behind a score. The source is MIT licensed and can be self-hosted, subject to your own infrastructure and provider requirements.

The system records candidates and evaluates eligible rows against later OHLCV data. Those counted outcomes are research measurements, not broker fills, and they omit simulated, blocked, unresolved, and force-expired placeholder rows. TradeClaw does not claim that following a candidate produces portfolio profit.

I would value feedback on the methodology, provenance labels, and self-hosting documentation. The repository is here:
https://github.com/naimkatiman/tradeclaw
```

## Questions And Answers

**Is it free?**

The repository source is MIT licensed. Infrastructure, data providers, messaging providers, model APIs, and brokers can have separate costs and terms.

**How quickly can I deploy it?**

Setup time varies with the host, credentials, provider availability, and operator experience. Follow the prerequisites and verify the deployment before relying on it.

**Are the signals profitable?**

TradeClaw does not make that claim. Published statistics describe eligible OHLCV-resolved signal outcomes for a stated window and sample. They do not include broker fills, all trading costs, position sizing, or portfolio equity.

**Does it execute trades?**

Do not describe execution as universal. Confirm the exact adapter and its fill records. Candidate generation and alert delivery are not execution.

**Is the local npm demo live market data?**

No. `tradeclaw-demo` is an explicitly synthetic UI and transport fixture.

## Launch Verification

- [ ] Re-run build, tests, and Docker health checks.
- [ ] Confirm the project site and repository URLs resolve.
- [ ] Confirm every screenshot shows current data status and methodology.
- [ ] Confirm no sample card is labeled live or real.
- [ ] Confirm no static performance number is copied into launch text.
- [ ] Confirm provider prerequisites, terms, and possible costs are disclosed.
- [ ] Confirm optional execution adapters are described by their implemented state.
