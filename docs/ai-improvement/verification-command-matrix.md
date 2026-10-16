# TradeClaw Verification Command Matrix

Date: 2026-08-08 17:54 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent

Use this matrix for the current `feat/premium-ui-overhaul` regime-expectancy `--json` path preflight source gate. It changed the local read-only research source/test lane plus tracking docs/`STATE.yaml`/central board/MemoryCore only; it did not change web runtime behavior, production trading rules, DB/schema, auth/billing, deployment, cron, secrets, dependencies, lockfiles, or branch state beyond existing local commits.

## Current stabilization matrix

| Lane | Command / check | Current result | Notes |
|---|---|---|---|
| Working tree inventory | `git status --short --branch --ahead-behind --untracked-files=all`; raw status read-back | Branch `feat/premium-ui-overhaul...origin/feat/premium-ui-overhaul`; dirty inventory `168` non-branch rows (`103` tracked modified + `3` tracked deleted + `62` untracked). | Dirty tree spans PM full-sweep runtime/config/docs/tests, recost helper/test files, regime-expectancy study files, slow-gate research CLI/test/artifacts, support artifacts, generated image/product-localization files, release-support residue, and AI tracking/STATE docs. |
| Branch/base posture | `git fetch --prune`; `git rev-list --left-right --count`; merge-base/path-count probe | `HEAD=f6ddc185`; upstream `f6ddc185`; `origin/main=58eee2b9`; merge-base `524fc44a`; `HEAD...upstream=0/0`; `HEAD...origin/main=37/61`; `origin_main_paths=203`; `local_head_paths=39`; branch path overlap `15`; dirty/`origin-main` overlap `140` paths. | Branch is synced with feature upstream and sixty-one commits behind current `origin/main`. No branch operation was performed beyond fetch. |
| Current source increment | `git diff --numstat -- scripts/research/regime-expectancy-study.ts`; `git diff --no-index --numstat -- /dev/null scripts/research/__tests__/regime-expectancy-study-cli.test.ts` | `23` insertions in `regime-expectancy-study.ts`; new CLI test contributes `143` inserted lines via expected no-index exit `1`. | `validateJsonOutputPath(...)` now rejects missing parent directories, parent-as-file paths, and existing-directory targets before `connect()`; valid local file paths still hit the no-credentials boundary without artifact creation. |
| RED focused missing-parent Jest | `npm test -- --runTestsByPath scripts/research/__tests__/regime-expectancy-study-cli.test.ts --runInBand --forceExit -t "missing parent"` | RED exit `1` before source patch. | RED failure was the old CLI reaching the credential path instead of controlled local `--json` path validation. |
| Focused regime-expectancy CLI Jest | `npm test -- --runTestsByPath scripts/research/__tests__/regime-expectancy-study-cli.test.ts --runInBand --forceExit` | exit `0`; `1` suite / `5` tests / `1.817s`. | Covers `--help`, missing-parent, parent-file, existing-directory, and valid local path/no-credentials boundary. |
| Adjacent regime source lane Jest | `npm test -- --runTestsByPath scripts/research/__tests__/regime-expectancy-study-cli.test.ts scripts/research/__tests__/regime-study-assembly.test.ts scripts/research/__tests__/regime-backtest-cli.test.ts scripts/research/__tests__/daily-momentum-validation.test.ts scripts/research/__tests__/carry-assembly.test.ts --runInBand --forceExit` | exit `0`; `5` suites / `101` tests / `54.397s`. | Confirms nearby research/backtest/carry contracts stayed green. Known non-blocking output: ts-jest globals deprecation and Jest force-exit notice. |
| Scoped regime TypeScript | `npx tsc --noEmit --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --types node,jest scripts/research/regime-expectancy-study.ts scripts/research/__tests__/regime-expectancy-study-cli.test.ts scripts/research/regime-study-assembly.ts scripts/research/__tests__/regime-study-assembly.test.ts` | exit `0`. | Proves this source/test slice typechecks after the CLI path preflight. |
| Target diff-check | `git diff --check -- ...`; no-index check for the new test | exit `0` for tracked target; no-index new-test check returned expected exit `1` with LF/CRLF warning only; no whitespace-error lines. | New test is untracked, so no-index exit `1` is expected for file difference. |
| Full root Jest | `npm test -- --runInBand --forceExit` | exit `0`; `219` suites passed (`3` skipped) / `1,868` tests passed (`26` skipped) / `1,894` total / `93.517s`; `1` snapshot passed. | Known non-blocking output: ts-jest globals deprecation, expected fallback-test console output, and force-exit notice. |
| Focused websocket auth Vitest | `npm run ws:test -- src/__tests__/auth.test.ts` | exit `0`; `1` file / `4` tests / `944ms`. | Workspace Vitest auth target ran/passed. |
| Web TypeScript | `npm run typecheck:web` | exit `0`. | Runs `npm run build:signals` then `tsc --noEmit --project apps/web/tsconfig.json`. |
| Lint | `npm run lint` | exit `0`; `0` errors / `23` warnings. | Warnings are existing unused/import/img/hook warnings, not blockers for this run. |
| Production build | `npm run build` | exit `0`; Next `16.2.6`; compiled in `14.9s`; `324/324` static pages. | Known warning class remains Next middleware-to-proxy, Turbopack/NFT/static-generation, and `url.parse()` deprecation warnings. |
| Focused source metrics | `uvx --from pygount pygount --format=summary --folders-to-skip=... apps packages scripts docker-compose.yml Dockerfile docker-entrypoint.sh package.json` | `1,523` files / `146,396` code / `15,086` comments. | Counts active source/test/config scope while excluding docs, dependency/build output, generated public/tmp artifacts, and local agent artifacts. |
| Focused source/test target metrics | `uvx --from pygount pygount --format=summary --folders-to-skip=... scripts/research/regime-expectancy-study.ts scripts/research/__tests__/regime-expectancy-study-cli.test.ts` | `2` files / `297` code / `41` comments. | Narrow metric for the two touched source/test files. |
| Secondary verifier | Delegated independent source/test verifier lane | PASS; runtime metadata reported `gpt-5.4-mini`; focused regime-expectancy CLI Jest exited `0` (`1` suite / `5` tests); scoped TypeScript exited `0`; target diff/no-index checks had no whitespace errors; verifier modified no files. | Verifier inspected actual live files, source/test diff, and `git status`. The parent did not select or pin the child tier per call. |
| Quota telemetry context | `hermes insights --days 7` | Local telemetry only: `1,071` sessions / `1,863,642,754` total tokens; `gpt-5.5` `394` sessions / `1,106,968,460` tokens. Provider weekly quota percentage unavailable. | No cron edits or retiering performed; the 90% guardrail remains unmeasured from local telemetry alone. |
| Dashboard acceptance URL | `curl -I --max-time 10 https://arizona-poison-combined-recommend.trycloudflare.com/` | `curl: (6) Could not resolve host`; `curl_exit=6`. | Disposable quick-tunnel availability evidence only; not treated as a repo runtime blocker. |

## Recommended next verification

```bash
git status --short --branch --ahead-behind --untracked-files=all
git diff --check --
git diff --no-index --check -- /dev/null C:/Ai/_zaky_ai_board/KANBAN.md
npm test -- --runTestsByPath scripts/research/__tests__/regime-expectancy-study-cli.test.ts --runInBand --forceExit
npm test -- --runTestsByPath scripts/research/__tests__/regime-expectancy-study-cli.test.ts scripts/research/__tests__/regime-study-assembly.test.ts scripts/research/__tests__/regime-backtest-cli.test.ts scripts/research/__tests__/daily-momentum-validation.test.ts scripts/research/__tests__/carry-assembly.test.ts --runInBand --forceExit
npx tsc --noEmit --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --types node,jest scripts/research/regime-expectancy-study.ts scripts/research/__tests__/regime-expectancy-study-cli.test.ts scripts/research/regime-study-assembly.ts scripts/research/__tests__/regime-study-assembly.test.ts
npm test -- --runInBand --forceExit
npm run ws:test -- src/__tests__/auth.test.ts
npm run typecheck:web
npm run lint
npm run build
```

If this source/test lane is accepted, keep the next action branch-safe: owner/Fatin should decide the synced `feat/premium-ui-overhaul` branch against `origin/main=58eee2b9` (`HEAD...origin/main=37/61`), then split/commit/revert the full-sweep runtime/config/docs/tests, recost helper/test, regime study, slow-gate research, standup, generated-image, localization-support, release-support, and product-localization residue lanes intentionally and rerun the matrix from a clean or deliberately staged state. Do not add DB writes, schema changes, trading-rule changes, auth/tier changes, deployment changes, credentials, cron edits, dependency changes, or lockfile changes in the same lane.
