# Dark + light theme craft pass

Date: 2026-08-11
Surface: the shared token layer in `apps/web/app/globals.css` (all routes inherit)
Register: brand (PRODUCT.md)

## Problem

Measured in a real browser at 1600x900 (contrast ratios, WCAG 2.x formula):

| pair | light | dark | note |
|---|---|---|---|
| `--border` on `--bg-card` | 1.30 | 1.23 | dividers that carry the ledger/explore grid structure |
| `--border-strong` on `--bg-card` | 1.57 | 1.71 | component frames (terminal, ledger, explore) |
| `--bg-card` on `--background` | 1.08 | 1.04 | panels do not read as their own plane |
| `--surface-inset` on `--background` | 1.11 | 1.02 | terminal interior |
| `--text-secondary` on `--background` | 5.30 | 7.06 | passes |
| `--brand` on `--bg-card` | 5.48 | 10.20 | passes |

Text colour is not the problem. **Structure and elevation are.** Surfaces do not
separate from the canvas, and the lines meant to do the separating sit at
1.2-1.7:1 in both themes. The page reads as one flat sheet.

Compounding it: every atmospheric primitive was calibrated against the near-black
canvas and applied unchanged to light.

- `.premium-terminal` — `0 30px 90px rgba(0,0,0,0.34)` plus a white inset
  highlight. On a near-white canvas that 90px black blur is a muddy grey halo
  around the hero terminal, and the white inset is invisible.
- `.glass-card` — same white inset, plus a `white 4%` gradient lift that is a
  no-op on a white card.
- `.premium-button-primary:hover` — `0 12px 30px rgba(0,0,0,0.24)`.
- `--hero-grid-dot` light is `rgba(16,185,129,0.09)`; on `#f4f7f8` it is
  effectively invisible, so the hero loses its grid entirely in light.
- `CostFieldScene` grid is hardcoded `0x9ca3af @ 0.14` in both themes. The hero's
  primary imagery does not respond to the theme at all.
- `.premium-dark-chrome` overrides only 5 tokens, so a descendant of the
  forced-dark nav reading `var(--text-secondary)` gets the *light* value on a
  light page: measured 1.35:1 for the nav clock.

## Approach

Fix at the token and primitive layer so all routes inherit it. No component
restructuring, no copy changes, no data-layer changes.

Light and dark get different definition strategies, because they behave
differently:

- **Light = ink on paper.** Definition comes from borders. Surfaces stay close
  together (contrast ratio is a poor metric for near-white separation), and the
  border tiers carry the structure.
- **Dark = emission.** Definition comes from surface luminance lift. `--bg-card`
  is raised off the canvas so panels read without a bright wireframe edge, and
  borders rise to a quiet-but-present tier.

1. **Border + surface retune.** Same token names, so every existing consumer
   inherits it. `--border` ~1.6-1.8:1, `--border-strong` ~2.7-2.9:1, dark
   `--bg-card` `#090c0e` -> `#151c1f` (1.04 -> 1.18 vs canvas).
2. **Theme-split elevation.** New `--shadow-panel` / `--shadow-raised` /
   `--shadow-pop` / `--surface-highlight` / `--card-gradient-top`, consumed by
   `.premium-terminal`, `.glass-card`, `.premium-button-primary`. Light sets
   `--surface-highlight: transparent` so the white inset stops washing top edges.
3. **Light-mode atmosphere.** `--hero-grid-dot` moves to the accessible dark
   emerald so the hero grid reads; the grid mask becomes radial so it dissolves
   on every side instead of cutting off at the shell edge.
4. **Theme-aware Cost Field.** `CostFieldScene` reads its grid colour/opacity
   from the live theme and rebuilds on theme change (MutationObserver on the
   `dark` class, guarded so it only rebuilds when the resolved tokens differ).
   Dot colours stay `#10b981` / `#f43f5e` per DESIGN.md in both themes.
5. **Complete `.premium-dark-chrome`** with the full dark palette.

## Non-goals

- The forced-dark navbar and footer stay dark. That is a shipped identity
  decision in DESIGN.md, not a defect.
- No change to signals, ledger maths, copy, routes, deps, or schema.

## Known-remaining (not addressed here)

Auditing `/dashboard` in light mode found ~40 sub-AA text nodes that predate this
change and are not token-driven. Two distinct causes:

1. The light-mode override layer remaps `text-white/60` to dark text but also
   applies **inside** `.premium-dark-chrome`, so dark text lands on the dark nav
   (1.04:1). The clean selector fix (`:not(.premium-dark-chrome *)`) silently
   drops the whole rule on Safari <16.4; the zero-risk alternative is ~50
   explicit restore rules. Deferred as its own change.
2. Components hardcode `text-white` (e.g. `guided-tour.tsx`), which the override
   layer deliberately never remaps — white on a light card.

## Verification

1. Re-measure all token pairs in-browser, both themes, against the new floors.
2. Homepage at 1600x900 and 390x844, both themes: no overflow, no console errors.
3. Layer-2 routes (`/research`, `/dashboard`) in both themes to confirm the token
   change does not regress product surfaces.
4. `next build` green; web typecheck green; lint no new errors.
