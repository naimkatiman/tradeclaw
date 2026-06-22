# TradeClaw Verification Command Matrix

Date: 2026-06-22 05:30 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent

Use this matrix when stabilizing the current TradeClaw remote-aligned feature branch plus dirty working tree. It is not permission to push, merge, promote local `main`, or accept every remaining diff as-is; it is the minimum evidence packet for the committed branch copy/test/docs lanes, accumulated docs/test/static-gate/tooling lanes, source-review metrics packet, and AI tracking/status docs.

## Current stabilization matrix

| Lane | Command / check | Current result | Notes |
|---|---|---|---|
| Branch/history inventory | `git status --short --branch --untracked-files=all`; `git branch -vv`; `git log --oneline -7` | Current branch is `fix/track-record-compliance-copy` at `528cd3c8`; upstream is `origin/fix/track-record-compliance-copy`; ahead/behind vs upstream is `0 / 0`; local `main` remains `da2afa06 [origin/main: ahead 1]`; dirty set includes one untracked metrics artifact. | Decide feature-branch and local-main posture before new runtime/source work. |
| Remote-clean merge-base probe | `git fetch --prune`; `BASE=$(git merge-base HEAD origin/main)`; compare `BASE..origin/main` and `BASE..HEAD` | Merge-base `004190974821f789b8b56979680de03fd77ebcad`; `origin/main` changed-path set is empty; `HEAD` changed-path set has 11 paths; dirty/origin overlap is zero. | This is remote-clean feature-branch + dirty-tree stabilization, not remote-conflict triage. |
| Upstream parity probe | `git rev-list --left-right --count HEAD...@{u}` | `0	0` | Branch is already aligned with its feature upstream, but not promoted into `origin/main`. |
| Feature branch committed public-copy lane | `git show --stat --oneline --no-renames HEAD --`; inspect `apps/web/app/pricing/page.tsx` and `apps/web/app/track-record/TrackRecordClient.tsx` | Latest commit `528cd3c8`; `apps/web/app/pricing/page.tsx`; 1 file changed, 4 insertions, 1 deletion. Previous branch commit `b52aae7d` adjusted `TrackRecordClient.tsx`. | Public trust/legal copy is committed on the feature branch, not dirty; review wording before PR/merge/push decisions. |
| Prior local committed AI/test/docs lane | `git diff --name-status 004190974821f789b8b56979680de03fd77ebcad..HEAD` | Branch includes prior `da2afa06 test(web): add middleware matcher characterization test + docs`. | Contains `apps/web/__tests__/middleware.test.ts`, AI improvement docs, self-host smoke checklist, and signal-data lineage doc. |
| Working tree inventory | `git status --short --branch --untracked-files=all`; `git ls-files --others --exclude-standard` | 13 dirty paths: 12 tracked modified files plus untracked `docs/ai-improvement/source-review-metrics.md`. | Dirty tree is public/operator docs + tooling, test/static/state, and AI tracking/status docs. |
| Tracked diff summary | `git diff --name-status`; `git diff --shortstat`; split non-AI vs AI docs | Pre-checkpoint snapshot: 12 tracked files / 1,879 insertions / 226 deletions; public/operator docs + tooling lane: 5 files / 178 insertions / 144 deletions; test/static/state lane: 3 files / 309 insertions / 6 deletions; AI tracking/status docs: 4 files / 1,392 insertions / 76 deletions. | Rerun after any keep/revert/split decision and after final tracking-doc patches, because `STATE.yaml` and AI docs change during checkpoints. |
| Source-review metrics packet | Read `docs/ai-improvement/source-review-metrics.md`; rerun no-temp overlap probe and `uvx --from pygount pygount --format=summary ...` source/test/config scope | Packet refreshed; source/test/config pygount scope: 1,419 files / 144,113 code / 16,085 comments; current dirty paths: 13; overlap paths: 0. | Metrics are review aids only, not merge/deploy approval. Keep this artifact in sync with branch and dirty-lane decisions. |
| Signal + middleware snapshot | `npx jest --runTestsByPath apps/web/app/api/signals/__tests__/route.test.ts apps/web/__tests__/middleware.test.ts --runInBand --forceExit` | Exit 0; 2 suites passed; 22 tests passed in 1.76s. | Force-exit notice remains because importing middleware leaves an async handle open; treat this as a snapshot, not a cleanup decision. |
| Targeted app ESLint | `npm run lint --workspace=apps/web -- app/api/signals/__tests__/route.test.ts __tests__/middleware.test.ts` | Exit 0; no warnings for targeted files. | Covers the dirty route-test lane plus committed middleware matcher test. |
| Web TypeScript contract | `npm run typecheck:web` | Exit 0; `@tradeclaw/signals` built; web `tsc --noEmit` printed no diagnostics. | This is the repo-local alias for the CI-style web typecheck and remains separate from `next build`. |
| App build snapshot | `npm run build --workspace=apps/web` | Exit 0; Next.js 16.2.6 compiled successfully in 14.4s and generated 332/332 static pages in 5.4s. Known warnings remained: workspace-root inference from multiple lockfiles, middleware-to-proxy convention warning, unexpected NFT trace from `apps/web/next.config.ts`, `url.parse()` deprecation notices, and edge runtime static-generation warning. | Build still skips type validation; pair this with `npm run typecheck:web`. Warnings are review inputs, not approval to rename middleware or change tracing/config behavior in this dirty-tree checkpoint. |
| Entrypoint syntax/help | `sh -n docker-entrypoint.sh && sh docker-entrypoint.sh --help` plus marker read | Exit 0; help includes `DATABASE_URL`, `Docker Compose recommended`, and `docs/self-host-smoke-checklist.md`. | Direct help output was enough for this checkpoint; no temp helper was needed. |
| Package manifest parse | `node -e "JSON.parse(fs.readFileSync('package.json','utf8'))"` | `package_json_parse_ok`. | Covers syntax only, not npm install/lockfile policy. |
| Static docs/tracking checks | `git diff --check`; no-index checks for repo-local log/metrics and central board outside this repo | Run after every tracking edit; latest outputs are recorded in `docs/ai-improvement/implementation-log.md` and the final scheduled report. | If the board directory is not a git repo, use read-back plus `git diff --no-index --check -- /dev/null C:/Ai/_zaky_ai_board/KANBAN.md`. |

## Recommended full review verification after keep/revert/split decisions

Run from the repo root after branch posture and working tree are intentionally arranged:

```bash
git status --short --branch --untracked-files=all
git branch -vv
git rev-list --left-right --count HEAD...@{u}
git show --stat --oneline --no-renames HEAD --
BASE=$(git merge-base HEAD origin/main)
git diff --name-status --no-renames "$BASE"..origin/main
git diff --name-status --no-renames "$BASE"..HEAD
git diff --name-status
git diff --shortstat
cat docs/ai-improvement/source-review-metrics.md
uvx --from pygount pygount --format=summary --folders-to-skip='.git,node_modules,venv,.venv,__pycache__,.cache,dist,build,.next,.tox,.eggs,*.egg-info,coverage,docs,data,public' apps packages scripts docker-compose.yml Dockerfile docker-entrypoint.sh package.json
npm run typecheck:web
npm run lint --workspace=apps/web -- app/api/signals/__tests__/route.test.ts __tests__/middleware.test.ts
npx jest --runTestsByPath apps/web/app/api/signals/__tests__/route.test.ts apps/web/__tests__/middleware.test.ts --runInBand --forceExit
npm run lint
npm test
npm run build
sh -n docker-entrypoint.sh
```

If Docker is available on the reviewer host and the self-host docs/help lane is being accepted, also run:

```bash
docker compose config --quiet
# optional local smoke, after filling a local .env only:
docker compose up -d --build
```

Keep production secrets, webhook tokens, broker credentials, Stripe keys, Telegram bot tokens, and database passwords out of logs, screenshots, issue comments, and AI prompts.
