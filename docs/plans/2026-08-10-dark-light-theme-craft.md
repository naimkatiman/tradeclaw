# Dark + light theme craft pass

Date: 2026-08-10
Surface: marketing layer-1 (homepage) via the shared token layer in `apps/web/app/globals.css`
Register: brand (PRODUCT.md)

## Problem

Measured in a real browser at 1600x900 on `/` (contrast ratios, WCAG 2.x formula):

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
canvas and is applied unchanged to light.

- `.premium-terminal` — `0 30px 90px rgba(0,0,0,0.34)` plus a white inset
  highlight. On a near-white canvas that 90px black blur is the muddy grey halo
  visible around the hero terminal, and the white inset is invisible.
- `.glass-card` — same white inset, plus a `white 4%` gradient lift that is a
  no-op on a white card.
- `.premium-button-primary:hover` — `0 12px 30px rgba(0,0,0,0.24)`.
- `--hero-grid-dot` light is `rgba(16,185,129,0.09)`; on `#f4f7f8` it is
  effectively invisible, so the hero loses its grid entirely in light.
- `CostFieldScene` grid is hardcoded `0x9ca3af @ 0.14` in both themes. The hero's
  primary imagery does not respond to the theme at all.

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

### 1. Border + surface retune (both themes)

Two tiers, unchanged names so every existing consumer inherits the fix:

- `--border` — hairline / internal divider. Target ~1.6-1.8:1.
- `--border-strong` — component frame. Target ~2.7-2.9:1 (WCAG 1.4.11 asks 3:1
  for boundaries required to identify a component; the frames now sit at that bar).
- Dark `--bg-card` lifts from `#090c0e` to `#151c1f` (1.04 -> 1.18 vs canvas).

### 2. Theme-split elevation tokens

New `--shadow-panel`, `--shadow-raised`, `--surface-highlight`, `--surface-lift`,
defined per theme and consumed by `.premium-terminal`, `.glass-card`,
`.glass-nav`, `.premium-button-primary`.

- Light: tight, low-alpha, hue-tinted shadows. `--surface-highlight` is
  `transparent` so the white inset stops washing top edges.
- Dark: deep diffuse shadow plus the inset top highlight retained.

### 3. Light-mode atmosphere

`--hero-grid-dot` moves to the accessible dark emerald at a workable alpha so the
hero grid reads as drawn lines. The generated sculpture gets a light-specific
contrast filter so it reads as a mark rather than fog.

### 4. Theme-aware Cost Field

`CostFieldScene` reads its grid colour and opacity from the live theme and
re-reads on theme change (MutationObserver on the `dark` class). Dot colours stay
`#10b981` / `#f43f5e` per DESIGN.md ("canvas/WebGL mark") in both themes.

## Non-goals

- The forced-dark navbar and footer (`.premium-dark-chrome`) stay. That is a
  shipped identity decision in DESIGN.md, not a defect.
- No change to signals, ledger maths, copy, routes, deps, or schema.

## Verification

1. Re-measure all token pairs in-browser, both themes, assert the new floors.
2. Homepage at 1600x900 and 390x844, both themes, zero console errors, no
   horizontal overflow.
3. A layer-2 route (`/research`, `/track-record`) in both themes to confirm the
   token change does not regress product surfaces.
4. `next build` green; web typecheck green; lint no new errors.

## Blast radius

`globals.css` tokens are consumed app-wide. That is intentional: the defect is
global. Verification therefore covers layer-2 routes, not just the homepage.
