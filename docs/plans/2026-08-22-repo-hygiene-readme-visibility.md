# Repo hygiene, README, and public visuals

Date: 2026-08-22
Owner: local operator on `feat/premium-ui-overhaul`
Status: done locally; not committed

## Goal

Make the GitHub surface match the live product: inspectable trading research, cost-adjusted honesty, paused billing, visible brand art.

## Assumptions

- Stay on `feat/premium-ui-overhaul` at current HEAD. Do not wholesale-commit the dirty product dump.
- Live hosted truth is `https://tradeclaw.win` plus `/api/signals/equity?summaryOnly=1&scope=pro` as of 2026-08-22.
- Modeled sequential equity is not the observed track-record headline. Keep that split.
- D1 slow-gate is a live tracked simulated lane collecting evidence. It is not promoted and does not authorize broker execution.
- Alpha Screener is not the current hosted offer. Do not sell Pro, Elite, or a paid signal feed.
- Generated art must stay in the existing evidence-instrument language. No fabricated P&L, no fake UI copy.

## Snapshot used for README numbers

Source: `GET https://tradeclaw.win/api/signals/equity?summaryOnly=1&scope=pro`

- Eligible sized signals: 4,708
- Gross expectancy: 0.00R / trade
- Modeled round-trip cost: 0.564R / trade (~0.183% of size)
- Net expectancy: -0.56R / trade
- Hypothetical 1%-risk sequential result: -100%
- Rolling counted win rate (resolved): 36.3%

These are modeled or OHLCV-resolved research figures, not broker fills.

## Work

1. Ignore transients (`.playwright-mcp/`, `/tmp/`) and keep `.gitattributes`.
2. Park root screenshot junk out of the repo root.
3. Generate README stills and a short demo video from the existing instrument references.
4. Rewrite English README. Put a canonical-English notice on ja/ko/zh.
5. Align AGENTS.md key decisions with the live product. Do not revive TC-001-008 as current work.

## Out of scope

- Committing the 100+ dirty product files
- Resuming Stripe, pricing, or Alpha Screener as an active offer
- Changing trading rules, migrations, or production config
- Full translation rewrite of ja/ko/zh

## Verification

- README links point at live public surfaces, not `/pricing`
- Numbers are labeled modeled vs observed and dated
- New assets exist under `docs/assets/` and contain no readable fake metrics
- `git diff --stat` for this lane stays on docs, ignore rules, README, and AGENTS.md
