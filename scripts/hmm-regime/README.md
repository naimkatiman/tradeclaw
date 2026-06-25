# HMM Regime Training (structural, 3-state)

Trains the Hidden Markov Model behind the canonical structural regime
vocabulary — **trend**, **volatile**, **range** (Phase 3 regime engine,
`docs/plans/2026-06-11-phase3-regime-engine.md`). The model reads market
SHAPE (ADX, Bollinger bandwidth, ATR percentile, return autocorrelation),
never drift direction.

One committed model: `models/crypto_hmm.json`, trained on real BTCUSD /
ETHUSD / SOLUSD H1 candles. Forex/metals have no stored real candles yet, so
the TypeScript runtime falls back to the documented heuristic default
(`getDefaultModel` in `packages/signals/src/regime/classifier.ts`) for those
asset classes.

## Why there is no Python feature code here

The four classifier features are computed in exactly ONE place:
`packages/signals/src/regime/features.ts` (plan D5). The trainer consumes
feature vectors exported by `scripts/research/export-regime-features.ts` and
never recomputes them — the old `classify_regime.py` (deleted) recomputed
features in Python with subtly different math, which is precisely the
train/inference parity bug class this layout kills structurally.

## Requirements

numpy only. hmmlearn has no Python 3.14 wheel, so the trainer ships a
self-contained log-space Baum-Welch EM (3-state full-covariance Gaussian,
ridge-regularized).

```bash
pip install -r scripts/hmm-regime/requirements.txt
```

## Pipeline (retrain instructions)

```bash
# 1. Dump 2 years of H1 candles from data-api.binance.vision (no DB needed)
npx tsx scripts/research/backfill-candles.ts \
  --symbols BTCUSD,ETHUSD,SOLUSD --timeframes H1 --years 2 \
  --out-dir data/research/candles

# 2. Export feature vectors via the one TS feature implementation
npm run build:signals
npx tsx scripts/research/export-regime-features.ts \
  --symbols BTCUSD,ETHUSD,SOLUSD --timeframe H1 \
  --candles-dir data/research/candles --out data/research/features

# 3. Verify the EM fitter (recovers known synthetic parameters)
python scripts/hmm-regime/train_hmm.py --self-test

# 4. Train + walk-forward validate + emit the model
python scripts/hmm-regime/train_hmm.py \
  --features-dir data/research/features --symbols BTCUSD,ETHUSD,SOLUSD
```

Raw candle dumps and feature exports live under `data/research/` (gitignored
via the root `/data/` rule) — only the model JSON and the validation report
are committed.

Determinism: seed 42, deterministic ADX-tercile EM initialization (no
randomness in the real-data path), fixed fold boundaries derived from the
data window, and `trained_at` derived from the data window END (never wall
clock). Re-running step 4 on the same feature files produces byte-identical
model JSON and report.

## Self-test

`--self-test` generates a synthetic 3-state HMM with KNOWN parameters
(seeded), fits it with the same EM code, and asserts recovery within
tolerance (emission means, transition probabilities, covariances). Synthetic
data unit-tests the FITTER only — the product model trains on real candles
only.

## Walk-forward validation (the Phase 3 gate evidence)

Train 12 months → test 3 months, stepping 3 months across the pooled window.
Each fold refits standardization + HMM on its train window only, then
classifies every TEST bar exactly the way production does: trailing-64
Viterbi terminal state, forward-posterior confidence, `applyHysteresis`
(min-dwell 6 bars / 0.80 override). Per fold, on test bars only:

- regime distribution (raw and hysteresis-smoothed)
- flips/week (raw and smoothed)
- mean dwell (bars)
- regime-conditional forward outcomes: next-24-bar return mean/std per
  regime and the |return| separation between regimes

The report lands in `docs/research/experiments/regime-hmm-walkforward-*.json`
and is registered in `docs/research/experiments/REGISTRY.md`.

Final model policy: fitted on the FULL pooled window (the folds estimate this
procedure's out-of-sample behaviour; the shipped model uses every bar).

## Model JSON schema

Consumed by `loadModel` / `validateModel` in
`packages/signals/src/regime/classifier.ts` (resolves `HMM_MODEL_DIR` env or
walks up to `scripts/hmm-regime/models/`).

| Field | Shape | Description |
|-------|-------|-------------|
| `n_states` | `3` | Number of hidden states |
| `state_labels` | `{ "0..2": label }` | State index → `trend` / `volatile` / `range`. Mapping rule (must match the TS classifier): highest ADX mean → trend; of the rest, higher ATR-percentile mean → volatile; remainder → range |
| `transition_matrix` | `3×3` | Row-stochastic state transition probabilities |
| `emission_means` | `3×4` | Per-state feature means, in STANDARDIZED feature space |
| `emission_covariances` | `3×4×4` | Full covariance matrix per state (standardized space, ridge-regularized) |
| `feature_names` | `[4]` | `adx14`, `bbBandwidthPct`, `atrPercentile`, `returnAutocorr1` (order = `REGIME_FEATURE_NAMES`) |
| `feature_means` | `[4]` | Standardization means, fitted on the TRAINING window only — inference standardizes `(x - mean) / std`, so there is no lookahead |
| `feature_stds` | `[4]` | Standardization stds (positive finite), training window only |
| `asset_class` | `string` | `crypto` |
| `trained_at` | ISO 8601 | Deterministic: the END of the training data window, not wall clock |
| `initial_probs` | `[3]` | Stationary distribution of the transition matrix (inference windows start at arbitrary times) |
