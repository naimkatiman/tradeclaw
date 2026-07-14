# SLC Motion Polish — Implementation Plan

Spec: docs/superpowers/specs/2026-07-13-slc-motion-polish-design.md
Branch: feat/slc-motion-polish (worktree .claude/worktrees/slc-motion-polish, base origin/main b6dd0ff4)

## Commit sequence (one layer per commit)

1. `docs(design): SLC motion polish spec + plan` — this doc + spec.
2. `feat(web): motion foundation — scroll-driven reveal/parallax utilities + full reduced-motion coverage` — globals.css + DESIGN.md Motion amendment.
3. `feat(web): shared motion kit — useReducedMotion, useInView, AnimatedNumber, Magnetic` — components/motion/* (4 files); CostFieldHero switched to the shared hook.
4. `feat(web): homepage motion choreography` — app/page.tsx, components/landing/proof-hero.tsx (reveals, count-up ledger, magnetic CTA, hero parallax wrapper, amber light-mode fix).
5. `feat(web): pivot pages — scroll reveals + complete social metadata` — research/methodology/why-long-term/open-data page.tsx (canonical + openGraph everywhere, .reveal classes; still zero client JS).
6. `feat(web): branded 404, error, and skeleton loading states` — not-found.tsx, error.tsx, loading.tsx.
7. `test(e2e): pivot pages, brand states, reduced-motion content invariant` — pivot-pages.spec.ts, brand-states.spec.ts.

Every commit ≤ 15 files. No `git add -A`; stage by explicit path.

## Task detail

### T2 — globals.css motion foundation
- Add `@supports (animation-timeline: view())` block: `.reveal`, `.reveal-stagger`, keyframes `revealUp`; `animation-range: entry 0% cover 30%`; `animation-fill-mode: both`.
- Parallax: `.parallax-drift-slow/-fast` using `animation-timeline: view()` translateY drift on decor layers.
- Replace the narrow reduced-motion block with a guard covering all house utilities (ticker-scroll, animate-fade-up, pulse-dot, slide-left/right, stagger-item, reveal*, parallax*, aurora, scanline).
- DESIGN.md: amend Motion section (scroll-reveal system allowed; load-entrance rule clarified).
- Verify: build + view homepage; disable animation-timeline support in DevTools → content visible.

### T3 — components/motion kit
- `use-reduced-motion.ts`: matchMedia hook, SSR-safe (defaults false, syncs on mount).
- `use-in-view.ts`: IO hook `{ once: true, threshold }`, SSR-safe, no-IO fallback = visible.
- `animated-number.tsx`: props `{ value: number, format?: (n: number) => string, durationMs?: number }`. Renders formatted final value as initial text (server-safe); on in-view + !reducedMotion, rAF eased count-up (house ease-out). Client component.
- `magnetic.tsx`: wraps a single child element; pointermove → target offset (max 6px), rAF lerp; pointerleave → return; skips on touch/reduced-motion. Client component.
- Switch CostFieldHero to import the shared `use-reduced-motion` (delete its inline copy — same-pass dead-code rule).
- Verify: tsc, lint.

### T4 — homepage
- page.tsx: wrap below-fold sections in `.reveal`; amber banner `text-amber-700 dark:text-amber-200/90`.
- proof-hero.tsx: kicker/headline/copy/ledger/CTAs get load-time stagger (`animate-fade-up` + delays); LedgerItem values → AnimatedNumber (sign/unit preserved via format fn — value+sign+cost-basis rule); primary CTA in Magnetic; Cost Field column wrapped in a `.parallax-drift-slow` container.
- Verify: dev server visual pass, both themes.

### T5 — pivot pages
- Four page.tsx files: add `metadata.alternates.canonical` + full `openGraph` (title/description/url); add `.reveal` to section wrappers.
- Verify: `curl` rendered HTML shows meta tags; pages still ship zero client JS (check build output/page bundle).

### T6 — brand states
- Rewrite not-found.tsx / error.tsx on tokens + display type + claw logo; loading.tsx becomes hero-shaped skeleton (animate-pulse blocks on --bg-card/--border).
- Verify: visit /nonexistent, force an error boundary in dev, throttle a route.

### T7 — e2e
- pivot-pages.spec.ts: for each of 4 routes: h1 visible, navbar visible, canonical link tag present, og:title present.
- brand-states.spec.ts: /definitely-not-a-page-9f3k → branded 404 headline + link home works. Landing with `reducedMotion: 'reduce'` emulation → hero h1 + HowItWorks section visible.
- Run: playwright targeted specs + existing landing/navbar specs.

## Gates before PR
tsc → lint → build → targeted e2e → visual QA screenshots (dark/light × desktop/mobile × motion/reduced) → typescript-reviewer subagent pass → reconcile base (origin/main may have moved) → push + PR.
