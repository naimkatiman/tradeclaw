# First-Layer Simplicity — Design Spec

Date: 2026-07-15
Status: Approved (auto mode, visible reasoning in session)
Owner feedback driving this: "the User interface is too complex... people not buying it. I want the first layer to be simple, lovable, and complete. The second layer you can have the complexity, like chatgpt.com."

## Diagnosis (recon, 4-agent sweep 2026-07-15)

The homepage stacks 8 sections (hero, live signals + amber banner, activity strip, demo embed, how-it-works, email CTA, FAQ) under a 7-cluster navbar (4 primary links + a 35-link More dropdown + locale + user menu + star + theme), and the root layout unconditionally mounts a floating-widget zoo on every route: StarProgressBar slides in after 5s for every visitor, PWAInstallPrompt after 30s, milestone confetti and unlock toasts for returning visitors. First-time visitors get interrupted before they read the finding.

Everything below the hero already exists deeper and better as layer-two routes: /how-it-works (full algorithm page), /demo (full interactive page), /live, /dashboard, /screener, /docs. Only the FAQ has no standalone route.

## The two layers

**Layer 1 — `/` (and localized `/es` `/ms` `/zh`):** one idea, one action, zero interruptions. Reference pattern: chatgpt.com, Runway, Sana AI (Mobbin, 2026-07-15).

- Minimal navbar variant: logo + wordmark · locale select · theme toggle · a single "Open the app →" link (/dashboard). No primary-links row, More dropdown, hamburger, sign-in control, or GitHub star pill competing with the hero action; account and repository controls remain one click away.
- The ProofHero IS the page: kicker, three-line headline, one paragraph, the 4-stat cost ledger, the Cost Field scene, two actions (primary "See the full track record", the GitHub source link). The middle "What we tested and killed" pill moves to the strip below.
- One "go deeper" strip — the doorway to layer 2, ledger rows not icon cards (DESIGN.md): Live app (/dashboard) · How it works (/how-it-works) · Research (/research) · Methodology (/methodology) · Open data (/open-data). Each row: title + one-line description + arrow.
- Global SiteFooter stays (it is the sitemap; conventional, below the fold).
- Floating widgets and MobileNav are gated OFF layer-1 routes via one client component (`MarketingChromeGate`, pathname-based — the StarProgressBar /embed precedent). Product routes unchanged.

**Layer 2 — everything else:** unchanged density. Dashboard, screener, docs, research, the full navbar, the widgets — complexity is welcome there.

## Removals (dead in the same pass)

Homepage-only components deleted (verified sole importer = app/page.tsx): live-hero-signals.tsx (+ amber banner moves with it — the live feed's transparency framing already exists on /live and /dashboard), live-activity-strip.tsx, live-demo-embed.tsx, how-it-works.tsx (landing variant; the /how-it-works route is the real one), email-cta.tsx (newsletter reachable at /subscribe + footer).

FAQ is content worth keeping → new thin route `/faq` renders the existing FAQAccordion (component kept, importer moves). Footer link added under Resources.

## E2E contract changes

- features/landing.spec.ts: "key landing sections" now asserts the go-deeper strip (link to /research visible) instead of FAQ text.
- features/navbar-ux.spec.ts: full-nav assertions (Track Record link, Live signals link, More dropdown) move to /track-record; homepage gains minimal-nav assertions (no More button, Open-the-app link → /dashboard, still zero tier badges).
- features/brand-states.spec.ts: unchanged — the strip carries `.reveal`, so the reduced-motion invariant still has a target.

## Out of scope (deferred)

- lib/hooks/use-user-tier.ts broken `\\api\\auth\\session` fetch (pre-existing bug found in recon — separate fix).
- The 56px mobile body padding reserved for MobileNav lingers on layer-1 mobile (harmless whitespace above footer).
- Localized landing content itself (LocalizedLanding) — untouched; only chrome gating applies to those routes.

## Verification

tsc, lint, root build, targeted Playwright (landing, navbar, brand-states, landing-proof, pivot-pages) green; visual QA dark/light, desktop/mobile; typescript-reviewer pass.

## New-user comprehension amendment

Owner follow-up after reviewing production: "still hard for new user to read. first impression fail."

- Replace the research-jargon headline with a two-line category and live outcome: "Open-source trading signals. Ours lost after costs." on tradeclaw.win. The outcome line follows the current environment's evidence so self-hosted instances never inherit the public deployment's result.
- Identify TradeClaw as an open-source BUY/SELL signal engine that can be inspected or self-hosted in the first paragraph; raise that paragraph to 16px.
- Move the primary action ahead of the detailed ledger so it remains inside a 390x844 first viewport.
- Replace the mixed-population win-rate/break-even tile with a reconcilable equation: before modeled costs, modeled fees + slippage, after modeled costs, and simulated compounded result.
- Define `R` inline and replace "notional" / "real cost" with plain, accurate modeled-cost language.
- Rename the Cost Field controls and caption so a cold visitor can understand what each dot and color means.
- Use theme-aware directional text colors that meet WCAG AA on the light and dark surfaces; keep the brighter hues for non-text chart marks.
- At 320px, tighten the header-to-hero spacing and keep the primary hero action fully inside a 320x568 first viewport.
