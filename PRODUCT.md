# Product

## Register

brand

Default register is brand: the public site's job is to communicate a finding, and the design is the argument. Authenticated and task surfaces (dashboard, settings, screener, tools) override to product per task.

## Users

1. Retail traders arriving from "trading signals" search intent. They expect hype and a paywall; the site's job is to show them the measured truth before they lose money elsewhere. Context: phone or laptop, evenings, skeptical but hopeful.
2. Self-hosters and developers who fork the repo, run the engine, and consume the public APIs and JSON artifacts. They need data access, methodology, and reproducibility, not persuasion.
3. Researchers, journalists, and skeptics auditing the claim. They need primary sources, machine-readable exports, and the full negative record.

## Product Purpose

TradeClaw is a free, open-source transparency engine. It built a real signal engine, ran it on 3,796+ production trades, charged every sized trade its modeled execution cost, and published the result: net expectancy is negative; single-asset short-term timing does not survive real costs. The product is the evidence: live cost-adjusted track record, the registry of killed strategies, the methodology, and downloadable data. Success = a visitor leaves understanding why turnover is a certain cost and holding is the rational default, and a developer can reuse our data pipeline for their own research.

## Brand Personality

Forensic. Unflinching. Generous.

Voice: a research lab publishing its own null result, proud of the rigor, not ashamed of the outcome. Never salesy, never doomer. Numbers are stated with sign and cost basis. Humor is dry and rare.

## Anti-references

- Our own retracted funnel: "+59.2% Historical PnL", "Stop renting your edge", fake 87%-confidence signal cards, paid-tier CTAs. Never resurrect any of it.
- Crypto-neon hype landing pages: rocket emojis, glow-everything, dark-with-acid-green "win rate" counters presented as profit promises.
- Generic SaaS template: centered hero, icon-title-text card grids, gradient text, hero-metric tiles.
- Editorial-confession aesthetic (display italic serif + ruled columns), the second-order reflex for "honest fintech". We are a lab, not a magazine.

## Design Principles

1. Data is the imagery. Every number on a public surface is fetched live from the same APIs the track record uses. Zero hardcoded results, ever. Charts, 3D scenes, and counters are all views over real endpoints.
2. The finding is the brand. Negative expectancy is shown in the hero, not buried in a footnote. Red is allowed to be the headline color when the data is red.
3. Both directions disclosed. Any comparison (engine vs hold, gross vs net) shows the unfavorable direction too. No cherry-picked windows.
4. Give the data away. Every chart offers the raw JSON next to it. The API and artifacts are first-class product surfaces, not an afterthought.
5. Earned dark. The observatory scene: a skeptical trader at night, and the evidence is the light source. Dark-first stays; light theme remains fully supported.

## Accessibility & Inclusion

- WCAG 2.2 AA. Contrast at least 4.5:1 for text on both themes.
- prefers-reduced-motion: all ambient motion and the 3D scene stop; a static render of the same data replaces WebGL.
- Direction (up/down, gross/net) is never encoded by color alone: signs, labels, and shape carry it too.
- Tabular numerals for all data. Keyboard-reachable interactive charts with text equivalents.
