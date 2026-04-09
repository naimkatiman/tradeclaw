#!/usr/bin/env python3
"""
TradeClaw Signal Engine v3 — 4-TF Confluence Scoring
Only emits signals with >= 70% confidence

Multi-Timeframe Analysis:
- M5  (5 minutes)
- M15 (15 minutes)
- H1  (1 hour)
- H4  (4 hours)

Confluence Rule: Need >= 2 TFs agreeing with no strong opposite signal
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import tradingview_ta

try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

# Configuration
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "data"
OUTPUT_FILE = DATA_DIR / "signals-live.json"

# Adaptive: read confidence_threshold.txt written by signal-outcome-checker.py
# (falls back to 70 if file missing/invalid). Closes the feedback loop —
# when accuracy tanks, checker writes 75/80 and engine actually honors it.
try:
    _threshold_file = Path(__file__).parent / "confidence_threshold.txt"
    MIN_CONFIDENCE = int(_threshold_file.read_text().strip())
except Exception:
    MIN_CONFIDENCE = 70

# Weak days filter — Wednesday (2) and Saturday (5) have <45% hit rate
WEAK_DAYS = {2, 5}  # 0=Mon, 6=Sun

# Symbol performance tiers based on track-record audit (24h hit rate / cum PnL)
# Tier 1: HR >= 70% — full confidence
# Tier 2: HR 55-69% — slight confidence penalty (-3)
# Tier 3: HR <= 50% — larger penalty (-7), needs higher confluence to pass
SYMBOL_TIER = {
    "XAUUSD": 1, "USDCAD": 1, "XAGUSD": 1, "EURUSD": 1,  # 70%+ HR
    "AUDUSD": 2, "BTCUSD": 2, "ETHUSD": 2, "USDJPY": 2,   # 55-69% HR
    "GBPUSD": 3, "XRPUSD": 3,                               # <=50% HR
}
TIER_CONFIDENCE_ADJUST = {1: 0, 2: -3, 3: -7}

# Asset class mapping for market hours filtering
FOREX_SYMBOLS = {"EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF"}
METALS_SYMBOLS = {"XAUUSD", "XAGUSD"}


def is_market_open(symbol: str) -> bool:
    """Check if the market is currently open for the given symbol."""
    now = datetime.now(timezone.utc)
    day = now.weekday()  # 0=Mon, 6=Sun
    hour = now.hour

    if symbol in FOREX_SYMBOLS:
        # Forex: Sunday 22:00 UTC - Friday 23:59 UTC
        if day == 6:  # Sunday
            return hour >= 22
        if day == 5:  # Saturday
            return False
        # Mon-Fri: open all day
        return True

    if symbol in METALS_SYMBOLS:
        # Metals: Mon-Fri 8:00-21:00 UTC
        if day >= 5:  # Sat-Sun
            return False
        return 8 <= hour < 21

    # Crypto: 24/7
    return True


# TradingView symbol mapping: internal -> TV format
SYMBOLS = [
    {"symbol": "BTCUSD", "name": "Bitcoin", "tv_symbol": "BINANCE:BTCUSDT"},
    {"symbol": "ETHUSD", "name": "Ethereum", "tv_symbol": "BINANCE:ETHUSDT"},
    {"symbol": "XRPUSD", "name": "XRP", "tv_symbol": "BINANCE:XRPUSDT"},
    {"symbol": "SOLUSD", "name": "Solana", "tv_symbol": "BINANCE:SOLUSDT"},
    {"symbol": "BNBUSD", "name": "BNB", "tv_symbol": "BINANCE:BNBUSDT"},
    {"symbol": "XAUUSD", "name": "Gold", "tv_symbol": "TVC:GOLD"},
    {"symbol": "XAGUSD", "name": "Silver", "tv_symbol": "TVC:SILVER"},
    {"symbol": "EURUSD", "name": "EUR/USD", "tv_symbol": "FX:EURUSD"},
    {"symbol": "GBPUSD", "name": "GBP/USD", "tv_symbol": "FX:GBPUSD"},
    {"symbol": "USDJPY", "name": "USD/JPY", "tv_symbol": "FX:USDJPY"},
]

TIMEFRAMES = {
    "M5": tradingview_ta.Interval.INTERVAL_5_MINUTES,
    "M15": tradingview_ta.Interval.INTERVAL_15_MINUTES,
    "H1": tradingview_ta.Interval.INTERVAL_1_HOUR,
    "H4": tradingview_ta.Interval.INTERVAL_4_HOURS,
}


def analyze_symbol(tv_symbol: str, symbol_info: dict) -> dict | None:
    """
    Analyze a symbol across 4 timeframes and return a signal if confluence exists.

    Confluence algorithm:
    - Check M5, M15, H1, H4 for BUY/SELL recommendations
    - Need >= 2 TFs agreeing AND 0 TFs with opposite signal
    - Base confidence from H1 (or H4 fallback)
    - Bonuses: confluence (+5/+12/+20), RSI extremes (+5), high volume (+3)
    """
    # Determine screener and exchange from TV symbol
    exchange_sym = tv_symbol.split(":")
    exchange = exchange_sym[0]
    sym = exchange_sym[1]

    # Set screener based on exchange
    if exchange == "BINANCE":
        screener = "crypto"
    elif exchange in ("FX", "FX_IDC"):
        screener = "forex"
    else:
        screener = "cfd"  # TVC (Gold, Silver, etc.)

    # Fetch analysis for each timeframe
    analyses = {}
    for tf_name, tf_interval in TIMEFRAMES.items():
        try:
            handler = tradingview_ta.TA_Handler(
                symbol=sym,
                screener=screener,
                exchange=exchange,
                interval=tf_interval,
            )
            analyses[tf_name] = handler.get_analysis()
        except Exception as e:
            print(f"  [{tf_name}] Error: {e}", file=sys.stderr)
            analyses[tf_name] = None

    # Count TF directions (BUY includes STRONG_BUY, SELL includes STRONG_SELL)
    buy_tfs = []
    sell_tfs = []
    for tf, a in analyses.items():
        if a is None:
            continue
        rec = a.summary.get("RECOMMENDATION", "")
        if "BUY" in rec:
            buy_tfs.append(tf)
        elif "SELL" in rec:
            sell_tfs.append(tf)

    # Confluence rule: BUY needs >= 2 TFs, SELL needs >= 3 TFs (asymmetric).
    # SELL hit-rate last 72h was 7% vs BUY 37% — we tightened SELLs because the
    # engine was emitting counter-trend reversals into a strong uptrend. Revisit
    # once SELL win rate climbs back above 40%.
    if len(buy_tfs) >= 2 and len(sell_tfs) == 0:
        direction = "BUY"
        agreeing = buy_tfs
    elif len(sell_tfs) >= 3 and len(buy_tfs) == 0:
        direction = "SELL"
        agreeing = sell_tfs
    else:
        total_checked = len([a for a in analyses.values() if a])
        print(f"  No confluence: BUY={buy_tfs}, SELL={sell_tfs} ({total_checked} TFs checked)", file=sys.stderr)
        return None

    # H4 trend gate — refuse signals that fight the higher timeframe.
    # Uses EMA20 vs EMA50 on H4 as the regime filter.
    h4 = analyses.get("H4")
    if h4 is not None:
        h4_ema20 = h4.indicators.get("EMA20", 0) or 0
        h4_ema50 = h4.indicators.get("EMA50", 0) or 0
        if h4_ema20 and h4_ema50:
            h4_uptrend = h4_ema20 > h4_ema50
            if direction == "BUY" and not h4_uptrend:
                print(f"  REJECTED: BUY against H4 downtrend (EMA20={h4_ema20:.4f} < EMA50={h4_ema50:.4f})", file=sys.stderr)
                return None
            if direction == "SELL" and h4_uptrend:
                print(f"  REJECTED: SELL against H4 uptrend (EMA20={h4_ema20:.4f} > EMA50={h4_ema50:.4f})", file=sys.stderr)
                return None

    # Get primary timeframe analysis (H1 preferred, H4 fallback)
    primary = analyses.get("H1") or analyses.get("H4")
    if primary is None:
        print(f"  No H1/H4 data available", file=sys.stderr)
        return None

    rec = primary.summary.get("RECOMMENDATION", "")

    # Base confidence: 85 for STRONG signals, 72 otherwise
    base = 85 if "STRONG" in rec else 72

    # Confluence bonus based on number of agreeing TFs
    n = len(agreeing)
    confluence_bonus = {1: 0, 2: 5, 3: 12, 4: 20}.get(n, 20)

    # RSI bonus for extreme values
    rsi = primary.indicators.get("RSI", 50) or 50
    rsi_bonus = 0
    if direction == "BUY" and rsi < 35:
        rsi_bonus = 5
    elif direction == "SELL" and rsi > 65:
        rsi_bonus = 5

    # Volume bonus (volume above 20-period average)
    volume = primary.indicators.get("volume", 0) or 0
    vol_sma = primary.indicators.get("SMA20", 1) or 1
    vol_ratio = volume / vol_sma if vol_sma > 0 else 1
    vol_bonus = 3 if vol_ratio > 1.2 else 0

    # Symbol tier adjustment — penalize historically weak symbols
    tier = SYMBOL_TIER.get(symbol_info["symbol"], 2)
    tier_adjust = TIER_CONFIDENCE_ADJUST.get(tier, 0)

    # Final confidence (capped at 95)
    confidence = min(base + confluence_bonus + rsi_bonus + vol_bonus + tier_adjust, 95)

    if confidence < MIN_CONFIDENCE:
        print(f"  Below threshold: {confidence}% < {MIN_CONFIDENCE}%", file=sys.stderr)
        return None

    # Get price and ATR for TP/SL calculation
    entry = primary.indicators.get("close", 0) or 0
    atr = primary.indicators.get("ATR", entry * 0.01) or (entry * 0.01)

    if entry == 0:
        print(f"  No price data available", file=sys.stderr)
        return None

    # Calculate TP/SL — 1.33:1 R:R (was inverted 0.67:1 which needed 60%+ win rate
    # to break even). 24% measured TP-hit rate × 1.33 R:R is break-even at ~43%.
    if direction == "BUY":
        tp1 = round(entry + atr * 1.0, 5)
        tp2 = round(entry + atr * 2.0, 5)
        sl = round(entry - atr * 0.75, 5)
    else:
        tp1 = round(entry - atr * 1.0, 5)
        tp2 = round(entry - atr * 2.0, 5)
        sl = round(entry + atr * 0.75, 5)

    # Build reasons list
    reasons = [
        f"TF confluence: {', '.join(agreeing)} all {direction}",
        f"RSI: {round(rsi, 1)}",
    ]
    if "STRONG" in rec:
        reasons.append(f"Strong {direction} signal on H1")
    if vol_bonus > 0:
        reasons.append(f"Volume {round(vol_ratio, 1)}x above average")
    if tier_adjust != 0:
        reasons.append(f"Tier {tier} symbol ({tier_adjust:+d}% adj)")

    # Get additional indicators for output
    macd_line = primary.indicators.get("MACD.macd", 0) or 0
    macd_signal = primary.indicators.get("MACD.signal", 0) or 0
    ema20 = primary.indicators.get("EMA20", 0) or 0
    ema50 = primary.indicators.get("EMA50", 0) or 0
    stoch_k = primary.indicators.get("Stoch.K", 50) or 50

    return {
        "id": f"SIG-{symbol_info['symbol']}-{agreeing[0]}-{direction}-{uuid4().hex[:8].upper()}",
        "symbol": symbol_info["symbol"],
        "name": symbol_info["name"],
        "signal": direction,
        "confidence": round(confidence, 1),
        "timeframe": f"{n}TF confluence ({', '.join(agreeing)})",
        "entry": round(entry, 5),
        "tp1": tp1,
        "tp2": tp2,
        "sl": sl,
        "reasons": reasons,
        "agreeing_timeframes": agreeing,
        "total_timeframes_checked": len([a for a in analyses.values() if a]),
        "indicators": {
            "rsi": round(rsi, 2),
            "macd_histogram": round(macd_line - macd_signal, 6),
            "ema_trend": "up" if ema20 > ema50 else "down",
            "stochastic_k": round(stoch_k, 2),
        },
        "source": "tradingview",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "expires_in_minutes": 60 if n >= 3 else 30,
    }


def main():
    """Main signal generation loop"""
    print(f"[{datetime.now(timezone.utc).isoformat()}] TradeClaw Signal Engine v3.1")
    print(f"4-TF Confluence: M5/M15/H1/H4")
    print(f"Minimum confidence: {MIN_CONFIDENCE}%")
    print("=" * 60)

    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    signals = []
    stats = {
        "symbols_checked": 0,
        "signals_generated": 0,
        "no_confluence": 0,
        "below_threshold": 0,
        "errors": 0,
    }

    for sym_config in SYMBOLS:
        symbol = sym_config["symbol"]
        tv_symbol = sym_config["tv_symbol"]
        print(f"\nAnalyzing {symbol} ({tv_symbol})...")
        stats["symbols_checked"] += 1

        if not is_market_open(symbol):
            print(f"  SKIPPED: {symbol} market is closed")
            stats["no_confluence"] += 1
            continue

        # Weak-day filter: Wed & Sat have <45% hit rate historically
        now_utc = datetime.now(timezone.utc)
        if now_utc.weekday() in WEAK_DAYS:
            print(f"  SKIPPED: weak day ({now_utc.strftime('%A')})")
            stats["no_confluence"] += 1
            continue

        try:
            signal = analyze_symbol(tv_symbol, sym_config)
            if signal:
                signals.append(signal)
                stats["signals_generated"] += 1
                print(f"  SIGNAL: {signal['signal']} {signal['confidence']}%")
                print(f"    Agreeing TFs: {', '.join(signal['agreeing_timeframes'])}")
                print(f"    Entry: {signal['entry']} | TP1: {signal['tp1']} | SL: {signal['sl']}")
            else:
                stats["no_confluence"] += 1
        except Exception as e:
            print(f"  ERROR: {e}", file=sys.stderr)
            stats["errors"] += 1

    # Sort by confidence descending
    signals.sort(key=lambda s: s["confidence"], reverse=True)

    # Build output
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "engine_version": "v3.1-optimized",
        "min_confidence": MIN_CONFIDENCE,
        "count": len(signals),
        "stats": stats,
        "signals": signals,
    }

    # Write to JSON file (fallback / debug)
    if os.environ.get("WRITE_JSON_FALLBACK", "true").lower() == "true":
        with open(OUTPUT_FILE, "w") as f:
            json.dump(output, f, indent=2)
        print(f"\nJSON written to: {OUTPUT_FILE}")

    # Write to PostgreSQL (primary)
    db_url = os.environ.get("DATABASE_URL")
    if db_url and HAS_PSYCOPG2 and signals:
        try:
            conn = psycopg2.connect(db_url, sslmode="require" if "railway.app" in db_url else "prefer")
            cur = conn.cursor()
            for s in signals:
                cur.execute(
                    """INSERT INTO live_signals (
                        id, symbol, direction, confidence, timeframe, entry, stop_loss,
                        tp1, tp2, reasons, indicators, source, engine_version, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (symbol, timeframe, direction, created_at) DO UPDATE SET
                        confidence = EXCLUDED.confidence,
                        entry = EXCLUDED.entry,
                        stop_loss = EXCLUDED.stop_loss,
                        tp1 = EXCLUDED.tp1,
                        tp2 = EXCLUDED.tp2,
                        indicators = EXCLUDED.indicators""",
                    (
                        s["id"], s["symbol"], s["signal"], s["confidence"],
                        s["timeframe"], s["entry"], s["sl"],
                        s["tp1"], s.get("tp2"), s.get("reasons", []),
                        json.dumps(s.get("indicators", {})),
                        s.get("source", "real"), "v3.1-optimized",
                        output["generated_at"],
                    ),
                )
            conn.commit()
            cur.close()
            conn.close()
            print(f"DB: Wrote {len(signals)} signals to PostgreSQL")
        except Exception as e:
            print(f"DB ERROR: {e}", file=sys.stderr)
    elif not db_url:
        print("DB: DATABASE_URL not set, skipping DB write")

    print(f"\n{'=' * 60}")
    print(f"Signals generated: {stats['signals_generated']}/{stats['symbols_checked']}")
    print(f"No confluence: {stats['no_confluence']}")
    print(f"Errors: {stats['errors']}")

    if signals:
        print(f"\n🎯 HIGH-CONFIDENCE SIGNALS:")
        for s in signals[:5]:
            print(f"  {s['symbol']}: {s['signal']} {s['confidence']}% ({s['timeframe']})")
            print(f"    Reasons: {', '.join(s['reasons'][:2])}")
    else:
        print("\nNo signals met confluence requirements.")

    return signals


if __name__ == "__main__":
    main()
