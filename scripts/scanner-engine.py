#!/usr/bin/env python3
"""
TradeClaw Scanner Engine v4
Uses tradingview_screener bulk API — one call gets all symbols + all TF indicators
No rate limiting, pre-calculated on TV servers, sub-second response

Architecture:
  tradingview_screener (bulk) → SQLite cache → signals-live.json → Web API
"""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import pandas as pd
import requests
from tradingview_screener import Query, Column

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "data"
DB_PATH = SCRIPT_DIR / "signals.db"
OUTPUT_FILE = DATA_DIR / "signals-live.json"
def get_min_confidence() -> int:
    """Read adaptive threshold from outcome checker. Default 70, raises to 75 if win rate drops."""
    threshold_file = SCRIPT_DIR / "confidence_threshold.txt"
    try:
        return int(threshold_file.read_text().strip())
    except Exception:
        return 70

MIN_CONFIDENCE = get_min_confidence()

# ─── Candle-Close Detection ────────────────────────────────────
# Timeframe boundaries in minutes. A candle is "closed" if current time
# is within CANDLE_CLOSE_TOLERANCE of a boundary.
CANDLE_PERIODS = {"M5": 5, "M15": 15, "H1": 60, "H4": 240}
CANDLE_CLOSE_TOLERANCE_MIN = 2  # within 2 minutes of close = "closed"
INCOMPLETE_CANDLE_PENALTY = 8   # confidence penalty for incomplete candles

# ─── Binance Cross-Validation ──────────────────────────────────
BINANCE_PRICE_MAP = {
    "BTCUSDT": "BTCUSDT", "ETHUSDT": "ETHUSDT", "XRPUSDT": "XRPUSDT",
    "SOLUSDT": "SOLUSDT", "BNBUSDT": "BNBUSDT",
}
BINANCE_PRICE_DIVERGENCE_THRESHOLD = 0.005  # 0.5% divergence = warning
BINANCE_CROSS_VALIDATION_BONUS = 3  # bonus when Binance confirms price

# Target symbols per market
TARGET_SYMBOLS = {
    "crypto": {
        "exchange": "BINANCE",
        "symbols": ["BTCUSDT", "ETHUSDT", "XRPUSDT", "SOLUSDT", "BNBUSDT"],
    },
    "forex": {
        "exchange": None,  # multiple exchanges
        "symbols": ["EURUSD", "GBPUSD", "USDJPY"],
    },
    "cfd": {
        "exchange": None,
        "symbols": ["XAUUSD", "XAGUSD"],
    },
}

TF_COLS = {
    "M5":  "Recommend.All|5",
    "M15": "Recommend.All|15",
    "H1":  "Recommend.All|60",
    "H4":  "Recommend.All|240",
}

RSI_COLS = {
    "M5": "RSI|5",
    "H1": "RSI|60",
    "H4": "RSI|240",
}


def get_candle_status(now: datetime) -> dict[str, str]:
    """
    For each timeframe, determine if the candle is 'closed' or 'incomplete'.
    A candle is considered closed if we're within CANDLE_CLOSE_TOLERANCE_MIN
    of a period boundary.
    """
    minute = now.minute + now.second / 60
    hour_minute = now.hour * 60 + minute
    statuses = {}
    for tf, period in CANDLE_PERIODS.items():
        minutes_into_candle = hour_minute % period
        minutes_until_close = period - minutes_into_candle
        if minutes_into_candle <= CANDLE_CLOSE_TOLERANCE_MIN or minutes_until_close <= CANDLE_CLOSE_TOLERANCE_MIN:
            statuses[tf] = "closed"
        else:
            statuses[tf] = "incomplete"
    return statuses


def fetch_binance_prices() -> dict[str, float]:
    """Fetch current prices from Binance for cross-validation."""
    prices = {}
    try:
        resp = requests.get(
            "https://api.binance.com/api/v3/ticker/price",
            params={"symbols": json.dumps(list(BINANCE_PRICE_MAP.values()))},
            timeout=5,
        )
        if resp.status_code == 200:
            for item in resp.json():
                prices[item["symbol"]] = float(item["price"])
    except Exception as e:
        print(f"  [WARN] Binance price fetch failed: {e}")
    return prices


def cross_validate_price(symbol: str, tv_price: float, binance_prices: dict[str, float]) -> dict:
    """
    Compare TradingView price with Binance price.
    Returns validation result with divergence info.
    """
    binance_sym = BINANCE_PRICE_MAP.get(symbol)
    if not binance_sym or binance_sym not in binance_prices:
        return {"validated": False, "reason": "no_binance_data"}

    binance_price = binance_prices[binance_sym]
    if tv_price == 0:
        return {"validated": False, "reason": "no_tv_price"}

    divergence = abs(tv_price - binance_price) / tv_price
    return {
        "validated": True,
        "binance_price": round(binance_price, 6),
        "tv_price": round(tv_price, 6),
        "divergence_pct": round(divergence * 100, 3),
        "price_confirmed": divergence < BINANCE_PRICE_DIVERGENCE_THRESHOLD,
    }


def get_win_rates(conn: sqlite3.Connection) -> dict[str, dict]:
    """
    Calculate historical win rate per symbol+direction from signals.db.
    Returns: { "BTCUSDT_BUY": { "wins": 5, "losses": 2, "total": 7, "win_rate": 71.4 }, ... }
    """
    rates = {}
    try:
        cursor = conn.execute("""
            SELECT symbol, signal,
                   COUNT(*) as total,
                   SUM(CASE WHEN outcome = 'TP1_HIT' THEN 1 ELSE 0 END) as wins,
                   SUM(CASE WHEN outcome = 'SL_HIT' THEN 1 ELSE 0 END) as losses
            FROM signals
            WHERE outcome IS NOT NULL AND outcome != 'EXPIRED'
            GROUP BY symbol, signal
        """)
        for row in cursor.fetchall():
            symbol, direction, total, wins, losses = row
            key = f"{symbol}_{direction}"
            win_rate = round((wins / total) * 100, 1) if total > 0 else 0
            rates[key] = {
                "wins": wins,
                "losses": losses,
                "total": total,
                "win_rate": win_rate,
            }
    except Exception:
        pass  # Table may not have outcome column populated yet
    return rates


def rec_to_signal(value):
    """TV uses -1.0 to 1.0: >=0.5=BUY, <=-0.5=SELL, else NEUTRAL"""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if value >= 0.5:
        return "BUY"
    elif value <= -0.5:
        return "SELL"
    return None


def rec_confidence(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return 0
    abs_val = abs(value)
    if abs_val >= 0.8:
        return 85  # STRONG_BUY / STRONG_SELL
    elif abs_val >= 0.5:
        return 72  # BUY / SELL
    return 0


def fetch_market(market, info):
    """Single bulk call per market — returns DataFrame with all indicators"""
    try:
        q = Query().set_markets(market)

        # Select all needed columns
        cols = [
            "name", "close", "volume", "ATR",
            "RSI|5", "RSI|15", "RSI|60", "RSI|240",
            "MACD.macd|60", "MACD.signal|60",
            "MACD.macd|240", "MACD.signal|240",
            "EMA20|60", "EMA50|60", "EMA200|60",
            "BB.upper|60", "BB.lower|60",
            "Stoch.K|60",
            "Recommend.All|5", "Recommend.All|15",
            "Recommend.All|60", "Recommend.All|240",
        ]
        q = q.select(*cols)

        # Filter by symbols
        if info["exchange"]:
            q = q.where(
                Column("exchange").isin([info["exchange"]]),
                Column("name").isin(info["symbols"]),
            )
        else:
            q = q.where(Column("name").isin(info["symbols"]))

        q = q.limit(50)
        _, df = q.get_scanner_data()
        return df

    except Exception as e:
        print(f"  [ERROR] {market}: {e}")
        return None


def calculate_confluence(row, symbol_name, candle_statuses=None, win_rates=None, binance_validation=None):
    """
    Confluence = multiple TFs agreeing on same direction.
    Enhanced with candle-close filtering, win-rate weighting, and cross-validation.
    Returns (confluence_signal, individual_tf_signals) or (None, [])
    """
    candle_statuses = candle_statuses or {}
    win_rates = win_rates or {}
    binance_validation = binance_validation or {}

    tf_directions = {}
    for tf, col in TF_COLS.items():
        val = row.get(col)
        sig = rec_to_signal(val)
        if sig:
            tf_directions[tf] = sig

    if not tf_directions:
        return None, []

    buy_tfs = [tf for tf, s in tf_directions.items() if s == "BUY"]
    sell_tfs = [tf for tf, s in tf_directions.items() if s == "SELL"]

    # No mixed signals allowed
    if buy_tfs and sell_tfs:
        return None, []

    agreeing = buy_tfs if buy_tfs else sell_tfs
    if len(agreeing) < 2:
        confluence = None  # Not enough confluence for main signal
    else:
        direction = "BUY" if buy_tfs else "SELL"

        # Base from strongest agreeing TF (prefer H1)
        primary_tf = "H1" if "H1" in agreeing else agreeing[-1]
        base = rec_confidence(row.get(TF_COLS[primary_tf], 0))

        # Confluence bonus
        n = len(agreeing)
        bonus = {2: 5, 3: 12, 4: 20}.get(n, 20)

        # RSI extreme bonus
        rsi_h1 = row.get("RSI|60") or 50
        rsi_bonus = 5 if (direction == "BUY" and rsi_h1 < 35) or (direction == "SELL" and rsi_h1 > 65) else 0

        # ── Candle-close penalty ──
        # If majority of agreeing TFs have incomplete candles, penalize
        incomplete_count = sum(1 for tf in agreeing if candle_statuses.get(tf) == "incomplete")
        candle_penalty = 0
        if incomplete_count > len(agreeing) / 2:
            candle_penalty = INCOMPLETE_CANDLE_PENALTY
        candle_status_label = "closed" if incomplete_count == 0 else f"{incomplete_count}/{len(agreeing)} incomplete"

        # ── Win-rate weighting ──
        # If we have historical data, adjust confidence based on past performance
        wr_key = f"{symbol_name}_{direction}"
        win_rate_data = win_rates.get(wr_key)
        wr_bonus = 0
        if win_rate_data and win_rate_data["total"] >= 5:
            wr = win_rate_data["win_rate"]
            if wr >= 70:
                wr_bonus = 5   # historically strong signal
            elif wr < 45:
                wr_bonus = -5  # historically weak — penalize

        # ── Binance cross-validation bonus ──
        cross_bonus = 0
        if binance_validation.get("price_confirmed"):
            cross_bonus = BINANCE_CROSS_VALIDATION_BONUS

        confidence = min(base + bonus + rsi_bonus - candle_penalty + wr_bonus + cross_bonus, 95)

        if confidence < MIN_CONFIDENCE:
            confluence = None
        else:
            entry = row.get("close", 0) or 0
            atr = row.get("ATR") or (entry * 0.01)

            if direction == "BUY":
                tp1 = round(entry + atr * 1.5, 6)
                tp2 = round(entry + atr * 2.5, 6)
                sl  = round(entry - atr * 1.0, 6)
            else:
                tp1 = round(entry - atr * 1.5, 6)
                tp2 = round(entry - atr * 2.5, 6)
                sl  = round(entry + atr * 1.0, 6)

            reasons = [f"TF confluence: {', '.join(agreeing)} all {direction}"]
            if rsi_bonus:
                reasons.append(f"RSI extreme: {round(rsi_h1, 1)}")

            # MACD confirmation
            macd_h1 = (row.get("MACD.macd|60") or 0) - (row.get("MACD.signal|60") or 0)
            if (direction == "BUY" and macd_h1 > 0) or (direction == "SELL" and macd_h1 < 0):
                reasons.append(f"MACD H1 confirms {direction}")

            if candle_penalty > 0:
                reasons.append(f"Candle incomplete ({candle_status_label}) — confidence reduced")
            if wr_bonus > 0:
                reasons.append(f"Strong historical win rate: {win_rate_data['win_rate']}%")
            elif wr_bonus < 0:
                reasons.append(f"Weak historical win rate: {win_rate_data['win_rate']}%")
            if cross_bonus > 0:
                reasons.append("Binance price cross-validated")

            confluence = {
                "id": f"SIG-{symbol_name}-{n}TF-{uuid4().hex[:8].upper()}",
                "symbol": symbol_name,
                "signal": direction,
                "confidence": round(confidence, 1),
                "timeframe": f"{n}TF ({', '.join(agreeing)})",
                "agreeing_timeframes": agreeing,
                "confluence_score": n,
                "entry": round(entry, 6),
                "tp1": tp1,
                "tp2": tp2,
                "sl": sl,
                "reasons": reasons,
                "candle_status": candle_status_label,
                "indicators": {
                    "rsi_m5":  round(row.get("RSI|5") or 0, 2),
                    "rsi_h1":  round(rsi_h1, 2),
                    "rsi_h4":  round(row.get("RSI|240") or 0, 2),
                    "macd_h1": round(macd_h1, 6),
                    "ema_trend": "up" if (row.get("EMA20|60") or 0) > (row.get("EMA50|60") or 0) else "down",
                    "stoch_k": round(row.get("Stoch.K|60") or 50, 2),
                },
                "win_rate": win_rate_data if win_rate_data else None,
                "cross_validation": binance_validation if binance_validation.get("validated") else None,
                "source": "tradingview_screener",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "expires_in_minutes": 60 if n >= 3 else 30,
            }

    # Individual per-TF signals (for filter API)
    individual = []
    entry = row.get("close", 0) or 0
    atr = row.get("ATR") or (entry * 0.01)

    for tf, col in TF_COLS.items():
        val = row.get(col)
        sig = rec_to_signal(val)
        if not sig:
            continue
        base = rec_confidence(val or 0)
        if base < MIN_CONFIDENCE:
            continue

        n_agree = len([t for t in agreeing if t != tf] if agreeing else [])
        tf_conf = min(base + (5 if tf in (agreeing or []) else 0), 95)

        if sig == "BUY":
            tp1i = round(entry + (atr or entry*0.01) * 1.5, 6)
            sli  = round(entry - (atr or entry*0.01) * 1.0, 6)
        else:
            tp1i = round(entry - (atr or entry*0.01) * 1.5, 6)
            sli  = round(entry + (atr or entry*0.01) * 1.0, 6)

        individual.append({
            "id": f"SIG-{symbol_name}-{tf}-{uuid4().hex[:8].upper()}",
            "symbol": symbol_name,
            "signal": sig,
            "confidence": round(tf_conf, 1),
            "timeframe": tf,
            "confluence_score": len(agreeing) if agreeing else 1,
            "entry": round(entry, 6),
            "tp1": tp1i,
            "sl": sli,
            "source": "tradingview_screener",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return confluence, individual


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS signals (
            id TEXT PRIMARY KEY,
            symbol TEXT, signal TEXT, confidence REAL,
            timeframe TEXT, confluence_score INTEGER,
            entry REAL, tp1 REAL, tp2 REAL, sl REAL,
            source TEXT, fired_at TEXT,
            fired_at_minute TEXT,
            outcome TEXT DEFAULT NULL,
            accuracy INTEGER DEFAULT NULL
        )
    """)
    # Unique constraint: same symbol+signal+timeframe cannot fire twice in same minute
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_dedup
        ON signals (symbol, signal, timeframe, fired_at_minute)
    """)
    conn.commit()
    return conn


def main():
    now = datetime.now(timezone.utc)
    print(f"[{now.strftime('%H:%M:%S')}] TradeClaw Scanner Engine v5 — Reliability Edition")

    conn = init_db()

    # ── Pre-fetch: candle status, win rates, Binance prices ──
    candle_statuses = get_candle_status(now)
    print(f"  Candle status: {candle_statuses}")

    win_rates = get_win_rates(conn)
    if win_rates:
        print(f"  Win rates loaded: {len(win_rates)} symbol/direction combos")

    binance_prices = fetch_binance_prices()
    if binance_prices:
        print(f"  Binance prices: {len(binance_prices)} symbols fetched")

    confluence_signals = []
    all_signals = []
    total_checked = 0
    errors = 0

    seen_symbols = set()  # deduplicate across markets

    for market, info in TARGET_SYMBOLS.items():
        print(f"  Scanning {market} ({len(info['symbols'])} symbols)...", end=" ")
        df = fetch_market(market, info)

        if df is None or df.empty:
            print("FAILED")
            errors += 1
            continue

        print(f"got {len(df)} rows")

        for _, row in df.iterrows():
            raw_name = str(row.get("name", ""))
            symbol_name = raw_name.replace("BINANCE:", "").replace("FX:", "").replace("OANDA:", "").replace("FXCM:", "")

            # Skip duplicates (same symbol from different exchanges)
            if symbol_name in seen_symbols:
                continue
            seen_symbols.add(symbol_name)
            total_checked += 1

            # Cross-validate price with Binance
            tv_price = row.get("close", 0) or 0
            bv = cross_validate_price(symbol_name, tv_price, binance_prices)

            conf, indiv = calculate_confluence(
                row, symbol_name,
                candle_statuses=candle_statuses,
                win_rates=win_rates,
                binance_validation=bv,
            )
            if conf:
                confluence_signals.append(conf)
            all_signals.extend(indiv)

    # Save to SQLite
    if confluence_signals:
        for s in confluence_signals:
            try:
                fired_minute = s["timestamp"][:16]
                conn.execute("""
                    INSERT OR IGNORE INTO signals
                    (id, symbol, signal, confidence, timeframe, confluence_score, entry, tp1, tp2, sl, source, fired_at, fired_at_minute)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, (s["id"], s["symbol"], s["signal"], s["confidence"],
                      s["timeframe"], s.get("confluence_score", 1),
                      s["entry"], s["tp1"], s.get("tp2"), s["sl"],
                      s["source"], s["timestamp"], fired_minute))
            except Exception:
                pass
        conn.commit()

    # ── Compute aggregate win rates for output ──
    aggregate_win_rates = {}
    for key, data in win_rates.items():
        if data["total"] >= 3:  # only show if meaningful sample
            aggregate_win_rates[key] = data

    # Save to JSON
    DATA_DIR.mkdir(exist_ok=True)
    output = {
        "generated_at": now.isoformat(),
        "engine_version": "v5-reliability",
        "min_confidence": MIN_CONFIDENCE,
        "count": len(confluence_signals),
        "confluence_signals": confluence_signals,
        "all_signals": all_signals,
        "reliability": {
            "candle_statuses": candle_statuses,
            "binance_prices_available": len(binance_prices),
            "win_rates": aggregate_win_rates,
            "incomplete_candle_penalty": INCOMPLETE_CANDLE_PENALTY,
            "cross_validation_bonus": BINANCE_CROSS_VALIDATION_BONUS,
        },
        "stats": {
            "symbols_checked": total_checked,
            "confluence_signals": len(confluence_signals),
            "individual_signals": len(all_signals),
            "data_errors": errors,
            "engine": "v5-reliability",
        },
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nDone: {len(confluence_signals)} confluence | {len(all_signals)} individual | {errors} errors")
    for s in confluence_signals:
        cs = s.get("candle_status", "unknown")
        wr = s.get("win_rate")
        wr_str = f" | WR:{wr['win_rate']}%" if wr else ""
        cv = " | Binance✓" if s.get("cross_validation", {}).get("price_confirmed") else ""
        print(f"  ★ {s['symbol']} {s['signal']} {s['confidence']}% — {s['timeframe']} [candle:{cs}{wr_str}{cv}]")


if __name__ == "__main__":
    main()
