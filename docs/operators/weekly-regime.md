# Weekly Regime — Operator Guide (Layer 1)

Every Monday the admin sets a directional bias per asset class. The system turns
that into a machine-readable Weekly Regime Card that the Telegram bot and Layer 2
read for the rest of the week. Each asset class is classified TRENDING or NEUTRAL.

This is a separate system from the algorithmic per-symbol `market_regimes` table.
That one is computed from price action per symbol. This one is human-set,
per-asset-class, once a week.

## The Monday ritual

1. Decide a bias and conviction per asset class: crypto, commodities, stocks,
   forex, indices.
2. Set it before Monday 12:00 MYT (Asia/Kuala_Lumpur). Either channel works:
   - Telegram: `/setregime <note>` then `/confirmregime`.
   - Admin panel: `/admin/weekly-regime`.
3. After the Monday 12:00 MYT lock, the week is locked. A post-lock change is
   admin-panel-only and requires an override plus a written reason.

## TRENDING vs NEUTRAL

The regime per class is always derived, never hand-set:

- NEUTRAL when bias is NONE, or conviction is 0. No clear edge / slow week.
  Mean-reversion, range, and income setups only. Aggressive directional
  pyramiding is disabled.
- TRENDING when bias is LONG or SHORT with conviction 1, 2, or 3. Catch the move
  before it runs. Satellite-aggressive setups are eligible.

So `crypto LONG conviction 0` is NEUTRAL, and `forex NONE conviction 3` is
NEUTRAL. Only a directional bias with conviction of at least 1 is TRENDING.

## Telegram commands

Writes (`/setregime`, `/confirmregime`) are admin-gated by `ADMIN_TELEGRAM_IDS`
(see Environment below). `/regime` is read-only and public.

### `/setregime <note>`

Parses a free-text note into a per-class card and replies a preview. Nothing is
written yet. The note format is comma-, semicolon-, or newline-separated phrases,
one per class you want to set. Classes you do not mention default to NEUTRAL.

Keyword families the parser understands:

- Class: crypto / btc / bitcoin map to crypto. gold / oil / commodity /
  commodities map to commodities. stocks / equities / equity map to stocks.
  forex / fx / eurusd / gbpusd / usd / currency map to forex. indices / spx /
  nasdaq / index / sp500 map to indices.
- Bias: long / bull / bullish / up / buy map to LONG. short / bear / bearish /
  down / sell map to SHORT. flat / neutral / range / sideways / chop / none /
  "no edge" map to NONE.
- Conviction: strong / high / max / conviction / aggressive give 3. medium /
  moderate give 2. weak / slight / small / low give 1. A direction with no
  qualifier defaults to 2. A NONE bias is always 0.

Examples (these parse cleanly):

```
/setregime crypto long strong, gold short medium, forex flat
/setregime crypto long strong, gold range, EURUSD short into NFP, indices flat, stocks neutral
```

If the note is ambiguous — conflicting directions for one class, or a class
mentioned with no parseable direction — the bot does not guess. It replies one
specific clarifying question. Resend `/setregime` with a clearer note.

### `/confirmregime`

Writes the pending preview for the current MYT week. The pending preview from
`/setregime` survives 5 minutes. If you wait longer, the stash expires and you
get "No pending regime to confirm" — just run `/setregime` again.

Post-lock behaviour: if Monday 12:00 MYT has passed, `/confirmregime` is rejected
with a message telling you a post-lock change needs an override plus reason via
the admin panel. The Telegram path cannot override the lock.

### `/regime`

Shows the current week's card: each class with its derived TRENDING / NEUTRAL,
bias, conviction, and thesis. Read-only, no admin gate. If no card is set yet it
replies "No regime card set for this week yet."

## Admin panel — `/admin/weekly-regime`

A per-class form (bias, conviction, thesis) with a live TRENDING / NEUTRAL
preview per row. Submitting confirms and locks the card for the current MYT week.
Auth rides the existing admin gate (email allowlist or `ADMIN_SECRET`), the same
gate that protects the rest of `/admin`.

This panel is the only place an override can happen. After Monday 12:00 MYT, tick
"Override post-cutoff lock", type a reason, and resubmit. Without both the
override box and a non-empty reason the write is rejected. The override and its
reason are recorded on the card and in the admin audit log.

## The Monday 12:00 MYT lock + override rule

- Asia/Kuala_Lumpur is a fixed UTC+8 with no daylight saving. Monday 12:00 MYT is
  04:00 UTC.
- Before the cutoff: set freely via Telegram or the admin panel. Override flags
  are ignored.
- At or after the cutoff:
  - Telegram `/confirmregime` is rejected. No override path on Telegram.
  - Admin panel accepts the write only with the override box ticked and a
    non-empty reason. Card and audit log record `override_used` and the reason.

The lock is per week. A new MYT week resets it, and writes flow freely again
until that week's Monday 12:00 MYT.

## Environment

- `ADMIN_TELEGRAM_IDS` — comma-separated numeric Telegram user IDs allowed to run
  `/setregime` and `/confirmregime`. Required for the bot to write. If unset or
  empty, every write command is denied (deny by default). `/regime` is unaffected.
- Admin panel auth — the existing admin gate: email allowlist or `ADMIN_SECRET`.
  No new variable for the panel.
- `OPENROUTER_API_KEY` — optional. The deterministic note parser is the primary
  and always-on path. When this key is set, a Gemini-Flash mapping layer is tried
  first for messier phrasing and falls back to the deterministic parser on any
  failure. Leave it unset and everything still works.
