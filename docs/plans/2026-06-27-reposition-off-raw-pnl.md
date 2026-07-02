# Reposition TradeClaw off raw P&L — scoping (parallel tracks)

Date: 2026-06-27
Status: SCOPING. Decision taken: run two parallel tracks (A education wedge + B
open-source/sponsorware). No paid SKU is built until its gate clears.
Source: multi-agent scoping pass 2026-06-27 (5 angles, adversarially critiqued +
completeness critic). Grounded in [[engine-no-net-edge]].

## Why this exists

The signal engine has no net edge after real cost (net expectancy ~= -0.43R/trade;
every asset-class x band cell net-negative at n>=100; premium is the worst cell;
filtering does not rescue it). The public equity curve now honestly reads -100%
($10k -> $0). Headlining the engine's P&L is a losing game whether the number is
-42% or -100%. The product must make money WITHOUT promising trading profit, and
the honest no-edge finding must stay front-and-center as the brand, not a liability.

## What was killed and why (do not revive without new evidence)

All five "sell a verdict / feed / badge" angles FAILED adversarial critique
(survives=false across the board). Recorded so they are not re-pitched:

| Angle | Score | Fatal reason (code-verified) |
|---|---|---|
| research-education | 54 | Best honesty-fit and only inventory that ships today, but distribution is ~28 GitHub stars + a tiny Telegram channel. Survives ONLY as a cheap content wedge, not yet a business. (-> Track A) |
| transparency-as-product (audit) | 31 | `recost-segment.ts` has no CSV intake and re-prices only TradeClaw's own trades; `strategy-audit-agent` is untracked (tmp/, gitignored) and does ZERO cost-adjustment. The marketed "cost-adjusted verified" product does not exist. Principal-agent dead market: the payer (signal sellers) is who the honest verdict opposes. |
| cost-reality-tool | 28 | Same recost-reuse illusion + falsifiable claims: recost has zero funding logic and structurally needs a stop-loss to compute R — raw broker ledgers carry neither. Ingest IS the product and none exists (8-12 wk, not 4). |
| b2b-honest-infra | 22 | `signal-slice.ts` has no tenant axis; multi-tenancy is a full rewrite. Shared global `signal_history` would commingle customer data with our own honest curve. Recurring revenue creates pressure to re-introduce the forbidden knobs. |
| regime-context-intel | 19 | Public `/api/v1/regime` serves the wrong feature shape, no posterior/calibration; the "odds it flips" claim is a static transition-matrix prior, not a forecast. Zero moat (a 4-indicator HMM is a weekend rebuild). |

Universal killers across all five: no validated buyer, no distribution, and most
"reuse" was net-new engineering misrepresented as already-built.

## Track A — Education "The Cost Wall" (content-led validation wedge, top-of-funnel)

Thesis: "Costs kill retail single-asset timing, reproducibly proven on our own
engine." This is the forbidden-to-rehide finding turned into content; the no-edge
result cannot undermine it.

Steps:
- WEEK 0 (no paid product): ship a free "What We Tested And Killed" page from the
  existing 6b.2 spec (`docs/plans/2026-06-13-phase6-honest-regime-product.md`).
  Link the two FINAL verdict docs, the live -100% equity curve, and the REGISTRY.
  ONE email-capture field (with a consent/legal basis + sender infra — see risks).
- WEEK 0: launch post "We open-sourced proof our own AI trading signals have no
  net edge after real cost" -> HN + r/algotrading + X. PRE-COMMIT a hard go/no-go
  gate BEFORE posting: >=2,000 unique visitors AND >=200 email captures from one
  wave. Miss it -> STOP, build no paid product.
- WEEK 1 (only if gate passes): one-time course + "cost-aware backtest checklist"
  PDF ($49-79) assembled verbatim from the two verdict docs + `stat-hints.ts` +
  the break-even/cost-denominator math from the equity route. Sell via existing
  Stripe Pro self-serve only (Elite/custom checkout is unwired).
- WEEK 2-3 (validated manually FIRST): manual, DM-delivered "Cost Verdict" on a
  trader's own CSV — run recost by hand, deliver the existing report.md+JSON,
  $49-99. Sell 5-10 before writing any parser. Require an SL column or refuse.

Do NOT build the recurring "Research Lab" subscription at launch (no recurring
value in static docs + a wiped curve). Revisit only when a live stream of new
kill-tests exists to subscribe to.

## Track B — Open-source / sponsorware (primary monetization)

Thesis: the honest measurement engine as open developer infrastructure. The buyer
is a developer / self-hoster who wants convenience — NOT a signal seller who wants
to hide a bad number. This sidesteps the principal-agent dead market that killed
every sell-a-verdict angle, has the warmest distribution, and makes "the honest
cost engine is free and open" a feature, not a giveaway.

Already-shipped assets (literally published, not net-new): `@naimkatiman/tradeclaw-js`
(npm SDK), `tradeclaw-mcp` (MCP server), `tradeclaw` (CLI), `tradeclaw-action`
(GitHub Action), `tradeclaw-discord`, `tradeclaw-extension`, `create-tradeclaw`.
`.github/FUNDING.yml` already wires GitHub Sponsors / Ko-fi / Buy-Me-A-Coffee.

Monetization stack (cheapest first):
- WEEK 0 (zero build): make Sponsors/Ko-fi/BMC visible — README "Sponsor/Support"
  section, repo headline = the honest no-edge story, pin the -100% proof as
  exhibit A. Same launch wave as Track A.
- Open-core: honest measurement core stays MIT; sell hosted/managed convenience.
- Paid managed cloud of the recost / regime engines (hosted API, no self-host ops).
- "Honest backtest linter": a CI check (via `tradeclaw-action`) / MCP tool that
  FAILS a build or flags an agent when a strategy's net edge is negative after
  real cost. Developer-workflow product, warm distribution, different channel from
  the consumer funnel.

RECONCILE `alphascreen.io`: `.github/FUNDING.yml` has a custom funding link to this
sibling product that NO proposal mentioned. Decide before any Track B build: is it
the intended commercial home (consolidate there), a conflict, or unrelated? This
gates where paid Track B SKUs should live.

## Shared guardrails (non-negotiable, both tracks)

- HONESTY FIREWALL: external/customer trade data MUST NEVER be written to the
  `signal_history` table that computes the public -100% proof. Any ingest path
  (including the Track A manual Cost Verdict) uses a separate store. This protects
  the one credibility asset everything depends on.
- NO DISHONEST KNOBS: cost model stays non-configurable, sourced only from
  `cost_estimate_pct` (migration 051). No `HARD_R_CAP` raise, no default
  curve-smoothing, no per-customer cost override. No "survived the gate" /
  "deployable" / "funding-adjusted" language anywhere (recost has no funding logic).
- KILL the signal-led homepage framing: `apps/web/app/page.tsx` still leads with
  `LiveHeroSignals` + `ProofHero`. Demote the live feed to a clearly-labelled
  transparency exhibit; make the no-edge finding + methodology the headline.
  Leaving the signal engine as the public face keeps the P&L-claim surface alive
  and contradicts every honest repositioning. Do this FIRST — it protects the
  brand regardless of which track wins.
- Do NOT market `strategy-audit-agent` as built or "cost-adjusted" (untracked,
  does zero cost-adjustment).

## Risks (kept visible)

- TradingRail conflict (operator's other business): TradingRail monetizes the
  affiliate/IB funnel that helps signal sellers convert subscribers. A successful
  education angle that makes "signals are fraud after cost" go viral directly
  damages that revenue line. Decide a stance: wall off, accept, or sequence.
- One-shot launch: the HN/reddit reveal is a spike, not a channel — you can only
  "reveal our engine has no edge" once. Passing the gate validates that the STORY
  spreads, not that there is repeatable $49-course acquisition. Need a follow-on
  acquisition plan.
- Regulatory: even the free page + course publishes analysis adjacent to
  investment decisions. Add "not investment advice / historical, not predictive"
  disclaimers + a jurisdiction posture (FCA financial-promotion, FTC).
- Email capture without a list-use plan / GDPR basis / sender infra wastes the
  only durable output of the validation spike and creates liability.
- External-ledger ingestion (any "audit your own trades" automation) is net-new
  8-12 wk (generic import + per-instrument cost model + UI + a correctness harness
  proving a mis-mapped symbol cannot silently flip a verdict). It is NOT a
  `recost-segment.ts` wrapper. Gate on >=10 paid manual verdicts first.
- Open-source giveaway: confirm exactly what is paid-for (hosting/convenience/CI
  seats) so the core being free is a funnel, not pure giveaway.

## Open questions (decide before heavy build)

1. Does the no-edge launch pull an audience? Unknown and decisive — gates everything.
2. Will any trader pay $49-99 to confirm bad news about their own strategy? Test
   with 5-10 manual Cost Verdicts before building anything automated.
3. Is `alphascreen.io` the intended commercial home, a conflict, or unrelated?
4. Can TradeClaw wall off / exit signal-selling to neutralize the conflict that
   shadows every B2B/audit angle?
5. For Track B, what exactly is the first paid SKU — hosted recost API, managed
   regime, or CI-linter seats?

## Sequencing

- Cross-cutting FIRST (protects the brand either way): implement the honesty
  firewall + demote the signal homepage to a labelled transparency exhibit.
- WEEK 0 (parallel): Track A free "Cost Wall" page + launch post; Track B turn on
  Sponsors/Ko-fi/BMC visibility + repo-headline the honest story (same launch wave).
- WEEK 1+ (gated): A -> one-time course if the gate passes; B -> scope the first
  paid SKU and reconcile `alphascreen.io`.
- Manual before automated everywhere: sell the course and the Cost Verdict by hand
  before writing any parser or paid-tier plumbing.
