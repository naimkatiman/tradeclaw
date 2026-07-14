# SLC Motion Polish — Design Spec

Date: 2026-07-13
Status: Approved (auto mode, visible reasoning in session)
Goal: Elevate the public marketing surface of tradeclaw.win to top-1% visual quality — full animation, parallax, richer 3D presence — while staying simple, lovable, and complete. Requested by owner: "improve tradeclaw site, search mobbin and implement like the 1% top percent that have full animation, parallax, 3d, assets — make it simple, lovable, and complete."

## Research inputs

Mobbin references (studied 2026-07-13):

- Fey — dark restraint, one luminous 3D object, evidence-as-light: https://mobbin.com/screens/2e3533e4-07db-412c-a52e-8d71f3f32915
- Linear — ghosted data panel behind stat chips: https://mobbin.com/sites/sections/7a5a9c52-f69d-4f55-a2da-a0fa4b289438
- Coda — full-viewport odometer counters ("the numbers speak for themselves"): https://mobbin.com/sites/sections/1b8a5274-5924-4198-a962-4482aeebc06f
- GitHub — code block paired with 3D data viz: https://mobbin.com/sites/sections/e36f0a2d-c4fa-4ae9-b2eb-730aa440d508

Conclusion: the top 1% in this category (finance/dev tools) win through **precision motion** — restrained, physical, purposeful — not through loud agency effects. This aligns exactly with DESIGN.md ("the finding is the brand", house easing, no bounce).

Repo recon (5-agent parallel sweep, 2026-07-13): design tokens and constitution are mature (globals.css @theme + DESIGN.md); the Cost Field WebGL hero is well-engineered (instanced points, DPR cap, IntersectionObserver pause, reduced-motion static fallback). The real gaps:

1. No scroll choreography or parallax anywhere; sections pop in with no rhythm.
2. Motion utilities exist but `prefers-reduced-motion` covers only 3 of 8+ (ticker-scroll, animate-fade-up, pulse-dot, slide-left/right, stagger-item uncovered).
3. `useReducedMotion` / IntersectionObserver / WebGL-probe logic is inlined 4× (CostFieldHero, BenchmarkClient, assets-showcase, social-proof) — no shared motion kit.
4. 404 / error / loading pages predate the design system: hardcoded `#0a0a0f` dark-only palette, no Navbar, no display type, spinner instead of skeleton (DESIGN.md bans spinners).
5. Metadata gaps: /why-long-term and /open-data have no openGraph; 3 of 4 pivot pages lack canonical. The shareable pages have the weakest share cards.
6. Homepage amber disclaimer uses `text-amber-200/90` with no light-mode variant (near-invisible on white).
7. Zero e2e coverage for the four pivot pages.

## Decisions

### D1 — Zero new runtime dependencies

Parallax and scroll reveals use **CSS scroll-driven animations** (`animation-timeline: view()` / `scroll()`) behind `@supports`, degrading to static-visible. Count-ups and magnetic hover use a small hand-rolled client kit (~300 LOC total). Rejected: framer-motion/motion (~40 kB) and GSAP (~60 kB, imperative) — both replicate what CSS + the kit achieve, against a repo that deliberately hand-rolls motion, ships zero-client-JS pivot pages, and budgets its bundles.

**Correctness invariant:** base classes never set `opacity: 0`. All hide-then-reveal styling lives inside `@supports (animation-timeline: view())` so unsupported browsers and reduced-motion users always see content. This invariant is e2e-tested.

### D2 — Motion system, not per-page hacks

New utilities in globals.css (house curve `cubic-bezier(0.32, 0.72, 0, 1)`, no bounce):

- `.reveal` — fade + 16px rise as element enters viewport (animation-range entry), once.
- `.reveal-stagger > *` — children cascade with 60ms steps (max 6 children budget).
- `.parallax-drift-slow` / `.parallax-drift-fast` — decor-layer translateY drift bound to scroll timeline (used on aurora orbs / hero grid only, never on text).
- Blanket `prefers-reduced-motion: reduce` guard covering **all** house animation utilities (fixes gap #2).

New shared kit `apps/web/components/motion/`:

- `use-reduced-motion.ts` — extracted from CostFieldHero (single source).
- `use-in-view.ts` — consolidated IntersectionObserver hook.
- `animated-number.tsx` — count-up to a real value when scrolled into view; Geist Mono tabular-nums; reduced-motion renders the final value instantly; the real value is server-rendered as text and JS only animates it (no content loss without JS).
- `magnetic.tsx` — ≤6px pointer-follow translate on the single primary CTA; rAF spring; disabled on touch and reduced motion.

DESIGN.md Motion section is amended in the same PR: scroll-linked section reveals are allowed as a *system* (one consistent treatment, ≤450ms, once per section); the "one orchestrated entrance per page" rule now applies to load-time entrances only.

### D3 — Homepage choreography (apps/web/app/page.tsx + proof-hero.tsx)

- Hero: headline lines get the one load-time staggered entrance (existing fadeUp utility, CSS only). Ledger values become `AnimatedNumber` count-ups. Primary CTA wrapped in `Magnetic`. The Cost Field container gets a subtle scroll parallax wrapper (CSS transform only — the scene internals are not touched).
- Sections below the fold (`LiveHeroSignals`, `LiveActivityStrip`, `LiveDemoEmbed`, `HowItWorks`, `EmailCTA`, `FAQAccordion`) get `.reveal` treatment at the wrapper level — no rewrites of the sections themselves.
- Fix amber banner light-mode: `text-amber-700 dark:text-amber-200/90` (matches pivot pages).

### D4 — Pivot pages stay zero-JS

/research, /methodology, /why-long-term, /open-data receive `.reveal` classes only (pure CSS ⇒ still zero client JS) plus completed metadata: canonical + openGraph on all four. No content changes.

### D5 — Complete the brand states

- `not-found.tsx`: token-driven, Navbar-less but branded — claw logo, Big Shoulders display headline "404 — NO EDGE FOUND HERE EITHER.", subline in house voice, links to `/` and `/research`. Works in both themes.
- `error.tsx`: same token treatment ("Something broke. Unlike our results, this is fixable."), keeps `console.error` (allowed by compiler.removeConsole config).
- `loading.tsx`: skeleton blocks matching the hero layout (DESIGN.md: skeletons, not spinners), token-driven.

### D6 — Tests

- New `tests/e2e/features/pivot-pages.spec.ts`: all four pivot pages render h1 + navbar; canonical + og:title present.
- New `tests/e2e/features/brand-states.spec.ts`: 404 page shows branded headline and home link.
- Extend landing coverage: with reduced-motion emulation, hero + section content is visible (the D1 invariant).

## Out of scope (deferred, logged)

- New homepage sections (odometer stat band) — the page already tells the story; adding sections violates "simple".
- Touching the Cost Field shader/scene internals.
- The other ~180 product pages.
- `animated-chart-hero.tsx` offscreen-pause fix (not mounted on the public marketing surface; follow-up note).
- images.remotePatterns / remote asset pipeline — no remote images needed under D1.

## Risks

- CSS scroll-driven animation support: acceptable — degradation is static-visible content, verified by e2e.
- Concurrent sessions: all work in worktree `slc-motion-polish` branched from origin/main b6dd0ff4; base re-verified before push.
- `typescript.ignoreBuildErrors: true` means `next build` green ≠ types green — `tsc` runs as a separate gate.

## Verification

1. `npx tsc --noEmit` (apps/web) green.
2. `npm run lint` (apps/web) green.
3. `next build` green in the worktree.
4. Targeted Playwright: existing landing specs + new pivot/brand-state/reduced-motion specs green.
5. Visual QA via Playwright screenshots: dark + light, desktop + iPhone 14, reduced-motion on/off.
