# Build vs Typecheck Parity Note

Date: 2026-06-18 20:54 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent

## Purpose

TradeClaw's web build and TypeScript validation are intentionally separate today. This note makes the current verification contract explicit so contributors do not treat a green `next build` as proof that web TypeScript is clean.

This note documents the current contract. The 2026-06-18 follow-up added one root `typecheck:web` script alias for the already-verified command sequence; it did not change Next config, CI behavior, dependencies, runtime behavior, trading logic, tier rules, schema, environment variables, Docker Compose, or deployment targets. The 2026-06-19 follow-up created `docs/ai-improvement/middleware-proxy-migration-note.md` to triage the observed Next 16 middleware-to-proxy warning without renaming files or changing route behavior.

## Source-of-truth files inspected

- `package.json` — root workspace scripts. `npm run build` builds the `packages/signals` workspace, the `packages/trading-agents` workspace, and then the web app. `npm run typecheck:web` builds `@tradeclaw/signals` and then runs the CI-style web TypeScript check.
- `apps/web/package.json` — web workspace scripts. `build` is `next build`; there is no web-local typecheck script.
- `apps/web/next.config.ts` — `typescript.ignoreBuildErrors: true`, so the web build skips TypeScript validation by design.
- `.github/workflows/ci.yml` — CI's `Lint & Type Check` job runs `npm ci`, `npm run build:signals`, `npm run lint`, then `npx tsc --noEmit --project apps/web/tsconfig.json`; the Build job separately runs `npm run build`.
- `apps/web/tsconfig.json` — web TypeScript scope includes `**/*.ts`, `**/*.tsx`, `.next/types`, `.next/dev/types`, and `**/*.mts`.
- `README.md` and `CONTRIBUTING.md` — public/local contributor instructions that should stay aligned with this contract.
- `docs/ai-improvement/middleware-proxy-migration-note.md` — docs-only preflight for the Next 16 middleware-to-proxy warning and approval boundary.

## Current command contract

| Command | What it proves | What it does not prove |
|---|---|---|
| `npm run build:signals` | Builds `@tradeclaw/signals` into `dist`, matching the CI prerequisite before web typechecking. | Does not validate the web app. |
| `npm run typecheck:web` | Builds `@tradeclaw/signals`, then runs `tsc --noEmit --project apps/web/tsconfig.json` from the repo root. This is the shortest local alias for the CI web TypeScript check. | Does not bundle or prerender the Next app. |
| `npx tsc --noEmit --project apps/web/tsconfig.json` | Runs the explicit web TypeScript check used by CI. Run it after `npm run build:signals` on clean checkouts because the web app resolves `@tradeclaw/signals` from its built output. | Does not bundle or prerender the Next app. |
| `npm run build --workspace=apps/web` | Runs `next build` for the web app: bundling, route analysis, static generation, and standalone output tracing. | Does not fail on TypeScript errors while `typescript.ignoreBuildErrors` is true. The build output prints `Skipping validation of types`. |
| `npm run build` | Runs the root production build chain: signals package, trading-agents package, then the web app build. | Does not replace the CI-style `tsc --noEmit` check. |
| `npm run lint` | Runs the web ESLint configuration. | Does not typecheck or build. |
| `npm test` | Runs the Jest unit suite. | Does not run browser E2E or Next production build. |

Recommended local PR evidence for web changes:

```bash
npm run typecheck:web
npm run lint
npm test
npm run build
```

For browser-journey, auth/session, pricing, routing, or conversion-critical UI work, also run:

```bash
npm run test:e2e
```

## Verification snapshot from this run

```text
npm run build:signals && npx tsc --noEmit --project apps/web/tsconfig.json
→ exit 0.
→ `@tradeclaw/signals` built with `tsc`.
→ Web TypeScript check printed no diagnostics.

npm run build --workspace=apps/web
→ exit 0.
→ Next.js 16.2.6 compiled successfully and generated 332 static pages.
→ Output explicitly included `Skipping validation of types`.
→ Warnings observed: multiple package-lock files caused Next workspace-root inference warning; `middleware` file convention is deprecated in favor of `proxy`; two Turbopack/NFT unexpected-file trace warnings involving `apps/web/next.config.ts` → `apps/web/lib/signals-live.ts` → `apps/web/app/api/signal-of-the-day/route.ts`; repeated Node `url.parse()` deprecation warnings; edge runtime disables static generation for one page.
```

These warnings were documented, not fixed, because this run is docs-only. Any future change to `next.config.ts`, lockfiles, middleware/proxy routing, output tracing, or route imports should be handled as a separate, tested increment.

## Safe boundaries

Autonomous safe follow-ups:

- Keep the `typecheck:web` alias, README, CONTRIBUTING, and CI command contract aligned as scripts evolve.
- Add docs/tests around a specific build warning after inspecting the source it names; the middleware/proxy warning now has a docs-only preflight note, and a future safe autonomous step can add matcher characterization tests without renaming files.
- Keep README/CONTRIBUTING command tables aligned with actual package scripts.

Approval or separate owner/Fatin review required before:

- Removing `typescript.ignoreBuildErrors` or changing CI blocking behavior.
- Deleting lockfiles, changing workspace package boundaries, or changing package-manager policy.
- Renaming middleware/proxy files or changing route behavior.
- Changing Next output tracing, deploy target, Docker Compose topology, production env vars, trading behavior, tier rules, auth, billing, or schema.

## Recommended next move

Smallest safe follow-up after the middleware/proxy preflight note: add a test-only matcher characterization for the current `apps/web/middleware.ts` using Next's experimental proxy testing helpers, without renaming files or changing auth/rate/header behavior. The actual `middleware.ts` → `proxy.ts` convention migration remains owner/Fatin-approved work and must stay separate from CI blocking behavior, `ignoreBuildErrors`, lockfile/package-manager policy, output tracing, runtime behavior, trading logic, tier rules, schema, env vars, Docker Compose, and deployment targets.
