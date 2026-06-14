#!/usr/bin/env python3
"""
Real-data HMM regime trainer + walk-forward validation (Phase 3, plan D7).

Trains the 3-state structural regime model (trend / volatile / range) on REAL
exported feature vectors and produces the walk-forward gate evidence for the
Phase 3 regime-engine rebuild.

Hard rules (docs/plans/2026-06-11-phase3-regime-engine.md):
- Features come EXCLUSIVELY from scripts/research/export-regime-features.ts
  (the one TypeScript implementation, plan D5). This trainer NEVER recomputes
  features — that structurally kills the train/inference parity bug class.
- Self-contained numpy Baum-Welch EM (full covariance, ridge-regularized,
  log-space). hmmlearn has no Python 3.14 wheel; requirements.txt is numpy
  only. `--self-test` verifies the fitter recovers known parameters from a
  synthetic 3-state HMM (synthetic data unit-tests the FITTER only; the
  product model trains on real candles only).
- Determinism: seed 42, fixed fold boundaries derived from the data window,
  `trained_at` derived from the data window end (never wall clock). Re-running
  on the same input produces byte-identical model JSON and report.

State -> label mapping (must match the TS classifier rule in
packages/signals/src/regime/classifier.ts): highest ADX mean -> trend; of the
rest, higher ATR-percentile mean -> volatile; remainder -> range.

Final model policy: fitted on the FULL pooled window (all three symbols, all
vectors) — the walk-forward folds estimate the out-of-sample behaviour of this
exact procedure; the shipped model uses every available bar.

Usage:
  python scripts/hmm-regime/train_hmm.py --self-test
  python scripts/hmm-regime/train_hmm.py \
      --features-dir data/research/features --symbols BTCUSD,ETHUSD,SOLUSD
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from datetime import datetime, timezone
from itertools import permutations
from pathlib import Path

import numpy as np

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SEED = 42
N_STATES = 3
N_FEATURES = 4
N_ITER = 300
TOL = 1e-6  # convergence: |delta log-likelihood per observation|
RIDGE = 1e-4  # added to covariance diagonals (standardized feature space)
FEATURE_NAMES = ["adx14", "bbBandwidthPct", "atrPercentile", "returnAutocorr1"]
ADX_IDX = 0
ATR_PCTL_IDX = 2

# Runtime mirror (packages/signals/src/regime/classifier.ts + hysteresis.ts):
SEQUENCE_LENGTH = 64        # trailing Viterbi window (DEFAULT_SEQUENCE_LENGTH)
MIN_DWELL_BARS = 6          # applyHysteresis default
OVERRIDE_CONFIDENCE = 0.80  # applyHysteresis default
FORWARD_BARS = 24           # forward-outcome horizon (next-24-bar return)

# Walk-forward geometry (plan D7): train 12mo -> test 3mo, step 3mo.
TRAIN_MONTHS = 12
TEST_MONTHS = 3
STEP_MONTHS = 3
# Fixed-length month (30.4375 days = 365.25/12). Internal to this trainer's
# fold arithmetic ONLY — intentionally NOT tied to any TS constant; the
# runtime never sees fold boundaries.
MONTH_MS = int(365.25 / 12 * 86_400_000)
H1_BARS_PER_WEEK = 168
MIN_TEST_BARS = H1_BARS_PER_WEEK  # one pooled H1 week — folds with less are dropped
H1_MS = 3_600_000

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
MODELS_DIR = SCRIPT_DIR / "models"
REPORT_DIR = REPO_ROOT / "docs" / "research" / "experiments"


# ---------------------------------------------------------------------------
# Numerics: log-space forward/backward/Viterbi, Gaussian log-pdf
# ---------------------------------------------------------------------------

def log_gaussian(X: np.ndarray, mean: np.ndarray, cov: np.ndarray) -> np.ndarray:
    """log N(x | mean, cov) for each row of X via Cholesky. Returns (T,)."""
    d = X.shape[1]
    try:
        chol = np.linalg.cholesky(cov)
    except np.linalg.LinAlgError:
        # Defensive: ridge regularization keeps EM covariances PD on every
        # known path; if a caller ever hands a non-PD matrix, retry with a
        # stronger diagonal boost instead of crashing mid-fit.
        chol = np.linalg.cholesky(cov + 1e-3 * np.eye(d))
    diff = X - mean
    # Solve L y = diff^T  ->  quadratic form = sum(y^2)
    y = np.linalg.solve(chol, diff.T)
    quad = np.sum(y * y, axis=0)
    log_det = 2.0 * np.sum(np.log(np.diag(chol)))
    return -0.5 * (d * math.log(2.0 * math.pi) + log_det + quad)


def log_emissions(X: np.ndarray, means: np.ndarray, covs: np.ndarray) -> np.ndarray:
    """(T, N) matrix of per-state Gaussian log-likelihoods."""
    return np.column_stack([log_gaussian(X, means[i], covs[i]) for i in range(len(means))])


def _logsumexp(a: np.ndarray, axis: int) -> np.ndarray:
    """logsumexp along `axis`, -inf-safe."""
    m = np.max(a, axis=axis, keepdims=True)
    m = np.where(np.isfinite(m), m, 0.0)
    return np.squeeze(m, axis=axis) + np.log(np.sum(np.exp(a - m), axis=axis))


def forward_log(log_b: np.ndarray, log_A: np.ndarray, log_pi: np.ndarray) -> np.ndarray:
    """log alpha, shape (T, N): alpha[t][j] = log P(o_0..o_t, s_t = j)."""
    T, _ = log_b.shape
    log_alpha = np.empty_like(log_b)
    log_alpha[0] = log_pi + log_b[0]
    for t in range(1, T):
        # logsumexp over the FROM axis of (from, to)
        log_alpha[t] = log_b[t] + _logsumexp(log_alpha[t - 1][:, None] + log_A, axis=0)
    return log_alpha


def backward_log(log_b: np.ndarray, log_A: np.ndarray) -> np.ndarray:
    """log beta, shape (T, N)."""
    T, N = log_b.shape
    log_beta = np.empty_like(log_b)
    log_beta[T - 1] = 0.0
    for t in range(T - 2, -1, -1):
        # logsumexp over the TO axis of (from, to)
        log_beta[t] = _logsumexp(log_A + (log_b[t + 1] + log_beta[t + 1])[None, :], axis=1)
    return log_beta


def viterbi_terminal(log_b_window: np.ndarray, log_A: np.ndarray, log_pi: np.ndarray) -> int:
    """Terminal state of the most-likely path over the window (mirrors the
    TS classifier: viterbiDecode over the trailing window, take the last)."""
    delta = log_pi + log_b_window[0]
    for t in range(1, log_b_window.shape[0]):
        delta = np.max(delta[:, None] + log_A, axis=0) + log_b_window[t]
    return int(np.argmax(delta))


def forward_terminal_posterior(
    log_b_window: np.ndarray, log_A: np.ndarray, log_pi: np.ndarray
) -> np.ndarray:
    """Normalized forward posterior at the final time step (mirrors the TS
    classifier's confidence)."""
    log_alpha = log_pi + log_b_window[0]
    for t in range(1, log_b_window.shape[0]):
        log_alpha = log_b_window[t] + _logsumexp(log_alpha[:, None] + log_A, axis=0)
    m = float(np.max(log_alpha))
    p = np.exp(log_alpha - m)
    return p / float(np.sum(p))


# ---------------------------------------------------------------------------
# Baum-Welch EM (multi-sequence, full covariance, ridge-regularized)
# ---------------------------------------------------------------------------

def init_params(sequences: list[np.ndarray]) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Deterministic initialization: split the pooled (standardized)
    observations into terciles along the ADX feature and seed each state's
    mean/covariance from one tercile. Sticky transitions, uniform pi.

    No randomness — together with fixed inputs this makes the whole fit
    byte-reproducible."""
    pooled = np.vstack(sequences)
    order = np.argsort(pooled[:, ADX_IDX], kind="stable")
    chunks = np.array_split(order, N_STATES)
    means = np.vstack([pooled[c].mean(axis=0) for c in chunks])
    # Rank-deficiency guard: a tercile with fewer than N_FEATURES + 1 samples
    # cannot yield a positive-definite covariance — fall back to the pooled
    # covariance for that state (never fires on real training windows).
    pooled_cov = np.cov(pooled.T, bias=True) + RIDGE * np.eye(N_FEATURES)
    covs = np.stack([
        pooled_cov if len(c) < N_FEATURES + 1
        else np.cov(pooled[c].T, bias=True) + RIDGE * np.eye(N_FEATURES)
        for c in chunks
    ])
    A = np.full((N_STATES, N_STATES), 0.025)
    np.fill_diagonal(A, 0.95)
    pi = np.full(N_STATES, 1.0 / N_STATES)
    return pi, A, means, covs


def fit_hmm(sequences: list[np.ndarray]) -> dict:
    """Fit a 3-state full-covariance Gaussian HMM with log-space Baum-Welch.

    `sequences` are ALREADY standardized observation arrays (one per symbol).
    Returns dict with pi, A, means, covs, ll_per_obs, iterations, converged.
    """
    pi, A, means, covs = init_params(sequences)
    n_obs = sum(s.shape[0] for s in sequences)
    prev_ll = -np.inf
    converged = False
    iteration = 0

    for iteration in range(1, N_ITER + 1):
        log_A = np.log(np.maximum(A, 1e-300))
        log_pi = np.log(np.maximum(pi, 1e-300))

        total_ll = 0.0
        acc_gamma0 = np.zeros(N_STATES)
        acc_xi = np.zeros((N_STATES, N_STATES))
        acc_gamma = np.zeros(N_STATES)
        acc_gamma_x = np.zeros((N_STATES, N_FEATURES))
        gammas: list[np.ndarray] = []

        for X in sequences:
            log_b = log_emissions(X, means, covs)
            log_alpha = forward_log(log_b, log_A, log_pi)
            log_beta = backward_log(log_b, log_A)
            seq_ll = float(_logsumexp(log_alpha[-1], axis=0))
            total_ll += seq_ll

            gamma = np.exp(log_alpha + log_beta - seq_ll)
            gamma /= np.maximum(gamma.sum(axis=1, keepdims=True), 1e-300)
            gammas.append(gamma)

            # xi accumulation, vectorized over t: (T-1, from, to)
            log_xi = (
                log_alpha[:-1, :, None]
                + log_A[None, :, :]
                + (log_b[1:] + log_beta[1:])[:, None, :]
                - seq_ll
            )
            acc_xi += np.exp(log_xi).sum(axis=0)

            acc_gamma0 += gamma[0]
            acc_gamma += gamma.sum(axis=0)
            acc_gamma_x += gamma.T @ X

        # M-step
        pi = acc_gamma0 / acc_gamma0.sum()
        row_sums = acc_xi.sum(axis=1, keepdims=True)
        A = np.where(row_sums > 0, acc_xi / np.maximum(row_sums, 1e-300), 1.0 / N_STATES)
        A /= A.sum(axis=1, keepdims=True)
        means = acc_gamma_x / np.maximum(acc_gamma[:, None], 1e-300)

        new_covs = np.zeros((N_STATES, N_FEATURES, N_FEATURES))
        for i in range(N_STATES):
            num = np.zeros((N_FEATURES, N_FEATURES))
            for X, gamma in zip(sequences, gammas):
                diff = X - means[i]
                num += (diff * gamma[:, i : i + 1]).T @ diff
            new_covs[i] = num / max(float(acc_gamma[i]), 1e-300) + RIDGE * np.eye(N_FEATURES)
        covs = new_covs

        ll_per_obs = total_ll / n_obs
        if abs(ll_per_obs - prev_ll) < TOL:
            converged = True
            prev_ll = ll_per_obs
            break
        prev_ll = ll_per_obs

    return {
        "pi": pi,
        "A": A,
        "means": means,
        "covs": covs,
        "ll_per_obs": float(prev_ll),
        "iterations": iteration,
        "converged": converged,
    }


def stationary_distribution(A: np.ndarray) -> np.ndarray:
    """Stationary distribution of a row-stochastic matrix via power iteration.
    Exported as initial_probs: runtime inference windows start at arbitrary
    points in time, so the stationary law is the honest prior (sequence-start
    gamma would overfit the three backfill start dates)."""
    v = np.full(A.shape[0], 1.0 / A.shape[0])
    for _ in range(10_000):
        nxt = v @ A
        if float(np.max(np.abs(nxt - v))) < 1e-14:
            v = nxt
            break
        v = nxt
    else:
        print(
            "WARNING: stationary_distribution hit the 10,000-iteration cap "
            "without reaching the 1e-14 tolerance — initial_probs may be "
            "slightly off the true stationary law",
            file=sys.stderr,
        )
    v = np.maximum(v, 0.0)
    return v / v.sum()


def label_states(means: np.ndarray) -> dict[str, str]:
    """State->label rule, MUST match the TS mapping documented in
    classifier.ts: highest ADX mean -> trend; of the rest, higher
    ATR-percentile mean -> volatile; remainder -> range. Ranking is invariant
    under standardization (same shift/scale for every state)."""
    trend = int(np.argmax(means[:, ADX_IDX]))
    rest = [i for i in range(N_STATES) if i != trend]
    volatile = rest[0] if means[rest[0], ATR_PCTL_IDX] >= means[rest[1], ATR_PCTL_IDX] else rest[1]
    range_state = next(i for i in rest if i != volatile)
    return {str(trend): "trend", str(volatile): "volatile", str(range_state): "range"}


# ---------------------------------------------------------------------------
# Feature-file loading (plan D5: features are read, never recomputed)
# ---------------------------------------------------------------------------

def load_feature_file(features_dir: Path, symbol: str, timeframe: str) -> dict:
    path = features_dir / f"{symbol}-{timeframe}-features.json"
    if not path.exists():
        raise FileNotFoundError(
            f"feature file not found: {path} — run scripts/research/export-regime-features.ts first"
        )
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if data.get("feature_names") != FEATURE_NAMES:
        raise ValueError(
            f"{path}: feature_names {data.get('feature_names')} != expected {FEATURE_NAMES} — "
            "exporter and trainer disagree; refusing to train"
        )
    rows = data["rows"]
    if not rows:
        raise ValueError(f"{path}: empty rows")
    return {
        "symbol": data["symbol"],
        "timestamps": np.array([r["timestamp"] for r in rows], dtype=np.int64),
        "closes": np.array([r["close"] for r in rows], dtype=np.float64),
        "X": np.array([r["features"] for r in rows], dtype=np.float64),
    }


# ---------------------------------------------------------------------------
# Walk-forward evaluation (mirrors the production inference path)
# ---------------------------------------------------------------------------

def simulate_test_window(
    series: dict,
    model: dict,
    feat_means: np.ndarray,
    feat_stds: np.ndarray,
    labels_by_state: dict[str, str],
    test_start: int,
    test_end: int,
) -> dict:
    """Classify every test bar exactly the way production does: standardize
    with the model's train-window params, Viterbi over the trailing
    SEQUENCE_LENGTH observations (history may reach into pre-test bars, as it
    does live), label from the terminal state, confidence from the forward
    posterior, then applyHysteresis (min-dwell 6 / override 0.80)."""
    ts = series["timestamps"]
    closes = series["closes"]
    Xz = (series["X"] - feat_means) / feat_stds
    log_A = np.log(np.maximum(model["A"], 1e-300))
    log_pi = np.log(np.maximum(model["pi"], 1e-300))
    log_b = log_emissions(Xz, model["means"], model["covs"])

    idx = np.where((ts >= test_start) & (ts < test_end))[0]
    raw_labels: list[str] = []
    smoothed: list[str] = []
    held_regime: str | None = None
    bars_held = 0
    fwd_returns: list[tuple[str, float]] = []
    skipped_noncontig = 0

    for i in idx:
        lo = max(0, i - SEQUENCE_LENGTH + 1)
        window = log_b[lo : i + 1]
        state = viterbi_terminal(window, log_A, log_pi)
        posterior = forward_terminal_posterior(window, log_A, log_pi)
        label = labels_by_state[str(state)]
        conf = float(posterior[state])
        raw_labels.append(label)

        # applyHysteresis mirror (packages/signals/src/regime/hysteresis.ts)
        if held_regime is None:
            resolved = label
        elif label == held_regime:
            resolved = held_regime
        elif bars_held >= MIN_DWELL_BARS or conf >= OVERRIDE_CONFIDENCE:
            resolved = label
        else:
            resolved = held_regime
        if resolved == held_regime:
            bars_held += 1
        else:
            held_regime = resolved
            bars_held = 1
        smoothed.append(resolved)

        # Forward outcome: next-FORWARD_BARS-bar simple return, only when the
        # forward bar is exactly contiguous (no gap-spanning pseudo-outcomes).
        j = i + FORWARD_BARS
        if j < len(ts):
            if ts[j] - ts[i] == FORWARD_BARS * H1_MS:
                fwd_returns.append((resolved, float(closes[j] / closes[i] - 1.0)))
            else:
                skipped_noncontig += 1

    return {
        "raw_labels": raw_labels,
        "smoothed": smoothed,
        "fwd_returns": fwd_returns,
        "skipped_noncontig": skipped_noncontig,
        "n_bars": len(idx),
    }


def run_lengths(labels: list[str]) -> list[int]:
    out: list[int] = []
    for i, lab in enumerate(labels):
        if i > 0 and lab == labels[i - 1]:
            out[-1] += 1
        else:
            out.append(1)
    return out


def distribution(labels: list[str]) -> dict[str, float]:
    n = max(len(labels), 1)
    return {r: round(sum(1 for x in labels if x == r) / n, 4) for r in ("trend", "volatile", "range")}


def flips(labels: list[str]) -> int:
    return sum(1 for i in range(1, len(labels)) if labels[i] != labels[i - 1])


def fwd_outcome_stats(fwd: list[tuple[str, float]]) -> dict:
    out: dict = {}
    means_abs: dict[str, float] = {}
    for regime in ("trend", "volatile", "range"):
        rets = np.array([r for (lab, r) in fwd if lab == regime], dtype=np.float64)
        if rets.size == 0:
            out[regime] = {"n": 0, "mean_ret": None, "std_ret": None, "mean_abs_ret": None}
            continue
        mean_abs = float(np.mean(np.abs(rets)))
        means_abs[regime] = mean_abs
        out[regime] = {
            "n": int(rets.size),
            "mean_ret": round(float(np.mean(rets)), 6),
            "std_ret": round(float(np.std(rets)), 6),
            "mean_abs_ret": round(mean_abs, 6),
        }
    out["abs_return_separation"] = (
        round(max(means_abs.values()) - min(means_abs.values()), 6) if len(means_abs) >= 2 else None
    )
    return out


# ---------------------------------------------------------------------------
# Self-test: the EM fitter must recover known parameters (fitter unit test —
# the product model NEVER trains on synthetic data)
# ---------------------------------------------------------------------------

def self_test() -> int:
    rng = np.random.default_rng(SEED)
    true_pi = np.array([0.5, 0.3, 0.2])
    true_A = np.array([
        [0.92, 0.05, 0.03],
        [0.04, 0.90, 0.06],
        [0.05, 0.05, 0.90],
    ])
    true_means = np.array([
        [2.0, 1.0, 0.5, 1.0],
        [0.0, -1.0, 2.0, -1.0],
        [-2.0, 0.0, -2.0, 0.0],
    ])
    base = 0.5 * np.eye(N_FEATURES) + 0.08
    true_covs = np.stack([base * s for s in (1.0, 1.5, 0.8)])

    # Generate 3 sequences (mirrors the 3-symbol pooled fit)
    sequences = []
    for _ in range(3):
        T = 8000
        states = np.empty(T, dtype=np.int64)
        states[0] = rng.choice(N_STATES, p=true_pi)
        for t in range(1, T):
            states[t] = rng.choice(N_STATES, p=true_A[states[t - 1]])
        chols = [np.linalg.cholesky(true_covs[i]) for i in range(N_STATES)]
        X = np.empty((T, N_FEATURES))
        for t in range(T):
            X[t] = true_means[states[t]] + chols[states[t]] @ rng.standard_normal(N_FEATURES)
        sequences.append(X)

    # The production pipeline standardizes before fitting — do the same and
    # compare against the TRUE parameters mapped into standardized space.
    pooled = np.vstack(sequences)
    m = pooled.mean(axis=0)
    s = pooled.std(axis=0)
    z_sequences = [(X - m) / s for X in sequences]
    true_means_z = (true_means - m) / s
    true_covs_z = true_covs / np.outer(s, s)

    fit = fit_hmm(z_sequences)

    # Align fitted states to true states: best of the 6 permutations by
    # summed mean distance.
    best_perm, best_cost = None, np.inf
    for perm in permutations(range(N_STATES)):
        cost = sum(
            float(np.linalg.norm(fit["means"][perm[i]] - true_means_z[i]))
            for i in range(N_STATES)
        )
        if cost < best_cost:
            best_cost, best_perm = cost, perm
    perm = list(best_perm)
    A_hat = fit["A"][np.ix_(perm, perm)]
    means_hat = fit["means"][perm]
    covs_hat = fit["covs"][perm]

    mean_err = float(np.max(np.abs(means_hat - true_means_z)))
    trans_err = float(np.max(np.abs(A_hat - true_A)))
    cov_err = float(np.max(np.abs(covs_hat - true_covs_z)))

    checks = [
        ("max |emission mean error| (standardized)", mean_err, 0.10),
        ("max |transition prob error|", trans_err, 0.05),
        ("max |covariance error| (standardized)", cov_err, 0.15),
    ]
    print(f"self-test: fitted in {fit['iterations']} iterations "
          f"(converged={fit['converged']}, ll/obs={fit['ll_per_obs']:.4f})")
    ok = True
    for name, err, tol in checks:
        status = "PASS" if err <= tol else "FAIL"
        if err > tol:
            ok = False
        print(f"  {status}  {name}: {err:.4f} (tolerance {tol})")
    print("self-test: " + ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


# ---------------------------------------------------------------------------
# Export helpers
# ---------------------------------------------------------------------------

def iso_ms(ts_ms: int) -> str:
    """ISO-8601 with milliseconds + Z, matching Date.prototype.toISOString."""
    dt = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def model_to_json_dict(
    fit: dict,
    feat_means: np.ndarray,
    feat_stds: np.ndarray,
    labels_by_state: dict[str, str],
    trained_at: str,
) -> dict:
    """Serialize to the exact schema validateModel() in classifier.ts checks."""
    A = fit["A"] / fit["A"].sum(axis=1, keepdims=True)  # row-stochastic to fp precision
    pi = stationary_distribution(A)
    return {
        "n_states": N_STATES,
        "state_labels": {str(i): labels_by_state[str(i)] for i in range(N_STATES)},
        "transition_matrix": A.tolist(),
        "emission_means": fit["means"].tolist(),
        "emission_covariances": fit["covs"].tolist(),
        "feature_names": FEATURE_NAMES,
        "feature_means": feat_means.tolist(),
        "feature_stds": feat_stds.tolist(),
        "asset_class": "crypto",
        "trained_at": trained_at,
        "initial_probs": pi.tolist(),
    }


def write_json(path: Path, payload: dict) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=2)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text + "\n")
    return hashlib.sha256((text + "\n").encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Main training + walk-forward
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Real-data 3-state regime HMM trainer + walk-forward validation",
    )
    parser.add_argument("--features-dir", default=str(REPO_ROOT / "data" / "research" / "features"))
    parser.add_argument("--symbols", default="BTCUSD,ETHUSD,SOLUSD")
    parser.add_argument("--timeframe", default="H1")
    parser.add_argument("--models-dir", default=str(MODELS_DIR))
    parser.add_argument("--report-dir", default=str(REPORT_DIR))
    parser.add_argument("--self-test", action="store_true",
                        help="verify the EM fitter recovers known synthetic parameters, then exit")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    features_dir = Path(args.features_dir)
    symbols = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
    timeframe = args.timeframe.upper()

    series_by_symbol = {sym: load_feature_file(features_dir, sym, timeframe) for sym in symbols}
    for sym, ser in series_by_symbol.items():
        print(f"loaded {sym} {timeframe}: {ser['X'].shape[0]} vectors "
              f"{iso_ms(int(ser['timestamps'][0]))} -> {iso_ms(int(ser['timestamps'][-1]))}")

    pooled_start = min(int(s["timestamps"][0]) for s in series_by_symbol.values())
    pooled_end = max(int(s["timestamps"][-1]) for s in series_by_symbol.values())

    # ---- walk-forward folds (fixed boundaries derived from the data window)
    folds = []
    k = 0
    while True:
        train_start = pooled_start + k * STEP_MONTHS * MONTH_MS
        train_end = train_start + TRAIN_MONTHS * MONTH_MS
        test_end = train_end + TEST_MONTHS * MONTH_MS
        if train_end >= pooled_end:
            break
        test_end = min(test_end, pooled_end + 1)
        n_test = sum(
            int(np.sum((s["timestamps"] >= train_end) & (s["timestamps"] < test_end)))
            for s in series_by_symbol.values()
        )
        if n_test < MIN_TEST_BARS:
            break
        folds.append((train_start, train_end, test_end))
        k += 1

    fold_reports = []
    for f_idx, (train_start, train_end, test_end) in enumerate(folds, start=1):
        train_seqs_raw = []
        for sym in symbols:
            ser = series_by_symbol[sym]
            mask = (ser["timestamps"] >= train_start) & (ser["timestamps"] < train_end)
            if int(mask.sum()) > 0:
                train_seqs_raw.append(ser["X"][mask])
        n_train = sum(int(X.shape[0]) for X in train_seqs_raw)
        if n_train < MIN_TEST_BARS:
            print(
                f"WARNING fold {f_idx}: only {n_train} pooled train bars in "
                f"{iso_ms(train_start)[:10]}..{iso_ms(train_end)[:10]} "
                f"(need >= {MIN_TEST_BARS}) — skipping fold; check that the "
                "feature export covers the requested window",
                file=sys.stderr,
            )
            continue
        pooled_train = np.vstack(train_seqs_raw)
        feat_means = pooled_train.mean(axis=0)
        feat_stds = pooled_train.std(axis=0)
        if np.any(feat_stds <= 0):
            raise ValueError(f"fold {f_idx}: degenerate train-window feature std {feat_stds.tolist()}")
        train_seqs = [(X - feat_means) / feat_stds for X in train_seqs_raw]

        fit = fit_hmm(train_seqs)
        if not fit["converged"]:
            print(
                f"WARNING fold {f_idx}: EM did not converge within {N_ITER} "
                f"iterations (ll/obs={fit['ll_per_obs']:.6f}) — raise N_ITER "
                "if this recurs",
                file=sys.stderr,
            )
        labels_by_state = label_states(fit["means"])
        model = {"A": fit["A"], "pi": stationary_distribution(fit["A"]),
                 "means": fit["means"], "covs": fit["covs"]}

        per_symbol = {}
        all_raw: list[str] = []
        all_smoothed: list[str] = []
        all_fwd: list[tuple[str, float]] = []
        total_flips_smoothed = 0
        total_flips_raw = 0
        total_weeks = 0.0
        dwell_runs: list[int] = []
        for sym in symbols:
            sim = simulate_test_window(
                series_by_symbol[sym], model, feat_means, feat_stds,
                labels_by_state, train_end, test_end,
            )
            weeks = sim["n_bars"] / H1_BARS_PER_WEEK if sim["n_bars"] > 0 else 0.0
            runs = run_lengths(sim["smoothed"])
            per_symbol[sym] = {
                "test_bars": sim["n_bars"],
                "distribution_smoothed": distribution(sim["smoothed"]),
                "flips_raw": flips(sim["raw_labels"]),
                "flips_smoothed": flips(sim["smoothed"]),
                "flips_per_week_smoothed": round(flips(sim["smoothed"]) / weeks, 2) if weeks > 0 else None,
                "mean_dwell_bars": round(float(np.mean(runs)), 1) if runs else None,
                "fwd_skipped_noncontiguous": sim["skipped_noncontig"],
            }
            all_raw.extend(sim["raw_labels"])
            all_smoothed.extend(sim["smoothed"])
            all_fwd.extend(sim["fwd_returns"])
            total_flips_smoothed += flips(sim["smoothed"])
            total_flips_raw += flips(sim["raw_labels"])
            total_weeks += weeks
            dwell_runs.extend(runs)

        dist_smoothed = distribution(all_smoothed)
        fold_report = {
            "fold": f_idx,
            "train": {"from": iso_ms(train_start), "to": iso_ms(train_end),
                      "obs": int(pooled_train.shape[0])},
            "test": {"from": iso_ms(train_end), "to": iso_ms(test_end),
                     "obs": len(all_smoothed)},
            "em": {"iterations": fit["iterations"], "converged": fit["converged"],
                   "ll_per_obs": round(fit["ll_per_obs"], 6)},
            "state_labels": labels_by_state,
            "distribution_raw": distribution(all_raw),
            "distribution_smoothed": dist_smoothed,
            "flips_per_week_raw": round(total_flips_raw / total_weeks, 2) if total_weeks > 0 else None,
            "flips_per_week_smoothed": round(total_flips_smoothed / total_weeks, 2) if total_weeks > 0 else None,
            "mean_dwell_bars": round(float(np.mean(dwell_runs)), 1) if dwell_runs else None,
            "per_symbol": per_symbol,
            "forward_outcomes_smoothed": fwd_outcome_stats(all_fwd),
            "degenerate_single_label": max(dist_smoothed.values()) > 0.90,
        }
        fold_reports.append(fold_report)
        print(f"fold {f_idx}: train {fold_report['train']['from'][:10]}->{fold_report['train']['to'][:10]} "
              f"test->{fold_report['test']['to'][:10]} dist={dist_smoothed} "
              f"flips/wk={fold_report['flips_per_week_smoothed']} dwell={fold_report['mean_dwell_bars']}")

    # ---- final model: full pooled window ------------------------------------
    full_seqs_raw = [series_by_symbol[sym]["X"] for sym in symbols]
    pooled_full = np.vstack(full_seqs_raw)
    feat_means = pooled_full.mean(axis=0)
    feat_stds = pooled_full.std(axis=0)
    if np.any(feat_stds <= 0):
        raise ValueError(f"final fit: degenerate full-window feature std {feat_stds.tolist()}")
    full_seqs = [(X - feat_means) / feat_stds for X in full_seqs_raw]
    final_fit = fit_hmm(full_seqs)
    if not final_fit["converged"]:
        print(
            f"WARNING: final EM fit did not converge within {N_ITER} iterations "
            f"(ll/obs={final_fit['ll_per_obs']:.6f}) — consider raising N_ITER "
            "before shipping this model",
            file=sys.stderr,
        )
    final_labels = label_states(final_fit["means"])

    trained_at = iso_ms(pooled_end)  # deterministic: data window end, not wall clock
    model_dict = model_to_json_dict(final_fit, feat_means, feat_stds, final_labels, trained_at)
    model_path = Path(args.models_dir) / "crypto_hmm.json"
    model_sha = write_json(model_path, model_dict)
    print(f"final model: {model_path} sha256={model_sha[:16]} "
          f"(iterations={final_fit['iterations']}, converged={final_fit['converged']}, "
          f"ll/obs={final_fit['ll_per_obs']:.4f})")

    # ---- validation report ---------------------------------------------------
    window_tag = f"{iso_ms(pooled_start)[:10]}-{iso_ms(pooled_end)[:10]}"
    report = {
        "spec": {
            "task": "regime-hmm-walkforward",
            "symbols": symbols,
            "timeframe": timeframe,
            "feature_names": FEATURE_NAMES,
            "feature_source": "scripts/research/export-regime-features.ts (TS features.ts is the only feature implementation — plan D5; this trainer never recomputes features)",
            "pooled_window": {
                "from": iso_ms(pooled_start),
                "to": iso_ms(pooled_end),
                "vectors": {sym: int(series_by_symbol[sym]["X"].shape[0]) for sym in symbols},
            },
            "walk_forward": {
                "train_months": TRAIN_MONTHS, "test_months": TEST_MONTHS,
                "step_months": STEP_MONTHS, "month_ms": MONTH_MS,
                "boundary_rule": f"fixed boundaries derived from the pooled data start; folds dropped when pooled test bars < {MIN_TEST_BARS}",
            },
            "em": {"n_states": N_STATES, "covariance": f"full + ridge {RIDGE}",
                   "seed": SEED, "max_iter": N_ITER, "tol": TOL,
                   "init": "deterministic ADX-tercile (no randomness)"},
            "runtime_mirror": {
                "sequence_length": SEQUENCE_LENGTH,
                "min_dwell_bars": MIN_DWELL_BARS,
                "override_confidence": OVERRIDE_CONFIDENCE,
                "forward_bars": FORWARD_BARS,
                "note": "test bars classified exactly as production: trailing-64 Viterbi terminal state, forward-posterior confidence, applyHysteresis smoothing; forward outcomes/distributions reported on the smoothed (persisted) labels",
            },
            "final_model_policy": "fitted on the full pooled window; walk-forward folds estimate this procedure's out-of-sample behaviour",
            "determinism": "seed 42, fixed fold boundaries, trained_at = data window end; byte-identical model + report on re-run over the same feature files",
        },
        "folds": fold_reports,
        "summary": {
            "n_folds": len(fold_reports),
            "mean_flips_per_week_smoothed": round(
                float(np.mean([f["flips_per_week_smoothed"] for f in fold_reports
                               if f["flips_per_week_smoothed"] is not None])), 2)
            if fold_reports else None,
            "mean_dwell_bars": round(
                float(np.mean([f["mean_dwell_bars"] for f in fold_reports
                               if f["mean_dwell_bars"] is not None])), 1)
            if fold_reports else None,
            "degenerate_folds": [f["fold"] for f in fold_reports if f["degenerate_single_label"]],
        },
        "final_model": {
            "path": "scripts/hmm-regime/models/crypto_hmm.json",
            "sha256": model_sha,
            "trained_at": trained_at,
            "state_labels": final_labels,
            "em": {"iterations": final_fit["iterations"], "converged": final_fit["converged"],
                   "ll_per_obs": round(final_fit["ll_per_obs"], 6)},
        },
    }
    report_name = f"regime-hmm-walkforward-{'_'.join(symbols)}-{timeframe}-{window_tag}.json"
    report_path = Path(args.report_dir) / report_name
    report_sha = write_json(report_path, report)
    print(f"report: {report_path} sha256={report_sha[:16]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
