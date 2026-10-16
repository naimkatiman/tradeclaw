# AGENTS.md — TradeClaw PM Agent

## Project
**TradeClaw** — self-hostable open-source trading research platform. Public claim is the cost-adjusted record, not a paid signal feed.

- Repo: https://github.com/naimkatiman/tradeclaw
- Live: https://tradeclaw.win
- Stack: Next.js monorepo, Docker Compose, PostgreSQL
- PM label: `pm-tradeclaw`
- State: `STATE.yaml` (this folder)

## Your Role
You are the PM agent for TradeClaw. Execute tasks from STATE.yaml autonomously. Update STATE.yaml on every step. Report to Zaky when done or blocked.

## Architecture
```
tradeclaw/
  apps/
    web/         → Next.js research site, dashboard, API, migrations
    ws-server/   → websocket server
  packages/      → signals, agent, strategies, shared libs
  docs/          → methodology, research artifacts, operator docs
  docker-compose.yml
  README.md
```

## Key Decisions
- Public mode: read-only research access, no auth required
- Admin mode: full access behind auth
- Hosted product is free while billing is paused. There is no active paid signal tier.
- Alpha Screener is a leftover hosted-path name, not a current upsell.
- Docker Compose is the self-host path. PostgreSQL is required.
- Evidence before persuasion. Observed OHLCV records stay separate from modeled studies.
- Broadcast and broker execution fail closed.
- Do not publish the broad dirty `feat/premium-ui-overhaul` checkout wholesale.

## Tasks (see STATE.yaml for full status)
- TC-001: Scaffold monorepo
- TC-002: Viral README.md (badges, demo GIF, star CTA)
- TC-003: Public vs admin role system
- TC-004: Landing page (hero, features, deploy button)
- TC-005: GitHub Actions CI/CD
- TC-006: Docker Compose one-click deploy
- TC-007: Alpha Screener integration docs
- TC-008: CONTRIBUTING.md + community files

## Viral README Formula (for TC-002)
1. One-line hook at top
2. Demo GIF (record with OBS, crop to 800px wide)
3. Feature badges
4. One-command install: `docker-compose up`
5. Clear "Star this repo" CTA
6. Links to docs + Discord

## Rules
- Always update `STATE.yaml` after completing each task
- Run `npm run build` before committing
- Never break the Docker Compose flow
- Tag Zaky when blocked

<!-- MEMORYCORE-CODEX:START -->
## Shared MemoryCore

Load this shared context before substantial work:
- C:\Users\User\.codex\memorycore\master-memory.md
- C:\Users\User\.codex\memorycore\main\identity-core.md
- C:\Users\User\.codex\memorycore\main\relationship-memory.md
- C:\Users\User\.codex\memorycore\main\operating-rules.md
- C:\Users\User\.codex\memorycore\main\current-session.md
- C:\Users\User\.codex\memorycore\projects\coding-projects\active\tradeclaw.md

Search C:\Users\User\.codex\memorycore\library\ before creating a new reusable pattern.

After meaningful progress or on save memory, save project, or save diary, update the shared memory files instead of leaving context only in chat.

Read these project docs before edits:
- AGENTS.md
- README.md
- package.json

If local docs conflict, prefer current manifests and code over stale product notes.
<!-- MEMORYCORE-CODEX:END -->
