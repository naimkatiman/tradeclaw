#!/usr/bin/env python3
"""
TradeClaw Signal Outcome Checker
Runs hourly — checks if past signals hit TP1 or SL, updates signals.db

Learning loop:
  fired signal → wait OUTCOME_WINDOW_HOURS → check price vs entry/tp1/sl → mark outcome
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

# How long to wait before checking outcome.
# Was 4h; bumped to 8h when TP1 was at 3*ATR. TP1 is now 1.5*ATR (see scanner-engine.py),
# which is reachable inside this window. Leaving at 8h for safety margin.
OUTCOME_WINDOW_HOURS = 8

# Combos the scanner no longer emits. Excluded from win-rate aggregates so that
# legacy signals fired before the blacklist don't drag the numbers.
BLACKLISTED_COMBOS = {
    "SOLUSDT_SELL", "USDJPY_BUY", "XRPUSDT_SELL", "BTCUSDT_SELL",
    "EURUSD_SELL", "GBPUSD_SELL", "ETHUSDT_SELL", "BNBUSDT_SELL",
}

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


def get_price_range(symbol: str, fired_at: str) -> Optional[tuple]:
    """
    Get HIGH and LOW price during the 8h window after a signal fired.
    Returns (high, low, current) or None.
    Crypto → Binance klines. Forex/metals → yfinance 15m history.
    If neither source returns a range, falls back to current-price snapshot,
    which intentionally disqualifies reversed TP hits (the bug we were fixing).
    """
    fired_dt = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))

    binance_sym = BINANCE_MAP.get(symbol.upper())
    if binance_sym:
        try:
            start_ms = int(fired_dt.timestamp() * 1000)
            end_ms = start_ms + OUTCOME_WINDOW_HOURS * 3600 * 1000

            r = requests.get(
                "https://api.binance.com/api/v3/klines",
                params={
                    "symbol": binance_sym,
                    "interval": "15m",  # 32 candles over 8h
                    "startTime": start_ms,
                    "endTime": end_ms,
                    "limit": 40,
                },
                timeout=5,
            )
            if r.status_code == 200:
                klines = r.json()
                if klines:
                    high = max(float(k[2]) for k in klines)
                    low = min(float(k[3]) for k in klines)
                    current = float(klines[-1][4])  # last close
                    return (high, low, current)
        except Exception:
            pass

    yahoo_sym = YAHOO_MAP.get(symbol.upper())
    if yahoo_sym:
        try:
            import yfinance as yf
            # Pad the window: yfinance rounds to candle boundaries and needs
            # start < end strictly in UTC. One candle of slack on each side.
            start_dt = fired_dt - timedelta(minutes=15)
            end_dt = fired_dt + timedelta(hours=OUTCOME_WINDOW_HOURS, minutes=15)
            hist = yf.Ticker(yahoo_sym).history(
                start=start_dt,
                end=end_dt,
                interval="15m",
            )
            if not hist.empty:
                high = float(hist["High"].max())
                low = float(hist["Low"].min())
                current = float(hist["Close"].iloc[-1])
                return (high, low, current)
        except Exception:
            pass

    # Last resort: snapshot price. Reversed TP hits will be missed — this is
    # why Binance/Yahoo klines are tried first.
    price = get_current_price(symbol)
    if price:
        return (price, price, price)
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
        price_range = get_price_range(row["symbol"], row["fired_at"])
        if price_range is None:
            print(f"  {row['symbol']}: price unavailable, skipping")
            continue

        high, low, current = price_range
        entry = row["entry"]
        tp1   = row["tp1"]
        sl    = row["sl"]
        sig   = row["signal"]

        # Determine outcome using HIGH/LOW range (not just snapshot)
        # This catches TP hits that occurred during the window but reversed
        if sig == "BUY":
            if high >= tp1:
                # Price reached TP1 at some point during the window
                outcome = "TP1_HIT"
                accuracy = 1
            elif low <= sl:
                outcome = "SL_HIT"
                accuracy = 0
            else:
                # Graduated: how far toward TP1 did price get? Use high water mark
                tp_range = tp1 - entry
                progress = (high - entry) / tp_range if tp_range != 0 else 0
                progress = max(0.0, min(1.0, progress))
                outcome = "EXPIRED_PROFIT" if current > entry else "EXPIRED_LOSS"
                accuracy = round(progress, 2)
        else:  # SELL
            if low <= tp1:
                # Price dropped to TP1 at some point during the window
                outcome = "TP1_HIT"
                accuracy = 1
            elif high >= sl:
                outcome = "SL_HIT"
                accuracy = 0
            else:
                tp_range = entry - tp1
                progress = (entry - low) / tp_range if tp_range != 0 else 0
                progress = max(0.0, min(1.0, progress))
                outcome = "EXPIRED_PROFIT" if current < entry else "EXPIRED_LOSS"
                accuracy = round(progress, 2)

        conn.execute("""
            UPDATE signals SET outcome = ?, accuracy = ? WHERE id = ?
        """, (outcome, accuracy, row["id"]))
        updated += 1
        range_info = f"H={high:.4f} L={low:.4f} C={current:.4f}" if high != low else f"{current:.4f}"
        print(f"  {row['symbol']} {sig} @ {entry:.4f} → [{range_info}] → {outcome}")

    conn.commit()

    # Print updated win rates.
    # Win = TP1_HIT, EXPIRED_PROFIT, or accuracy >= 0.5 (partial progress toward TP1).
    # EXPIRED_PROFIT was previously counted as a loss if progress < 0.5 — even
    # though the signal was directionally correct and closed profitable.
    if updated > 0:
        # Build "NOT blacklisted" filter for win-rate aggregates.
        if BLACKLISTED_COMBOS:
            bl_pairs = [c.rsplit("_", 1) for c in BLACKLISTED_COMBOS]
            bl_filter = " AND (" + " AND ".join(
                "NOT (symbol = ? AND signal = ?)" for _ in bl_pairs
            ) + ")"
            bl_params = [v for pair in bl_pairs for v in pair]
        else:
            bl_filter = ""
            bl_params = []

        print(f"\nUpdated {updated} signals. Win rates:")
        rates = conn.execute(f"""
            SELECT symbol, signal,
                   COUNT(*) as total,
                   SUM(CASE WHEN outcome IN ('TP1_HIT', 'EXPIRED_PROFIT')
                                 OR accuracy >= 0.5 THEN 1 ELSE 0 END) as wins,
                   ROUND(AVG(accuracy) * 100, 1) as avg_accuracy
            FROM signals
            WHERE outcome IS NOT NULL AND outcome != 'LEGACY'
            {bl_filter}
            GROUP BY symbol, signal
            ORDER BY (1.0 * SUM(CASE WHEN outcome IN ('TP1_HIT', 'EXPIRED_PROFIT')
                                         OR accuracy >= 0.5 THEN 1 ELSE 0 END)
                      / COUNT(*)) DESC
        """, bl_params).fetchall()

        for r in rates:
            win_pct = round(100.0 * r["wins"] / r["total"], 1) if r["total"] else 0
            print(
                f"  {r['symbol']} {r['signal']}: "
                f"{win_pct}% win rate ({r['wins']}/{r['total']}) "
                f"— {r['avg_accuracy']}% avg accuracy"
            )

        # Adaptive threshold uses the new win-rate definition, not avg accuracy.
        overall = conn.execute(f"""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN outcome IN ('TP1_HIT', 'EXPIRED_PROFIT')
                                 OR accuracy >= 0.5 THEN 1 ELSE 0 END) as wins,
                   ROUND(AVG(accuracy) * 100, 1) as avg_accuracy
            FROM signals
            WHERE outcome IS NOT NULL AND outcome != 'LEGACY'
            {bl_filter}
        """, bl_params).fetchone()

        if overall and overall["total"] >= 10:
            win_rate = round(100.0 * overall["wins"] / overall["total"], 1)
            print(
                f"\nOverall win rate: {win_rate}% "
                f"({overall['wins']}/{overall['total']}) "
                f"— avg accuracy {overall['avg_accuracy']}%"
            )
            threshold_file = SCRIPT_DIR / "confidence_threshold.txt"
            if win_rate < 40:
                print("⚠️  Win rate below 40% — raising confidence threshold to 80%")
                threshold_file.write_text("80")
            elif win_rate < 55:
                print("⚠️  Win rate below 55% — raising confidence threshold to 75%")
                threshold_file.write_text("75")
            elif win_rate > 70:
                print("✅ Win rate above 70% — lowering confidence threshold to 70%")
                threshold_file.write_text("70")
    else:
        print("No signals updated this run.")

    conn.close()


if __name__ == "__main__":
    check_outcomes()
