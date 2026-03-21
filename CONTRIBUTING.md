# Contributing to TradeClaw

Thanks for your interest in contributing! TradeClaw is MIT-licensed and community-driven.

## How to Contribute

### Bug Reports

Open an issue with:
- What happened
- What you expected
- Steps to reproduce
- Your OS + Node version

### Feature Requests

Open an issue with `[Feature Request]` in the title. Describe the use case, not just the feature.

### Pull Requests

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run `npm run lint` — must pass
5. Run `npm run build` — must pass
6. Open a PR against `main`

### Areas We Need Help

- **New indicators** — add to `packages/core/src/indicators/`
- **New assets** — extend symbol list in `packages/core/src/symbols.ts`
- **UI improvements** — React components in `apps/web/components/`
- **Documentation** — add to `docs/` or improve README
- **Translations** — i18n support planned, translators welcome

## Development Setup

```bash
git clone https://github.com/naimkatiman/tradeclaw.git
cd tradeclaw
npm install
cp apps/web/.env.example apps/web/.env.local
npm run dev
```

## Code Style

- TypeScript strict mode
- Tailwind CSS for styling (no inline styles)
- Components: PascalCase, files: kebab-case
- No `any` types without a comment explaining why

## Commit Format

```
type: short description

feat: add RSI divergence detection
fix: correct Fibonacci level calculation
docs: update Docker setup instructions
chore: upgrade Next.js to 16.1
```

## Questions?

Join [Discord](https://discord.gg/tradeclaw) or open an issue.
