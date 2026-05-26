#!/usr/bin/env python3
"""
Per-symbol ATR stop-loss multiplier calibration (issue #53).

For each symbol with enough closed-out signals, replays the historical
signal set at a range of stop multipliers (`[0.5, 0.75, 1.0, 1.25, 1.5,
2.0]`) and picks the multiplier with the best expected value:

    EV = P(TP) * reward - P(SL) * risk

Writes the resulting multiplier per symbol to
`scripts/atr-multipliers.json`. The signal engine reads that file at
startup and falls back to the existing 0.75 default for any symbol
without a calibrated entry.

Usage:
    python scripts/calibrate-atr-multipliers.py
    python scripts/calibrate-atr-multipliers.py --min-trades 30
    python scripts/calibrate-atr-multipliers.py --output scripts/atr-multipliers.json

Designed to be run nightly via the same cron that drives
`signal-outcome-checker.py`.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Iterable

SCRIPT_DIR = Path(__file__).parent
DB_PATH = SCRIPT_DIR / "signals.db"
OUTPUT_PATH = SCRIPT_DIR / "atr-multipliers.json"

CANDIDATE_MULTIPLIERS = (0.5, 0.75, 1.0, 1.25, 1.5, 2.0)
DEFAULT_REWARD_MULTIPLIER = 2.0  # TP1 is at 2.0 * ATR in the live engine
DEFAULT_MIN_TRADES = 20


def _coerce_outcome(outcome: str | None) -> str | None:
    """Normalize the outcome column into 'TP', 'SL', 'EXPIRED', or None."""
    if not outcome:
        return None
    u = outcome.upper()
    if u in ("TP1_HIT", "TP_HIT", "WIN"):
        return "TP"
    if u in ("SL_HIT", "LOSS", "STOPPED"):
        return "SL"
    if u.startswith("EXPIRED"):
        return "EXPIRED"
    return None


def _load_closed_signals(conn: sqlite3.Connection) -> list[dict]:
    """Fetch every signal with a known outcome and the price metadata we need to replay."""
    cur = conn.execute(
        """
        SELECT symbol, direction, entry, sl, tp1, atr, outcome,
               high_during_window, low_during_window
          FROM signals
         WHERE outcome IS NOT NULL
        """
    )
    rows: list[dict] = []
    for r in cur.fetchall():
        symbol, direction, entry, sl, tp1, atr, outcome, hi, lo = r
        if entry is None or atr is None or atr <= 0:
            continue
        normalized = _coerce_outcome(outcome)
        if normalized is None:
            continue
        rows.append({
            "symbol": symbol,
            "direction": (direction or "").upper(),
            "entry": float(entry),
            "atr": float(atr),
            "tp1": float(tp1) if tp1 is not None else None,
            "outcome": normalized,
            "high": float(hi) if hi is not None else None,
            "low": float(lo) if lo is not None else None,
        })
    return rows


def _replay_signal(signal: dict, mult: float, reward_mult: float) -> str | None:
    """Replay a single signal at a candidate stop multiplier.

    Returns 'TP', 'SL', or 'EXPIRED'. If we don't have enough price-window
    data to make a determination, returns None.
    """
    entry = signal["entry"]
    atr = signal["atr"]
    high = signal["high"]
    low = signal["low"]

    if signal["direction"] == "BUY":
        sl_price = entry - atr * mult
        tp_price = entry + atr * reward_mult
        if low is None or high is None:
            # Fall back to the original outcome — assume the originally-tagged
            # outcome would have repeated under a similar stop distance.
            return signal["outcome"]
        if low <= sl_price:
            return "SL"
        if high >= tp_price:
            return "TP"
        return "EXPIRED"

    if signal["direction"] == "SELL":
        sl_price = entry + atr * mult
        tp_price = entry - atr * reward_mult
        if low is None or high is None:
            return signal["outcome"]
        if high >= sl_price:
            return "SL"
        if low <= tp_price:
            return "TP"
        return "EXPIRED"

    return None


def _expected_value(outcomes: Iterable[str], mult: float, reward_mult: float) -> float:
    """EV per trade in units of risk-multiple (R)."""
    total = 0
    wins = 0
    losses = 0
    for o in outcomes:
        total += 1
        if o == "TP":
            wins += 1
        elif o == "SL":
            losses += 1
    if total == 0:
        return 0.0
    reward_R = reward_mult / mult     # winners pay reward_mult ATR / risk = mult ATR
    return (wins * reward_R - losses * 1.0) / total


def calibrate(
    rows: list[dict],
    min_trades: int = DEFAULT_MIN_TRADES,
    reward_mult: float = DEFAULT_REWARD_MULTIPLIER,
) -> dict[str, dict]:
    """Compute the best multiplier per symbol."""
    by_symbol: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_symbol[r["symbol"]].append(r)

    out: dict[str, dict] = {}
    for symbol, sigs in by_symbol.items():
        if len(sigs) < min_trades:
            continue

        best_mult = None
        best_ev = float("-inf")
        per_mult_stats: list[dict] = []

        for mult in CANDIDATE_MULTIPLIERS:
            replayed = [_replay_signal(s, mult, reward_mult) for s in sigs]
            replayed = [r for r in replayed if r is not None]
            ev = _expected_value(replayed, mult, reward_mult)
            wins = sum(1 for r in replayed if r == "TP")
            losses = sum(1 for r in replayed if r == "SL")
            win_rate = wins / len(replayed) if replayed else 0.0
            per_mult_stats.append({
                "multiplier": mult,
                "trades": len(replayed),
                "win_rate": round(win_rate, 4),
                "ev_R": round(ev, 4),
            })
            if ev > best_ev:
                best_ev = ev
                best_mult = mult

        out[symbol] = {
            "multiplier": best_mult,
            "ev_R": round(best_ev, 4),
            "samples": len(sigs),
            "candidates": per_mult_stats,
        }

    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=str(DB_PATH))
    parser.add_argument("--output", default=str(OUTPUT_PATH))
    parser.add_argument("--min-trades", type=int, default=DEFAULT_MIN_TRADES)
    parser.add_argument("--reward-multiplier", type=float, default=DEFAULT_REWARD_MULTIPLIER)
    args = parser.parse_args()

    if not Path(args.db).exists():
        print(f"no signals.db at {args.db} — nothing to calibrate")
        return 0

    conn = sqlite3.connect(args.db)
    try:
        rows = _load_closed_signals(conn)
    finally:
        conn.close()

    if not rows:
        print("no closed signals with outcomes found — nothing to calibrate")
        return 0

    print(f"loaded {len(rows)} closed signals across "
          f"{len(set(r['symbol'] for r in rows))} symbols")

    result = calibrate(
        rows,
        min_trades=args.min_trades,
        reward_mult=args.reward_multiplier,
    )

    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "reward_multiplier": args.reward_multiplier,
        "min_trades_per_symbol": args.min_trades,
        "default_multiplier_fallback": 0.75,
        "multipliers": {sym: data["multiplier"] for sym, data in result.items()},
        "diagnostics": result,
    }

    with open(args.output, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"wrote {args.output} with calibrated multipliers for "
          f"{len(result)} symbols")
    for sym, data in result.items():
        print(f"  {sym}: mult={data['multiplier']}  EV={data['ev_R']:.3f}R  "
              f"samples={data['samples']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
