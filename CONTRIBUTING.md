# Contributing to TradeClaw

Thanks for your interest in contributing! TradeClaw is MIT-licensed and community-driven.

This guide is meant to get you from “I want to help” to “here’s a PR we can merge”.

## How to Contribute

### Bug Reports

Before writing code, please open an issue with enough context to reproduce.

Include:
- What happened
- What you expected
- Steps to reproduce
- Your OS + Node version
- How you're running TradeClaw (Docker Compose / `npm run dev` / other)
- Any relevant logs or screenshots

### Feature Requests

Open an issue with `[Feature Request]` in the title.

Try to describe the use case (who it helps and why), not just the feature idea.

### Pull Requests

1. Fork the repo
2. Create a branch using one of these prefixes:
   - `feat/` for new features
   - `fix/` for bug fixes
   - `docs/` for documentation updates
   - `chore/` for maintenance (deps, tooling, refactors)
3. Make your changes
4. Run checks locally (see `Testing` below)
5. Open a PR against `main`
6. Fill out the PR template checklist before requesting review

### Areas We Need Help

- **New indicators / signal helpers** — canonical app logic lives in `apps/web/app/lib/ta-engine.ts`; shared testable exports live in `packages/signals/src/indicators.ts` and `packages/signals/src/indicators-adx.ts`
- **New symbols / markets** — extend `packages/signals/src/symbols.ts` and update tier/docs coverage when the public product surface changes
- **UI improvements** — React components in `apps/web/components/` and route-level UI in `apps/web/app/`
- **Documentation** — add to `docs/` or improve README/setup guides
- **Translations** — i18n support planned, translators welcome

## Development Setup

TradeClaw is an npm-workspaces monorepo with a Next.js web app, shared packages, a websocket server, and optional Docker Compose services.

```bash
git clone https://github.com/naimkatiman/tradeclaw.git
cd tradeclaw
npm install

# Root env used by Docker Compose, scripts, and most local setup docs
cp .env.example .env
# Fill DATABASE_URL and required local secrets before using DB-backed pages/APIs.

# Optional web-app-only overrides for OAuth/hosted settings
cp apps/web/.env.example apps/web/.env.local

# Run the Next.js web app (apps/web) on :3000
npm run dev
```

Notes:
- There is no bundled SQLite fallback. DB-backed pages and APIs require PostgreSQL via `DATABASE_URL`; Docker Compose starts Postgres/Redis/migrations for the full self-host path.
- If a change touches the signal engine or shared trading logic, validate the relevant package/tests first, then re-check the web app.
- For UI changes, make sure the local dev server starts cleanly after dependencies are installed.

## Code Style

General rules:
- Prefer small, focused changes with clear commit messages.
- TypeScript strict mode (avoid loosening types to “make it compile”).
- Tailwind CSS for styling (no inline styles).
- Components: PascalCase, files: kebab-case.
- Avoid `any` unless you can explain why it’s necessary.

Formatting/linting:
- Use the repo linting command (`npm run lint`) before opening a PR.

## Testing

Run the checks that match your change from the repo root:

```bash
npm run lint
npm run typecheck:web                         # builds @tradeclaw/signals, then runs the CI web typecheck
npm test
npm run build
```

Notes:
- `npm test` runs the Jest unit suite. Add or update targeted tests when your change touches covered trading logic, access gates, alerts, or integration helpers.
- `next build` is configured to skip TypeScript failures, so use `npm run typecheck:web` for web TypeScript changes. That alias builds `@tradeclaw/signals` first because the web app resolves the workspace package from its built output, then runs the same `tsc --noEmit --project apps/web/tsconfig.json` check used by CI.
- Run `npm run test:e2e` for PRs that change browser journeys, routing, auth/session, pricing, or conversion-critical UI.

## PR Workflow (What maintainers expect)

- A clear PR title that matches the change type (e.g., “Fix: …”, “Feat: …”).
- A brief description of the problem/goal.
- Evidence/tests:
  - lint + relevant typecheck/build evidence for all PRs
  - tests updated/added when the change includes logic covered by tests
- No secrets:
  - don’t commit `.env` files
  - don’t paste API keys/tokens in descriptions or logs

## Commit Format

Use `type:` prefixes to keep history easy to scan:

```text
type: short description

feat: add RSI divergence detection
fix: correct Fibonacci level calculation
docs: update Docker setup instructions
chore: upgrade Next.js to 16.1
```

## Questions?

Join [Discord](https://discord.gg/tradeclaw) or open an issue.
