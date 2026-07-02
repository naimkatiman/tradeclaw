# TradeClaw monetization implementation

## Decision

Build and sell **TradeClaw Strategy Audits** first.

The offer is a fixed-scope historical evidence report generated from the existing TradeClaw Backtest Lab. Browser automation runs the matrix, captures evidence, and creates a reviewable report. The service does not connect to a brokerage account or place trades.

This is materially faster to monetize than building another dashboard because TradeClaw already has:

- a Backtest Lab and strategy presets;
- cost/slippage-aware research work and an experiment registry in recent commits;
- a hosted product, Stripe subscription plumbing, Telegram delivery, APIs, MCP, and a public audience;
- a broad UI that can be automated with Playwright and recovered with OpenAI computer use.

## Included

- `packages/strategy-audit-agent`: runnable browser automation package.
- `docs/MONETIZATION_STRATEGY_AUDIT.md`: research, offer, launch, validation, review, learning, and iteration plan.
- deterministic browser runner with visual computer-use fallback;
- domain/path safety guards and prompt-injection stopping;
- bounded test matrix to discourage brute-force overfitting;
- screenshot/raw-text evidence;
- deterministic Markdown report and optional AI review;
- unit tests and a no-network fixture validation path.

## Apply to the repository

From a clean TradeClaw checkout:

```bash
unzip tradeclaw-strategy-audit-patch.zip -d /tmp/tradeclaw-audit
cp -R /tmp/tradeclaw-audit/packages/strategy-audit-agent ./packages/
cp /tmp/tradeclaw-audit/docs/MONETIZATION_STRATEGY_AUDIT.md ./docs/
npm install
npx playwright install chromium
npm --workspace @naimkatiman/tradeclaw-strategy-audit test
npm --workspace @naimkatiman/tradeclaw-strategy-audit run validate:fixture
```

The root workspace already includes `packages/*`, so no root workspace edit is required.

## Current validation boundary

The package has syntax, unit, and fixture end-to-end validation. A live browser run against `tradeclaw.win/backtest` must be executed from a networked development machine because this build environment could inspect GitHub and the hosted pages but could not clone or run the repository locally.
