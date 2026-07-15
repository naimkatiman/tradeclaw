# Building an auditable, self-hosted trading research platform

*Draft for Dev.to, Hashnode, or Medium. Verify code paths and links against the release commit before publishing.*

**Tags:** `opensource` `trading` `nextjs` `typescript` `selfhosted`

## Why I built TradeClaw

Technical indicators are easy to calculate. The harder engineering problem is provenance: which market-data source produced a candidate, which rules contributed to its score, which later observation resolved it, and which rows belong in a historical denominator.

[TradeClaw](https://github.com/naimkatiman/tradeclaw) is an MIT-licensed, self-hostable platform built around those questions. It generates rule-scored signal candidates and persists enough context to audit later OHLCV-based outcome studies.

It is not a promise of profitable trading. A rule score is not a calibrated probability, and a candidate is not a broker order or fill.

## Architecture

The repository is a TypeScript/Next.js monorepo with PostgreSQL-backed history and Docker Compose configuration. Operators configure the data and delivery providers they intend to use.

The source license does not make the whole operation cost-free. Hosting, market-data providers, messaging providers, model APIs, and brokers may impose their own charges and terms.

The main flow is:

```text
configured OHLCV provider
  -> indicator and regime rules
  -> rule-scored candidate
  -> persisted candidate and provenance
  -> later OHLCV outcome resolution
  -> counted research statistics
```

Alert delivery and optional execution adapters are separate from this flow. A delivered message does not prove a trade was placed, and a requested order does not prove a fill.

## Scores are not probabilities

The engine combines technical conditions into a score. Conceptually:

```typescript
type Candidate = {
  direction: 'BUY' | 'SELL';
  ruleScore: number;
  dataQuality: 'real' | 'synthetic' | 'unknown';
  source: string;
};

function publishable(candidate: Candidate) {
  return candidate.dataQuality === 'real' && candidate.ruleScore >= configuredThreshold;
}
```

The exact implementation is in the repository and evolves with the code. The important wording is `ruleScore`: without a calibration study, `80/100` must not be presented as an 80% chance of profit.

## Failing closed on missing data

An earlier design used synthetic candles when providers failed. That made interfaces look available while changing the meaning of the output. Public and broadcast paths now need to reject synthetic data or label a fixture explicitly.

For example:

```typescript
if (candidate.dataQuality !== 'real') {
  return { status: 'unavailable', candidate: null };
}
```

The standalone `tradeclaw-demo` package is intentionally different: it is a deterministic synthetic UI/transport fixture. Its API and interface label that provenance and make no market or performance claim.

## Counting historical outcomes

TradeClaw can compare a persisted candidate with later OHLCV observations. The canonical counted population excludes:

- simulated rows
- gate-blocked rows
- unresolved rows
- force-expired zero-PnL placeholders

That produces a signal-outcome research measure for a stated window and sample. It still does not reproduce broker execution. It omits or may differ from fills, spread, fees, slippage, funding, latency, rejected orders, position sizing, and portfolio equity.

Any published result should therefore identify:

- the as-of time and evaluation window
- the counted sample size
- the OHLCV source and resolution method
- the exclusion rules
- whether modeled costs are included

## What self-hosting means

Docker Compose provides a reproducible configuration, not a universal one-click guarantee. Setup depends on the host, credentials, provider availability, network, and operator experience. The correct workflow is to review prerequisites, start the stack, inspect health checks, and verify data provenance before relying on output.

## What I learned

1. **Unavailable is a valid product state.** An empty, sourced answer is better than an invented fallback.
2. **Names shape claims.** `ruleScore`, `candidate`, and `OHLCV outcome` are more accurate than `confidence`, `trade`, and `portfolio return` when that is what the system actually has.
3. **Denominators need one owner.** Every public metric should use the same canonical counted-outcome predicate.
4. **Execution needs receipts.** Broker order IDs and fills, not UI state, are the evidence for execution.
5. **Licensing and operating cost are different.** MIT source can still depend on paid infrastructure and providers.

## Try the source

```bash
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
```

Then read the current prerequisites and Docker documentation in the repository before configuring providers or starting services.

Project site: [tradeclaw.win](https://tradeclaw.win)

Source: [github.com/naimkatiman/tradeclaw](https://github.com/naimkatiman/tradeclaw)

TradeClaw is research software, not investment advice. Past OHLCV-resolved outcomes do not guarantee future results.
