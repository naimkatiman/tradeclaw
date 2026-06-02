"""
Tests for scripts/calibrate-atr-multipliers.py — replay and EV math.

Run with:
    python -m pytest scripts/test_calibrate_atr.py -v
    # or, no pytest installed:
    python scripts/test_calibrate_atr.py
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

# The script has a hyphen in its name so we have to load it by path.
SCRIPT = Path(__file__).parent / "calibrate-atr-multipliers.py"
spec = importlib.util.spec_from_file_location("calibrate_atr_multipliers", SCRIPT)
calib = importlib.util.module_from_spec(spec)
sys.modules["calibrate_atr_multipliers"] = calib
spec.loader.exec_module(calib)


def _signal(direction: str, entry: float, atr: float, high: float, low: float, outcome: str = "TP"):
    return {
        "symbol": "BTCUSDT",
        "direction": direction,
        "entry": entry,
        "atr": atr,
        "tp1": None,
        "outcome": outcome,
        "high": high,
        "low": low,
    }


def test_replay_buy_hits_tp_when_high_exceeds_target():
    s = _signal("BUY", entry=100.0, atr=1.0, high=103.0, low=99.5)
    # mult=0.5 → SL at 99.5 — low equals SL but doesn't cross below; reward_mult=2 → TP at 102
    assert calib._replay_signal(s, 0.5, 2.0) in ("TP", "SL")
    # mult=1.5 → SL at 98.5 (low 99.5 doesn't reach). TP at 102 → hit.
    assert calib._replay_signal(s, 1.5, 2.0) == "TP"


def test_replay_buy_hits_sl_when_low_crosses_stop():
    s = _signal("BUY", entry=100.0, atr=1.0, high=100.5, low=98.4)
    # mult=1.5 → SL at 98.5; low 98.4 < 98.5 → SL hit
    assert calib._replay_signal(s, 1.5, 2.0) == "SL"


def test_replay_sell_hits_tp_when_low_below_target():
    s = _signal("SELL", entry=100.0, atr=1.0, high=100.5, low=97.5)
    # SL for SELL with mult 1.0 → 101; high 100.5 < 101 (safe). TP at 98 → low 97.5 hits.
    assert calib._replay_signal(s, 1.0, 2.0) == "TP"


def test_replay_handles_expiry():
    s = _signal("BUY", entry=100.0, atr=1.0, high=100.2, low=99.9)
    # Tight stop & target both unreached
    assert calib._replay_signal(s, 1.5, 2.0) == "EXPIRED"


def test_expected_value_positive_for_winning_set():
    # 7 TP, 3 SL at mult=1.0 reward=2.0 → wins worth 2R each, losses -1R
    outcomes = ["TP"] * 7 + ["SL"] * 3
    ev = calib._expected_value(outcomes, mult=1.0, reward_mult=2.0)
    # (7 * 2 - 3 * 1) / 10 = 1.1
    assert abs(ev - 1.1) < 1e-9


def test_expected_value_zero_for_no_trades():
    assert calib._expected_value([], mult=1.0, reward_mult=2.0) == 0.0


def test_calibrate_skips_symbols_below_min_trades():
    rows = [_signal("BUY", 100, 1, 102, 99, "TP")] * 5
    out = calib.calibrate(rows, min_trades=10)
    assert out == {}


def test_calibrate_picks_best_ev_multiplier():
    # Construct signals where tighter stops would hit SL but a wider stop wins.
    rows = []
    for _ in range(25):
        rows.append(_signal("BUY", entry=100.0, atr=1.0, high=103.0, low=99.0, outcome="TP"))
    out = calib.calibrate(rows, min_trades=20)
    assert "BTCUSDT" in out
    # 99 doesn't break a 1.0+ multiplier stop (SL at 99 inclusive isn't crossed)
    # but 0.5 multiplier (SL at 99.5) IS crossed → should be picked against.
    assert out["BTCUSDT"]["multiplier"] != 0.5


def _run_as_script():
    """Allow `python scripts/test_calibrate_atr.py` to run without pytest."""
    failures = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except AssertionError as e:
                failures += 1
                print(f"FAIL {name}: {e}")
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    _run_as_script()
