# Design

Visual system for TradeClaw. The token source of truth is `apps/web/app/globals.css` (Tailwind v4 `@theme` plus CSS variables). This document defines how those tokens become a coherent premium exchange experience and the rules for extending it.

## Core principles

1. **Evidence before persuasion.** TradeClaw earns trust by showing the dataset, assumptions, costs, sample size, timestamps, and limitations behind a claim. Marketing may simplify the explanation, but it must not outrun the proof.
2. **Null is a valid result.** No signal, insufficient data, flat performance, and failed validation are first-class outcomes. Never replace a null result with optimistic copy, an invented metric, or a positive-looking placeholder.
3. **Brand authenticity before reference matching.** Premium references may influence hierarchy, density, and motion, but TradeClaw keeps its original emerald identity. Emerald also carries positive/up data and rose carries negative/down data, always reinforced by labels and shape.
4. **Layer complexity deliberately.** Marketing establishes the product and proof; the application exposes the full terminal density one click deeper. Do not force app chrome onto the first marketing screen or dilute product screens into sparse SaaS cards.
5. **Data earns visual weight.** Charts, terminals, and WebGL exist to explain real data. Decoration must remain subordinate to evidence.

## Theme and canvas

TradeClaw uses a near-black/near-white exchange canvas with crisp contrast, quiet borders, and small amounts of emerald light. Dark mode is the signature presentation; light mode is fully supported and must preserve the same hierarchy.

- Dark canvas: `--background: #030506`; cards `#090c0e`; raised surface `#0e1316`; inset surface `#06090a`; borders `#1b2327` to `#303b40`.
- Light canvas: `--background: #f4f7f8`; cards `#ffffff`; raised surface `#edf2f4`; inset surface `#e6ecef`; borders `#dce3e6` to `#c5d0d5`.
- Prefer solid semantic surfaces and one-pixel borders. Glass, blur, glow, grids, and gradients are supporting atmosphere, never the default treatment for every panel.
- The legacy light-mode utility remapping in `globals.css` exists for compatibility. New components must use semantic variables rather than depending on that layer.

## Color semantics

### Brand and interaction

Original TradeClaw emerald is the brand color: `--brand`, `--brand-bright`, `--brand-soft`, and `--brand-glow`. The light theme uses accessible `#047857` for text and controls; the dark theme uses `#34d399`. Tints and opacity are variants of the same family, not additional accent colors.

Use emerald for:

- the logo and brand wordmark accent;
- active navigation and selected states;
- links, focus rings, interactive borders, chart cursors, and subtle hover fills;
- small live/system indicators when they do not express market direction;
- restrained grid, glow, and terminal-light cues.

Emerald may identify either the product or a positive/up result, so the surrounding label, sign, icon, and position must make the role explicit. Do not make every surface emerald. A primary CTA is deliberately neutral and high contrast: white with near-black text in dark mode, near-black with white text in light mode. Emerald belongs in focus, hover, selected, and supporting cues rather than becoming the default fill for every control.

### Directional data

Directional data uses the same restrained families:

- Up/positive: accessible text `#047857` in light mode and `#34d399` in dark mode; canvas/WebGL mark `#10b981`.
- Down/negative: accessible text `#be123c` in light mode and `#fb7185` in dark mode; canvas/WebGL mark `#f43f5e`.

Rose is never decorative, branded, selected, or merely "important." Always pair directional color with a sign, label, shape, or position so meaning does not depend on color alone. Supporting colors may remain when they communicate a distinct warning, integration, or feature category; they must not replace emerald in TradeClaw-owned assets, SVGs, or icons. Amber at low alpha is reserved for disclosure, warning, and disclaimer callouts.

## Typography

- **Display and UI:** Geist Sans (`--font-geist-sans`). Hero headlines, section openers, navigation, controls, and body copy all use the same family. Hierarchy comes from scale, weight, spacing, and contrast, not a decorative display font.
- **Data:** Geist Mono (`--font-geist-mono`) for prices, percentages, R multiples, timestamps, identifiers, code, and dense table values. Data uses tabular numerals.
- Marketing display type may be fluid with `clamp()` and tight leading. Product type uses a compact fixed scale that remains legible at terminal density.
- Keep body copy at or below `72ch`; use short proof-led paragraphs and direct labels. Avoid oversized type that pushes the evidence below the first fold.

## Product layering

### Layer 1: marketing

The homepage and localized marketing pages use a centered **1280px maximum shell** with responsive gutters. Compositions are left-anchored and controlled: clear claim, primary action, visible product proof, then deeper evidence. A terminal preview may be dense enough to feel real, but it must not inherit the full dashboard navigation or floating product widgets.

The first screen must name TradeClaw and its finding in plain language before introducing research terminology. On mobile, place the primary action before detailed proof. When performance is discussed, show the causal equation `gross result - modeled cost = net result` and define `R` inline.

### Layer 2: product

Dashboard, screener, strategy, trade, and analytics views are dense exchange terminals. Use compact toolbars, tight data tables, aligned mono numerals, clear row states, and persistent context. Density is welcome when grouping and hierarchy remain obvious; avoid turning product views into oversized marketing tiles.

Desktop product navigation lives at the top. Mobile product navigation is a fixed **five-item bottom bar** with an icon and a visible text label for every destination, a clearly marked active item, `56px` minimum bar height, and safe-area padding. Keep the five destinations stable; move secondary actions into the appropriate destination instead of adding a sixth item. Marketing pages stay free of the product bottom bar.

## Layout, shape, and depth

- Marketing sections align to the 1280px shell. Full-bleed atmosphere may extend beyond it, but copy, controls, and proof align to the shell grid.
- Product shells may use the viewport more aggressively. Prioritize table width, comparison, and scanning over decorative whitespace.
- Use restrained radii from **8px to 18px**: buttons `8px`, standard cards `14px`, and prominent terminal frames no more than `18px`. Full pills are for compact status, filter, and tag semantics only.
- Prefer one-pixel borders and tonal surface changes. Use shadows mainly to lift navigation, menus, dialogs, and a hero terminal from the canvas.
- `.glass-card`, `.glass-nav`, grid backgrounds, emerald glow, and terminal gradients are accents. Do not stack all effects on one surface or repeat them on every card.

## Components and content

- **Primary CTA:** high-contrast white/black polarity via foreground and background tokens. It is singular within a visual region and uses a direct verb.
- **Secondary actions:** bordered neutral surfaces; emerald may appear on hover, focus, or selection.
- **Terminal frame:** dense, real product content inside a strong border and restrained 18px radius. Decorative light must never obscure values or controls.
- **Stat display:** value, sign, unit, and cost basis stay together, for example `-0.43R / trade, after modeled cost`. A bare large number with a tiny qualifier is not acceptable.
- **Proof block:** cite source or endpoint, time range, sample size, modeled assumptions, last-updated time, and relevant limitation close to the claim. Do not use fabricated logos, testimonials, activity, or "live" labels.
- **Null/empty result:** distinguish "no result" from loading and error. Name why the result is empty or inconclusive, preserve the user's inputs, and offer a relevant next action without implying success.
- **Disclosure:** amber-tinted, full-border block at compact type size for risk, methodology, and "not advice / not a profit claim" framing.
- **Charts and scenes:** expose a raw JSON link to the endpoint feeding the visual. Tooltips and legends must show units and model status.
- **System states:** every interactive element needs default, hover, focus-visible, active/selected, disabled, and loading behavior. Data regions additionally need honest error, stale, permission, empty, and null-result states. Prefer a shape-matched skeleton to a blocking spinner.

## Trust and proof

Premium means precise, calm, and verifiable, not glossy. Trust is built through evidence visible at the decision point:

- Separate observed data, modeled values, and projections in labels and legends.
- Show data freshness and source provenance wherever recency changes interpretation.
- Keep costs and drawdowns at the same visual hierarchy as returns.
- Never cherry-pick a positive interval without making the range and comparison clear.
- Never render sample/demo values as live account data. Mark demo, delayed, simulated, stale, or unavailable states explicitly.
- Let a negative or null finding remain visually neutral and complete; epistemic honesty is a product feature.

## Interaction and accessibility

- All links, buttons, inputs, selects, and text areas must retain a visible `:focus-visible` treatment: a 2px emerald semantic `--ring` with a 3px offset. Do not remove it or rely on hover alone.
- Active and selected states require more than color: use a marker, border, weight, icon state, or label in addition to emerald.
- Maintain WCAG text contrast in both themes. Use the darker light-theme brand token for emerald text rather than the bright decorative emerald.
- Touch targets should be at least 44px in either dimension even when the visible control is compact. Bottom-nav labels must not disappear on small screens.
- Keyboard order follows visual order. Dialogs, menus, filters, tables, and chart controls must remain usable without a pointer.

## Motion

- Use `cubic-bezier(0.32, 0.72, 0, 1)` or a simple ease-out. No bounce.
- Product state transitions last about `150-250ms`. Marketing may use one orchestrated load entrance and subtle ambient movement.
- Scroll reveals are progressive enhancement. Content must be fully visible when scroll timelines are unsupported.
- Parallax belongs only on imagery or decoration, never standalone text. Count-up animation may animate only real values that are already server-rendered as text.
- Every ambient, scroll, count-up, ticker, and WebGL animation must honor `prefers-reduced-motion: reduce`. The reduced-motion version shows the complete static content, removes smooth scrolling, and never leaves an element transparent or transformed offscreen.

## 3D / WebGL language

WebGL is **data-only**. It may render a real dataset when depth or motion materially clarifies the finding; it is never a decorative hero background. Use one scene per page at most, lazy-loaded client-side with `next/dynamic`, no SSR, and `three` without react-three-fiber.

For the Cost Field, each resolved sized trade is an instanced point, Y is the R multiple, and a neutral zero plane separates positive from negative. The gross-to-net interpolation applies modeled cost so the cloud visibly shifts. Emerald and rose retain their directional meaning; a neutral high-contrast cursor identifies selection without inventing another hue.

Cap DPR at 2, instance points, pause offscreen and on hidden tabs, and fully dispose on unmount. Target less than 200KB gzipped for the Three.js chunk and less than 100KB for the data payload. The fallback chain is: WebGL scene -> static 2D rendering of the same data -> text summary of the same numbers. Reduced motion may skip interpolation, but it must not omit the evidence.
