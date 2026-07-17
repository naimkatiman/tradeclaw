# Release Receipt — Homepage claw refinement

## Identity

| Field | Value |
|---|---|
| Repo | naimkatiman/tradeclaw |
| Version / tag | 0.1.0 / no tag |
| Commit SHA | 8ba63ad4e8de85d9833821b5d4ccab07c73cc27a |
| Environment | production |
| Released at (UTC) | 2026-07-17T10:28:09Z (SUCCESS observed) |
| Owner | naimkatiman / TradeClaw PM agent |
| Railway deployment | 8e67d017-a7cb-4d1d-b152-561c68cc2641 |
| Image digest | sha256:f3eabbf326bcc4f900af6ad81e9cd14b239cbfd128ffcf7f9ee1527d9c7ffb4b |

## What shipped

- User-visible impact: TradeClaw now shows one restrained, scroll-parallax sculpture only in the homepage hero, with no repeated artwork on supporting pages.
- Feature flags changed: none.
- Migrations run: none added; startup confirmed 55/55 existing migrations applied and 0 pending.

## Verification

- Tests run: `npm test -- --runTestsByPath apps/web/lib/__tests__/homepage-brand-art.test.ts apps/web/components/landing/proof-hero-copy.test.ts --runInBand` (2 suites / 5 tests passed); `npm run lint` (0 errors / 23 existing warnings); `npm run typecheck:web` (passed); `npm run build` (passed, 324/324 static pages); `git diff --check` and `STATE.yaml` parse (passed).
- Security scans run: none; this presentation-only change removes two runtime dependencies and does not alter auth, trading rules, data access, schema, secrets, or deployment configuration.
- Manual verification performed: local and production Chrome checks covered 1440×1000 desktop, scroll parallax, 360px mobile, reduced motion, `/docs`, and console errors. Production HTML and browser state confirm exactly one homepage image, no global backdrop or Remotion player, no lower-section wallpaper, and no artwork on `/docs`. `https://tradeclaw.win/api/health` returned HTTP 200 with `status: ok`.

## Risk

- Known risks accepted at release time: browsers without CSS scroll-timeline support receive the intended static artwork; mobile intentionally omits it; two unused generated WebPs remain in the repository as source assets but are not referenced at runtime.
- Rollback command: `$rollbackPath = 'C:\Ai\tradeclaw-rollback-3a2e09c6'; git worktree add $rollbackPath 3a2e09c6; Push-Location $rollbackPath; railway up --project 4265dacd-9431-446e-8d04-5e1ec8482530 --environment production --service web --ci --yes --message 'rollback homepage artwork to 3a2e09c6'; Pop-Location`
- Monitoring link: https://railway.com/project/4265dacd-9431-446e-8d04-5e1ec8482530/service/b958acce-02e3-4aee-9e5f-c2f1f1897253?id=8e67d017-a7cb-4d1d-b152-561c68cc2641

## Sign-off

- [x] All fields above are filled (no blanks — "none" used explicitly).
- [x] Rollback source commit and required Railway CLI flags were verified to exist.
