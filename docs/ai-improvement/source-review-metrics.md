# TradeClaw Source Review Metrics Packet

Date: 2026-08-08 17:54 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent

## Purpose

This packet remains a historical source-review baseline plus an active pointer to the current regime-expectancy `--json` path preflight source gate. The current run did **not** recompute the old 2026-06-22 full historical packet below; it updated this header/status note and focused source/test/config metric table so reviewers do not mistake earlier recost/slow-gate/regime checkpoints for the active checkout. Current active evidence lives in `docs/ai-improvement/implementation-log.md`, `docs/ai-improvement/uncommitted-source-verification-handoff.md`, and `docs/ai-improvement/verification-command-matrix.md`.

Latest source-work gate: Latest Max quota-burst run stayed inside the existing regime-expectancy research lane and hardened the read-only `scripts/research/regime-expectancy-study.ts` CLI artifact boundary. The new `validateJsonOutputPath(...)` preflight now validates `--json` output paths after `--help` and before `connect()`, rejecting missing parent directories, parent-as-file paths, and existing-directory targets before any Postgres credential path or local artifact write. New `scripts/research/__tests__/regime-expectancy-study-cli.test.ts` locks help/no-DB behavior plus invalid/valid local artifact boundaries. Branch `feat/premium-ui-overhaul` is synced with upstream at `f6ddc185`, `origin/main=58eee2b9`, merge-base `524fc44a`, `HEAD...upstream=0/0`, `HEAD...origin/main=37/61`, `origin_main_paths=203`, `local_head_paths=39`, branch path overlap `15`, dirty/`origin-main` overlap `140`, dirty inventory `168` rows (`103` tracked modified + `3` tracked deleted + `62` untracked). Fresh evidence passed: focused regime-expectancy CLI Jest `1` suite / `5` tests / `1.817s`; adjacent regime lane Jest `5` suites / `101` tests / `54.397s`; scoped TypeScript exit `0`; full root Jest `219` passed and `3` skipped suites / `1,868` passed and `26` skipped tests / `1,894` total / `93.517s`; websocket auth Vitest `4/4` / `944ms`; web typecheck exit `0`; lint exit `0` with `23` warnings; root build exit `0` with Next `16.2.6`, compile `14.9s`, and `324/324` static pages; focused two-file pygount `2` files / `297` code / `41` comments; focused source/test/config pygount `1,523` files / `146,396` code / `15,086` comments; dashboard quick-tunnel DNS returned `curl_exit=6`; local Hermes telemetry reported `1,071` sessions / `1,863,642,754` total tokens with provider weekly quota percentage unavailable; independent delegated verifier PASS on live files, focused Jest, scoped TypeScript, and target diff-check.

## Source/test/config pygount scope

Command used:

```bash
uvx --from pygount pygount --format=summary \
  --folders-to-skip='.git,node_modules,dist,build,.next,.cache,coverage,.turbo,public,tmp' \
  apps packages scripts docker-compose.yml Dockerfile docker-entrypoint.sh package.json
```

Summary from this source/test/config scope:

| Language | Files | Code | Comment |
|---|---:|---:|---:|
| TypeScript | 811 | 68,513 | 9,729 |
| TSX | 486 | 67,860 | 3,176 |
| JSON | 48 | 2,245 | 0 |
| Python | 8 | 1,757 | 389 |
| JavaScript | 34 | 1,730 | 154 |
| JavaScript+Genshi Text | 16 | 1,613 | 139 |
| Transact-SQL | 55 | 916 | 544 |
| CSS+Lasso | 2 | 755 | 79 |
| Bash | 8 | 510 | 128 |
| YAML | 3 | 289 | 16 |
| HTML | 2 | 97 | 0 |
| XML | 1 | 48 | 0 |
| HTML+Genshi | 1 | 36 | 35 |
| Docker | 1 | 27 | 12 |
| Markdown | 21 | 0 | 681 |
| Text only | 3 | 0 | 4 |
| __unknown__ | 15 | 0 | 0 |
| __generated__ | 1 | 0 | 0 |
| __duplicate__ | 2 | 0 | 0 |
| __binary__ | 5 | 0 | 0 |
| **Sum** | **1,523** | **146,396** | **15,086** |

This scope intentionally excludes dependency/build output, docs, data, public static assets, and local agent artifacts so Markdown tracking churn and generated assets do not distort source-size metrics.

## Historical git / review posture (2026-06-22 baseline)

| Item | Historical evidence |
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

This packet remains a historical source-review baseline plus an active pointer to the current recost-report JSON stats/cell guard. The current run did **not** recompute the old 2026-06-22 full historical packet below; it updated this header/status note and focused source/test/config metric table so reviewers do not mistake earlier same-day recost/slow-gate checkpoints for the active checkout. Current active evidence lives in `docs/ai-improvement/implementation-log.md`, `docs/ai-improvement/uncommitted-source-verification-handoff.md`, and `docs/ai-improvement/verification-command-matrix.md`.

## Source/test/config pygount scope

Command used:

```bash
uvx --from pygount pygount --format=summary \
  --folders-to-skip='.git,node_modules,venv,.venv,__pycache__,.cache,dist,build,.next,.tox,.eggs,*.egg-info,coverage,docs,data,public,.codex,.playwright-cli,output,tmp' \
  apps packages scripts docker-compose.yml Dockerfile docker-entrypoint.sh package.json
```

Summary from this source/test/config scope:

| Language | Files | Code | Comment |
|---|---:|---:|---:|
| TypeScript | 797 | 67,391 | 9,627 |
| TSX | 465 | 64,855 | 3,041 |
| Python | 8 | 1,757 | 389 |
| JavaScript | 34 | 1,730 | 154 |
| JavaScript+Genshi Text | 16 | 1,613 | 139 |
| JSON | 38 | 1,416 | 0 |
| Transact-SQL | 55 | 916 | 544 |
| CSS+Lasso | 2 | 755 | 79 |
| Bash | 8 | 510 | 128 |
| YAML | 3 | 289 | 16 |
| HTML | 2 | 97 | 0 |
| XML | 1 | 48 | 0 |
| HTML+Genshi | 1 | 36 | 35 |
| Docker | 1 | 27 | 12 |
| Markdown | 21 | 0 | 681 |
| Text only | 3 | 0 | 4 |
| __unknown__ | 15 | 0 | 0 |
| __generated__ | 1 | 0 | 0 |
| __duplicate__ | 1 | 0 | 0 |
| __binary__ | 5 | 0 | 0 |
| **Sum** | **1,477** | **141,440** | **14,849** |

This scope intentionally excludes dependency/build output, docs, data, public static assets, and local agent artifacts so Markdown tracking churn and generated assets do not distort source-size metrics.

## Verification snapshot for this checkpoint

Commands run from `C:/Ai/tradeclaw` before updating the final tracking artifacts:

```text
git fetch --prune
→ exit 0

branch/upstream probe
→ current branch: feat/premium-ui-overhaul
→ HEAD: a721b15c
→ upstream: origin/feat/premium-ui-overhaul at a721b15c
→ origin/main: 705c5268
→ merge-base with origin/main: 524fc44a8999bf69b6c56f0c44caf25efa5bedd0
→ HEAD...upstream: 0 / 0
→ HEAD...origin/main: 20 / 58
→ origin_main_paths=196; local_head_paths=30; branch_overlap=10; dirty/origin-main overlap=137; status rows=160

RED npm test -- --runTestsByPath scripts/research/__tests__/recost-report.test.ts --runInBand --forceExit -t "duplicate asset-class/band cell key"
→ exit 1 before final source patch
→ Failure class: duplicate crypto/all cells were accepted by the old report builder boundary.

npm test -- --runTestsByPath scripts/research/__tests__/recost-report.test.ts --runInBand --forceExit -t "duplicate asset-class/band cell key"
→ exit 0
→ 1 passed, 39 skipped, 40 total
→ Runtime: 0.577s

npm test -- --runTestsByPath scripts/research/__tests__/recost-report.test.ts --runInBand --forceExit
→ exit 0
→ Test Suites: 1 passed, 1 total
→ Tests: 40 passed, 40 total
→ Runtime: 0.58s

npm test -- --runTestsByPath scripts/research/__tests__/recost-report.test.ts scripts/research/__tests__/recost-segment-cli.test.ts --runInBand --forceExit
→ exit 0
→ Test Suites: 2 passed, 2 total
→ Tests: 65 passed, 65 total
→ Runtime: 10.921s

npx tsc --noEmit --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --types node,jest scripts/research/recost-segment.ts scripts/research/recost-report.ts scripts/research/__tests__/recost-report.test.ts scripts/research/__tests__/recost-segment-cli.test.ts
→ exit 0

npx tsx scripts/research/recost-segment.ts --help / invalid --days / --json without DB
→ help_exit=0; invalid_days_exit=1 before DB; json_no_db_exit=1 with artifact_exists=no

npm test -- --runInBand --forceExit
→ exit 0
→ Test Suites: 217 passed, 3 skipped, 220 total
→ Tests: 1,819 passed, 26 skipped, 1,845 total
→ Runtime: 119.861s

npm run ws:test -- src/__tests__/auth.test.ts
→ exit 0
→ Test Files: 1 passed (1)
→ Tests: 4 passed (4)
→ Duration: 502ms

npm run typecheck:web
→ exit 0
→ ran packages/signals build plus `tsc --noEmit --project apps/web/tsconfig.json`

npm run lint
→ exit 0
→ 0 errors, 23 warnings

npm run build
→ exit 0

uvx --from pygount pygount --format=summary --folders-to-skip=... apps packages scripts docker-compose.yml Dockerfile docker-entrypoint.sh package.json
→ exit 0
→ Sum: 1,477 files / 141,440 code / 14,849 comments

curl -I --max-time 10 https://arizona-poison-combined-recommend.trycloudflare.com/
→ curl exit 6 / Could not resolve host

hermes insights --days 7
→ exit 0
→ local telemetry only: 1,315 sessions / 2,812,410,387 total tokens; gpt-5.5 578 sessions / 1,680,878,552 tokens; provider quota percentage unavailable
```

Secondary verifier PASS: independent delegated source/test verifier inspected the live source/test files, confirmed the exact duplicate-cell guard/test, reran focused duplicate-cell Jest with exit `0`, reran the full recost-report Jest file with exit `0`, reran scoped recost TypeScript with exit `0`, and modified no files. Runtime metadata reported `gpt-5.4-mini`; the parent did not select or pin the child tier per call.
