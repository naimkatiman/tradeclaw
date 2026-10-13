<div align="center">

<img src="docs/assets/logo.svg" alt="TradeClaw logo" width="72" height="72" />

# TradeClaw

**Open-source trading research. Our average modeled trade lost after costs.**

[![Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=flat-square&color=10b981)](https://github.com/naimkatiman/tradeclaw/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Live](https://img.shields.io/badge/Live-tradeclaw.win-10b981?style=flat-square)](https://tradeclaw.win)

[Track Record](https://tradeclaw.win/track-record) · [Research](https://tradeclaw.win/research) · [Methodology](https://tradeclaw.win/methodology) · [Open Data](https://tradeclaw.win/open-data) · [Live App](https://tradeclaw.win/dashboard) · [API](https://tradeclaw.win/api-docs)

Read this in other languages: [日本語](README.ja.md) · [한국어](README.ko.md) · [中文](README.zh.md) · [more](LANGUAGES.md)

<br />

<img src="docs/assets/hero-evidence-field.jpg" alt="TradeClaw evidence instruments in a dark laboratory" width="100%" />

<br />

[Watch the 18s reel (mp4)](docs/assets/demo.mp4)

</div>

---

TradeClaw is a self-hostable research terminal for BUY/SELL signals, an inspectable PostgreSQL ledger, and the public record of what survived testing. It is MIT-licensed. Hosted access at [tradeclaw.win](https://tradeclaw.win) is free. Paid signal subscriptions are not for sale.

The live engine still emits signals. The public claim is the cost-adjusted result, not a promise that those signals are an edge.

## Published finding

Fetched `2026-08-22` from [`/api/signals/equity?summaryOnly=1&scope=pro`](https://tradeclaw.win/api/signals/equity?summaryOnly=1&scope=pro). This is a hypothetical 1%-risk sequential simulation on OHLCV-resolved sized signals after modeled fee and slippage. It is not a broker-fill or customer-portfolio ledger.

| Measure | Value |
|---|---|
| Eligible sized signals | 4,708 |
| Gross expectancy | 0.00R / trade |
| Modeled round-trip cost | 0.564R / trade (~0.183% of size) |
| Net expectancy | −0.56R / trade |
| Counted resolved win rate | 36.3% |
| Sequential 1%-risk path | −100% modeled equity, 100% modeled drawdown |

R is result divided by the planned stop distance. [Methodology](https://tradeclaw.win/methodology) defines which rows count, which rows are sized, and which costs are modeled.

The [observed track record](https://tradeclaw.win/track-record) is count-first: source-backed wins, losses, exclusions, and unsized price moves. Position sizing, drawdown, and sequential equity live on the separate [modeled study](https://tradeclaw.win/track-record/study).

That finding on the live homepage — one dot per OHLCV-resolved sized signal, after modeled costs:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/hero-light.png" />
  <img src="docs/assets/hero-dark.png" alt="tradeclaw.win homepage: the cost-aware signal field after modeled costs, most resolved trades below zero" width="100%" />
</picture>

## What this is

- A Next.js + PostgreSQL monorepo you can inspect or self-host
- A public signal ledger with CSV/JSON export
- A research archive of pre-registered tests, including killed strategies
- Optional paper/testnet execution that stays fail-closed unless you turn it on

## What this is not

- Not financial advice
- Not a broker, wallet, or customer account ledger
- Not a live profitability claim
- Not an active paid Pro/Elite funnel. `/pricing` redirects to the track record.

<p align="center">
  <img src="docs/assets/instrument-gate.jpg" alt="Research gate instrument" width="49%" />
  <img src="docs/assets/instrument-claw.jpg" alt="Claw-ring candlestick instrument" width="49%" />
</p>

## Current access

| Surface | Behavior |
|---|---|
| Public dashboard, track record, research, methodology, open data | Read-only, no auth |
| Signal history | Current rolling archive, capped at 10,000 source rows; CSV and provenance endpoints are public |
| Costs | Static fee + slippage by asset class; funding and actual broker charges are excluded from the per-trade charge |
| Portfolio curve | Hypothetical sequential 1%-risk simulation |
| Broadcast / Telegram entry-like alerts | Fail-closed unless the cost-adjusted evidence gate is ready |
| Automated execution | Disabled by default (`EXECUTION_MODE=disabled`) |
| Billing | Paused. Stripe env vars remain in the repo as leftover wiring, not a live offer |

## Research status

The [research page](https://tradeclaw.win/research) is the verdict board. TradeClaw also publishes a pinned 61-candidate intake from [paperswithbacktest/awesome-systematic-trading](https://github.com/paperswithbacktest/awesome-systematic-trading) in original source order. It is a discovery queue, not a leaderboard: upstream figures are gross discovery metadata, not TradeClaw performance.

The catalog currently separates 47 untouched discoveries, 10 source-audit no-go records (not local performance failures), 1 QA-only INCONCLUSIVE replication, and 3 cost- or stability-failed replications. This catalog grants neither publication nor trading authority.

Separately, the retained TradeClaw study ledger records headline tests of single-asset hourly timing, HMM regime routing, daily momentum, funding carry, and cross-sectional momentum that failed their registered gates or were too thin to deploy.

Two narrow later results exist and stay labeled:

1. **Sandbox slow-gate** (BTC/ETH D1, modeled spot costs): a 50/50 vol-targeted overlay did not beat buy-and-hold CAGR. It improved modeled Calmar and max drawdown. HMM sizing did not.
2. **Pre-registered D1 slow-gate** (BTC/ETH D1, modeled crypto-perpetual costs): the frozen historical sample passed its build gate. Owner approval on 2026-08-09 opened a fail-closed simulated tracking lane. That lane is collecting evidence. It is not promoted, does not place broker orders, and does not bypass the broadcast gate.

Do not read a historical simulation PASS as live performance.

## Quick start

### Hosted

Open [tradeclaw.win](https://tradeclaw.win). No account required for the public research surfaces.

### Docker Compose (self-host)

```bash
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
cp .env.example .env
```

Set at least `DB_PASSWORD`, `USER_SESSION_SECRET`, `ADMIN_SECRET`, and `AUTH_SECRET` in `.env`. Then:

```bash
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000). The stack ships its own PostgreSQL (`db`) service, and the `app` entrypoint applies everything in `apps/web/migrations/` before the server starts — idempotent, tracked in a `_migrations` table, and refusing to boot if any migration fails.

Then run the [self-host smoke checklist](docs/self-host-smoke-checklist.md).

A single-container preview image also exists:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@host:5432/tradeclaw \
  ghcr.io/naimkatiman/tradeclaw:latest
```

The app throws on first database access if `DATABASE_URL` is missing.

### Image tags

| Tag | Tracks |
| --- | --- |
| `ghcr.io/naimkatiman/tradeclaw:latest` | Latest `main` |
| `ghcr.io/naimkatiman/tradeclaw:X.Y.Z` | A release tag — the workflow strips the `v`, so tag `v0.4.0` publishes `:0.4.0` |
| `ghcr.io/naimkatiman/tradeclaw:sha-<git-sha>` | A specific commit |

### Local development

Node.js 20+, npm, and PostgreSQL:

```bash
npm install
cp .env.example .env
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Next.js app on :3000 |
| `npm run build` | Build `packages/signals`, `packages/trading-agents`, then the web app |
| `npm run typecheck:web` | Shared signals build + web `tsc` |
| `npm run lint` | Lint `apps/web` |
| `npm test` | Jest |
| `npm run test:e2e` | Playwright (`apps/web`) |
| `npm run verify:research-review` | Verify every pinned manual-review evidence manifest |
| `npm run validate:research-review-handoff -- --file <path>` | Validate one completed handoff and its current evidence without recording it |
| `npm run prepare:research-owner-decision-request -- --file <completed-handoff.yaml>` | Revalidate a ready handoff and print its fingerprinted owner-request artifact without recording a decision |
| `npm run prepare:research-owner-decision-template -- --file <completed-handoff.yaml>` | Print a ready-only blank owner-decision YAML form without writing a file |
| `npm run validate:research-owner-decision -- --handoff <completed-handoff.yaml> --decision <completed-owner-decision.yaml>` | Validate a manual owner response against the exact handoff, request, and current evidence without persisting it |
| `npm run prepare:research-publication-action-request -- --handoff <completed-handoff.yaml> --decision <completed-owner-decision.yaml>` | Print an approval-only, exact-draft request for a separate publication action without performing it |
| `npm run verify:research-publication-action-request -- --artifact <publication-action-request.json> --handoff <completed-handoff.yaml> --decision <completed-owner-decision.yaml>` | Verify exact saved artifact bytes against the handoff, decision, and current evidence without performing an action |
| `npm run ws:dev` | Websocket server |
| `npm run agent` | Trading-agent CLI |

`next build` is not a typecheck. See [`docs/ai-improvement/build-typecheck-parity.md`](docs/ai-improvement/build-typecheck-parity.md).

## How it works

```
API request → getTrackedSignals() → generateSignalsFromTA()
  → ta-engine.ts (RSI, MACD, EMA, BB, Stoch, ADX, Volume)
  → recordSignalsAsync() → signal_history
  → /track-record  and  /track-record/study
```

Signals are generated as a side effect of API requests unless you schedule `/api/cron/*`. The TA engine runs inside the Next.js process.

Market data prefers `MARKET_DATA_HUB_URL` when set. Otherwise the app uses free public fallbacks (Binance for crypto, Stooq for some FX/metals). Non-empty OHLCV is cached in-process for 5 minutes whichever provider served it; only empty results are left uncached, so a recovered provider is retried on the next request.

Optional execution, disabled by default:

```
Gate-approved signal → apps/web/lib/execution/executor.ts
  → Binance USDT-perp, only when `EXECUTION_MODE=testnet|live` (default `disabled`)
  → RoboForex R StocksTrader remains an unimplemented interface scaffold
  → 90-day cost-adjusted evidence gate, fail-closed
```

## Strategy presets

`SIGNAL_ENGINE_PRESET` defaults to `hmm-top3`. In live signal generation that value is currently a label. The live engine still scores with the `classic` profile. Per-preset live generation is not wired. Compare presets in the [backtest UI](https://tradeclaw.win/backtest).

| Preset | Logic |
|--------|-------|
| `classic` | RSI + MACD + EMA scoring, no regime filter |
| `regime-aware` | Classic filtered by HMM regime (backtest path) |
| `hmm-top3` | Regime-aware, top 3 by confidence |
| `vwap-ema-bb` | Mean-reversion at BB extremes with VWAP + EMA |
| `full-risk` | HMM top-3 with risk-weighted allocation |

## API

No key required on the public research routes. Cache on your side; responses already carry short `s-maxage` headers. Public users can start with the human-readable research evidence brief at `/api/research/intake/brief.md`; it states the evaluated-versus-not-evaluated denominator, adverse results, pinned source, preregistration workflow, and safe next resource without candidate bodies. It does not recommend a strategy, publish or broadcast a claim, or trade. Its next human click is the human-readable examined-candidate index at `/api/research/intake/evidence/index.md`, which preserves every compact decision in pinned source order. Each row opens a human-readable exact record at `/api/research/intake/{candidateId}/brief.md` first and retains the machine JSON separately, completing the human-readable index to human-readable exact record journey. The exact brief does not rank or recommend a strategy, publish a claim, or trade. Machine clients can start with the compact overview, then use the JSON evidence index to choose exact candidate detail without downloading complete nested evidence. Every public candidate's links advertise both exact formats. Every compact row includes one evidence-derived decision summary explaining why that candidate stopped or failed and its canonical evidence date; the same decision summary continues into exact candidate detail. Authenticated admins can start with the human-readable research cycle brief at `/api/admin/research-intake/brief.md`; it combines the exact do-now action, current and next receipt timing, next review packet, evidence counts, and safety boundary from one server observation. When a UTC receipt window is empty, `startHere` opens the protected human-readable manual screening queue at `/api/admin/research-intake/screening/index.md`, which keeps all 47 untouched candidates in pinned source order with one cost-first checklist. It does not create or authorize a receipt, does not select a candidate, calculate returns, publish, post, or trade. The next evidence-browsing step is the protected human-readable examined-candidate index at `/api/admin/research-intake/evidence/index.md`, where all 14 audited or replicated candidates remain in pinned source order with the frozen next action and only the receipt and review state visible at that observation. Each row opens the protected human-readable exact candidate at `/api/admin/research-intake/{candidateId}/brief.md`; protected machine JSON stays separate at `/api/admin/research-intake/evidence/index`. This completes the admin cycle brief to index to exact candidate journey without creating or authorizing a receipt, completing a review, publishing, posting, or trading. The same state remains machine-readable at `/api/admin/research-intake/overview`; every protected resource map advertises both human briefs. That one-observation exact record joins the decision, frozen next action, visible receipt, review packet, repository files, and previous/next navigation; it does not create a receipt, change research state, complete a review, publish, post, or trade. The oldest visible human-review handoff is named as `nextReview`, which links directly to one exact protected review item instead of requiring a complete-queue search. The protected human-readable marketing-review queue at `/api/admin/research-intake/review/index.md` completes the cycle brief to review queue to exact review packet journey: it shows all observation-visible drafts oldest-first with summaries and evidence state, while full draft copy stays in each exact packet. Exact packets link back to the queue and to their visible previous and next packets. This queue does not create or authorize a receipt, complete a review, record an owner decision, publish, post, or trade. Its navigation is visible-only and grants no approval; the compact cycle brief and queue contain no draft body. When manual review is the highest-priority action, every protected JSON projection's `startHere` opens that handoff's concise Markdown review packet directly. Both audiences remain read-only, and protected routes stay outside the public OpenAPI surface.

Research JSON is self-describing: use `resources` for sibling endpoints, each public record's `links.candidateBrief` for exact human-readable detail, and `links.candidate` for exact JSON. Protected candidate links similarly expose `adminCandidateBrief`, `adminCandidate`, `publicCandidateBrief`, and `publicCandidate` without changing authority. `startHere` gives one server-authored evidence-first target; `targetResource` names it and `targetIsCurrentResource` prevents clients from turning an already-open target into a circular next link. It is navigation convenience, not a strategy recommendation, evidence claim, or authority. Every evidence-state summary includes `plainLanguageSummary`, generated from the same classifier counts in `statuses`; it adds convenience copy, not evidence or authority. Each exact protected review includes a structured `reviewProtocol` with stable required-check IDs, plus a `claimVerification` map that links draft numbers to the protected candidate overlay and preregistration while naming the result and artifact files as the sources of truth. Its frozen `evidenceIntegrity` manifest pins the preregistration, result, and artifact by normalized byte count and SHA-256; the same manifest and claim map render in the Markdown packet and blank YAML handoff. From the repository root, `npm run verify:research-review` checks every manifest or `npm run verify:research-review -- --task TC-255` checks one exact review; success proves current repository-byte parity only. After filling a downloaded handoff, `npm run validate:research-review-handoff -- --file <completed-handoff.yaml>` checks its exact immutable binding, reviewer metadata, required-check and claim sets, non-approving outcome, and current repository evidence. Report schema v2 gives one explicit workflow status: `draft-rejected`, `revision-required`, `ready-for-separate-owner-decision`, or `invalid-handoff`. Only a valid ready outcome includes `ownerDecisionRequest`, bound to the completed-file and evidence-manifest hashes with protected packet links. For a transport-ready copy, `npm run prepare:research-owner-decision-request -- --file <completed-handoff.yaml>` revalidates the handoff and evidence, then emits a compact artifact with the canonical request byte count and SHA-256. It writes JSON to stdout and does not write files. The artifact does not record an owner decision, approve publication, post, or grant publication or trading authority.

Every protected research JSON projection also carries the same observation-safe `researchLoop.receiptGate`. `open-for-one-receipt` means the current UTC window has one empty manual slot, `wait-for-next-window` names the exact later window after the current slot is used, and `blocked-by-conflict` promises no future slot until the ledger is reconciled. The gate does not create or authorize a receipt, select a candidate, publish, or trade; its controls keep manual screening required and automatic receipt creation false.

For the separate manual owner step, `npm run prepare:research-owner-decision-template -- --file <completed-handoff.yaml>` prints a deterministic blank YAML form only when that handoff and current evidence still produce the ready request. The owner fills `owner`, `decidedAt`, `outcome`, and `notes`, then an admin runs `npm run validate:research-owner-decision -- --handoff <completed-handoff.yaml> --decision <completed-owner-decision.yaml>`. Validation re-derives the exact request and fingerprint, rejects immutable drift, and recognizes only decline, revision, or approval for a separate publication action. The owner name is structural metadata: identity is not authenticated and the form is not a cryptographic signature. The validator does not persist or record an owner decision, does not publish or post, and grants no publication or trading authority. The handoff's `downloadHref` avoids manual transcription, and its only review outcomes are `reject-draft`, `needs-revision`, or `ready-for-separate-owner-decision`. Human review remains required and does not approve publication. The API records no completion or decision, and the template, download, validators, request, form, and artifacts grant no publication or trading authority.

Only after that validator accepts the explicit approval outcome may an admin run `npm run prepare:research-publication-action-request -- --handoff <completed-handoff.yaml> --decision <completed-owner-decision.yaml>`. The command revalidates current evidence and emits one deterministic JSON artifact binding the exact reviewed draft, completed handoff, submitted decision, evidence manifest, and prior request fingerprint. Declines, revisions, invalid forms, tampering, and evidence drift produce no request. Owner identity remains unauthenticated structural metadata. The command writes only to stdout: it does not select a publication target, does not enqueue the social queue, and does not publish or post. The outbound step remains a separately authorized publication action, and the artifact grants no publication or trading authority.

Before any separately authorized publication action, run `npm run verify:research-publication-action-request -- --artifact <publication-action-request.json> --handoff <completed-handoff.yaml> --decision <completed-owner-decision.yaml>`. The verifier compares the exact saved artifact bytes with a freshly re-derived canonical artifact under current repository evidence; changed content, unknown fields, whitespace, inputs, or evidence fail closed. It writes only a report to stdout. It does not authenticate owner identity, does not authorize publication, does not perform publication, and does not enqueue the social queue. Verification grants no publication or trading authority.

```bash
# Human-readable adverse-inclusive research orientation
curl https://tradeclaw.win/api/research/intake/brief.md

# Human-readable source-ordered index of every examined candidate
curl https://tradeclaw.win/api/research/intake/evidence/index.md

# One exact candidate in human-readable form; replace the canonical ID as needed
curl https://tradeclaw.win/api/research/intake/a-risk-based-approach-to-tactical-asset-allocation/brief.md

# Compact evidence overview and safe next resource, with no candidate records
curl https://tradeclaw.win/api/research/intake/overview

# Compact evidence index with exact candidate-detail links and no nested research bodies
curl https://tradeclaw.win/api/research/intake/evidence/index

# All 61 pinned discovery candidates, with completed TradeClaw evidence overlays
curl https://tradeclaw.win/api/research/intake

# All examined candidates, including failures, no-go audits, and the inconclusive run
curl https://tradeclaw.win/api/research/intake/evidence

# Complete examined-candidate evidence spreadsheet: failures, no-go audits, and the inconclusive run
curl https://tradeclaw.win/api/research/intake/evidence.csv -o tradeclaw-systematic-research-evidence-2026-08-30.csv

# One canonical candidate, with its complete safe evidence overlay
curl https://tradeclaw.win/api/research/intake/a-risk-based-approach-to-tactical-asset-allocation

# 25-column spreadsheet index; canonical JSON above retains complete nested evidence
curl https://tradeclaw.win/api/research/intake.csv -o tradeclaw-systematic-research-intake-2026-08-29.csv

# Cost-adjusted sequential summary (the table above)
curl 'https://tradeclaw.win/api/signals/equity?summaryOnly=1&scope=pro'

# Per-trade gross R, modeled cost R, asset class
curl https://tradeclaw.win/api/research/cost-field

# Counted signal history
curl 'https://tradeclaw.win/api/signals/history?limit=50'
```

Explore the [research verdict board](https://tradeclaw.win/research), download from [open data](https://tradeclaw.win/open-data), or inspect the [API docs](https://tradeclaw.win/api-docs).

## Notifications

Entry-like fan-out stays suppressed unless the cost-adjusted evidence gate is ready. Telegram, email, and Discord can carry gate-approved entry-like signals plus outcome and risk-exit notices once that gate is ready.

- Telegram: `TELEGRAM_BOT_TOKEN` plus channel IDs
- Email: `EMAIL_PROVIDER` = `resend` | `sendgrid` | `smtp`
- Discord webhook: `DISCORD_WEBHOOK_URL`
- Generic webhooks: [`docs/webhooks.md`](docs/webhooks.md)

Compose maps documented `.env` keys through an allowlist. `NEXT_PUBLIC_*` values are baked into the client bundle and need an image rebuild.

## Environment

| Variable | Required | Notes |
|----------|:--------:|-------|
| `DATABASE_URL` / `DB_PASSWORD` | Yes | PostgreSQL. Compose builds `DATABASE_URL` from `DB_*` |
| `USER_SESSION_SECRET` | Yes | Session / OAuth / link-token signing |
| `ADMIN_SECRET` | Yes | Admin login |
| `AUTH_SECRET` | Yes | Websocket server auth |
| `CRON_SECRET` | For cron | `/api/cron/*` |
| `MARKET_DATA_HUB_URL` | No | Hosted hub; self-hosters can leave blank |
| `SIGNAL_ENGINE_PRESET` | No | Default `hmm-top3` (label; live path is still `classic`) |
| `EXECUTION_MODE` | No | Default `disabled` |
| `STRIPE_*` | No | Leftover. Not an active checkout |

See `.env.example` for the full list.

## Repository layout

```
apps/web                 Next.js app, API routes, migrations
apps/ws-server           Websocket server
apps/mobile              Expo client
packages/signals         Shared signal types
packages/agent           Trading-agent CLI
packages/strategies      Backtest comparison; also supplies the cost model and preset registry the live path uses
docs/research            Pre-registered experiments and JSON artifacts
scripts/research         Read-only recost / regime / slow-gate helpers
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [good first issues](https://github.com/naimkatiman/tradeclaw/labels/good%20first%20issue).

Before a PR: `npm install`, then `npm run lint`, `npm test`, and for web changes `npm run test:e2e`.

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<a href="https://github.com/naimkatiman/tradeclaw/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=naimkatiman/tradeclaw" alt="Contributors" />
</a>
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://allcontributors.org/) specification.

---

<div align="center">
<sub>MIT License · <a href="https://tradeclaw.win">tradeclaw.win</a> · not financial advice</sub>
</div>
