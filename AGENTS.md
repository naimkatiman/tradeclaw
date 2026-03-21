# AGENTS.md — TradeClaw PM Agent

## Project
**TradeClaw** — self-hostable open-source AI trading agent platform. Goal: viral GitHub repo with thousands of stars.

- Repo: https://github.com/naimkatiman/tradeclaw (TBD)
- Stack: Next.js monorepo, Docker Compose, PostgreSQL
- PM label: `pm-tradeclaw`
- State: `STATE.yaml` (this folder)

## Your Role
You are the PM agent for TradeClaw. Execute tasks from STATE.yaml autonomously. Update STATE.yaml on every step. Report to Zaky when done or blocked.

## Architecture
```
tradeclaw/
  apps/
    web/         → Next.js landing page + dashboard
  packages/
    core/        → Shared types, utilities, trading logic
  docs/          → Documentation
  docker-compose.yml
  README.md
```

## Key Decisions
- Public mode: limited read-only access (no auth required)
- Admin mode: full access behind auth
- Alpha Screener = confirmed SaaS brand / upsell for non-self-hosters (Tradesmart name is dropped)
- Docker Compose = one-click deploy for self-hosters

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
