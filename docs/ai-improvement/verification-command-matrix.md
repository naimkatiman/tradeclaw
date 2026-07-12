# TradeClaw Verification Command Matrix

Date: 2026-07-12 18:10 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent

Use this matrix for the current recost CLI parser hardening lane. The run stayed inside the local read-only research utility and its Jest contract; it did not change the web app, trading rules, DB/schema, auth/billing, deployment, cron, secrets, dependencies, or lockfiles.

## Current stabilization matrix

| Lane | Command / check | Current result | Notes |
|---|---|---|---|
| Working tree inventory before tracking-doc refresh | `git status --short --branch --ahead-behind --untracked-files=all` | `## HEAD (no branch)` with `M scripts/research/__tests__/recost-segment-cli.test.ts` and `M scripts/research/recost-segment.ts`. | Detached `HEAD` matched `origin/main` at `6f363cd7`; no configured upstream. |
| Branch/base posture | `git merge-base HEAD origin/main`; path-count probes | merge-base `6f363cd7fde369722b2563952ac2cb6729745bf8`; `origin_main_paths=0`; `local_head_paths=0`. | Source-work was safe because the checkout is at current `origin/main` and the only pre-tracking diff was the recost CLI/test lane. |
| Source/test diff | `git diff --shortstat -- scripts/research/recost-segment.ts scripts/research/__tests__/recost-segment-cli.test.ts` | `2 files changed, 38 insertions(+), 4 deletions(-)`. | Parser hardening plus no-DB boundary tests only. |
| Focused recost parser Jest | `npm test -- --runTestsByPath scripts/research/__tests__/recost-segment-cli.test.ts --runInBand --forceExit` | exit 0; 1 suite / 21 tests / 7.397s. | Covers help without DB credentials, missing/unknown/duplicate flags, unsafe and malformed numeric input, blank JSON paths, no-artifact behavior, and the valid-flags missing-DB boundary. |
| Scoped script/test typecheck | `npx tsc --noEmit --pretty false --module nodenext --moduleResolution nodenext --target es2022 --lib es2022 --types node,jest --esModuleInterop --skipLibCheck scripts/research/recost-segment.ts scripts/research/__tests__/recost-segment-cli.test.ts` | exit 0. | Confirms the touched CLI and Jest contract compile in standalone mode. |
| Dependency install precondition | `npm ci` | exit 0; 1,961 packages installed; npm reported 63 audit findings. | Needed because the first build attempt found the lockfile-listed `three` dependency absent from local `node_modules`. No package or lockfile content changed. |
| Full repo build | `npm run build` | exit 0 after `npm ci`; Next 16.2.6 compiled and generated 325/325 static pages. | Known warnings: deprecated middleware convention, Big Shoulders font fallback, NFT tracing, edge-runtime static-generation warning, and Node `url.parse()` deprecations. |
| Focused source metrics | `uvx --from pygount pygount --format=summary ... scripts/research/recost-segment.ts scripts/research/__tests__/recost-segment-cli.test.ts` | 2 TypeScript files / 338 code / 60 comments. | Counts only the touched recost source/test lane. |
| Owner-authorized release rerun | focused Jest; scoped TypeScript; root Jest; app ESLint; `npm run build` | 21/21 focused tests; scoped TypeScript exit 0; 1,285 passed / 26 skipped / 0 failed; ESLint 0 errors with 31 pre-existing warnings; 325/325 static pages. | Docker is unavailable in the local shell; GitHub Actions provides the Docker image-build gate after push. |
| Post-refresh docs/static checks | `git diff --check`; board no-index check | repo diff check exit 0; board check emitted no whitespace diagnostics (no-index exit 1 because the compared files differ). | Final deployment evidence is recorded in `STATE.yaml` after the main push and Railway health verification. |

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

If this source/test increment is accepted, keep the next recost follow-up source-adjacent and no-secret: add output/report shape coverage or run the already-read production recost result through a sanitized artifact path. Do not add DB writes, schema changes, trading-rule changes, auth/tier changes, deployment changes, or credentials in the same lane.
