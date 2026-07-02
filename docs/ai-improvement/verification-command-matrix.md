# TradeClaw Verification Command Matrix

Date: 2026-07-02 06:46 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent

Use this matrix for the current verification-only docs refresh and the read-only research lane. The working tree still has the root README hook alongside the AI-tracking docs, STATE, and the untracked research CLI.

## Current stabilization matrix

| Lane | Command / check | Current result | Notes |
|---|---|---|---|
| Working tree inventory | `git status --short --branch --ahead-behind --untracked-files=all` | `## loop/standup-2026-06-26...origin/loop/standup-2026-06-26`; `M README.md`, `M STATE.yaml`, `M docs/ai-improvement/README.md`, `M docs/ai-improvement/implementation-log.md`, `M docs/ai-improvement/uncommitted-source-verification-handoff.md`, `M docs/ai-improvement/verification-command-matrix.md`, `?? scripts/research/recost-segment.ts`. | Current docs refresh stays limited to the AI-tracking docs, STATE, and the untracked research CLI; the root README hook remains in place. |
| Tracked diff summary | `docs-only delta` | exact shortstat omitted in this verification-only refresh | Keeps the matrix aligned to the live docs refresh without pinning a stale line-count snapshot. |
| Research CLI typecheck | `npx tsc --noEmit --pretty false --module nodenext --moduleResolution nodenext --target es2022 --lib es2022 --types node --esModuleInterop --skipLibCheck scripts/research/recost-segment.ts` | exit 0 | Confirms the CLI is syntactically and type-wise valid in standalone mode. |
| No-DB guard | `DATABASE_PUBLIC_URL= DATABASE_URL= npx tsx scripts/research/recost-segment.ts` | exit 1; missing-DB message printed | Expected fail-closed behavior when no Postgres connection is available. |
| Root README discoverability hook | read-back of `README.md` scripts section | `scripts/research/recost-segment.ts` is documented under `scripts/` | Future agents can find the tool without spelunking through the AI packet. |
| Post-refresh docs/static checks | `git diff --check`; `git diff --no-index --check -- /dev/null C:/Ai/_zaky_ai_board/KANBAN.md` | `git diff --check` exited 0; the board no-index check exited 1 with only the LF→CRLF warning and no whitespace-error lines. | Confirms the docs refresh is clean and the external board row has no Markdown whitespace issues. |

## Recommended next verification

```bash
git status --short --branch --ahead-behind --untracked-files=all
git diff --name-status
git diff --check
git diff --no-index --check -- /dev/null C:/Ai/_zaky_ai_board/KANBAN.md
npx tsc --noEmit --pretty false --module nodenext --moduleResolution nodenext --target es2022 --lib es2022 --types node --esModuleInterop --skipLibCheck scripts/research/recost-segment.ts
DATABASE_PUBLIC_URL= DATABASE_URL= npx tsx scripts/research/recost-segment.ts
```

If a live Postgres connection becomes available, run `scripts/research/recost-segment.ts` against Railway Postgres and record the result as LOCAL vs PROD-verified.
