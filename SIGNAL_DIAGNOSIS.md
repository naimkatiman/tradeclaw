# Signal Engine Diagnosis

## 2026-04-02 v3: 4-TF confluence engine live

### Algorithm
- Checks M5, M15, H1, H4 timeframes for each symbol
- Requires >= 2 TFs agreeing with 0 opposite signals
- Base confidence: 85 (STRONG) or 72 (regular)
- Bonuses: confluence (+5/+12/+20), RSI extremes (+5), high volume (+3)
- Maximum confidence capped at 95%

### Test Results
```
Signals generated: 4/10
No confluence: 6
Errors: 0

HIGH-CONFIDENCE SIGNALS:
  GBPUSD: SELL 95% (4TF confluence)
  USDJPY: BUY 95% (4TF confluence)
  BNBUSD: SELL 87% (3TF confluence)
  EURUSD: SELL 87% (3TF confluence)
```

### Output Fields
- `agreeing_timeframes`: List of TFs that agree on direction
- `total_timeframes_checked`: Number of TFs with valid data
- `timeframe`: Human-readable confluence summary
- `expires_in_minutes`: 60 for 3+ TF, 30 for 2 TF

## Per-symbol ATR stop calibration

### Calibration pipeline (issue #53)

The signal engine ships with a global `0.75 × ATR` stop multiplier for
every symbol, which is volatility-blind: gold wicks through 0.75 ATR on
NY open, EUR/USD chops inside 0.5 ATR for hours. The calibration
pipeline replays our historical signal outcomes against a range of
candidate multipliers and picks the one with the best expected value
per symbol.

**Components:**

1. `scripts/calibrate-atr-multipliers.py` — reads closed signals from
   `signals.db`, replays them at every multiplier in
   `[0.5, 0.75, 1.0, 1.25, 1.5, 2.0]`, picks the multiplier that
   maximises EV = `P(TP) × reward - P(SL) × risk`, and writes
   `scripts/atr-multipliers.json`.
2. `scripts/atr-multipliers.json` — generated artefact, structure:
   ```json
   {
     "generated_at": "2026-05-26T00:00:00Z",
     "default_multiplier_fallback": 0.75,
     "multipliers": { "XAUUSD": 1.25, "BTCUSDT": 1.5, ... },
     "diagnostics": { "XAUUSD": { "samples": 142, ... } }
   }
   ```
3. `scripts/test_calibrate_atr.py` — unit tests for the replay & EV
   math (run with plain `python` or `pytest`).
4. Engine wiring (TODO): load `atr-multipliers.json` at startup; fall
   back to 0.75 for any symbol without a calibrated entry.

**Run cadence:** nightly via the same cron that drives
`scripts/signal-outcome-checker.py`. Re-runs are idempotent —
multiplying low sample counts produces no entry rather than a noisy
override.

**Why this matters:** XAU, BTC, and EUR/USD have radically different
intra-day behaviour. A one-size-fits-all stop leaves edge on the table
and contributes to the red-day patterns we documented in the
stop-loss audit on 2026-04-09.
