# TradeClaw Source Review Metrics Packet

Date: 2026-07-12 18:10 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent

## Purpose

This packet is now a historical source-review baseline plus an active pointer to the latest recost CLI source/test hardening run. The current run did **not** recompute the full repository metrics packet; it only updated this header/status note so reviewers do not mistake the older 2026-06-22 branch posture below for the active checkout. Current active evidence lives in `docs/ai-improvement/implementation-log.md`, `docs/ai-improvement/uncommitted-source-verification-handoff.md`, and `docs/ai-improvement/verification-command-matrix.md`.

Latest source/test lane: detached `HEAD` matched `origin/main` at `6f363cd7`; the pre-tracking source diff was `2 files changed, 38 insertions(+), 4 deletions(-)` across `scripts/research/recost-segment.ts` and `scripts/research/__tests__/recost-segment-cli.test.ts`; focused `pygount` for those two files reported 2 TypeScript files / 338 code / 60 comments. Code changes stayed limited to the local read-only research CLI and its Jest contract.

Historical full-packet note: the branch/dirty-lane posture and broad metrics below remain preserved as history from the previous source-review packet and should be refreshed before being used for a new branch-disposition decision.

## Current git / review posture

| Item | Current evidence |
|---|---|
| Branch | `fix/track-record-compliance-copy` |
| HEAD | `528cd3c8 fix(pricing): reframe cumulative-PnL stat as historical, add forecast disclaimer` |
| Current branch upstream | `origin/fix/track-record-compliance-copy` |
| Ahead / behind vs upstream | `0 / 0` |
| Local `main` | `da2afa06 [origin/main: ahead 1] test(web): add middleware matcher characterization test + docs` |
| Merge base with `origin/main` | `004190974821f789b8b56979680de03fd77ebcad` |
| Remote changed paths since merge base | `0` |
| HEAD changed paths since merge base | `11` |
| Dirty path count before this checkpoint | `13` paths: 12 tracked modified files plus this untracked metrics artifact |
| Dirty / remote overlap | `0` paths because `origin/main` has no changed paths since the merge base |

### Clean no-temp overlap probe

```text
remote_paths=0
dirty_paths=13
overlap_paths=0
```

The dirty-path count already includes this untracked metrics artifact. No temporary inventory files were left behind.

### Dirty path set at start of this checkpoint

```text
CONTRIBUTING.md
README.md
STATE.yaml
apps/web/app/api/signals/__tests__/route.test.ts
apps/web/public/readme-banner.svg
docker-entrypoint.sh
docs/QUICKSTART.md
docs/ai-improvement/README.md
docs/ai-improvement/implementation-log.md
docs/ai-improvement/source-review-metrics.md
docs/ai-improvement/uncommitted-source-verification-handoff.md
docs/ai-improvement/verification-command-matrix.md
package.json
```

## Committed local branch lane since merge base

`git diff --name-status --no-renames "$BASE"..HEAD`:

```text
A	apps/web/__tests__/middleware.test.ts
M	apps/web/app/pricing/page.tsx
M	apps/web/app/track-record/TrackRecordClient.tsx
A	docs/ai-improvement/README.md
A	docs/ai-improvement/build-typecheck-parity.md
A	docs/ai-improvement/implementation-log.md
A	docs/ai-improvement/middleware-proxy-migration-note.md
A	docs/ai-improvement/uncommitted-source-verification-handoff.md
A	docs/ai-improvement/verification-command-matrix.md
A	docs/self-host-smoke-checklist.md
A	docs/signal-data-lineage.md
```

Shortstat: `11 files changed, 2530 insertions(+), 9 deletions(-)`.

Latest commit stat:

```text
528cd3c8 fix(pricing): reframe cumulative-PnL stat as historical, add forecast disclaimer
apps/web/app/pricing/page.tsx | 5 ++++-
1 file changed, 4 insertions(+), 1 deletion(-)
```

Review implication: the branch is now remote-aligned with `origin/fix/track-record-compliance-copy`, but it still diverges from `origin/main`. Decide whether this feature branch should become a PR/merge, be amended/squashed, be cherry-picked, or be reset before accepting more dirty lanes.

## Dirty working-tree churn by review lane

The shortstats below are the pre-checkpoint split from before this run's AI tracking updates. Non-AI lane sizes are still useful review aids, but rerun the matrix after any keep/revert/commit decision because `STATE.yaml` and AI tracking docs change during these cron checkpoints.

### Public/operator docs + tooling contract lane

Shortstat: `5 files changed, 178 insertions(+), 144 deletions(-)`.

```text
CONTRIBUTING.md
README.md
docker-entrypoint.sh
docs/QUICKSTART.md
package.json
```

Review implication: contributor setup, root command guidance, self-host setup/help copy, and one root package-script alias are one docs/tooling review lane. No dependency or lockfile mutation is present.

### Test/static/state lane

Pre-checkpoint shortstat: `3 files changed, 309 insertions(+), 6 deletions(-)`.

```text
STATE.yaml
apps/web/app/api/signals/__tests__/route.test.ts
apps/web/public/readme-banner.svg
```

Review implication: route test expansion, SVG duplicate-attribute cleanup, and project-local `STATE.yaml` bookkeeping should be reviewed separately from public/operator docs. `STATE.yaml` is also a project-local tracking surface and will keep changing when Zaky checkpoints are refreshed.

### AI tracking/status lane

Pre-checkpoint tracked shortstat, excluding this metrics file's later refresh: `4 files changed, 1,392 insertions(+), 76 deletions(-)`.

```text
docs/ai-improvement/README.md
docs/ai-improvement/implementation-log.md
docs/ai-improvement/uncommitted-source-verification-handoff.md
docs/ai-improvement/verification-command-matrix.md
```

This packet remains a fifth AI tracking/status artifact. These documents should be reviewed together with the branch posture so they do not undercount or misclassify the dirty tree.

## Source/test/config pygount scope

Command used:

```bash
uvx --from pygount pygount --format=summary \
  --folders-to-skip='.git,node_modules,venv,.venv,__pycache__,.cache,dist,build,.next,.tox,.eggs,*.egg-info,coverage,docs,data,public' \
  apps packages scripts docker-compose.yml Dockerfile docker-entrypoint.sh package.json
```

Summary from this source/test/config scope:

| Language | Files | Code | Comment |
|---|---:|---:|---:|
| TSX | 501 | 73,962 | 3,527 |
| TypeScript | 723 | 62,469 | 10,427 |
| Python | 8 | 1,757 | 389 |
| JavaScript+Genshi Text | 17 | 1,608 | 171 |
| JSON | 34 | 1,301 | 0 |
| Transact-SQL | 54 | 896 | 519 |
| JavaScript | 21 | 731 | 184 |
| Bash | 8 | 500 | 125 |
| CSS+Lasso | 2 | 500 | 37 |
| YAML | 3 | 265 | 16 |
| HTML | 2 | 97 | 0 |
| Docker | 1 | 27 | 12 |
| Markdown | 24 | 0 | 674 |
| Other / unknown / generated / duplicate / binary | 21 | 0 | 4 |
| **Sum** | **1,419** | **144,113** | **16,085** |

This scope intentionally excludes dependency/build output, docs, data, and public static assets so Markdown tracking churn and generated assets do not distort source-size metrics.

## Verification snapshot for this checkpoint

Commands run from `C:/Ai/tradeclaw` before updating the tracking artifacts:

```text
git fetch --prune
→ exit 0

branch/upstream probe
→ current branch: fix/track-record-compliance-copy
→ HEAD: 528cd3c8 fix(pricing): reframe cumulative-PnL stat as historical, add forecast disclaimer
→ upstream: origin/fix/track-record-compliance-copy
→ ahead/behind vs upstream: 0 / 0
→ local main: da2afa06 [origin/main: ahead 1]
→ merge-base with origin/main: 004190974821f789b8b56979680de03fd77ebcad
→ remote_paths=0; dirty_paths=13; overlap_paths=0

npm run lint --workspace=apps/web -- app/api/signals/__tests__/route.test.ts __tests__/middleware.test.ts
→ exit 0; targeted ESLint printed no warnings.

npm run typecheck:web
→ exit 0; ran `npm run build:signals && tsc --noEmit --project apps/web/tsconfig.json`.

npx jest --runTestsByPath apps/web/app/api/signals/__tests__/route.test.ts apps/web/__tests__/middleware.test.ts --runInBand --forceExit
→ exit 0; 2 suites passed, 22 tests passed in 1.76s; Jest still prints the known force-exit/open-handle notice.

npm run build --workspace=apps/web
→ exit 0; Next.js 16.2.6 compiled successfully in 14.4s and generated 332/332 static pages in 5.4s.
→ known warnings remained: workspace-root inference from multiple lockfiles, middleware-to-proxy convention warning, unexpected NFT trace from `apps/web/next.config.ts` import path, `url.parse()` deprecation notices, and edge runtime disabling static generation on affected pages.
→ build still reports `Skipping validation of types`; `npm run typecheck:web` above is the separate web TypeScript contract.

sh -n docker-entrypoint.sh
→ exit 0

sh docker-entrypoint.sh --help + marker/package probe
→ `DATABASE_URL`, `Docker Compose recommended`, and `docs/self-host-smoke-checklist.md` markers were present.
→ package_json_parse_ok
→ temp verification script removed successfully.
```

## Anti-scope

This checkpoint does not approve or perform:

- source edits, runtime behavior changes, test changes, dependency changes, lockfile changes, broad formatting, commits, pushes, rebases, resets, branch renames, or deploys;
- trading/business-rule changes, stronger public performance claims, tier/auth/billing/payment changes, DB/schema migrations, data mutations, broker execution changes, production env var changes, secret/credential changes, Docker Compose topology changes, cron behavior changes, deploy target changes, or provider calls;
- accepting the current branch or dirty working tree as merge-ready solely because targeted checks pass.

## Recommended review sequence

1. Decide the remote-aligned feature branch posture for `fix/track-record-compliance-copy` at `528cd3c8`: PR/merge, amend, squash, cherry-pick, or reset.
2. Decide the local `main` / `da2afa06` posture separately so branch and local-main histories stop drifting.
3. Review the public trust/legal copy now committed on the branch: `apps/web/app/track-record/TrackRecordClient.tsx` and `apps/web/app/pricing/page.tsx`.
4. Split the public/operator docs + tooling lane (`CONTRIBUTING.md`, `README.md`, `docs/QUICKSTART.md`, `docker-entrypoint.sh`, `package.json`) into keep/revert/commit decisions.
5. Split the test/static/state lane (`apps/web/app/api/signals/__tests__/route.test.ts`, `apps/web/public/readme-banner.svg`, `STATE.yaml`) into keep/revert/commit decisions.
6. Keep AI tracking/status docs, this metrics packet, implementation log, and central board consistent with whichever branch/diff posture is selected.
7. Rerun `docs/ai-improvement/verification-command-matrix.md` after the tree is intentionally arranged.
8. Only after stabilization, continue a separate approved/safe increment such as a single build-warning or middleware/proxy migration step.
