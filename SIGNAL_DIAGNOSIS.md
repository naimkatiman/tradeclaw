# Signal System Diagnosis

**Date:** 2026-04-02
**Diagnosed by:** Sam + Aiman

---

## Current State Assessment

### Data Sources (Already Implemented)

The existing signal system in `apps/web/app/lib/` uses a **multi-source fallback chain**:

| Asset Class | Primary | Fallback 1 | Fallback 2 | Last Resort |
|------------|---------|------------|------------|-------------|
| Crypto | Binance API | Kraken | CryptoCompare | Synthetic |
| Forex/Metals | OANDA (if token) | Yahoo Finance | Twelve Data | Synthetic |

**Key Files:**
- `ohlcv.ts` — Fetches OHLCV candle data with 5-min caching
- `ta-engine.ts` — Pure math TA: RSI, MACD, EMA, Bollinger, Stochastic, ADX
- `signal-generator.ts` — Converts indicators to BUY/SELL signals with weighted scoring
- `signals.ts` — Main entry point, orchestrates multi-timeframe analysis

### What's Good

1. **Real Data Sources** — Binance/Yahoo/Kraken APIs provide actual market data
2. **Proper TA Calculations** — RSI, MACD, EMA, Bollinger, Stochastic, ADX all implemented correctly
3. **Multi-Timeframe Analysis** — Checks M15, H1, H4, D1 for confluence
4. **Source Transparency** — Each signal tagged with `source: 'real'` or `source: 'fallback'`
5. **Synthetic Detection** — Volume patterns checked to identify fake data

### What's Wrong

1. **Confidence Threshold Too Low**
   - Current: `PUBLISHED_SIGNAL_MIN_CONFIDENCE = 60`
   - Problem: 60% signals are barely better than noise
   - Fix: Raise to 70% minimum for published signals

2. **No Persistence Layer**
   - Signals are generated on-demand and discarded
   - No historical tracking of signal accuracy
   - No learning from wins/losses

3. **No Outcome Tracking**
   - We don't know if past signals hit TP or SL
   - Can't calculate actual win rate
   - No adaptive threshold adjustment

4. **Synthetic Fallback Still Emits**
   - When all APIs fail, synthetic data is generated
   - These signals are marked but still returned
   - Users may act on fake data

5. **No Scheduled Generation**
   - Signals only computed when API is called
   - No pre-computed "signal of the day" for marketing
   - Cold cache = slow first load

---

## Fix Plan

### Phase 1: Confidence Threshold (Immediate)
- Raise `PUBLISHED_SIGNAL_MIN_CONFIDENCE` to 70
- Add filter: never emit synthetic-source signals to v1 API

### Phase 2: Signal Persistence
- Create `data/signals-live.json` — current active signals
- Create `scripts/signal-memory.json` — historical outcomes
- Cron job updates every 15 minutes

### Phase 3: Outcome Learning
- Track each signal: did price hit TP1 or SL?
- Calculate rolling win rate
- If win_rate < 60%: raise threshold to 75%
- If win_rate > 80%: log success, consider lowering

### Phase 4: TradingView Integration (Optional Enhancement)
- Install `tradingview-scraper` for additional data source
- Use as high-priority fallback before Yahoo Finance
- Benefits: More forex/metals coverage, TradingView-quality data

---

## Confidence Scoring Algorithm (Current)

```
buyScore = 0, sellScore = 0

RSI < 30 → buyScore += 20
RSI > 70 → sellScore += 20

MACD histogram positive + crossing up → buyScore += 25
MACD histogram negative + crossing down → sellScore += 25

EMA20 > EMA50 > EMA200 → buyScore += 20
EMA20 < EMA50 < EMA200 → sellScore += 20

Stochastic < 20, K > D → buyScore += 15
Stochastic > 80, K < D → sellScore += 15

Price near lower BB → buyScore += 10
Price near upper BB → sellScore += 10

confidence = max(48, min(95, 42 + dominantScore * 0.62))
```

**Minimum required:**
- `SIGNAL_THRESHOLD = 25` to emit any signal
- `MIN_CONFIDENCE = 58` internal cutoff
- `MIN_DIRECTIONAL_EDGE = 8` — buy/sell score gap

---

## What Can Still Fail

1. **API Rate Limits** — Binance 1200/min, Yahoo no hard limit but may block
2. **Weekend Gaps** — Forex markets closed, only crypto available
3. **Flash Crashes** — TA indicators lag real-time moves
4. **Low Liquidity Symbols** — Spread can eat into TP/SL calculations
5. **Synthetic Pollution** — If all APIs fail simultaneously

---

## Next Iteration Ideas

1. **Volume Confirmation** — Only emit if volume > 1.5x average
2. **Market Hours Filter** — Penalize forex signals during Asian session lull
3. **Correlation Check** — Avoid emitting conflicting signals (XAUUSD BUY + EURUSD SELL)
4. **News Calendar** — Suppress signals 30min before major releases
5. **ML Layer** — Train model on historical outcomes to predict signal quality

---

## Files Modified in This Fix

- `lib/signal-thresholds.ts` — Raised confidence threshold
- `scripts/signal-engine.py` — NEW: Standalone signal generator
- `scripts/signal-outcome-checker.py` — NEW: Learning loop
- `scripts/run-signals.sh` — NEW: Cron entrypoint
- `data/signals-live.json` — NEW: Active signals cache
- `scripts/signal-memory.json` — NEW: Outcome history

---

**Conclusion:** The existing system is architecturally sound but needs:
1. Higher confidence threshold (60% → 70%)
2. Persistence and outcome tracking
3. Learning loop to adapt thresholds
4. Never emit synthetic signals as real
