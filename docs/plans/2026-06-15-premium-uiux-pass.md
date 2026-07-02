# Premium UI/UX Pass — TradeClaw web

Date: 2026-06-15
Owner: Naim
Status: Layers 1-3 done (L1 d617e97, L2 d143e6b, L3 this commit). PR #127 covers L1+L2. Long-tail deferred (see Out of scope).
Source audit: 8-agent fan-out `wf_2bbd7a93-25e` + hand review of design system and core surfaces, benchmarked against 28 Mobbin reference screens (Coinbase, OKX, TradingView, Public, Wealthsimple, Mercury, Airwallex, Neon, Vapi, Mixpanel).

## Goal

Make TradeClaw look and feel like a premium app without a rewrite. Current state scores ~24/40 on Nielsen heuristics and ~62/100 premium ("competent engineering, junior design"). The honest-metrics product is the moat; the visual shell undersells it.

Direction chosen by owner (2026-06-15):
- First lever: **color discipline** (de-emerald the chrome).
- Scope: **top-3 quick wins** (token split, type floor, nav/banner declutter).
- Brand: **keep dark + emerald identity, disciplined.** Emerald becomes data-only; chrome goes neutral. Reference: Neon / Vapi / Mixpanel (dark done right).

## Root causes (from audit)

1. Emerald used as chrome, not data. 1,807 emerald classNames, 780 emerald borders/rings across 240 files, 254 glass/glow usages, emerald scrollbar + focus rings + nav.
2. Cramped, generic typography. `text-[8px]/[9px]/[10px]` everywhere, Geist defaults, no display face, no confident big-number headline.
3. Decorative overload. Global grain overlay (z-100), aurora orbs, scanline, glow, glassmorphism on every card.
4. IA / chrome clutter. 36-link nav "More" dropdown; 5 competing mobile banners; duplicate onboarding systems; emoji-as-icons; no spacing/radius scale; brittle 85-rule light-theme override.

## Token reality check

Project is on Tailwind v4 (CSS-first: `@import "tailwindcss"` + `@custom-variant`, no `tailwind.config`). New scales and semantic colors go in an `@theme` block in `apps/web/app/globals.css`, surfaced as utilities (e.g. `bg-up`, `rounded-card`).

## The three layers (one commit each, by layer per global rules)

### Layer 1 — Color + scale tokens (this pass)

Restructure `apps/web/app/globals.css`:

Directional data (the ONLY home for green/red):
- `--up: #10b981` / `--up-soft: rgba(16,185,129,.12)` — BUY, price up, TP, positive P&L
- `--down: #f43f5e` / `--down-soft: rgba(244,63,94,.12)` — SELL, price down, SL, negative P&L

Brand (reserved, sparing — primary CTA + logo + active nav only):
- `--brand: #10b981` / `--brand-contrast: #050505`

Interactive chrome (NEW, neutral — replaces emerald on borders/rings/scrollbar/secondary):
- `--ring: rgba(255,255,255,.18)` dark / `rgba(0,0,0,.18)` light
- `--scrollbar: rgba(255,255,255,.18)` (was emerald `rgba(16,185,129,.3)`)
- `--glass-border-accent` neutralized (was emerald) so card hover stops glowing green
- glow utilities (`glow-emerald`, `text-glow-emerald`) reduced to hover-only / removed from default state

Scales (via `@theme`):
- Spacing: 8px base (4, 8, 12, 16, 24, 32, 48).
- Radius: `--radius-button` 8px, `--radius-card` 14px, `--radius-pill` 9999px.

High-traffic shared surfaces recolored in this pass (chrome emerald -> neutral, data emerald kept):
- `apps/web/app/globals.css` (scrollbar, glass-card hover accent, glow, focus default)
- `apps/web/app/components/navbar.tsx` (scrolled glow, focus ring, active states)
- `apps/web/app/dashboard/DashboardClient.tsx` (signal card chrome: borders/rings/hover, keep BUY/SELL + confidence colors)
- `apps/web/components/landing/ab-hero.tsx` (badge borders/glow chrome; keep the live signal data colors)
- `apps/web/app/track-record/TrackRecordClient.tsx` (cyan scope-tab escape -> neutral; chrome borders)

DEFERRED (long tail, logged not silently dropped): the remaining ~235 files with emerald chrome get swept in the full refactor, not this quick-win pass. Tracked as follow-up "emerald-chrome sweep (long tail)".

Verification: `npm run lint --workspace=apps/web`; Stop-hook tsc on changed TS; visual diff of dashboard + landing + track-record in dark and light; grep that scrollbar/focus no longer reference emerald.

### Layer 2 — Typography (done)

Done this pass:
- Killed the broken sub-9px floor: `text-[8px]` -> `text-[10px]` across all 6 files that had it (market-context-panel, trailing-week-band-callout, DashboardClient ×6, ScreenerClient, LeaderboardClient, StarHistoryClient = 15 occurrences). Mechanical, no data-vs-chrome judgment, so applied app-wide (unlike the color sweep).
- Track-record headline: confident big-number treatment (`text-5xl sm:text-6xl tracking-tight`), Wealthsimple `$140.00` reference.

Deferred (logged, not silent):
- Display face for h1/h2. Kept Geist on purpose — owner direction is "keep identity disciplined", and a font swap is an outward-facing brand change. Optional opt-in later.
- `text-[9px]` -> `text-[10px]` floor (borderline-readable; ~public surfaces have 1 each). Revisit with the long-tail.
- 12px label / 16px body floor app-wide: too aggressive for the dense trading tables (TradingView/OKX run ~11px there); needs per-component judgment, not a blanket bump.

### Layer 3 — Chrome declutter (done)

Done this pass:
- Removed the global grain overlay (body class in layout.tsx + the dead `.grain-overlay::before` rule in globals.css). App-wide.
- Removed the duplicate onboarding system: deleted `OnboardingOverlay` (top-center content-blocker) + its render in DashboardClient. OnboardingChecklist (root, bottom pill) remains the single onboarding surface.
- Navbar "More" mega-menu polish: divider section headers, muted icons, roomier rows, and fixed the light-theme bug (`hover:text-white` -> `hover:text-[var(--foreground)]`, was invisible in light mode). Kept width at 380px after a 600px/3-col attempt clipped the left edge on narrow viewports (the More button sits mid-nav).

Deferred (logged, not silent):
- Full mobile overlay coordinator (PWA / feature-unlock / star-progress / onboarding share the bottom corner). Needs a shared state machine + careful testing; higher risk than the rest. PWA prompt is already gated (7-day cooldown, standalone check, onboarding-panel check).
- Nav link-count curation (the ~37-link mega-menu). Which links to cut is a product decision — flagged for owner, not guessed.
- Aurora/scanline are opt-in per-surface already (not global like grain was), so left as-is.

## Out of scope (deferred, per owner scope choice)

- Full 240-file emerald-chrome sweep (long tail).
- Component-layer polish (emoji -> Lucide everywhere, ASCII pagination, badge hierarchy, empty/loading states).
- Surface-level recomposition (dashboard card accordion, pricing tier differentiation).
- Light-first rebrand / 85-rule override replacement.

## Execution notes

- Repo root `d:\Chatbot\tradeclaw` is shared with concurrent jobs. Implement in a git worktree (EnterWorktree + `npm ci`); never switch the root branch; main is integration-only.
- `packages/agent/dist` is force-tracked; stage explicit source paths, never `git add -A`.
- One commit per layer. Commit message leads with the observable outcome and cites this doc.
