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

- **New indicators** — add to `packages/core/src/indicators/`
- **New assets** — extend symbol list in `packages/core/src/symbols.ts`
- **UI improvements** — React components in `apps/web/components/`
- **Documentation** — add to `docs/` or improve README
- **Translations** — i18n support planned, translators welcome

## Development Setup

TradeClaw is a Next.js + packages monorepo.

```bash
git clone https://github.com/naimkatiman/tradeclaw.git
cd tradeclaw
npm install

# Web app env
cp apps/web/.env.example apps/web/.env.local

# Run dev server
npm run dev
```

Notes:
- If a change touches the signal engine or core logic, you’ll often want to validate it via the relevant package commands, then re-check the web app.
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

Run the following from the repo root:

```bash
npm run lint
npm run build
npm test
```

Notes:
- `npm test` is best-effort; if your PR doesn’t affect logic that’s covered by tests, you may not need to add new ones.
- If you add/modify indicator logic or trading rules, please also run `npm run build` to ensure the app compiles with the new code.

## PR Workflow (What maintainers expect)

- A clear PR title that matches the change type (e.g., “Fix: …”, “Feat: …”).
- A brief description of the problem/goal.
- Evidence/tests:
  - lint/build passing for all PRs
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
