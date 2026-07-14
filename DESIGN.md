# Design

Visual system for tradeclaw.win. Source of truth for tokens is `apps/web/app/globals.css` (Tailwind v4 `@theme` + CSS variables). This file documents the system and the rules for extending it.

## Theme

Dark-first, light fully supported via `.dark` class + `next-themes`. Scene: a skeptical trader at night; the evidence (data) is the light source. Dark surfaces are near-black neutrals, never pure `#000`; light surfaces are warm near-white, never pure `#fff`.

- Dark: `--background: #050505`, cards `#0a0a0a`, borders `#1a1a1a`
- Light: `--background: #fafafa`, cards `#ffffff`, borders `#e5e7eb`
- A legacy light-mode override layer in globals.css remaps dark utility classes; new components should use semantic tokens directly instead of relying on it.

## Color

Strategy: Restrained on product surfaces; Committed on brand surfaces where the data itself carries the color.

- Direction only: `--color-up: #10b981` (emerald), `--color-down: #f43f5e` (rose). Green/red mean up/down and gross/net-positive/negative. Nothing else may be green or red.
- Brand emerald `#10b981` is reserved: single primary action, logo, active-nav marker.
- Cost and drawdown surfaces may headline in rose: the finding is the brand.
- Interactive chrome (borders, rings, scrollbar) is neutral, never emerald.
- Amber (`amber-500` family at low alpha) = disclosure/disclaimer callouts only.
- In WebGL scenes use the same two data hues as emissive points on the neutral dark field; the zero plane is neutral white/black alpha.

## Typography

- Body/UI: Geist Sans (`--font-geist-sans`), the shipped identity. Data and numerals: Geist Mono, always `tabular-nums`.
- Display (brand surfaces only): Big Shoulders (Google Fonts, variable weight 500–800), condensed industrial grotesque, used for hero headlines and section-opening statements in large sizes (clamp 2.5rem–6rem), tight leading, never below 28px, never in UI controls or body.
- Scale: brand surfaces fluid `clamp()` with ratio ≥ 1.25; product surfaces fixed rem scale ratio 1.125–1.2.
- Body line length ≤ 72ch. Light-on-dark body gets +0.05 line-height.

## Layout

- Brand pages: asymmetric, left-anchored compositions; one dominant idea per fold; generous vertical rhythm alternating with tight data clusters. No centered icon-card stacks.
- Product pages: predictable grid, standard top nav (existing `Navbar`), density welcome in tables.
- Radius tokens: buttons `0.5rem`, cards `0.875rem`, pills `9999px`. Converge ad-hoc values onto these.
- `.glass-card` / `.glass-nav` utilities exist; use sparingly and never as the default card.

## Components

- Stat displays: value + sign + cost basis label together (e.g. "−0.43R / trade, after modeled cost"). Never a bare big number with a small label (banned hero-metric template).
- Disclosure callout: amber-tinted full-border block, 12px, used for "this is not advice / not a profit claim" framing.
- Every chart/scene ships a "raw JSON" link to the endpoint that feeds it.
- Interactive states required on everything: default, hover, focus-visible (neutral ring `--ring`), active, disabled, loading (skeleton, not spinner), error, empty.

## Motion

- Easing: `cubic-bezier(0.32, 0.72, 0, 1)` (existing house curve) or ease-out-quart. No bounce.
- Product: 150–250ms state transitions only. Brand: one orchestrated *load-time* entrance per page max (existing `fadeUp` / stagger utilities), ambient drift (aurora orbs, scanline) already tokenized.
- Scroll choreography (brand pages): the `.reveal` system in globals.css — fade + 16px rise scrubbed by scroll via CSS `animation-timeline: view()`. One consistent treatment, applied at section level. `.parallax-drift-slow` gives imagery/decor layers scroll depth; never applied to standalone text. All of it is progressive enhancement inside `@supports`: browsers without scroll-timeline (and reduced motion) get static, fully visible content — no class may set `opacity: 0` outside the `@supports` block.
- Count-up numerals (`components/motion/animated-number.tsx`) animate only real data already server-rendered as text; magnetic hover (`components/motion/magnetic.tsx`) is reserved for the single primary action, ≤6px translate, fine pointers only.
- All ambient + WebGL motion gated behind `prefers-reduced-motion: reduce` with a static same-data fallback. The blanket guard in globals.css covers every house animation utility; new utilities must be added to it.

## 3D / WebGL language

- Purpose: 3D renders the real dataset, never decoration. One scene per page max, lazy-loaded client-side (`next/dynamic`, no SSR), `three` only (no react-three-fiber).
- The Cost Field (homepage hero): each resolved sized trade is an instanced point; Y = R multiple; a neutral zero plane separates profit from loss; the scene interpolates gross → net (cost applied) so the cloud visibly sinks below zero. Emerald above plane, rose below, same data hues as 2D.
- Budget: DPR capped at 2, points instanced, pause when offscreen (IntersectionObserver) and on hidden tab, full dispose on unmount. Target < 200KB gzipped for the three bundle chunk, < 100KB for the data payload.
- Fallback chain: WebGL unavailable or reduced-motion → static 2D canvas scatter of the same data → text summary of the same numbers.
