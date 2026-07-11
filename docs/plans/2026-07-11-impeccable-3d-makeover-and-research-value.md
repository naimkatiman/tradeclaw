# Impeccable 3D makeover + research-value surfaces

Date: 2026-07-11
Owner request: "improve or replace the ui ux with 3d model animation and graphics — full makeover — and make the repo give real value people can use in the real world; we provide the data, the user uses it."
Branch: `worktree-impeccable-3d` off `origin/main` @ de242989.
Parent plan: `2026-07-07-free-open-source-transparency-pivot.md` (Phase 5 backlog). Design context: `PRODUCT.md` + `DESIGN.md` (added in this branch).

## Goal

1. Rebuild the homepage hero around a data-driven 3D scene ("the Cost Field") that renders every resolved sized trade at its gross R and lets the real recorded cost drag the cloud below zero. 3D as evidence, not ornament. Zero hardcoded numbers.
2. Ship the real-value surfaces from pivot Phase 5: `/research`, `/methodology`, `/why-long-term`, `/open-data`. These are the "we provide the data" product.

## Assumptions

1. `three` (vanilla, no react-three-fiber) is an authorized new dependency — the owner explicitly asked for 3D. Kept to one runtime dep; lazy-loaded client-side only.
2. Route `/data` is taken (user export/import tool); the public datasets page is `/open-data`.
3. Hero copy uses the owner's own Phase 4 draft direction ("we measured it honestly; it loses") — final wording is owner-approvable at PR review.
4. The pivot plan doc itself is untracked in the main checkout and owned by another session; this branch does not commit it. Citation content is embedded directly in `/why-long-term` with primary-source attribution.
5. New pages ship EN-only; locale routing falls back to EN (pivot Phase 4 owns translations).

## Data contract for the 3D hero

New endpoint `GET /api/research/cost-field`: reuses `getResolvedSlice` (`apps/web/lib/signal-slice.ts`) and the exact cost math of `/api/signals/equity` (`costEstimatePct` with `costModelFor` fallback). Returns compact parallel arrays: `t[]` (timestamps), `grossR[]`, `costR[]`, `cls[]` (0 crypto / 1 metals / 2 fx), plus the same `summary` block the equity route computes, 60s s-maxage. No new math — gross R and cost R per trade are the equity route's own primitives.

## Commits (one concern each, ≤15 files)

1. `docs(design): impeccable context files + makeover plan` — PRODUCT.md, DESIGN.md, this doc.
2. `chore(deps): add three for the data-driven hero scene` — apps/web package.json + lockfile.
3. `feat(api): cost-field endpoint exposing per-trade gross/net R` — route + unit test.
4. `feat(web): 3D cost-field hero — the finding, rendered` — CostField client component (lazy, DPR≤2, instanced points, IntersectionObserver + visibility pause, dispose on unmount), static-canvas reduced-motion/no-WebGL fallback, hero rebuild in page.tsx + proof-hero rework, Big Shoulders display font in layout.tsx + globals.css token.
5. `feat(web): /methodology — how the numbers are made` — R-multiples, isCountedResolved, per-asset cost table, provenance. Sources: lib/stat-hints.ts, docs honesty contract, backtest-options.
6. `feat(web): /why-long-term — the external evidence, correctly attributed` — citation pack (SPIVA, Barber & Odean 2000, Barber/Lee/Liu/Odean 2009, Chague et al., DALBAR w/ caveat, EU-regulators-via-ESMA 2018 + FCA, Bryzgalova et al. 2023, BIS WP 1049, SEC v. Robinhood 2020, PDT rule in past tense).
7. `feat(web): /research — what we tested and killed` — verdicts, BTC-sleeve kill, carry decay, registry rendering; links to raw artifacts.
8. `feat(web): /open-data — every dataset, machine-readable` — API index + artifact downloads; navbar/footer wiring for all four pages.

## Verification

- Per commit: `npm run typecheck:web`; targeted `npm test` for touched routes.
- End: full `npm test`, `next build` for apps/web, dev-server visual pass (dark + light, mobile width, prefers-reduced-motion) on `/`, `/research`, `/methodology`, `/why-long-term`, `/open-data`.
- Honesty gate: grep the diff for hardcoded R/return/win-rate literals in JSX — none allowed outside tests; every displayed stat traces to an API or committed artifact.

## Deferred (logged, not done here)

- Pivot Phase 3 (legacy quarantine) and Phase 4 (README/OG/i18n/telegram rebrand).
- Dashboard/product-register makeover beyond shared tokens.
- Calibration panel + decay retirement ledger (pivot Phase 5.6/5.7).
- Translations of the new pages.
