#!/usr/bin/env python3
"""
TradeClaw Signal Outcome Checker — Learning Loop

Runs hourly to:
1. Check if past signals hit TP1 or SL
2. Update signal-memory.json with outcomes
3. Calculate rolling win rate
4. Adjust confidence threshold if win rate drops below 60%

This implements the MemoryCore pattern for continuous learning.
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

import requests

# Configuration
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "data"

SIGNALS_FILE = DATA_DIR / "signals-live.json"
MEMORY_FILE = SCRIPT_DIR / "signal-memory.json"

# Thresholds
MIN_WIN_RATE = 0.60  # Escalate if below 60%
SUCCESS_WIN_RATE = 0.80  # Log success if above 80%
EXPIRY_HOURS = 4

# Symbol mapping for price fetching
BINANCE_SYMBOLS = {
    "BTCUSD": "BTCUSDT",
    "ETHUSD": "ETHUSDT",
    "XRPUSD": "XRPUSDT",
    "SOLUSD": "SOLUSDT",
    "BNBUSD": "BNBUSDT",
}

COINGECKO_IDS = {
    "BTCUSD": "bitcoin",
    "ETHUSD": "ethereum",
    "XRPUSD": "ripple",
    "SOLUSD": "solana",
    "BNBUSD": "binancecoin",
}

# ─── Price Fetching ─────────────────────────────────────────────

def get_current_price(symbol: str) -> Optional[float]:
    """Get current price for a symbol"""

    # Try Binance for crypto
    binance_sym = BINANCE_SYMBOLS.get(symbol)
    if binance_sym:
        try:
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={binance_sym}"
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                return float(resp.json()["price"])
        except Exception:
            pass

    # Try CoinGecko
    cg_id = COINGECKO_IDS.get(symbol)
    if cg_id:
        try:
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={cg_id}&vs_currencies=usd"
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if cg_id in data:
                    return float(data[cg_id]["usd"])
        except Exception:
            pass

    # Forex fallback using exchange rates API
    if symbol in ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "XAGUSD"]:
        try:
            url = "https://open.er-api.com/v6/latest/USD"
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                rates = resp.json().get("rates", {})
                if symbol == "EURUSD" and "EUR" in rates:
                    return 1 / rates["EUR"]
                elif symbol == "GBPUSD" and "GBP" in rates:
                    return 1 / rates["GBP"]
                elif symbol == "USDJPY" and "JPY" in rates:
                    return rates["JPY"]
        except Exception:
            pass

    return None

def get_price_history(symbol: str, hours: int = 5) -> list[tuple[datetime, float]]:
    """Get price history for the last N hours (for checking if TP/SL was hit)"""
    prices = []

    binance_sym = BINANCE_SYMBOLS.get(symbol)
    if binance_sym:
        try:
            url = f"https://api.binance.com/api/v3/klines"
            params = {
                "symbol": binance_sym,
                "interval": "5m",
                "limit": hours * 12,  # 12 candles per hour at 5m
            }
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 200:
                for candle in resp.json():
                    ts = datetime.fromtimestamp(candle[0] / 1000, tz=timezone.utc)
                    high = float(candle[2])
                    low = float(candle[3])
                    prices.append((ts, high, low))
        except Exception:
            pass

    return prices

def check_if_hit(signal: dict, price_history: list) -> Optional[str]:
    """Check if signal hit TP1 or SL"""
    direction = signal.get("signal")
    entry = signal.get("entry", 0)
    tp1 = signal.get("tp1", 0)
    sl = signal.get("sl", 0)

    if not all([direction, entry, tp1, sl]):
        return None

    for ts, high, low in price_history:
        if direction == "BUY":
            if high >= tp1:
                return "TP1_HIT"
            if low <= sl:
                return "SL_HIT"
        elif direction == "SELL":
            if low <= tp1:
                return "TP1_HIT"
            if high >= sl:
                return "SL_HIT"

    return None

# ─── Memory Management ─────────────────────────────────────────

def load_memory() -> dict:
    """Load signal memory from file"""
    if not MEMORY_FILE.exists():
        return {
            "version": "1.0.0",
            "signals": [],
            "stats": {
                "total_signals": 0,
                "resolved_signals": 0,
                "tp1_hit": 0,
                "sl_hit": 0,
                "expired": 0,
                "win_rate": 0,
                "current_confidence_threshold": 70,
                "last_updated": None,
            },
            "config": {
                "min_confidence_threshold": 70,
                "escalated_confidence_threshold": 75,
                "win_rate_escalation_trigger": 0.60,
                "win_rate_success_trigger": 0.80,
                "signal_expiry_hours": 4,
            },
        }

    with open(MEMORY_FILE, "r") as f:
        return json.load(f)

def save_memory(memory: dict):
    """Save signal memory to file"""
    with open(MEMORY_FILE, "w") as f:
        json.dump(memory, f, indent=2)

def load_live_signals() -> list[dict]:
    """Load current live signals"""
    if not SIGNALS_FILE.exists():
        return []

    with open(SIGNALS_FILE, "r") as f:
        data = json.load(f)
        return data.get("signals", [])

# ─── Main Logic ─────────────────────────────────────────────────

def import_new_signals(memory: dict):
    """Import new signals from signals-live.json to memory"""
    live_signals = load_live_signals()
    existing_ids = {s["id"] for s in memory["signals"]}

    new_count = 0
    for signal in live_signals:
        if signal["id"] not in existing_ids:
            memory_signal = {
                "id": signal["id"],
                "symbol": signal["symbol"],
                "signal": signal["signal"],
                "confidence": signal["confidence"],
                "entry": signal["entry"],
                "tp1": signal["tp1"],
                "sl": signal["sl"],
                "fired_at": signal["timestamp"],
                "outcome": None,
                "resolved_at": None,
                "accuracy": None,
            }
            memory["signals"].append(memory_signal)
            memory["stats"]["total_signals"] += 1
            new_count += 1

    if new_count > 0:
        print(f"Imported {new_count} new signals to memory")

    return new_count

def check_pending_signals(memory: dict):
    """Check pending signals for outcomes"""
    now = datetime.now(timezone.utc)
    checked = 0
    resolved = 0

    for signal in memory["signals"]:
        if signal["outcome"] is not None:
            continue  # Already resolved

        fired_at = datetime.fromisoformat(signal["fired_at"].replace("Z", "+00:00"))
        age_hours = (now - fired_at).total_seconds() / 3600

        # Skip if too old (expired)
        if age_hours > EXPIRY_HOURS:
            signal["outcome"] = "EXPIRED"
            signal["resolved_at"] = now.isoformat()
            signal["accuracy"] = False
            memory["stats"]["expired"] += 1
            memory["stats"]["resolved_signals"] += 1
            resolved += 1
            print(f"  {signal['symbol']}: EXPIRED (no outcome in {EXPIRY_HOURS}h)")
            continue

        # Get price history and check outcome
        price_history = get_price_history(signal["symbol"])
        if not price_history:
            continue  # Skip if can't get prices

        outcome = check_if_hit(signal, price_history)
        if outcome:
            signal["outcome"] = outcome
            signal["resolved_at"] = now.isoformat()
            signal["accuracy"] = outcome == "TP1_HIT"

            if outcome == "TP1_HIT":
                memory["stats"]["tp1_hit"] += 1
            else:
                memory["stats"]["sl_hit"] += 1

            memory["stats"]["resolved_signals"] += 1
            resolved += 1
            print(f"  {signal['symbol']} {signal['signal']}: {outcome}")

        checked += 1

    print(f"Checked {checked} pending signals, resolved {resolved}")
    return resolved

def calculate_win_rate(memory: dict) -> float:
    """Calculate rolling win rate from resolved signals"""
    resolved = memory["stats"]["resolved_signals"]
    if resolved == 0:
        return 0.0

    wins = memory["stats"]["tp1_hit"]
    # Don't count expired as losses for win rate calculation
    actual_resolved = wins + memory["stats"]["sl_hit"]

    if actual_resolved == 0:
        return 0.0

    return wins / actual_resolved

def adjust_threshold(memory: dict, win_rate: float):
    """Adjust confidence threshold based on win rate"""
    config = memory["config"]
    stats = memory["stats"]

    if win_rate < config["win_rate_escalation_trigger"]:
        # Win rate dropped below 60% — escalate threshold
        new_threshold = config["escalated_confidence_threshold"]
        if stats["current_confidence_threshold"] != new_threshold:
            print(f"WARNING: Win rate {win_rate:.1%} below 60% — raising threshold to {new_threshold}%")
            stats["current_confidence_threshold"] = new_threshold

    elif win_rate >= config["win_rate_success_trigger"]:
        # Win rate above 80% — log success (but don't lower threshold yet)
        print(f"SUCCESS: Win rate {win_rate:.1%} above 80% — system performing well")
        # Could lower threshold here, but keeping conservative
        stats["current_confidence_threshold"] = config["min_confidence_threshold"]

    else:
        # Normal range — use standard threshold
        stats["current_confidence_threshold"] = config["min_confidence_threshold"]

def cleanup_old_signals(memory: dict, max_age_days: int = 7):
    """Remove resolved signals older than max_age_days"""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=max_age_days)

    original_count = len(memory["signals"])
    memory["signals"] = [
        s for s in memory["signals"]
        if s["outcome"] is None or  # Keep pending
        datetime.fromisoformat(s["resolved_at"].replace("Z", "+00:00")) > cutoff
    ]

    removed = original_count - len(memory["signals"])
    if removed > 0:
        print(f"Cleaned up {removed} old resolved signals")

def main():
    """Main outcome checking loop"""
    print(f"[{datetime.now(timezone.utc).isoformat()}] Signal Outcome Checker starting...")

    # Load memory
    memory = load_memory()

    # Import any new signals
    import_new_signals(memory)

    # Check pending signals for outcomes
    print("\nChecking signal outcomes...")
    check_pending_signals(memory)

    # Calculate win rate
    win_rate = calculate_win_rate(memory)
    memory["stats"]["win_rate"] = round(win_rate, 4)
    memory["stats"]["last_updated"] = datetime.now(timezone.utc).isoformat()

    print(f"\nStats:")
    print(f"  Total signals: {memory['stats']['total_signals']}")
    print(f"  Resolved: {memory['stats']['resolved_signals']}")
    print(f"  TP1 hit: {memory['stats']['tp1_hit']}")
    print(f"  SL hit: {memory['stats']['sl_hit']}")
    print(f"  Expired: {memory['stats']['expired']}")
    print(f"  Win rate: {win_rate:.1%}")

    # Adjust threshold based on performance
    adjust_threshold(memory, win_rate)
    print(f"  Current threshold: {memory['stats']['current_confidence_threshold']}%")

    # Cleanup old signals
    cleanup_old_signals(memory)

    # Save memory
    save_memory(memory)
    print(f"\nMemory saved to {MEMORY_FILE}")

if __name__ == "__main__":
    main()
