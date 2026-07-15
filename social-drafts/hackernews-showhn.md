# Show HN: TradeClaw - auditable, self-hosted trading research

I built TradeClaw to make signal-candidate rules and historical denominators inspectable.

Repository: https://github.com/naimkatiman/tradeclaw

The TypeScript/Next.js monorepo includes:

- rule-scored multi-asset candidates from configured OHLCV providers
- PostgreSQL-backed candidate history and provenance
- canonical counted 24-hour OHLCV outcome studies
- alert adapters and Docker Compose configuration

The wording is intentional: a candidate is not an order, a rule score is not a profit probability, and an OHLCV-resolved outcome is not a broker fill or portfolio return. Simulated, blocked, unresolved, and force-expired placeholder rows are excluded from counted results.

The source is MIT licensed. Hosting and data, messaging, model, or broker providers may have separate costs. Setup time depends on the environment and credentials.

`tradeclaw-demo` is a synthetic local UI/SSE fixture, not a market-data demo.

I would value feedback on the data-provenance model, canonical denominator, and self-hosting documentation.
