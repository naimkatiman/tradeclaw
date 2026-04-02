#!/usr/bin/env python3
"""
TradeClaw Signal Engine — Real TA-Based Signal Generation
Only emits signals with >= 70% confidence

Data Sources:
- Binance API (crypto)
- yfinance (forex, metals, indices)
- tradingview-scraper (fallback)

Indicators:
- RSI (14)
- MACD (12, 26, 9)
- EMA 20/50/200
- Bollinger Bands (20, 2)
- Stochastic (14, 3, 3)
- Volume trend
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

import numpy as np
import pandas as pd
import requests

# Try importing tradingview-scraper (optional)
try:
    from tradingview_scraper import TradingViewScraper
    TV_AVAILABLE = True
except ImportError:
    TV_AVAILABLE = False

# Try importing yfinance
try:
    import yfinance as yf
    YF_AVAILABLE = True
except ImportError:
    YF_AVAILABLE = False

# Configuration
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "data"
OUTPUT_FILE = DATA_DIR / "signals-live.json"

MIN_CONFIDENCE = 70  # Only emit signals >= 70%
MIN_CANDLES = 50     # Minimum candles needed for TA

# Symbols to analyze
SYMBOLS = [
    {"symbol": "BTCUSDT", "name": "Bitcoin", "type": "crypto"},
    {"symbol": "ETHUSDT", "name": "Ethereum", "type": "crypto"},
    {"symbol": "XRPUSDT", "name": "XRP", "type": "crypto"},
    {"symbol": "SOLUSDT", "name": "Solana", "type": "crypto"},
    {"symbol": "BNBUSDT", "name": "BNB", "type": "crypto"},
    {"symbol": "XAUUSD", "name": "Gold", "type": "forex"},
    {"symbol": "XAGUSD", "name": "Silver", "type": "forex"},
    {"symbol": "EURUSD", "name": "EUR/USD", "type": "forex"},
    {"symbol": "GBPUSD", "name": "GBP/USD", "type": "forex"},
    {"symbol": "USDJPY", "name": "USD/JPY", "type": "forex"},
]

TIMEFRAMES = ["15m", "1h", "4h"]

# yfinance symbol mapping
YF_SYMBOLS = {
    "XAUUSD": "GC=F",
    "XAGUSD": "SI=F",
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "JPY=X",
}

# Binance interval mapping
BINANCE_INTERVALS = {
    "15m": "15m",
    "1h": "1h",
    "4h": "4h",
}

# ─── Data Fetching ─────────────────────────────────────────────

def fetch_binance_ohlcv(symbol: str, interval: str, limit: int = 300) -> Optional[pd.DataFrame]:
    """Fetch OHLCV from Binance API"""
    try:
        url = f"https://api.binance.com/api/v3/klines"
        params = {"symbol": symbol, "interval": interval, "limit": limit}
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            return None

        data = resp.json()
        df = pd.DataFrame(data, columns=[
            "timestamp", "open", "high", "low", "close", "volume",
            "close_time", "quote_volume", "trades", "taker_buy_base",
            "taker_buy_quote", "ignore"
        ])
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
        for col in ["open", "high", "low", "close", "volume"]:
            df[col] = df[col].astype(float)
        return df[["timestamp", "open", "high", "low", "close", "volume"]]
    except Exception as e:
        print(f"[Binance] {symbol} error: {e}", file=sys.stderr)
        return None

def fetch_yfinance_ohlcv(symbol: str, interval: str) -> Optional[pd.DataFrame]:
    """Fetch OHLCV from yfinance"""
    if not YF_AVAILABLE:
        return None

    yf_symbol = YF_SYMBOLS.get(symbol, symbol)

    # yfinance interval/period mapping
    interval_map = {"15m": "15m", "1h": "1h", "4h": "1h"}  # 4h needs aggregation
    period_map = {"15m": "5d", "1h": "30d", "4h": "60d"}

    try:
        ticker = yf.Ticker(yf_symbol)
        df = ticker.history(period=period_map[interval], interval=interval_map[interval])
        if df.empty:
            return None

        df = df.reset_index()
        df.columns = [c.lower() for c in df.columns]
        df = df.rename(columns={"date": "timestamp", "datetime": "timestamp"})

        # Aggregate to 4h if needed
        if interval == "4h":
            df = aggregate_candles(df, 4)

        return df[["timestamp", "open", "high", "low", "close", "volume"]]
    except Exception as e:
        print(f"[yfinance] {symbol} error: {e}", file=sys.stderr)
        return None

def aggregate_candles(df: pd.DataFrame, factor: int) -> pd.DataFrame:
    """Aggregate candles by factor (e.g., 1h -> 4h)"""
    if len(df) < factor:
        return df

    rows = []
    for i in range(0, len(df) - factor + 1, factor):
        chunk = df.iloc[i:i + factor]
        rows.append({
            "timestamp": chunk.iloc[0]["timestamp"],
            "open": chunk.iloc[0]["open"],
            "high": chunk["high"].max(),
            "low": chunk["low"].min(),
            "close": chunk.iloc[-1]["close"],
            "volume": chunk["volume"].sum(),
        })
    return pd.DataFrame(rows)

def get_ohlcv(symbol: str, timeframe: str) -> tuple[Optional[pd.DataFrame], str]:
    """Get OHLCV data with fallback chain"""
    sym_info = next((s for s in SYMBOLS if s["symbol"] == symbol), None)
    if not sym_info:
        return None, "unknown"

    # Crypto: Binance first
    if sym_info["type"] == "crypto":
        df = fetch_binance_ohlcv(symbol, BINANCE_INTERVALS[timeframe])
        if df is not None and len(df) >= MIN_CANDLES:
            return df, "binance"

    # Forex/metals: yfinance
    if symbol in YF_SYMBOLS or sym_info["type"] == "forex":
        df = fetch_yfinance_ohlcv(symbol, timeframe)
        if df is not None and len(df) >= MIN_CANDLES:
            return df, "yfinance"

    return None, "none"

# ─── Technical Indicators ─────────────────────────────────────

def calc_ema(data: pd.Series, period: int) -> pd.Series:
    """Exponential Moving Average"""
    return data.ewm(span=period, adjust=False).mean()

def calc_sma(data: pd.Series, period: int) -> pd.Series:
    """Simple Moving Average"""
    return data.rolling(window=period).mean()

def calc_rsi(closes: pd.Series, period: int = 14) -> pd.Series:
    """RSI using Wilder's smoothing"""
    delta = closes.diff()
    gain = delta.where(delta > 0, 0)
    loss = (-delta).where(delta < 0, 0)

    avg_gain = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calc_macd(closes: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> tuple[pd.Series, pd.Series, pd.Series]:
    """MACD: line, signal, histogram"""
    ema_fast = calc_ema(closes, fast)
    ema_slow = calc_ema(closes, slow)
    macd_line = ema_fast - ema_slow
    signal_line = calc_ema(macd_line, signal)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram

def calc_bollinger(closes: pd.Series, period: int = 20, std_dev: float = 2.0) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Bollinger Bands: upper, middle, lower"""
    middle = calc_sma(closes, period)
    std = closes.rolling(window=period).std()
    upper = middle + (std * std_dev)
    lower = middle - (std * std_dev)
    return upper, middle, lower

def calc_stochastic(df: pd.DataFrame, k_period: int = 14, k_smooth: int = 3, d_period: int = 3) -> tuple[pd.Series, pd.Series]:
    """Stochastic %K and %D"""
    low_min = df["low"].rolling(window=k_period).min()
    high_max = df["high"].rolling(window=k_period).max()

    raw_k = 100 * (df["close"] - low_min) / (high_max - low_min)
    k = raw_k.rolling(window=k_smooth).mean()
    d = k.rolling(window=d_period).mean()
    return k, d

def calculate_all_indicators(df: pd.DataFrame) -> dict:
    """Calculate all indicators for a dataframe"""
    closes = df["close"]

    # RSI
    rsi = calc_rsi(closes)

    # MACD
    macd_line, macd_signal, macd_hist = calc_macd(closes)

    # EMAs
    ema20 = calc_ema(closes, 20)
    ema50 = calc_ema(closes, 50)
    ema200 = calc_ema(closes, 200)

    # Bollinger
    bb_upper, bb_middle, bb_lower = calc_bollinger(closes)

    # Stochastic
    stoch_k, stoch_d = calc_stochastic(df)

    # Volume trend
    vol_sma = calc_sma(df["volume"], 20)

    # Get latest values
    idx = -1
    return {
        "rsi": float(rsi.iloc[idx]) if pd.notna(rsi.iloc[idx]) else 50,
        "macd": {
            "line": float(macd_line.iloc[idx]) if pd.notna(macd_line.iloc[idx]) else 0,
            "signal": float(macd_signal.iloc[idx]) if pd.notna(macd_signal.iloc[idx]) else 0,
            "histogram": float(macd_hist.iloc[idx]) if pd.notna(macd_hist.iloc[idx]) else 0,
        },
        "ema": {
            "ema20": float(ema20.iloc[idx]) if pd.notna(ema20.iloc[idx]) else 0,
            "ema50": float(ema50.iloc[idx]) if pd.notna(ema50.iloc[idx]) else 0,
            "ema200": float(ema200.iloc[idx]) if pd.notna(ema200.iloc[idx]) else 0,
        },
        "bollinger": {
            "upper": float(bb_upper.iloc[idx]) if pd.notna(bb_upper.iloc[idx]) else 0,
            "middle": float(bb_middle.iloc[idx]) if pd.notna(bb_middle.iloc[idx]) else 0,
            "lower": float(bb_lower.iloc[idx]) if pd.notna(bb_lower.iloc[idx]) else 0,
        },
        "stochastic": {
            "k": float(stoch_k.iloc[idx]) if pd.notna(stoch_k.iloc[idx]) else 50,
            "d": float(stoch_d.iloc[idx]) if pd.notna(stoch_d.iloc[idx]) else 50,
        },
        "volume": {
            "current": float(df["volume"].iloc[idx]),
            "sma": float(vol_sma.iloc[idx]) if pd.notna(vol_sma.iloc[idx]) else 0,
            "ratio": float(df["volume"].iloc[idx] / vol_sma.iloc[idx]) if vol_sma.iloc[idx] > 0 else 1,
        },
        "price": float(closes.iloc[idx]),
        "prev_macd_hist": float(macd_hist.iloc[-2]) if len(macd_hist) > 1 and pd.notna(macd_hist.iloc[-2]) else 0,
        "prev_stoch_k": float(stoch_k.iloc[-2]) if len(stoch_k) > 1 and pd.notna(stoch_k.iloc[-2]) else 50,
    }

# ─── Signal Generation ─────────────────────────────────────────

def score_indicators(ind: dict) -> tuple[int, int, list[str]]:
    """Score indicators for BUY/SELL signals"""
    buy_score = 0
    sell_score = 0
    reasons = []

    rsi = ind["rsi"]
    macd = ind["macd"]
    ema = ind["ema"]
    bb = ind["bollinger"]
    stoch = ind["stochastic"]
    vol = ind["volume"]
    price = ind["price"]

    # RSI (0-100)
    if rsi < 30:
        buy_score += 20
        reasons.append(f"RSI oversold ({rsi:.1f})")
    elif rsi < 40:
        buy_score += 10
    elif rsi > 70:
        sell_score += 20
        reasons.append(f"RSI overbought ({rsi:.1f})")
    elif rsi > 60:
        sell_score += 10

    # MACD
    hist = macd["histogram"]
    prev_hist = ind["prev_macd_hist"]

    if hist > 0:
        if prev_hist <= 0:
            buy_score += 25
            reasons.append("MACD bullish cross")
        else:
            buy_score += 15
    elif hist < 0:
        if prev_hist >= 0:
            sell_score += 25
            reasons.append("MACD bearish cross")
        else:
            sell_score += 15

    # EMA alignment
    ema20, ema50, ema200 = ema["ema20"], ema["ema50"], ema["ema200"]
    if ema20 > 0 and ema50 > 0 and ema200 > 0:
        if ema20 > ema50 > ema200:
            buy_score += 20
            reasons.append("EMA 20>50>200 bullish alignment")
        elif ema20 < ema50 < ema200:
            sell_score += 20
            reasons.append("EMA 20<50<200 bearish alignment")
        elif ema20 > ema50:
            buy_score += 10
        elif ema20 < ema50:
            sell_score += 10

    # Stochastic
    k, d = stoch["k"], stoch["d"]
    prev_k = ind["prev_stoch_k"]

    if k < 20:
        if k > prev_k:  # crossing up
            buy_score += 15
            reasons.append(f"Stochastic oversold recovery ({k:.1f})")
        else:
            buy_score += 8
    elif k > 80:
        if k < prev_k:  # crossing down
            sell_score += 15
            reasons.append(f"Stochastic overbought reversal ({k:.1f})")
        else:
            sell_score += 8

    # Bollinger Bands
    bb_lower, bb_upper = bb["lower"], bb["upper"]
    if bb_lower > 0 and bb_upper > 0:
        bb_range = bb_upper - bb_lower
        if bb_range > 0:
            position = (price - bb_lower) / bb_range
            if position < 0.1:
                buy_score += 10
                reasons.append("Price near lower Bollinger Band")
            elif position > 0.9:
                sell_score += 10
                reasons.append("Price near upper Bollinger Band")

    # Volume confirmation (bonus, not penalty)
    if vol["ratio"] > 1.5:
        # High volume confirms the dominant signal
        if buy_score > sell_score:
            buy_score += 5
            reasons.append(f"Volume {vol['ratio']:.1f}x above average")
        elif sell_score > buy_score:
            sell_score += 5
            reasons.append(f"Volume {vol['ratio']:.1f}x above average")

    return buy_score, sell_score, reasons

def calculate_confidence(buy_score: int, sell_score: int) -> tuple[str, int]:
    """Calculate signal direction and confidence"""
    max_possible = 100  # Theoretical max score

    if buy_score > sell_score:
        direction = "BUY"
        net_score = buy_score - sell_score
        raw_confidence = 50 + (net_score / max_possible) * 50
    elif sell_score > buy_score:
        direction = "SELL"
        net_score = sell_score - buy_score
        raw_confidence = 50 + (net_score / max_possible) * 50
    else:
        return "NEUTRAL", 50

    # Clamp confidence to 50-95
    confidence = int(min(95, max(50, raw_confidence)))
    return direction, confidence

def calculate_levels(price: float, direction: str, ind: dict) -> dict:
    """Calculate entry, TP1, TP2, SL based on volatility"""
    bb = ind["bollinger"]

    # Estimate ATR-like volatility from Bollinger width
    bb_width = bb["upper"] - bb["lower"]
    volatility = bb_width * 0.15 if bb_width > 0 else price * 0.01

    entry = round(price, 5)

    if direction == "BUY":
        sl = round(price - volatility * 1.5, 5)
        tp1 = round(price + volatility * 1.5, 5)
        tp2 = round(price + volatility * 2.5, 5)
    else:  # SELL
        sl = round(price + volatility * 1.5, 5)
        tp1 = round(price - volatility * 1.5, 5)
        tp2 = round(price - volatility * 2.5, 5)

    return {"entry": entry, "tp1": tp1, "tp2": tp2, "sl": sl}

def generate_signal(symbol: str, timeframe: str, df: pd.DataFrame, source: str) -> Optional[dict]:
    """Generate a signal from OHLCV data"""
    indicators = calculate_all_indicators(df)
    buy_score, sell_score, reasons = score_indicators(indicators)
    direction, confidence = calculate_confidence(buy_score, sell_score)

    if direction == "NEUTRAL":
        return None

    if confidence < MIN_CONFIDENCE:
        print(f"  {symbol} {timeframe}: {direction} {confidence}% (below {MIN_CONFIDENCE}% threshold)", file=sys.stderr)
        return None

    levels = calculate_levels(indicators["price"], direction, indicators)

    # Map timeframe format
    tf_map = {"15m": "M15", "1h": "H1", "4h": "H4"}

    signal = {
        "id": f"SIG-{symbol}-{tf_map.get(timeframe, timeframe)}-{uuid4().hex[:8].upper()}",
        "symbol": symbol.replace("USDT", "USD"),  # Normalize to USD suffix
        "signal": direction,
        "confidence": confidence,
        "timeframe": tf_map.get(timeframe, timeframe),
        "entry": levels["entry"],
        "tp1": levels["tp1"],
        "tp2": levels["tp2"],
        "sl": levels["sl"],
        "reasons": reasons,
        "indicators": {
            "rsi": round(indicators["rsi"], 2),
            "macd_histogram": round(indicators["macd"]["histogram"], 6),
            "ema_trend": "up" if indicators["ema"]["ema20"] > indicators["ema"]["ema50"] else "down",
            "stochastic_k": round(indicators["stochastic"]["k"], 2),
            "volume_ratio": round(indicators["volume"]["ratio"], 2),
        },
        "source": source,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "expires_in_minutes": 240,
    }

    return signal

# ─── Main ─────────────────────────────────────────────────────

def main():
    """Main signal generation loop"""
    print(f"[{datetime.now(timezone.utc).isoformat()}] Signal Engine starting...")
    print(f"Minimum confidence threshold: {MIN_CONFIDENCE}%")

    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    signals = []
    stats = {
        "symbols_checked": 0,
        "signals_generated": 0,
        "signals_below_threshold": 0,
        "data_fetch_errors": 0,
    }

    for sym_config in SYMBOLS:
        symbol = sym_config["symbol"]
        print(f"\nAnalyzing {symbol}...")

        for timeframe in TIMEFRAMES:
            stats["symbols_checked"] += 1

            df, source = get_ohlcv(symbol, timeframe)
            if df is None or len(df) < MIN_CANDLES:
                print(f"  {timeframe}: insufficient data", file=sys.stderr)
                stats["data_fetch_errors"] += 1
                continue

            signal = generate_signal(symbol, timeframe, df, source)
            if signal:
                signals.append(signal)
                stats["signals_generated"] += 1
                print(f"  {timeframe}: {signal['signal']} {signal['confidence']}% - {', '.join(signal['reasons'][:2])}")
            else:
                stats["signals_below_threshold"] += 1

    # Sort by confidence descending
    signals.sort(key=lambda s: s["confidence"], reverse=True)

    # Build output
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "min_confidence": MIN_CONFIDENCE,
        "count": len(signals),
        "stats": stats,
        "signals": signals,
    }

    # Write to file
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n{'='*50}")
    print(f"Results written to: {OUTPUT_FILE}")
    print(f"Signals generated: {stats['signals_generated']}")
    print(f"Below threshold: {stats['signals_below_threshold']}")
    print(f"Data errors: {stats['data_fetch_errors']}")

    if signals:
        print(f"\nTop signals:")
        for s in signals[:5]:
            print(f"  {s['symbol']} {s['timeframe']}: {s['signal']} {s['confidence']}%")

if __name__ == "__main__":
    main()
