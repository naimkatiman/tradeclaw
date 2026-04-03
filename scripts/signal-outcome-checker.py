#!/usr/bin/env python3
"""
TradeClaw Signal Outcome Checker
Runs hourly — checks if past signals hit TP1 or SL, updates signals.db

Learning loop:
  fired signal → wait 4h → check current price vs entry/tp1/sl → mark outcome
  outcome data feeds win_rate → win_rate feeds confidence scoring
"""

import json
import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

import requests

SCRIPT_DIR = Path(__file__).parent
DB_PATH = SCRIPT_DIR / "signals.db"

# How long to wait before checking outcome
OUTCOME_WINDOW_HOURS = 4

# Binance symbol mapping
BINANCE_MAP = {
    "BTCUSDT": "BTCUSDT",
    "ETHUSDT": "ETHUSDT",
    "XRPUSDT": "XRPUSDT",
    "SOLUSDT": "SOLUSDT",
    "BNBUSDT": "BNBUSDT",
    "BTCUSD":  "BTCUSDT",
    "ETHUSD":  "ETHUSDT",
    "XRPUSD":  "XRPUSDT",
}

# Yahoo Finance fallback for forex/metals
YAHOO_MAP = {
    "XAUUSD": "GC=F",
    "XAGUSD": "SI=F",
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "JPY=X",
}


def get_current_price(symbol: str) -> Optional[float]:
    """Fetch current price — Binance for crypto, Yahoo for forex/metals"""
    binance_sym = BINANCE_MAP.get(symbol.upper())
    if binance_sym:
        try:
            r = requests.get(
                f"https://api.binance.com/api/v3/ticker/price",
                params={"symbol": binance_sym},
                timeout=5,
            )
            if r.status_code == 200:
                return float(r.json()["price"])
        except Exception:
            pass

    yahoo_sym = YAHOO_MAP.get(symbol.upper())
    if yahoo_sym:
        try:
            import yfinance as yf
            ticker = yf.Ticker(yahoo_sym)
            hist = ticker.history(period="1d", interval="1m")
            if not hist.empty:
                return float(hist["Close"].iloc[-1])
        except Exception:
            pass

    return None


def check_outcomes():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=OUTCOME_WINDOW_HOURS)

    # Re-evaluate LEGACY signals too (they were marked by old checker)
    conn.execute("UPDATE signals SET outcome = NULL WHERE outcome = 'LEGACY'")
    conn.commit()

    # Get signals old enough to check, still without outcome
    pending = conn.execute("""
        SELECT id, symbol, signal, entry, tp1, tp2, sl, fired_at
        FROM signals
        WHERE outcome IS NULL
          AND fired_at < ?
        ORDER BY fired_at ASC
        LIMIT 100
    """, (cutoff.isoformat(),)).fetchall()

    print(f"[{now.strftime('%H:%M:%S')}] Checking {len(pending)} pending signals...")

    updated = 0
    for row in pending:
        price = get_current_price(row["symbol"])
        if price is None:
            print(f"  {row['symbol']}: price unavailable, skipping")
            continue

        entry = row["entry"]
        tp1   = row["tp1"]
        sl    = row["sl"]
        sig   = row["signal"]

        # Determine outcome based on current price vs entry/tp1/sl
        # Accuracy is graduated: TP1_HIT=1, SL_HIT=0, EXPIRED=proportional
        if sig == "BUY":
            if price >= tp1:
                outcome = "TP1_HIT"
                accuracy = 1
            elif price <= sl:
                outcome = "SL_HIT"
                accuracy = 0
            else:
                # Graduated: how far toward TP1 did price get? (0.0 = at entry, 1.0 = at TP1)
                tp_range = tp1 - entry
                progress = (price - entry) / tp_range if tp_range != 0 else 0
                progress = max(0.0, min(1.0, progress))  # clamp 0-1
                outcome = "EXPIRED_PROFIT" if price > entry else "EXPIRED_LOSS"
                accuracy = round(progress, 2)
        else:  # SELL
            if price <= tp1:
                outcome = "TP1_HIT"
                accuracy = 1
            elif price >= sl:
                outcome = "SL_HIT"
                accuracy = 0
            else:
                tp_range = entry - tp1
                progress = (entry - price) / tp_range if tp_range != 0 else 0
                progress = max(0.0, min(1.0, progress))
                outcome = "EXPIRED_PROFIT" if price < entry else "EXPIRED_LOSS"
                accuracy = round(progress, 2)

        conn.execute("""
            UPDATE signals SET outcome = ?, accuracy = ? WHERE id = ?
        """, (outcome, accuracy, row["id"]))
        updated += 1
        print(f"  {row['symbol']} {sig} @ {entry:.4f} → {price:.4f} → {outcome}")

    conn.commit()

    # Print updated win rates
    if updated > 0:
        print(f"\nUpdated {updated} signals. Win rates:")
        rates = conn.execute("""
            SELECT symbol, signal,
                   COUNT(*) as total,
                   SUM(CASE WHEN accuracy >= 0.5 THEN 1 ELSE 0 END) as wins,
                   ROUND(AVG(accuracy) * 100, 1) as avg_accuracy
            FROM signals
            WHERE outcome IS NOT NULL AND outcome != 'LEGACY'
            GROUP BY symbol, signal
            ORDER BY avg_accuracy DESC
        """).fetchall()

        for r in rates:
            print(f"  {r['symbol']} {r['signal']}: {r['avg_accuracy']}% avg accuracy ({r['wins']}/{r['total']} wins)")

        # Adaptive threshold: if overall win rate < 60%, tighten to 75%
        overall = conn.execute("""
            SELECT ROUND(AVG(accuracy) * 100, 1) as avg_accuracy,
                   COUNT(*) as total,
                   SUM(CASE WHEN accuracy >= 0.5 THEN 1 ELSE 0 END) as wins
            FROM signals WHERE outcome IS NOT NULL
        """).fetchone()

        if overall and overall["total"] >= 10:
            acc = overall["avg_accuracy"]
            print(f"\nOverall avg accuracy: {acc}% ({overall['wins']}/{overall['total']} wins)")
            if acc < 40:
                print("⚠️  Accuracy below 40% — raising confidence threshold to 80%")
                threshold_file = SCRIPT_DIR / "confidence_threshold.txt"
                threshold_file.write_text("80")
            elif acc < 55:
                print("⚠️  Accuracy below 55% — raising confidence threshold to 75%")
                threshold_file = SCRIPT_DIR / "confidence_threshold.txt"
                threshold_file.write_text("75")
            elif acc > 70:
                print("✅ Accuracy above 70% — engine performing well, lowering threshold to 70%")
                threshold_file = SCRIPT_DIR / "confidence_threshold.txt"
                threshold_file.write_text("70")
    else:
        print("No signals updated this run.")

    conn.close()


if __name__ == "__main__":
    check_outcomes()
