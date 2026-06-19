# TradeClaw Verification Command Matrix

Date: 2026-06-19 06:58 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent

Use this matrix when stabilizing the current uncommitted TradeClaw working tree. It is not permission to merge everything as-is; it is the minimum evidence packet for the current accumulated docs/test/static-gate lanes.

## Current stabilization matrix

| Lane | Command / check | Current result | Notes |
|---|---|---|---|
| Working tree inventory | `git status --short --branch --untracked-files=all` | Dirty tree: 8 tracked modified files plus untracked test/docs artifacts before this handoff. | Re-run before review; the exact untracked list will now include this handoff and matrix too. |
| Tracked diff summary | `git diff --name-status`, `git diff --shortstat`, `git diff --numstat` | 8 tracked files; 465 insertions / 150 deletions before this handoff. | Splits across README/CONTRIBUTING/STATE, signal tests, SVG, Docker entrypoint, quickstart, and package script. |
| Signal + middleware tests | `npx jest --runTestsByPath apps/web/app/api/signals/__tests__/route.test.ts apps/web/__tests__/middleware.test.ts --runInBand` | Tests passed, then process timed out at 300s because Jest did not exit after the middleware import kept an async handle alive. | Do not ignore the open-handle symptom; either use `--forceExit` only for snapshot verification or add an owner-reviewed cleanup/test strategy later. |
| Signal + middleware snapshot | `npx jest --runTestsByPath apps/web/app/api/signals/__tests__/route.test.ts apps/web/__tests__/middleware.test.ts --runInBand --forceExit` | Exit 0; 2 suites passed; 22 tests passed. | Snapshot proves the current added tests' assertions pass; it does not prove every accumulated diff is merge-ready. |
| Web TypeScript contract | `npm run typecheck:web` | Exit 0; `@tradeclaw/signals` built; web `tsc --noEmit` printed no diagnostics. | This is the repo-local alias for the CI-style web typecheck and remains separate from `next build`. |
| Entrypoint syntax/help | `sh -n docker-entrypoint.sh && sh docker-entrypoint.sh --help` plus marker read | Exit 0; help includes `DATABASE_URL`, `Docker Compose recommended`, and `docs/self-host-smoke-checklist.md`. | Does not prove the full Compose stack runs; Docker smoke remains host/operator-dependent. |
| Package manifest parse | `node -e "JSON.parse(fs.readFileSync('package.json','utf8'))"` | `package_json_parse_ok`. | Covers syntax only, not npm install/lockfile policy. |
| Static docs/tracking checks | `git diff --check`; no-index checks for untracked docs/central board fallback | Exit 0 for `git diff --check`; expected exit 1 for /dev/null no-index checks, with only LF→CRLF normalization warnings. | Final outputs are recorded in the implementation log for this run. |

## Recommended full review verification after keep/revert/split decisions

Run from the repo root after the working tree is intentionally arranged:

```bash
git status --short --branch --untracked-files=all
git diff --name-status
git diff --shortstat
npm run typecheck:web
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
