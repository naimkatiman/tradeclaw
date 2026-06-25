# TradeClaw Strategy Audit Agent

A service-first monetization layer for TradeClaw. It turns the existing Backtest Lab into a paid, reproducible strategy-audit deliverable.

The agent uses:

- Playwright first for cheap, deterministic browser automation.
- OpenAI computer use only as a visual fallback when selectors or layout change.
- A strict domain/path allowlist. It never logs in, purchases, connects a broker, connects a wallet, or places a trade.
- Markdown and JSON evidence outputs suitable for manual review before delivery.

## Install in the TradeClaw monorepo

Copy `packages/strategy-audit-agent` into the repository, then run from the repo root:

```bash
npm install
npx playwright install chromium
npm --workspace @naimkatiman/tradeclaw-strategy-audit test
npm --workspace @naimkatiman/tradeclaw-strategy-audit run validate:fixture
```

For ChatGPT/OpenAI computer fallback:

```bash
export OPENAI_API_KEY="..."
export OPENAI_COMPUTER_MODEL="gpt-5.5"
```

Do not put API keys in request files or browser storage.

## Run a paid pilot

```bash
npm --workspace @naimkatiman/tradeclaw-strategy-audit run audit -- \
  --request ./packages/strategy-audit-agent/examples/audit-request.json \
  --out ./audit-output/pilot-001 \
  --ai-summary
```

Use `--headful` during the first pilots so a human can monitor failures. Use `--dry-run` before every new matrix.

## Output

```text
audit-output/pilot-001/
├── request.normalized.json
├── results.json
├── report.md
└── artifacts/
    ├── <run>.png
    └── <run>.txt
```

The report deliberately uses conservative screening language. It does not authorize live execution and does not claim future profitability.

## Operating boundary

This package is for historical analysis only. Keep brokerage credentials, order entry, deposits, withdrawals, subscriptions, and checkout outside the agent. A human must review every customer report during the validation phase.
