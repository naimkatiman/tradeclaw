# Release Receipt — 2026-07-04 current-state snapshot

> This is a **state snapshot**, not a release. It records what is actually shipped in the repo as of the commit below, so future receipts have an honest baseline. Release-specific fields are marked "n/a (state snapshot)".

## Identity

| Field | Value |
|---|---|
| Repo | naimkatiman/tradeclaw |
| Version / tag | **Inconsistent — see "Version discrepancy" below** |
| Commit SHA | b8ad24d5c419dd848493be9a2c9fdf8ace1e0458 |
| Environment | n/a (state snapshot) |
| Released at (UTC) | n/a (state snapshot; snapshot taken 2026-07-04) |
| Owner | naimkatiman |

### Version discrepancy

Three version sources disagree. All three are stated here; none is silently picked as canonical:

- `package.json` (repo root): `0.1.0`
- `CHANGELOG.md` latest entry: `[0.5.0] — 2026-05-09`
- Newest git tag: `v0.4.0`

Follow-up (not done in this snapshot): reconcile the three on the next real release and record the chosen version in that release's receipt.

## What shipped (current state, verified in-repo)

- User-visible impact: AI trading signals dashboard (Next.js 14 + PostgreSQL) with backtest UI, Telegram alerting, and market-data hub integration is the shipped surface; live broker execution is not.
- RoboForex R StocksTrader bridge is **scaffold/interface-only**: `apps/web/lib/execution/rstockstrader-bridge.ts` throws `"rstockstrader-bridge: not implemented yet"` (implementation deferred to `docs/plans/2026-05-08-demo-roboforex-rstockstrader.md`).
- `SIGNAL_ENGINE_PRESET` currently **labels emitted signals only** — the live engine still generates with the `classic` profile regardless of preset; per-preset live generation is not wired (README, "Strategy presets" section).
- Feature flags changed: n/a (state snapshot)
- Migrations run: n/a (state snapshot)

## Verification

- Tests run: n/a (state snapshot — no release performed)
- Security scans run: n/a (state snapshot)
- Manual verification performed: facts above verified directly against the worktree at commit b8ad24d5 — `package.json` version field, `CHANGELOG.md` headings, `git tag` output, `rstockstrader-bridge.ts` throw site, README "Strategy presets" section.

## Risk

- Known risks accepted: version discrepancy above may mislead consumers of CHANGELOG/tags until reconciled; execution bridge advertised in plans but not implemented.
- Rollback command: n/a (state snapshot — nothing deployed by this receipt)
- Monitoring link: n/a (state snapshot)

## Sign-off

- [x] All fields above are filled (no blanks — "n/a (state snapshot)" used explicitly)
- [x] Rollback command was verified to exist (n/a — nothing deployed by this receipt)
