# Signal Engine Spec (Updated 2026-04-02)

## Default view = Confluence signals
Show multi-TF agreement signals by default. User can drill down to individual TFs.

## Timeframes to scan (per symbol)
- M5  (5 minute)
- M15 (15 minute)
- H1  (1 hour)
- H4  (4 hour)

## Confidence = Confluence between timeframes

```
Confluence scoring:
- 4 TFs agree:  base + 20%  → strongest signal
- 3 TFs agree:  base + 12%
- 2 TFs agree:  base + 5%
- 1 TF only:    base + 0%   (usually filtered unless STRONG_ rec)
- Mixed TFs:    skip — no signal emitted

STRONG_BUY / STRONG_SELL base = 80%
BUY / SELL base = 65%

Only emit if final confidence >= 70%
```

## signals-live.json structure

```json
{
  "generated_at": "...",
  "min_confidence": 70,
  "confluence_signals": [
    {
      "id": "SIG-BTCUSDT-3TF-XXXX",
      "symbol": "BTCUSDT",
      "signal": "BUY",
      "confidence": 92,
      "timeframe": "3TF confluence (M15/H1/H4)",
      "agreeing_timeframes": ["M15", "H1", "H4"],
      "confluence_score": 3,
      "entry": 67850,
      "tp1": 68500,
      "tp2": 69200,
      "sl": 67200,
      "reasons": ["M15/H1/H4 all BUY", "RSI oversold 28.9"],
      "source": "tradingview"
    }
  ],
  "all_signals": [
    {
      "id": "SIG-BTCUSDT-H1-XXXX",
      "symbol": "BTCUSDT",
      "signal": "BUY",
      "confidence": 80,
      "timeframe": "H1",
      "confluence_score": 3,
      "entry": 67850,
      "tp1": 68500,
      "sl": 67200,
      "source": "tradingview"
    }
  ],
  "stats": {
    "symbols_checked": 10,
    "confluence_signals": 2,
    "individual_signals": 8,
    "filtered_below_threshold": 22
  }
}
```

## API endpoint: /api/v1/signals

**Default (no params):**
→ returns confluence_signals only (multi-TF agreement, highest quality)

**Filter by timeframe:**
→ `?tf=H1` returns all_signals where timeframe = H1
→ `?tf=M5` returns all_signals where timeframe = M5
→ `?tf=M15,H1` returns all_signals where timeframe in [M15, H1]

**Filter by confluence strength:**
→ `?min_confluence=3` returns signals with confluence_score >= 3
→ `?min_confluence=4` returns only 4-TF full agreement signals

**Filter by symbol:**
→ `?symbol=BTCUSDT`
→ `?symbol=BTCUSDT,XAUUSD`

**Combine freely:**
→ `?symbol=BTCUSDT&tf=H1`
→ `?symbol=XAUUSD&min_confluence=3`

**Response always includes:**
- `mode`: "confluence" | "filtered"
- `filter_applied`: what filters were used
- `signals`: the result array

## Scan frequency
Every 5 minutes

## Priority order
1. 4-TF full confluence → highest alert priority
2. 3-TF confluence → strong signal
3. 2-TF confluence → standard signal
4. 1-TF individual → only visible when user explicitly filters
