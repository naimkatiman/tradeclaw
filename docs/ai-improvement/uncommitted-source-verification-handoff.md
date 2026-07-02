# Uncommitted Source Verification Handoff

Date: 2026-07-02 06:46 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent

## Why this exists

The live working tree still contains the refreshed docs-only checkpoint, the existing root README discoverability hook, and the untracked read-only research utility `scripts/research/recost-segment.ts`. This handoff records the current inventory, verifies the script's syntax and fail-closed DB guard, and keeps the tool as an intentional local analysis aid before any new runtime work.

Current inventory at the start of this handoff:

```text
git status --short --branch --ahead-behind --untracked-files=all
→ ## loop/standup-2026-06-26...origin/loop/standup-2026-06-26
→  M README.md
→  M STATE.yaml
→  M docs/ai-improvement/README.md
→  M docs/ai-improvement/implementation-log.md
→  M docs/ai-improvement/uncommitted-source-verification-handoff.md
→  M docs/ai-improvement/verification-command-matrix.md
→ ?? scripts/research/recost-segment.ts
```

The snapshot intentionally keeps the inventory to the live dirty paths and omits a shortstat so the handoff stays stable while the docs-only refresh is being reconciled.

## Source diff inventory

| Surface | Current files | Review implication |
|---|---|---|
| Read-only research CLI | `scripts/research/recost-segment.ts` + root `README.md` | DB-backed analysis utility that re-costs the track record at real per-row cost and segments net expectancy by asset class x band. It typechecks cleanly and exits closed without DB env; the root README now documents it so the tool is intentionally kept as a local analysis aid. |

No dependency installation, package-lock mutation, DB/schema migration, auth/authorization/payment change, trading-rule change, production env var change, Docker Compose topology change, deployment target change, or secret/credential change is included in this handoff.

## Verification snapshot

Commands run from the repository root during this handoff:

```text
npx tsc --noEmit --pretty false --module nodenext --moduleResolution nodenext --target es2022 --lib es2022 --types node --esModuleInterop --skipLibCheck scripts/research/recost-segment.ts
→ exit 0

DATABASE_PUBLIC_URL= DATABASE_URL= npx tsx scripts/research/recost-segment.ts
→ exit 1
→ No DATABASE_PUBLIC_URL or DATABASE_URL set.
→ Add DATABASE_PUBLIC_URL=postgresql://... to apps/web/.env.local (Railway -> Postgres -> Variables),
→ or run via: railway login && railway run -- npx tsx scripts/research/recost-segment.ts

git diff --check
→ exit 0

git diff --no-index --check -- /dev/null ../_zaky_ai_board/KANBAN.md
→ exit 1
→ warning: in the working copy of '../_zaky_ai_board/KANBAN.md', LF will be replaced by CRLF the next time Git touches it
```

## Guardrails for the next run

- Keep the script read-only; do not add DB writes, schema changes, auth/tier changes, or deploy changes in the same increment.
- Do not treat the no-DB guard as a failure; it is the intended fail-closed behavior.
- The keep/drop decision is resolved in favor of keep; the remaining question is live-data output, not the tool's existence.

## Recommended next move

Keep `scripts/research/recost-segment.ts` as an intentional local research utility, and when a Postgres connection is available run the real-data probe against Railway Postgres to answer the cost edge question. The root README already exposes the tool; the open question is live-data output, not the tool's existence.
