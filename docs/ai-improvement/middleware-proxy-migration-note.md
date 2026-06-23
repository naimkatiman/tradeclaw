# Next 16 Middleware-to-Proxy Migration Preflight

Date: 2026-06-19 03:51 MPST (+0800)
Agent: CEO Zaky recurring Product + Engineering repository improvement agent

## Purpose

TradeClaw's Next.js 16 web build still succeeds, but it emits a convention warning:

```text
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

This note triages that warning without changing runtime behavior. The current `apps/web/middleware.ts` is a global security and access-control surface, so the safe action this run is to document the migration contract and owner/Fatin approval boundary before any file rename or route behavior change.

Code changes: none.

## Source-of-truth files inspected

- `apps/web/middleware.ts` — current global middleware surface.
- `apps/web/next.config.ts` — standalone output, Turbopack settings, `typescript.ignoreBuildErrors`, redirects, headers, image policy, and performance/security config.
- `apps/web/package.json` — web build script is `next build`.
- Root `package.json` — `typecheck:web` and root build scripts.
- `.github/workflows/ci.yml` — CI still typechecks web separately from `next build`.
- Installed Next docs:
  - `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
- Existing AI artifacts:
  - `docs/ai-improvement/README.md`
  - `docs/ai-improvement/build-typecheck-parity.md`
  - `docs/ai-improvement/implementation-log.md`

## What the installed Next docs say

- Starting with Next.js 16, Middleware is now called Proxy; the docs say the functionality remains the same.
- The new convention is a single `proxy.ts` file at the same level as `app` or `pages`.
- The file must export a single function as either a named `proxy` export or a default export.
- Next provides a codemod:

```bash
npx @next/codemod@canary middleware-to-proxy .
```

- The codemod renames `middleware.ts` to `proxy.ts` and changes `export function middleware()` to `export function proxy()`.
- Next 15.1+ exposes experimental test helpers in `next/experimental/testing/server`, including `unstable_doesProxyMatch`, for asserting whether proxy runs for a URL.

## Current TradeClaw middleware contract

| Responsibility | Current source | Why it matters |
|---|---|---|
| API CORS preflight | `OPTIONS` for `/api/*` returns 204 with CORS headers before rate limiting | Keeps browser/API preflights from being counted or blocked. |
| API rate limiting | In-memory per-IP limiter, with higher allowance for public feed paths | Protects write/API routes while avoiding false 429s for public read-only feeds. |
| Admin/API auth | `AUTH_RULES` gates `/api/admin/*`, debug, plugin/key mutation, import, webhook delivery, performance reset, and paper-trading reset paths | Protects privileged mutation and diagnostics routes. |
| Admin auth fallback | Production fails closed when `ADMIN_SECRET` is missing; development fails open with a warning | Prevents production admin surfaces from becoming open by misconfiguration. |
| Bearer/cookie grants | Accepts signed admin sessions and constant-time raw `ADMIN_SECRET` bearer tokens | Supports browser admin and operator/API workflows. |
| Security headers | Applies X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS, and report-only CSP | Provides global baseline security posture for pages and API responses. |
| Matcher | Covers `/api/:path*` plus pages except static/image/favicon/service-worker/manifest assets | Determines which requests receive auth, limits, and headers. |

## Decision this run

Do **not** rename `apps/web/middleware.ts` autonomously in this run.

Reasoning:

- The warning is real and reproducible, but the current file protects admin auth, write-route mutation surfaces, rate limiting, CORS, and global security headers.
- `docs/ai-improvement/build-typecheck-parity.md` already marks middleware/proxy renames and route behavior changes as owner/Fatin-reviewed work.
- A rename is likely straightforward, but without a focused matcher/behavior characterization test, a subtle matcher or export mistake could silently remove global coverage.
- The safest 30-minute increment is therefore a docs-only preflight and future verification plan.

## Future owner/Fatin-approved migration plan

1. **Add characterization before rename**
   - Use `next/experimental/testing/server` and the exported `config` to assert that proxy/middleware coverage includes:
     - `/api/health`
     - `/api/admin/social-queue`
     - `/api/webhooks/deliver`
     - `/dashboard`
     - `/embed/XAUUSD`
   - Assert static exclusions remain excluded:
     - `/_next/static/...`
     - `/_next/image?...`
     - `/favicon.ico`
     - `/sw.js`
     - `/manifest.json`
   - If direct function tests are added, account for the module-level rate-limit cleanup timer in `apps/web/middleware.ts` so the Jest process does not retain open handles.

2. **Apply the convention migration only after review**
   - Preferred: run the official codemod from the repo root and review the diff.
   - Equivalent manual diff, if chosen:
     - move `apps/web/middleware.ts` to `apps/web/proxy.ts`;
     - rename `export async function middleware` to `export async function proxy`;
     - keep `export const config` unchanged unless tests prove a matcher update is required.

3. **Verify behavior and warning cleanup**
   - `npm run typecheck:web`
   - `npm run build --workspace=apps/web`
   - Confirm the build no longer prints the middleware-to-proxy deprecation warning.
   - Confirm the build still reports a single `ƒ Proxy` route surface.
   - Run the new matcher/behavior tests.
   - Run any low-risk admin/API smoke that does not require production secrets.

4. **Keep these out of scope unless separately approved**
   - Changing admin auth rules, `ADMIN_SECRET` semantics, session-token semantics, rate-limit thresholds, CORS policy, security headers, matcher coverage, deploy targets, env vars, DB/schema, trading/tier rules, or Docker Compose topology.

## Current verification snapshot

```text
npm run build --workspace=apps/web
→ exit 0.
→ Next.js 16.2.6 compiled successfully in 11.2s and generated 332 static pages.
→ Reproduced warning: `The "middleware" file convention is deprecated. Please use "proxy" instead.`
→ Existing unrelated warnings also remain: multiple lockfiles/workspace-root inference, four Turbopack/NFT unexpected-file trace warnings through `apps/web/next.config.ts` → `apps/web/lib/signals-live.ts` → `apps/web/app/api/signal-of-the-day/route.ts`, repeated Node `url.parse()` deprecation warnings, and edge runtime disabling static generation for one page.
```

## Recommended next move

Safe autonomous follow-up, if Zaky/Fatin wants migration readiness before approval: add a test-only matcher characterization for the current `apps/web/middleware.ts` using Next's experimental proxy testing helpers, without renaming files or changing auth/rate/header behavior.

Owner/Fatin approval-required follow-up: perform the actual `middleware.ts` → `proxy.ts` convention migration and prove the warning is gone with `npm run build --workspace=apps/web` plus the matcher/behavior checks above.
