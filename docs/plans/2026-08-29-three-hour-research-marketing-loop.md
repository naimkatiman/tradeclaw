# Three-Hour Research and Marketing Loop

Date: 2026-08-29

Task: TC-256

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
does not invent historical receipt coverage. TC-256 and TC-260 remain absent
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

For the next catalog cycle, prefer a rule with fewer than daily position
transitions, an immutable or append-stable source subset, a primary rule that
does not require vendor code, and published gross headroom materially above the
full frozen friction model. A positive full-history curve is not a selection
advantage after TC-258 or TC-259; chronological fold stability and an untouched
same-window benchmark are mandatory screens.

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
