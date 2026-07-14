# First-Layer Simplicity — Implementation Plan

Spec: docs/superpowers/specs/2026-07-15-first-layer-simplicity-design.md
Branch: feat/first-layer-simplicity (worktree slc-motion-polish, base origin/main 18531992)

## Commits

1. `docs(design): first-layer simplicity spec + plan` (+ DESIGN.md "Layering" note)
2. `feat(web): navbar minimal variant for the marketing surface` — optional `variant` prop, default 'full' (non-breaking); minimal = logo, locale, theme, "Open the app" link. Account and star controls stay on layer 2 so the first layer has no competing pills.
3. `feat(web): homepage becomes the first layer` — page.tsx = Navbar(minimal) + ProofHero + ExploreStrip; new components/landing/explore-strip.tsx; proof-hero drops the middle CTA pill; DELETE live-hero-signals, live-activity-strip, live-demo-embed, landing how-it-works, email-cta; new app/faq/page.tsx rendering FAQAccordion; footer gains /faq link.
4. `feat(web): gate floating widgets + MobileNav off layer-1 routes` — app/components/marketing-chrome-gate.tsx ('/', '/es', '/ms', '/zh'); layout.tsx wraps PWAInstallPrompt, MilestoneCelebrationModal, FeatureUnlockBanner, OnboardingChecklist, StarProgressBar, MobileNav.
5. `test(e2e): homepage/navbar specs match the two-layer contract`.
6. `fix(web): make the first fold legible to a new user` — plain-language outcome and product description, CTA before proof, causal cost equation, inline `R` definition, Cost Field labels, and a mobile first-viewport assertion.

## Gates
tsc → lint → root build → targeted e2e (chromium) → visual QA (dark/light × desktop/390px) → typescript-reviewer → push → PR.
