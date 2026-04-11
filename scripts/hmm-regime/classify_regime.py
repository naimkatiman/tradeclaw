#!/usr/bin/env python3
"""
HMM Regime Classifier — Python Module
======================================
Loads pre-trained HMM model JSON files and classifies market regimes
using the forward algorithm with multivariate Gaussian emissions.

Designed to be imported by signal-engine.py. Zero external dependencies
beyond numpy (already installed as a dependency of hmmlearn).

Usage:
    from classify_regime import classify_regime, compute_features, load_model

    model = load_model("crypto")
    features = compute_features(price_history)  # list of {close, volume} dicts
    result = classify_regime(features, model)
    # result = {"regime": "bull", "confidence": 0.82, "features": {...}}
"""

import json
import logging
from pathlib import Path

import numpy as np

log = logging.getLogger("hmm-classify")

MODELS_DIR = Path(__file__).resolve().parent / "models"

# Cache loaded models to avoid re-reading JSON on every call
_model_cache: dict[str, dict] = {}


def load_model(asset_class: str) -> dict:
    """Load a pre-trained HMM model from the JSON file on disk.

    Args:
        asset_class: One of 'crypto', 'forex', 'metals'.

    Returns:
        Model dict with keys: n_states, state_labels, transition_matrix,
        emission_means, emission_covariances, feature_names, asset_class.

    Raises:
        FileNotFoundError: If the model JSON file doesn't exist.
    """
    if asset_class in _model_cache:
        return _model_cache[asset_class]

    model_path = MODELS_DIR / f"{asset_class}_hmm.json"
    if not model_path.exists():
        raise FileNotFoundError(f"HMM model not found: {model_path}")

    with open(model_path) as f:
        model = json.load(f)

    # Convert lists to numpy arrays for computation
    model["_transition_matrix"] = np.array(model["transition_matrix"])
    model["_emission_means"] = np.array(model["emission_means"])
    model["_emission_covariances"] = np.array(model["emission_covariances"])

    _model_cache[asset_class] = model
    log.info("Loaded HMM model for %s from %s", asset_class, model_path)
    return model


def compute_features(price_history: list[dict]) -> list[float]:
    """Compute the 4 regime features from a price history array.

    Requires at least 21 bars. Each bar should have 'close' and 'volume' keys.
    The list should be sorted oldest-first.

    Args:
        price_history: List of dicts with 'close' and 'volume' keys.

    Returns:
        List of 4 floats: [rolling_vol_20d, returns_5d, returns_20d, volume_z_score]

    Raises:
        ValueError: If fewer than 21 bars are provided.
    """
    n = len(price_history)
    if n < 21:
        raise ValueError(f"Need at least 21 price bars, got {n}")

    closes = np.array([bar["close"] for bar in price_history], dtype=np.float64)
    volumes = np.array([bar["volume"] for bar in price_history], dtype=np.float64)

    # Log returns
    log_returns = np.log(closes[1:] / closes[:-1])

    # 20-day rolling volatility (std of log returns over last 20 periods)
    last_20_returns = log_returns[-20:]
    rolling_vol_20d = float(np.std(last_20_returns, ddof=1))

    # 5-day cumulative return
    returns_5d = float(closes[-1] / closes[-6] - 1)

    # 20-day cumulative return
    returns_20d = float(closes[-1] / closes[-21] - 1)

    # Volume z-score: (current volume - mean) / std over last 20 bars
    last_20_vol = volumes[-20:]
    mean_vol = float(np.mean(last_20_vol))
    std_vol = float(np.std(last_20_vol, ddof=1))
    volume_z_score = float((volumes[-1] - mean_vol) / std_vol) if std_vol > 0 else 0.0

    return [rolling_vol_20d, returns_5d, returns_20d, volume_z_score]


def _multivariate_gaussian_log_pdf(
    x: np.ndarray, mean: np.ndarray, cov: np.ndarray
) -> float:
    """Compute log N(x | mean, cov) for a multivariate Gaussian.

    Uses numpy's linear algebra for determinant and inverse.
    Falls back to a very low log-probability for near-singular covariances.
    """
    d = len(x)
    diff = x - mean

    det = np.linalg.det(cov)
    if abs(det) < 1e-30:
        return -1e6

    try:
        cov_inv = np.linalg.inv(cov)
    except np.linalg.LinAlgError:
        return -1e6

    quad = float(diff @ cov_inv @ diff)
    log_det = np.log(abs(det))
    log_norm = -0.5 * (d * np.log(2 * np.pi) + log_det + quad)
    return float(log_norm)


def classify_regime(features: list[float], model: dict) -> dict:
    """Classify the current market regime using the forward algorithm.

    Args:
        features: List of 4 floats [rolling_vol_20d, returns_5d, returns_20d, volume_z_score].
        model: Model dict from load_model().

    Returns:
        Dict with keys:
            regime: str — one of 'crash', 'bear', 'neutral', 'bull', 'euphoria'
            confidence: float — posterior probability of the classified regime (0-1)
            features: dict — the 4 feature values with readable names
            all_probabilities: dict — posterior probability for each regime
    """
    n_states = model["n_states"]
    means = model["_emission_means"]
    covs = model["_emission_covariances"]
    trans = model["_transition_matrix"]
    state_labels = model["state_labels"]

    obs = np.array(features, dtype=np.float64)

    # Forward algorithm — single observation, so just initialization step
    # log alpha_i = log pi_i + log N(obs | mu_i, Sigma_i)
    # Using uniform initial distribution
    log_pi = np.log(1.0 / n_states)

    log_alpha = np.empty(n_states)
    for i in range(n_states):
        log_emission = _multivariate_gaussian_log_pdf(obs, means[i], covs[i])
        log_alpha[i] = log_pi + log_emission

    # For a single observation, the forward probabilities are just the
    # normalized emission probabilities under uniform prior.
    # Normalize via log-sum-exp
    max_log = np.max(log_alpha)
    exp_alpha = np.exp(log_alpha - max_log)
    sum_exp = np.sum(exp_alpha)
    posteriors = exp_alpha / sum_exp if sum_exp > 0 else np.full(n_states, 1.0 / n_states)

    # Find best state
    best_state = int(np.argmax(posteriors))
    regime = state_labels[str(best_state)]
    confidence = float(posteriors[best_state])

    # Build all-probabilities map
    all_probabilities = {}
    for i in range(n_states):
        label = state_labels[str(i)]
        all_probabilities[label] = round(float(posteriors[i]), 6)

    # Feature names for output
    feature_dict = {
        "rollingVol20d": round(features[0], 6),
        "returns5d": round(features[1], 6),
        "returns20d": round(features[2], 6),
        "volumeZScore": round(features[3], 6),
    }

    return {
        "regime": regime,
        "confidence": round(confidence, 4),
        "features": feature_dict,
        "all_probabilities": all_probabilities,
    }


def get_asset_class(symbol: str) -> str:
    """Map a symbol to its asset class.

    Uses the same mapping as signal-engine.py.
    """
    FOREX_SYMBOLS = {"EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF"}
    METALS_SYMBOLS = {"XAUUSD", "XAGUSD"}

    if symbol in FOREX_SYMBOLS:
        return "forex"
    elif symbol in METALS_SYMBOLS:
        return "metals"
    else:
        return "crypto"


# ---------------------------------------------------------------------------
# Standalone test / CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    # Quick smoke test with synthetic feature vectors
    test_cases = [
        ("crypto", [0.025, 0.015, 0.05, 0.08]),    # moderate vol, positive returns -> bull-ish
        ("forex", [0.008, -0.003, -0.01, -0.3]),    # low vol, slight negative -> neutral/bear
        ("metals", [0.04, 0.02, 0.08, 1.5]),        # high vol, strong positive -> bull/euphoria
    ]

    for asset_class, test_features in test_cases:
        model = load_model(asset_class)
        result = classify_regime(test_features, model)
        print(f"\n{asset_class.upper()}: features={test_features}")
        print(f"  regime={result['regime']}, confidence={result['confidence']:.4f}")
        for label, prob in sorted(result["all_probabilities"].items(), key=lambda x: -x[1]):
            bar = "=" * int(prob * 40)
            print(f"    {label:10s} {prob:.4f} {bar}")
