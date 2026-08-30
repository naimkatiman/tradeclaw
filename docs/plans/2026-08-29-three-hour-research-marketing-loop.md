# Three-Hour Research and Marketing Loop

Date: 2026-08-29

Task: TC-256 through TC-266

Status: active operating contract; local-only until separately authorized

## Objective

Move TradeClaw forward every three hours with one evidence-preserving product or
research increment. A cycle may finish a verified improvement, advance one
candidate through one gated research stage, or close an idea as an evidenced
no-go. It must never manufacture a positive result to satisfy the clock.

The research clock does not authorize a push, merge, deployment, publication,
social post, signal change, allocation, broadcast, broker action, billing
change, or trading activation.

## Inputs

- Pinned discovery catalog:
  `apps/web/data/systematic-research-intake.json`
- Source commit:
  `d9c98521c76662d5eae03ab97a4fc721d010dde3`
- Source README SHA-256:
  `67f4c4963ce10ab5ebdc7a0b1eb578c179cf151e1ddaad990cd428a231b2b29a`
- Local evidence overlay: `apps/web/lib/research-intake.ts`
- Protected admin read model: `GET /api/admin/research-intake`
- Canonical project state: `STATE.yaml`

The 61 upstream rows are discovery metadata only. Their Sharpe ratios,
t-statistics, volatility, and years are upstream gross-of-cost readings. They
are never TradeClaw evidence, default ordering, a candidate score, or a reason
to promote a strategy.

## Protected admin read contract

`GET /api/admin/research-intake` is the non-visual data boundary for the future
intake desk. It authenticates before parsing query parameters, returns no catalog
or validation detail to unauthorized callers, sets `private, no-store` caching,
and exposes no mutation method.

Accepted query parameters are deliberately bounded:

- `q`: trimmed text, at most 120 characters;
- `assetClass`: one exact supported asset class or `all`;
- `stage`: one evidence-ladder stage or `all`;
- `verdict`: `not-tested`, `pass`, `fail`, `inconclusive`, or `all`;
- `sourceAuditDisposition`: `advance`, `hold`, `no-go`, or `all`;
- `page`: a positive integer no greater than 10,000;
- `limit`: a positive integer no greater than 100.

Unknown, duplicated, malformed, or out-of-range inputs fail closed with `400`.
Results always preserve pinned source order; upstream return or Sharpe never
changes ordering. The payload carries both whole-catalog and filtered summaries,
the evidence workflow, source provenance, pagination, and the server-observed
current UTC-aligned `PT3H` research window with its next rollover. That timing
projection is informational and retains explicit false values for publication
and trading authority. Each returned candidate also carries either its
server-authored human-review draft or explicit `null`; clients must not recreate
research claims from raw metrics.

The same payload carries an observation-time-consistent receipt projection:
the latest recorded receipt, every receipt already visible in the current
window, `complete` / `awaiting-receipt` / `conflict` status, one server-owned
next action, and explicit false automatic-candidate, publication, and trading
controls. Future-dated receipts are never exposed by an earlier observation.
Receipt data is filter-independent so pagination cannot hide the operator's
workflow state.

The sibling `marketingReview` projection is also independent of candidate
filters and pagination. It lists every server-authored draft whose evidence was
available at the observation instant, plus the latest handoff and any handoff in
the current UTC window. Each entry says whether it came from a cycle receipt or
the explicit pre-loop TC-255 closure; TC-255 keeps a null cycle ID, so the API
does not invent historical receipt coverage. TC-256, TC-260, TC-261, TC-262, TC-263, and TC-264 remain absent
because their source-audit no-go receipts deliberately produced no drafts. Summary counts separate
pre-loop and receipt-backed evidence and keep publication-approved drafts at
zero. `review-ready` means only that factual copy exists for a human to inspect;
automatic publication and posting remain false.

`GET /api/admin/research-intake/review` is the compact structured sibling for an
admin client that needs the complete review queue without fetching the paginated
catalog or parsing CSV. It joins each visible handoff to a safe candidate
summary and its exact cycle receipt, or explicit `null` receipt for TC-255's
pre-loop closure. It also carries the current receipt window, canonical detail
paths, and repeated false publication, posting, trading, and external-action
controls. `GET /api/admin/research-intake/review.csv` remains the spreadsheet
download of the same visible handoff set. Both routes authenticate before
observing the clock, ignore filters, stay private/no-store, and expose no
mutation or outbound action.

After an admin fills the exact review's downloaded `handoff.yaml`, the local
repository command
`npm run validate:research-review-handoff -- --file <completed-handoff.yaml>`
fails closed on a stale or altered template, malformed reviewer metadata,
missing or duplicate check and claim IDs, an invented outcome, changed authority
fields, or repository evidence drift. Its machine-readable success proves only
that the completed file matches the current observation-bound handoff contract
and pinned evidence bytes. It does not record review completion, make an owner
decision, approve publication, post externally, or authorize trading.

Validator report schema v2 turns that result into one explicit local next step:
`draft-rejected`, `revision-required`, `ready-for-separate-owner-decision`, or
`invalid-handoff`. Only the valid ready state includes an
`ownerDecisionRequest`, bound to the completed handoff SHA-256, evidence
manifest, reviewer, review time, outcome, notes, and protected review links.
The request does not record an owner decision and grants no publication,
posting, promotion, signal, allocation, broadcast, broker, execution, or
trading authority.

For a compact transport artifact, run
`npm run prepare:research-owner-decision-request -- --file <completed-handoff.yaml>`.
It revalidates the exact handoff and current evidence, succeeds only for the
ready outcome, and includes the canonical request byte count and SHA-256. It
writes JSON to stdout and does not write files. The artifact does not record an owner decision, approve publication, post, or grant publication or trading authority.

To give the owner one fixed response shape, run
`npm run prepare:research-owner-decision-template -- --file <completed-handoff.yaml>`.
It revalidates the ready handoff, evidence manifest, and canonical request, then
prints a deterministic blank YAML form to stdout without writing a file. Only
`owner`, `decidedAt`, `outcome`, and `notes` are editable. The allowed outcomes
are decline publication, request draft revision, or approve the draft only for
a separate publication action.

After the owner completes a separate copy, run
`npm run validate:research-owner-decision -- --handoff <completed-handoff.yaml> --decision <completed-owner-decision.yaml>`.
The validator re-derives the exact request from the completed handoff and
current evidence, rejects immutable or timestamp drift, and emits one explicit
next state. The owner label is structural metadata. Owner identity is not authenticated and the form is not a cryptographic signature. The command does
not persist or record an owner decision, does not publish or perform any
publication action, and grants no publication, posting, signal, execution, or
trading authority. Even a valid approval outcome only identifies a draft for a
separate, separately authorized publication action.

To bind that approved manual result to the content that was actually reviewed,
run
`npm run prepare:research-publication-action-request -- --handoff <completed-handoff.yaml> --decision <completed-owner-decision.yaml>`.
The command revalidates the owner decision and current evidence, recovers the
exact reviewed draft from the handoff's observation-bound protected projection,
and emits one deterministic JSON artifact on stdout. It fingerprints the draft
and complete request and binds the completed handoff, submitted decision,
evidence manifest, and prior owner-request fingerprint. Decline, revision,
invalid, tampered, stale-evidence, or unavailable-projection inputs produce no
request. The owner label remains structural metadata; identity is not
authenticated and no cryptographic signature is verified. The command does not
select a publication target, does not enqueue the social queue, and does not
publish or post. A separately authorized publication action is still required,
and the artifact grants no publication, posting, execution, or trading authority.

Before a separately authorized publication action consumes a saved request, run
`npm run verify:research-publication-action-request -- --artifact <publication-action-request.json> --handoff <completed-handoff.yaml> --decision <completed-owner-decision.yaml>`.
The verifier re-derives the canonical request from the exact handoff, decision,
reviewed draft, and current evidence, then requires the exact saved artifact bytes
to match, including whitespace and final LF. It emits a read-only report to stdout.
It does not authenticate owner identity, does not authorize publication, does not
perform publication, and does not enqueue the social queue. Verification grants
no publication, posting, execution, or trading authority.

The retained history contains one known contract violation: TC-256 and TC-257
both use `2026-08-29T06:00:00.000Z/PT3H`. Neither receipt may be deleted,
renamed, or silently selected as canonical after the fact. The ledger labels
that window `conflict`, allowlists only this historical collision, and treats
any additional duplicate window or third receipt in that window as invalid.
Every future window still permits at most one receipt. Once an empty window
opens, its next action changes from the prior receipt's boundary wait to a safe
instruction to screen one candidate without automatic selection or authority.

## Cycle contract

Three-hour windows are aligned to UTC (`00:00`, `03:00`, `06:00`, and so on),
which maps to `08:00`, `11:00`, `14:00`, and so on in Malaysia. Each window has
one stable identifier and one receipt in `STATE.yaml` when meaningful progress
occurs.

Programmatic string inputs must identify an instant with `Z` or an explicit
signed `HH:MM` offset. Date-only and timezone-less strings fail closed so a
developer laptop and a deployment host cannot assign the same text to different
UTC receipt windows.

| Time | Work | Required output |
|---|---|---|
| 00:00-00:15 | Reconcile state | Exact worktree, base SHA, dirty-file boundary, previous receipt, and one next action |
| 00:15-00:45 | Source and rights audit | Primary source, rule text, ambiguity list, data/license needs, and expected turnover; otherwise an explicit no-go |
| 00:45-01:15 | Cost and data feasibility | Round-trip fee/slippage/funding model, minimum gross edge or break-even cost, required history, and falsification market |
| 01:15-01:35 | Freeze before results | Preregistration with rule, fills, costs, datasets/hashes, benchmarks, folds, holdout, metrics, and pass gates |
| 01:35-02:20 | Implement or reproduce | Smallest deterministic implementation or one product improvement that advances the evidence workflow |
| 02:20-02:45 | Verify | Focused tests, adjacent research tests, deterministic replay where applicable, typecheck/lint, and proportionate build checks |
| 02:45-02:55 | Record evidence | Artifact/result document, exact hashes, limitations, verdict, `STATE.yaml`, and next action |
| 02:55-03:00 | Prepare the handoff | One factual marketing review draft or a no-draft receipt; never send or publish automatically |

If a replication cannot honestly finish inside one window, the cycle closes
with a tested intermediate artifact and an explicit carry-forward stage. The
next cycle resumes from that artifact; it does not reopen frozen choices or
peek at results to tune the protocol.

## Research gates

### 1. Discovered

The pinned row exists. Nothing else is known. Upstream performance stays
neutral and gross-labeled.

### 2. Source-audited

Advance only when all are recorded:

- accessible primary paper or article;
- exact public rule and timing;
- every contradictory or underspecified statement;
- data fields, history, survivorship, and licensing constraints;
- likely turnover and an initial cost-risk assessment.

Reject or hold when the rule cannot be reconstructed without inventing choices.
A source-audit no-go remains `not-tested`: it records why TradeClaw should not
spend a replication cycle, but it must never be relabeled as a TradeClaw FAIL.

### 3. Preregistered

Freeze before reading any local return or verdict:

- universe and external falsification market;
- signal, entry, exit, sizing, and missing-data behavior;
- fee, slippage, funding, borrowing, and rebalance costs;
- source files and SHA-256 hashes;
- comparison benchmarks with identical applicable costs;
- folds, holdout boundary, metrics, and minimum sample sizes;
- pass, fail, inconclusive, prospective-review, and activation boundaries;
- parameter-search prohibition or an explicitly nested training protocol.

### 4. Replicated

Require deterministic output, a separate replay, focused tests, the adjacent
research suite, an honest verdict, limitations, and retained adverse results.
Post-result source corrections may add labeled ungated sensitivities, but they
cannot silently change preregistered gates.

### 5. Prospective

Only an eligible result may be considered for a separately frozen immutable
ledger. Historical PASS is not live performance. Eligibility is not promotion,
and promotion is not activation. Each is a separate owner decision.

## Candidate choice

Do not choose the next candidate by upstream Sharpe or table position. The PM
selects from source-audited candidates using this order:

1. rule can be reconstructed without hidden vendor code;
2. data is legally accessible and can be independently hashed;
3. expected turnover has room above TradeClaw's full friction model;
4. external falsification market and holdout are possible;
5. implementation is bounded enough to verify without weakening other gates.

TC-255 is the first completed overlay. It remains a failed replication and must
not be retuned or promoted. Its useful finding is the cost screen: average BTC
gross edge was about `0.0451%` per trade against roughly `0.40%` round-trip
fee and slippage, with a break-even fee-plus-slippage ceiling of about `0.0186%`
per side.

The first source-audit no-go is the catalog's price-overreaction candidate. The
primary paper's own spread-aware contrarian rule loses, its positive continuation
rule is statistically indistinguishable from random, and material sign, fill,
cost, and data-provenance choices remain unspecified. Its receipt is retained at
`docs/research/2026-08-29-price-overreactions-source-audit.md`; no TradeClaw
backtest or marketing draft was created.

TC-257 then advanced the lower-turnover end-of-month Treasury rule, but its
frozen run stopped at standing source QA. One of 27,453 curve-reconstruction
checks exceeded the preregistered tolerance, so its artifact remains
INCONCLUSIVE with no return observations or performance gate evaluation.

TC-258 applied the cost screen before implementation to two distinct lanes in
one primary paper. The daily `21:00-23:00 UTC` Bitcoin lane was rejected without
a local return search: the paper's 33% annualized gross result supports only
`0.039031%` break-even cost per side, below the fee alone. The event-driven
`MAX10 OR MIN10` composite had enough published headroom to preregister. Its
independent Gemini replication retained large full-history gross and positive
full-history net results, but failed honestly on post-paper evidence: BTC and
ETH holdouts were `-65.66%` and `-67.28%` net, both had only 2/4 positive folds,
and neither holdout cleared the `0.10%` fee alone. The artifact and all 15
source-defined controls remain shelved; selecting a better-looking MAX-only
lookback after the result is prohibited.

TC-259 then tested the lower-transition U.S. term-spread MA40 lane on a hashed
current-vintage Federal Reserve curve snapshot. All standing QA and full-window
gates passed, but only 1/4 paper folds beat both frozen benchmarks and the
42-month holdout returned `+10.35%` after modeled costs versus `+15.62%` for the
identically costed one-month sleeve. Its `+3,917.50%` full-window headline and
the stronger prior-only ambiguity control cannot override those failures. The
canonical result remains FAIL and is not observed security performance.

TC-260 then selected the older weekly Expected-Shortfall allocation idea because
it offered the shortlist's only meaningful post-publication horizon. The exact
specification stopped at source audit: the paper delegates its Filtered
Bootstrap parameters, depends on proprietary and author-stitched histories,
fills a close-derived signal at that same close, and substitutes fixed annual
expense ratios for turnover-linked costs. The retained record is `not-tested`,
has no preregistration, return, result artifact, or marketing draft, and is not a
TradeClaw performance failure. Its receipt is
`docs/research/2026-08-29-risk-based-tactical-allocation-source-audit.md`.

TC-261 then selected Hubrich's 2017 weekly cryptocurrency factor study because
the primary paper specifies the factor family, 11-coin universe, seven weekly
schedules, turnover, and approximate costs, and leaves a long possible
post-publication period. The exact replay stopped at source audit. The original
Coin Metrics vintage is not supplied; the pinned current Community archive has
`PriceUSD` for only 10 of 11 assets, and its PIVX file cannot reconstruct either
the paper sample or a later holdout. The strongest reported factor portfolios
also require shorts that the paper says were not scalable. Dropping PIVX, using
modern perpetual futures, or retaining only a clipped long-only construction
would be a new hypothesis. TC-261 therefore remains `not-tested`, with no
preregistration, return, result artifact, or marketing draft. Its receipt is
`docs/research/2026-08-29-crypto-factor-investing-source-audit.md`.

TC-262 then selected the primary paper's semiannual long-only Most Diversified
Portfolio for source feasibility rather than its upstream clone result. The
mathematical objective is clear, but the empirical study requires point-in-time
MSCI World membership and region weights, Bloomberg total returns and market
capitalizations, MSCI FX, an undisclosed plesiochronous correlation estimator,
and an undisclosed turnover penalty. The clone also says quarterly over
`1990-2026`, while the paper rebalances at the end of May and November over
`1999-2010`. Exact replay therefore stopped at source audit. TC-262 remains
`not-tested`, with no preregistration, return, result artifact, or marketing
draft. Its receipt is
`docs/research/2026-08-30-most-diversified-portfolio-source-audit.md`.

TC-263 selected the paper's long-only two-cryptocurrency grid because its small
universe, accessible primary source, and long post-2019 window appeared more
bounded than the remaining real-time macro and factor-allocation finalists. The
full source audit found no executable grid-level, sizing, reset, accounting, or
limit-order fill formulas; no named venue, immutable event data, application
code, order ledger, or complete friction model; and user-adjustable settings in
the reported account observations. The discovery clone also says weekly over
`1992-2026`, while the paper describes standing limit orders and illustrates only
LTC/BTC over `2018-2019`. Exact replay therefore stopped before preregistration
or returns. TC-263 remains `not-tested`, with no result artifact or marketing
draft. Its receipt is
`docs/research/2026-08-30-cryptocurrency-as-money-source-audit.md`.

TC-264 selected the paper's rolling-versus-expanding commodity-ratio study for
source feasibility rather than its upstream figures. The daily signal, seven-
year window, `1.25` z-threshold, confirmation filter, 15-trading-day hold, and
flat cost sensitivity are understandable at a research-concept level. Exact
replay nevertheless stopped at source audit: the paper does not pin its
Investing.com files, futures contracts or rolls, denominator vehicles, causal
fills, overlapping-entry accounting, or realized friction ledger. It also says
parameters were selected on the full 2000-2026 sample before presenting the
2016-2026 period as out of sample, and its February 2026 publication leaves no
meaningful prospective sample for a roughly two-trade-per-year primary rule.
The discovery clone compounds the mismatch by running `1990-2026` and showing a
current short SPX position. TC-264 therefore remains `not-tested`, with no
preregistration, return, result artifact, or marketing draft. Its receipt is
`docs/research/2026-08-30-rolling-vs-expanding-mean-reversion-source-audit.md`.

TC-265 selected *Good Carry, Bad Carry* because its monthly G-10 rule and
paper-level bid/ask treatment made source and cost feasibility auditable before
returns. The paper ranks mid-quote one-month forward differentials and computes
returns from forward and next-month spot quote sides, using Barclays Bank data
through Datastream. Neither the authors nor the publisher supplies those
immutable vendor bytes or a public replication package. The visible Papers With
Backtest clone names only `Forex Daily Price`, spans `1990-2026`, and hides its
implementation, so it cannot reconstruct the paper's signal or fills. The paper
also acknowledges look-back bias in the fixed headline subsets chosen after the
dynamic exclusion exercise. Exact replay therefore stopped before
preregistration or returns. TC-265 remains `not-tested`, with no result artifact
or marketing draft. Its receipt is
`docs/research/2026-08-30-good-carry-bad-carry-source-audit.md`.

TC-266 selected *Risk Parity Portfolios with Risk Factors* through a
receipt-neutral, cost-first feasibility screen. The primary source is a
methodology illustrated by three different applications: six proprietary MSCI
USA style indexes, a Dow Jones Credit Suisse hedge-fund-index PCA allocation,
and a Datastream macro strategic-allocation example. It does not specify one
executable 27-stock strategy. The optimizer may be non-unique, a matching
long-only solution is not guaranteed, and the paper supplies neither the
proprietary input bytes nor a complete friction ledger, chronological folds, or
untouched holdout. The Papers With Backtest clone instead spans `1990-2026`,
shows 27 long US stocks, and hides its pseudocode. Exact replay therefore
stopped before preregistration or returns. TC-266 remains `not-tested`, with no
result artifact or marketing draft. Its receipt is
`docs/research/2026-08-30-risk-factor-parity-source-audit.md`.

Do not open another catalog receipt before the exact
`2026-08-30T12:00:00.000Z` boundary. The TC-266 no-go does not authorize a
public-data proxy backtest, marketing claim, publication, signal, allocation,
broadcast, broker action, or execution change.

## Marketing handoff

Marketing begins only after the research receipt exists. The allowed artifact
is a **human-review draft**, never an outbound action.

Every draft must state:

- what was tested;
- observed, modeled, or upstream provenance;
- gross result and full modeled cost beside the net result;
- sample/window and the relevant gate outcome;
- the limitation or reason the result does not authorize trading;
- a repository-relative result and artifact path that exists locally.

For failed work, lead with the failure and what was learned. For inconclusive
work, lead with the missing evidence. For a historical PASS, say
`eligible for the next research gate`, never `profitable`, `proven`, `live`, or
`ready to trade`.

Drafts may later be placed in `/admin/social-queue` only through an explicitly
approved integration. Approval in that queue must still not auto-post until a
separate outbound publication action is authorized.

The protected intake API is the canonical discovery surface for those drafts.
An admin does not need to guess a candidate filter or page through all 61 source
rows: the filter-independent `marketingReview.handoffs` list contains the full
review-ready set visible at the server observation time. This is a read-only
handoff, not a review decision, queue mutation, publication approval, or social
post.

## Cycle receipt

Record these fields in `STATE.yaml` after meaningful progress:

```yaml
cycle_id: 2026-08-29T06:00:00.000Z/PT3H
started_at: 2026-08-29T06:00:00.000Z
ends_at: 2026-08-29T09:00:00.000Z
candidate_id: null
stage_before: discovered
stage_after: discovered
outcome: implemented | verified-no-go | carry-forward
changed_files: []
verification: []
evidence_paths: []
marketing_draft: none | human-review-draft-only
external_actions: none
next_action: one exact action
```

`candidate_id` stays null for product-only improvements. A cycle receipt is not
a claim that a full replication finished.

## Stop conditions

Stop the cycle and record the reason when:

- the primary source is inaccessible or materially contradictory;
- data provenance, rights, cadence, or hashes cannot be established;
- break-even costs are already below unavoidable fees and the objective is only
  to prove tradable net edge;
- the worktree overlaps the broad dirty checkout;
- a test, deterministic replay, evidence boundary, or build gate fails;
- the next step requires push, deployment, publication, money movement, billing,
  broker/execution access, or another authority not granted by this contract.

Zaky must be tagged in project reporting if the same blocker prevents further
meaningful progress.
