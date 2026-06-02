# HMM Regime Classification

Trains Hidden Markov Models to classify markets into 5 regimes: **crash**, **bear**, **neutral**, **bull**, **euphoria**.

Produces one model per asset class (crypto, forex, metals) as JSON files consumed by the TypeScript Viterbi classifier at runtime.

## Setup

```bash
pip install -r scripts/hmm-regime/requirements.txt
```

## Train

```bash
python scripts/hmm-regime/train_hmm.py
```

Output lands in `scripts/hmm-regime/models/`:
- `crypto_hmm.json`
- `forex_hmm.json`
- `metals_hmm.json`

## Weekly Retrain (cron)

```cron
0 3 * * 0  cd /path/to/tradeclaw && python scripts/hmm-regime/train_hmm.py >> /var/log/hmm-train.log 2>&1
```

Replace synthetic data generation with real OHLCV fetches when live data sources are integrated.

## JSON Schema

Each model JSON contains:

| Field | Shape | Description |
|-------|-------|-------------|
| `n_states` | `5` | Number of hidden states |
| `state_labels` | `{0..4: label}` | State index to regime name |
| `transition_matrix` | `5x5` | State transition probabilities |
| `emission_means` | `5x4` | Mean of each feature per state |
| `emission_covariances` | `5x4x4` | Covariance matrix per state |
| `feature_names` | `[4]` | Feature column names |
| `asset_class` | `string` | crypto / forex / metals |
| `trained_at` | `ISO 8601` | Training timestamp |
