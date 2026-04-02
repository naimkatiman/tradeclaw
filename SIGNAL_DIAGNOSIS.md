# Signal Engine Diagnosis

## 2026-04-02 v3: 4-TF confluence engine live

### Algorithm
- Checks M5, M15, H1, H4 timeframes for each symbol
- Requires >= 2 TFs agreeing with 0 opposite signals
- Base confidence: 85 (STRONG) or 72 (regular)
- Bonuses: confluence (+5/+12/+20), RSI extremes (+5), high volume (+3)
- Maximum confidence capped at 95%

### Test Results
```
Signals generated: 4/10
No confluence: 6
Errors: 0

HIGH-CONFIDENCE SIGNALS:
  GBPUSD: SELL 95% (4TF confluence)
  USDJPY: BUY 95% (4TF confluence)
  BNBUSD: SELL 87% (3TF confluence)
  EURUSD: SELL 87% (3TF confluence)
```

### Output Fields
- `agreeing_timeframes`: List of TFs that agree on direction
- `total_timeframes_checked`: Number of TFs with valid data
- `timeframe`: Human-readable confluence summary
- `expires_in_minutes`: 60 for 3+ TF, 30 for 2 TF
