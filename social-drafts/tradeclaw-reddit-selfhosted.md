# Reddit Draft - r/selfhosted

## Title

TradeClaw: MIT-licensed, self-hosted trading research with Docker Compose

## Body

TradeClaw is a Next.js/PostgreSQL monorepo for generating and auditing rule-scored trading candidates.

Source: https://github.com/naimkatiman/tradeclaw

Docker Compose configuration is included, but this is not a fixed-time or zero-cost deployment promise. Operators need to review credentials, storage, networking, and configured provider requirements. Hosting, market data, messaging, model APIs, and brokers can have separate costs and terms.

The dashboard distinguishes candidate generation from alert delivery and optional execution adapters. Historical results are counted OHLCV-resolved signal outcomes, not broker fills or portfolio performance.

There is also an `npx tradeclaw-demo` package. It is explicitly a deterministic synthetic UI/transport fixture and does not connect to market data.

Feedback on the Docker prerequisites, backup/restore process, and provider configuration would be useful.
