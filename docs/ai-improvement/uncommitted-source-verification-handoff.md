# Uncommitted Source Verification Handoff

Date: 2026-06-19 06:58 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent

## Why this exists

The live working tree already contains accumulated modified and untracked artifacts from prior TradeClaw improvement runs. This run did **not** add new runtime/source/test behavior. The safest high-value action is to document the current diff, verify a current snapshot, and make source-diff stabilization the active next move before layering on new runtime work.

Current inventory at the start of this handoff:

```text
git status --short --branch --untracked-files=all
→ ## main...origin/main
→  M CONTRIBUTING.md
→  M README.md
→  M STATE.yaml
→  M apps/web/app/api/signals/__tests__/route.test.ts
→  M apps/web/public/readme-banner.svg
→  M docker-entrypoint.sh
→  M docs/QUICKSTART.md
→  M package.json
→ ?? apps/web/__tests__/middleware.test.ts
→ ?? docs/ai-improvement/README.md
→ ?? docs/ai-improvement/build-typecheck-parity.md
→ ?? docs/ai-improvement/implementation-log.md
→ ?? docs/ai-improvement/middleware-proxy-migration-note.md
→ ?? docs/self-host-smoke-checklist.md
→ ?? docs/signal-data-lineage.md

tracked shortstat before this handoff
→ 8 files changed, 465 insertions(+), 150 deletions(-)
```

Passing checks below are a **snapshot of the current dirty tree**, not proof that every accumulated diff has been reviewed or should be merged as-is.

## Source diff inventory

| Surface | Current files | Review implication |
|---|---|---|
| Contributor/DX command contract | `CONTRIBUTING.md`, `README.md`, `package.json`, `docs/ai-improvement/build-typecheck-parity.md` | Adds/documented root `npm run typecheck:web`. Review as a tooling/docs lane; no lockfile or dependency changes are present. |
| Self-host/operator docs and entrypoint help | `docs/QUICKSTART.md`, `docker-entrypoint.sh`, `docs/self-host-smoke-checklist.md`, README self-host link | Aligns visible setup/help text with Compose + PostgreSQL + websocket health. Review with Docker availability separately; this handoff only verified shell syntax/help markers. |
| Signal disclosure route tests | `apps/web/app/api/signals/__tests__/route.test.ts` | Test-only expansion covering live-scanner and TA worker fallback free/Pro disclosure parity. Review as test-only safety coverage before committing. |
| Middleware matcher characterization | `apps/web/__tests__/middleware.test.ts`, `docs/ai-improvement/middleware-proxy-migration-note.md` | Test-only guard for current matcher coverage before any owner/Fatin-approved `middleware.ts` → `proxy.ts` migration. The test imports current middleware config and currently needs `--forceExit` or cleanup because middleware has a module-level interval. |
| Static public asset polish | `apps/web/public/readme-banner.svg` | One duplicated SVG `x` attribute removed. Review as static asset/parser-warning cleanup, not runtime application code. |
| Signal lineage/operator maps | `docs/signal-data-lineage.md`, `docs/ai-improvement/README.md` | Docs-only maintainer maps for trust-sensitive signal flow and active backlog. Must be committed if future agents should rely on them. |
| Project-local state/tracking | `STATE.yaml`, `docs/ai-improvement/implementation-log.md`, central board row | Historical PM/state tracking has been updated by prior runs; keep it aligned with whatever source/docs/test lanes are accepted. |

No dependency installation, package-lock mutation, DB/schema migration, auth/authorization/payment change, trading-rule change, production env var change, Docker Compose topology change, deployment target change, or secret/credential change is included in this handoff.

## Verification snapshot

Commands run from `C:/Ai/tradeclaw` during this handoff:

```text
npx jest --runTestsByPath apps/web/app/api/signals/__tests__/route.test.ts apps/web/__tests__/middleware.test.ts --runInBand
→ PASS apps/web/__tests__/middleware.test.ts
→ PASS apps/web/app/api/signals/__tests__/route.test.ts
→ Test Suites: 2 passed, 2 total
→ Tests: 22 passed, 22 total
→ Command then timed out at 300s because Jest did not exit after the middleware import kept an async handle alive.

npx jest --runTestsByPath apps/web/app/api/signals/__tests__/route.test.ts apps/web/__tests__/middleware.test.ts --runInBand --forceExit
→ exit 0
→ PASS apps/web/__tests__/middleware.test.ts
→ PASS apps/web/app/api/signals/__tests__/route.test.ts
→ Test Suites: 2 passed, 2 total
→ Tests: 22 passed, 22 total

npm run typecheck:web
→ exit 0
→ ran `npm run build:signals && tsc --noEmit --project apps/web/tsconfig.json`
→ `@tradeclaw/signals` built with `tsc`; web TypeScript printed no diagnostics.

sh -n docker-entrypoint.sh && sh docker-entrypoint.sh --help
→ exit 0 for syntax/help path
→ help output includes `DATABASE_URL`, `Docker Compose recommended`, and `docs/self-host-smoke-checklist.md` markers.

node package parse probe
→ package_json_parse_ok
```

## Guardrails for the next run

Do **not** layer new runtime or architecture work on top of this working tree until the accumulated diff is reviewed and stabilized.

Approval/review boundaries that remain in force:

- No DB/schema migrations or data mutations.
- No auth, tier, billing, payment, or trading/business-rule changes.
- No production env var, secret, credential, deploy target, or Docker Compose topology changes.
- No `apps/web/middleware.ts` → `apps/web/proxy.ts` convention migration until owner/Fatin approve it and the matcher/behavior checks are run.
- No broad formatting, package-manager policy change, dependency upgrade, or lockfile normalization mixed into this stabilization pass.

## Suggested review sequence for Fatin / owner / maintainer

1. **Tracking/docs durability lane** — decide whether to keep and commit `docs/ai-improvement/*`, `docs/signal-data-lineage.md`, `docs/self-host-smoke-checklist.md`, and the central board/STATE updates.
2. **Test-only safety lane** — review `apps/web/app/api/signals/__tests__/route.test.ts` and `apps/web/__tests__/middleware.test.ts` separately from runtime code; decide whether to fix the middleware open-handle test cleanup or keep `--forceExit` only in manual verification.
3. **Tooling/DX lane** — review the root `typecheck:web` script and README/CONTRIBUTING command guidance.
4. **Self-host docs/help lane** — review `docs/QUICKSTART.md`, `docker-entrypoint.sh` help/comment text, and `docs/self-host-smoke-checklist.md`; rerun `docker compose config --quiet` and live smoke checks on a host with Docker installed.
5. **Static asset polish lane** — review the one-line SVG duplicate-attribute cleanup.
6. After keep/revert/split decisions, rerun the verification matrix in `docs/ai-improvement/verification-command-matrix.md` and update `docs/ai-improvement/implementation-log.md` with final accepted evidence.

## Recommended next move

Source-diff stabilization before new feature/runtime work: Fatin/owner/maintainer should split the accumulated changes into keep/revert/commit lanes, rerun the verification matrix, and only then continue with one separate improvement such as build-warning triage or the owner/Fatin-approved middleware/proxy migration.

Code changes this run: none. This run produced docs/tracking only.
