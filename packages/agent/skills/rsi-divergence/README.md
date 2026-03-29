# RSI Divergence Skill

A signal strategy skill for tradeclaw-agent that focuses on RSI (Relative Strength Index) divergence patterns.

## Strategy

- **BUY Signal**: When RSI is oversold (<30) and trend indicators confirm upward momentum
- **SELL Signal**: When RSI is overbought (>70) and trend indicators confirm downward momentum
- **Divergence**: When RSI direction conflicts with price direction, signals are generated with lower confidence as contrarian trades

## How It Works

1. Generates base signals using the core signal engine
2. Filters for signals where RSI shows extreme conditions (oversold/overbought)
3. Boosts confidence by +10% when RSI direction aligns with the signal direction
4. Reduces confidence by -15% for divergence (contrarian) signals

## Configuration

This skill is loaded automatically when listed in your `.tradeclaw/config.json`:

```json
{
  "skills": ["rsi-divergence"]
}
```

## Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| RSI Period | 14 | Standard RSI lookback period |
| Oversold | <30 | RSI value considered oversold |
| Overbought | >70 | RSI value considered overbought |
| Confidence Boost | +10% | Applied when RSI confirms direction |
| Divergence Penalty | -15% | Applied for contrarian signals |
