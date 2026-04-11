#!/usr/bin/env python3
"""
HMM Regime Training Pipeline
=============================
Trains GaussianHMM models (5 hidden states) for market regime classification.
Asset classes: crypto, forex, metals.

Output: JSON model files consumable by the TypeScript Viterbi classifier.
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from hmmlearn.hmm import GaussianHMM

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SEED = 42
N_STATES = 5
N_FEATURES = 4
N_ITER = 200
COVARIANCE_TYPE = "full"
FEATURE_NAMES = ["rolling_vol_20d", "returns_5d", "returns_20d", "volume_z_score"]
STATE_LABELS = ["crash", "bear", "neutral", "bull", "euphoria"]

SCRIPT_DIR = Path(__file__).resolve().parent
MODELS_DIR = SCRIPT_DIR / "models"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("hmm-train")


# ---------------------------------------------------------------------------
# Synthetic data generation
# ---------------------------------------------------------------------------

def _regime_params(asset_class: str) -> list[dict]:
    """Return per-regime parameters tuned to each asset class.

    Each element corresponds to one market regime (crash -> euphoria) and
    contains: daily_return_mean, daily_return_std, vol_scale, volume_bias,
    and avg_duration (trading days).
    """
    if asset_class == "crypto":
        return [
            {"mu": -0.035, "sigma": 0.065, "vol": 1.10, "vol_bias": 1.8, "dur": 20},
            {"mu": -0.008, "sigma": 0.035, "vol": 0.70, "vol_bias": 0.6, "dur": 60},
            {"mu": 0.001, "sigma": 0.022, "vol": 0.40, "vol_bias": -0.2, "dur": 120},
            {"mu": 0.012, "sigma": 0.030, "vol": 0.55, "vol_bias": 0.4, "dur": 80},
            {"mu": 0.030, "sigma": 0.055, "vol": 0.95, "vol_bias": 2.0, "dur": 25},
        ]
    elif asset_class == "forex":
        return [
            {"mu": -0.012, "sigma": 0.018, "vol": 0.60, "vol_bias": 1.5, "dur": 25},
            {"mu": -0.003, "sigma": 0.010, "vol": 0.35, "vol_bias": 0.4, "dur": 80},
            {"mu": 0.0002, "sigma": 0.006, "vol": 0.18, "vol_bias": -0.3, "dur": 150},
            {"mu": 0.004, "sigma": 0.009, "vol": 0.30, "vol_bias": 0.3, "dur": 70},
            {"mu": 0.010, "sigma": 0.016, "vol": 0.52, "vol_bias": 1.6, "dur": 20},
        ]
    else:  # metals
        return [
            {"mu": -0.018, "sigma": 0.028, "vol": 0.75, "vol_bias": 1.6, "dur": 22},
            {"mu": -0.004, "sigma": 0.016, "vol": 0.45, "vol_bias": 0.5, "dur": 70},
            {"mu": 0.0005, "sigma": 0.011, "vol": 0.28, "vol_bias": -0.2, "dur": 130},
            {"mu": 0.006, "sigma": 0.014, "vol": 0.38, "vol_bias": 0.3, "dur": 75},
            {"mu": 0.015, "sigma": 0.025, "vol": 0.68, "vol_bias": 1.8, "dur": 22},
        ]


def generate_synthetic_ohlcv(
    asset_class: str,
    n_days: int = 504,  # ~2 years of trading days
    rng: np.random.Generator | None = None,
) -> np.ndarray:
    """Generate synthetic daily OHLCV with realistic market-cycle characteristics.

    Returns an (n_days, 4) array of HMM input features:
        [rolling_vol_20d, returns_5d, returns_20d, volume_z_score]
    """
    if rng is None:
        rng = np.random.default_rng(SEED)

    regimes = _regime_params(asset_class)

    # --- simulate regime sequence (Markov chain of durations) ---
    regime_sequence: list[int] = []
    current_regime = 2  # start neutral
    while len(regime_sequence) < n_days:
        dur = max(5, int(rng.poisson(regimes[current_regime]["dur"])))
        regime_sequence.extend([current_regime] * dur)
        # transition: favor adjacent regimes (mean-reversion toward neutral)
        weights = np.array([0.05, 0.15, 0.40, 0.15, 0.05])
        # bias toward neighbors of current regime
        for offset in (-1, 1):
            neighbor = current_regime + offset
            if 0 <= neighbor < N_STATES:
                weights[neighbor] += 0.20
        weights[current_regime] *= 0.3  # reduce self-transition when duration ends
        weights /= weights.sum()
        current_regime = int(rng.choice(N_STATES, p=weights))

    regime_sequence = regime_sequence[:n_days]

    # --- generate daily returns with fat tails ---
    daily_returns = np.empty(n_days)
    daily_volume_z = np.empty(n_days)
    for i, reg in enumerate(regime_sequence):
        p = regimes[reg]
        # Student-t with df=5 for fat tails, scaled to target sigma
        t_sample = rng.standard_t(df=5)
        daily_returns[i] = p["mu"] + p["sigma"] * t_sample / np.sqrt(5 / 3)
        daily_volume_z[i] = p["vol_bias"] + rng.normal(0, 0.5)

    # --- compute features ---
    # rolling 20-day volatility (std of daily returns)
    rolling_vol = np.full(n_days, np.nan)
    for i in range(19, n_days):
        rolling_vol[i] = np.std(daily_returns[i - 19 : i + 1])

    # cumulative 5-day and 20-day returns
    returns_5d = np.full(n_days, np.nan)
    returns_20d = np.full(n_days, np.nan)
    for i in range(4, n_days):
        returns_5d[i] = np.sum(daily_returns[i - 4 : i + 1])
    for i in range(19, n_days):
        returns_20d[i] = np.sum(daily_returns[i - 19 : i + 1])

    # trim leading NaN rows (first 19 days)
    start = 19
    features = np.column_stack(
        [
            rolling_vol[start:],
            returns_5d[start:],
            returns_20d[start:],
            daily_volume_z[start:],
        ]
    )

    # replace any remaining NaN with 0 (shouldn't happen, safety net)
    features = np.nan_to_num(features, nan=0.0)

    log.info(
        "Generated %d observations for %s (trimmed from %d raw days)",
        features.shape[0],
        asset_class,
        n_days,
    )
    return features


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train_model(features: np.ndarray, asset_class: str) -> dict:
    """Fit a GaussianHMM and return serializable model parameters."""
    log.info("Training HMM for %s  (%d obs, %d features)", asset_class, *features.shape)

    model = GaussianHMM(
        n_components=N_STATES,
        covariance_type=COVARIANCE_TYPE,
        n_iter=N_ITER,
        random_state=SEED,
        verbose=False,
    )
    model.fit(features)

    if not model.monitor_.converged:
        log.warning(
            "Model for %s did NOT converge after %d iterations (score=%.2f)",
            asset_class,
            N_ITER,
            model.score(features),
        )
    else:
        log.info(
            "Model for %s converged at iteration %d (score=%.2f)",
            asset_class,
            model.monitor_.iter,
            model.score(features),
        )

    # --- label states by ascending returns_20d emission mean ---
    # returns_20d is feature index 2
    returns_20d_means = model.means_[:, 2]
    sorted_indices = np.argsort(returns_20d_means).tolist()

    state_labels: dict[str, str] = {}
    for rank, state_idx in enumerate(sorted_indices):
        state_labels[str(state_idx)] = STATE_LABELS[rank]

    # --- build output dict ---
    result = {
        "n_states": N_STATES,
        "state_labels": state_labels,
        "transition_matrix": model.transmat_.tolist(),
        "emission_means": model.means_.tolist(),
        "emission_covariances": model.covars_.tolist(),
        "feature_names": FEATURE_NAMES,
        "asset_class": asset_class,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    log.info("State labeling for %s:", asset_class)
    for idx in sorted_indices:
        label = state_labels[str(idx)]
        mean_str = ", ".join(f"{v:.6f}" for v in model.means_[idx])
        log.info("  state %d -> %-10s  means=[%s]", idx, label, mean_str)

    return result


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def export_model(model_dict: dict, asset_class: str) -> Path:
    """Write model JSON to disk."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    path = MODELS_DIR / f"{asset_class}_hmm.json"
    with open(path, "w") as f:
        json.dump(model_dict, f, indent=2)
    log.info("Saved model -> %s  (%.1f KB)", path, path.stat().st_size / 1024)
    return path


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

ASSET_CLASSES = ["crypto", "forex", "metals"]


def main() -> None:
    log.info("=" * 60)
    log.info("HMM Regime Training Pipeline  (seed=%d, states=%d)", SEED, N_STATES)
    log.info("=" * 60)

    rng = np.random.default_rng(SEED)
    outputs: list[Path] = []

    for asset_class in ASSET_CLASSES:
        try:
            features = generate_synthetic_ohlcv(asset_class, rng=rng)
            model_dict = train_model(features, asset_class)
            path = export_model(model_dict, asset_class)
            outputs.append(path)
        except Exception:
            log.exception("Failed to train model for %s", asset_class)
            sys.exit(1)

    log.info("-" * 60)
    log.info("All models trained successfully:")
    for p in outputs:
        log.info("  %s", p)
    log.info("Done.")


if __name__ == "__main__":
    main()
