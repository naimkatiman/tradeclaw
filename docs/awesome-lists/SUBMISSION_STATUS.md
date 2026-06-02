# Awesome List Submissions — TradeClaw

Single source of truth for awesome-list submission status. Verified against live repos on 2026-06-02. Other files under `docs/awesome-lists/`, `docs/awesome-submissions.md`, and `community/awesome-submissions/` are older drafts and are superseded by this file.

## Facts that gate acceptance (verified 2026-06-02)

- Repo: https://github.com/naimkatiman/tradeclaw — public, MIT license, 28 stars
- First public release: v0.1.0 on 2026-03-25 (repo created 2026-03-21)
- Demo: https://tradeclaw.win/dashboard — live (client-rendered)
- Docker Compose deploy present; market data depends on an external feed (`MARKET_DATA_HUB_URL`, Binance fallback) → `depends_3rdparty: true` for awesome-selfhosted

## Status

| List | Repo (correct) | State | Reference |
|---|---|---|---|
| awesome-quant | wilsonfreitas/awesome-quant | MERGED, then duplicated; dedup PR open | #300 merged 2026-03-28; dedup [#399](https://github.com/wilsonfreitas/awesome-quant/pull/399) |
| awesome-systematic-trading | paperswithbacktest/awesome-systematic-trading | PR open | [#58](https://github.com/paperswithbacktest/awesome-systematic-trading/pull/58) |
| awesome-selfhosted | awesome-selfhosted/awesome-selfhosted-data | HOLD — too new | prior #2234 closed 2026-03-28 |
| awesome-trading (nickmack813) | — | DROP — repo 404 | does not exist |

## Detail

### 1. awesome-quant — done (+ dedup in flight)

- PR #300 ("Add TradeClaw — self-hosted trading intelligence platform") **merged** 2026-03-28. This created the first entry (tagged `JavaScript`).
- A second TradeClaw entry was later added to the same section, producing a duplicate (README lines 262 and 281 on `main`).
- Dedup **PR #399** removes the older `JavaScript` entry and keeps the accurate `Node.js`/`TypeScript` one with the demo link. No new submission needed.
- Note: upstream default branch is **main**, not master.

### 2. awesome-systematic-trading — submitted

- Correct repo is **paperswithbacktest/awesome-systematic-trading** (~8.3k stars). The `edarchimbaud/...` URL in older drafts is stale (redirects).
- There is **no** "Platforms and Frameworks" section. Entry placed in the **Trading bots** table (TypeScript precedent: R2 Bitcoin Arbitrager).
- **PR #58** open. Base branch **main**.

### 3. awesome-selfhosted — HOLD until ~2026-07-25

- The list is generated from the **awesome-selfhosted-data** repo. Entries are YAML files in `software/`, **not** a line edit to README.md. Older drafts describing a README edit are wrong and would be auto-rejected.
- Hard gate (CONTRIBUTING): the project must have been **first released more than 4 months ago**. TradeClaw released 2026-03-25, so the window opens **~2026-07-25**.
- Prior **PR #2234** ("Add TradeClaw - AI trading signal platform") was submitted 2026-03-28 and **closed unmerged** the same day — three days after release, against this rule.
- Ready-to-fire entry is staged at `community/awesome-submissions/tradeclaw.yml`. On/after 2026-07-25: fork awesome-selfhosted-data, add `software/tradeclaw.yml`, open one PR.

### 4. awesome-trading (nickmack813) — drop

- `nickmack813/awesome-trading` returns 404. Dead target. If a replacement "awesome-trading" list is wanted, identify a live, maintained repo first.
