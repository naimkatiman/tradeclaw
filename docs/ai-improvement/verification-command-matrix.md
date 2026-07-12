# TradeClaw Verification Command Matrix

Date: 2026-07-12 23:37 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent

Use this matrix for the current recost CLI `--json` output-path preflight lane. The run stayed inside the local read-only research utility and its Jest contract; it did not change the web app, trading rules, DB/schema, auth/billing, deployment, cron, secrets, dependencies, or lockfiles.

## Current stabilization matrix

| Lane | Command / check | Current result | Notes |
|---|---|---|---|
| Working tree inventory before tracking-doc refresh | `git status --short --branch --ahead-behind --untracked-files=all` | `## HEAD (no branch)` with `M scripts/research/__tests__/recost-segment-cli.test.ts` and `M scripts/research/recost-segment.ts`. | Detached checkout was corrected to current `origin/main` `40a599bc` before source work. |
| Branch/base posture | `git merge-base HEAD origin/main`; path-count probes | merge-base `40a599bce58185801f72249d7b7960c7ca820ee8`; `origin_main_paths=0`; `local_head_paths=0`. | Source-work was safe because the checkout is at current `origin/main` and the only pre-tracking diff was the recost CLI/test lane. |
| Source/test diff | `git diff --shortstat -- scripts/research/recost-segment.ts scripts/research/__tests__/recost-segment-cli.test.ts` | `2 files changed, 59 insertions(+)`. | `--json` output-path guard plus no-DB parser tests only. |
| RED recost parser Jest | `npm test -- --runTestsByPath scripts/research/__tests__/recost-segment-cli.test.ts --runInBand --forceExit` | exit 1 before implementation; 2 new tests failed. | The old script reached `No DATABASE_PUBLIC_URL or DATABASE_URL set` instead of rejecting missing-parent and existing-directory output paths. |
| GREEN focused recost parser Jest | same focused Jest command | exit 0; 1 suite / 23 tests / 10.087s. | Covers help, missing/unknown/duplicate flags, unsafe numeric input, blank JSON paths, missing-parent JSON paths, existing-directory JSON paths, no-artifact behavior, and valid-input missing-DB boundary. |
| Scoped script/test typecheck | `npx tsc --noEmit --pretty false --module nodenext --moduleResolution nodenext --target es2022 --lib es2022 --types node,jest --esModuleInterop --skipLibCheck scripts/research/recost-segment.ts scripts/research/__tests__/recost-segment-cli.test.ts` | exit 0. | Confirms the touched CLI and Jest contract compile in standalone mode. |
| Direct native output-path guard | `DATABASE_PUBLIC_URL= DATABASE_URL= npx tsx scripts/research/recost-segment.ts --json C:/Users/User/AppData/Local/Temp/tradeclaw-recost-native-dir-<pid>` | exit 1; printed `Invalid --json: expected a file path, got an existing directory: ...`; no missing-DB message. | Confirms the preflight runs before DB credential resolution for native Windows paths. |
| Full repo build | `npm run build` | exit 0; Next 16.2.6 compiled and generated 325/325 static pages. | Known warnings: deprecated middleware convention, Big Shoulders font fallback, NFT tracing, edge-runtime static-generation warning, and Node `url.parse()` deprecations. |
| Focused source metrics | `uvx --from pygount pygount --format=summary ... scripts/research/recost-segment.ts scripts/research/__tests__/recost-segment-cli.test.ts` | 2 TypeScript files / 378 code / 60 comments. | Counts only the touched recost source/test lane. |
| Quota telemetry context | `hermes insights --days 7` | 850 sessions / 1,567,569,539 local tokens; provider weekly quota percentage unavailable. | No cron edits or retiering performed; the 90% guardrail remains unmeasured from local telemetry alone. |

## Recommended next verification

```bash
git status --short --branch --ahead-behind --untracked-files=all
git diff --shortstat --
git diff --check
git diff --no-index --check -- /dev/null C:/Ai/_zaky_ai_board/KANBAN.md
npm test -- --runTestsByPath scripts/research/__tests__/recost-segment-cli.test.ts --runInBand --forceExit
npx tsc --noEmit --pretty false --module nodenext --moduleResolution nodenext --target es2022 --lib es2022 --types node,jest --esModuleInterop --skipLibCheck scripts/research/recost-segment.ts scripts/research/__tests__/recost-segment-cli.test.ts
DATABASE_PUBLIC_URL= DATABASE_URL= npx tsx scripts/research/recost-segment.ts --help
DATABASE_PUBLIC_URL= DATABASE_URL= npx tsx scripts/research/recost-segment.ts --days 7 --min-n 100
```

If this source/test increment is accepted, keep the next recost follow-up source-adjacent and no-secret: add JSON payload/report-shape coverage with a pure helper seam or mocked DB boundary. Do not add DB writes, schema changes, trading-rule changes, auth/tier changes, deployment changes, or credentials in the same lane.
