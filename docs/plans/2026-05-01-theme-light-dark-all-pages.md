# Light/Dark Theme — All Pages

## Goal
Every page in `apps/web/app/` renders correctly in both light and dark mode when the user toggles via the existing `ThemeToggle` in the navbar.

## Current state (audit, 2026-05-01)
- `next-themes` provider already wraps the tree (`apps/web/app/components/theme-provider.tsx`), `attribute="class"`, `defaultTheme="dark"`, `enableSystem`.
- `globals.css` defines full CSS-variable palettes for both `:root` (light) and `.dark`.
- `ThemeToggle` cycles dark → light → system.
- Pages that use `var(--background)`, `var(--foreground)`, `var(--bg-card)`, `var(--border)`, `var(--text-secondary)` switch correctly. Home page (`page.tsx`) and `screener/page.tsx` already work.
- Pages that use hardcoded Tailwind utilities (`bg-zinc-900`, `text-white`, `border-white/10`, `bg-white/5`) do NOT switch. Counts:
  - `bg-zinc-{700-950}` and `bg-white/X` overlays — ~1000+ instances
  - `text-zinc-{300-600}` muted text — ~1800+ instances
  - `border-white/X` and `border-zinc-{600-800}` — ~700+ instances
  - 184 files have at least one hardcoded color utility.

## Strategy
**Single-file CSS override layer** in `apps/web/app/globals.css`. Use `html:not(.dark) .<utility>` selectors (specificity 0,2,1) to remap the most common dark-only utilities to light-friendly values when light theme is active. Cascade specificity beats Tailwind's `.<utility>` (0,1,0) without needing `!important`.

Why not refactor every file:
- Workspace rule: no single commit >15 files. 184 files would require ~13 phased commits and weeks of work.
- 80/20 rule: a focused override layer fixes the visible breakage immediately.
- Future refactors can convert files to CSS-vars piecemeal without conflicting with the override layer (vars take precedence at the source, override only kicks in when raw utilities are used).

## What gets remapped in light mode

| Pattern | Light-mode value | Reason |
|---|---|---|
| `bg-zinc-900`, `bg-zinc-950`, `bg-zinc-800`, `bg-black` | zinc-100 → zinc-200 range | dark page/card backgrounds → light |
| `bg-white/X` (alpha overlays on dark bg) | `bg-black/X` equivalents | invert overlay direction |
| `bg-black/X` (modal/scrim overlays) | `bg-black/X` (kept) | scrims stay dark in both themes |
| `border-white/X` | `border-black/X` | invert |
| `border-zinc-{600-800}` | zinc-200 → zinc-300 range | invert |
| `text-zinc-{300-400}` (muted-bright) | zinc-600 → zinc-700 (muted-dark) | invert luminance, preserve hierarchy |
| `text-zinc-{500-600}` (muted-mid) | zinc-500 → zinc-600 (similar) | minor tweak |
| `text-white/X` | `text-black/X` equivalents | invert |
| `text-gray-{300-400}`, `text-neutral-{300-400}` | dark equivalents | invert |

## What does NOT get remapped (preserved as-is)

- `text-white` — frequently on colored backgrounds (emerald buttons, gradients). Preserving keeps contrast.
- `bg-white` — usually intentional white cards / pills. Preserve.
- `bg-black/X` — modal scrims. Should stay dark.
- `text-black` — usually on light/colored backgrounds. Preserve.
- All `text-emerald-*`, `text-rose-*`, brand accent colors — already theme-agnostic.

These edge cases will need per-component fixes if they look wrong, but they are the minority.

## Trade-offs / Known limitations

- A page with `bg-zinc-900 text-white` will render as light-zinc bg with white text in light mode → unreadable. Fix: page should use `text-zinc-100 dark:text-white` or CSS vars. We log these as deferred follow-up.
- Tailwind v4's atomic CSS gets cached aggressively — verify with hard refresh after deploy.

## Verification

1. `npm run build -w apps/web` — must pass.
2. `npm run dev -w apps/web` — visit:
   - `/` (home, already works) — confirm no regression
   - `/dashboard` — heavy hardcoded colors, should now switch
   - `/screener`, `/backtest`, `/blog` — sample of pages
3. Toggle `ThemeToggle` → confirm dark, light, system cycles work.
4. Check `prefers-color-scheme` system mode picks correct theme.

## Deferred (logged, not done in this pass)

- ⚠️ Per-page audit for `bg-<dark> text-white` combos that look wrong in light mode.
- ⚠️ Codemod to migrate hardcoded utilities → CSS variables (`--bg-card`, `--border`, etc.) across the 184 files. Multi-phase, separate plan.
- ⚠️ Audit gradient backgrounds and SVG fills that may use `#fff`/`#000` literals.

## Outcome

One commit, two files: this plan doc + `globals.css` override layer. All pages render in both themes; edge cases logged for follow-up.
