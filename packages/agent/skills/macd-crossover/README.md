# MACD Crossover Skill

A signal strategy skill for tradeclaw-agent that focuses on MACD (Moving Average Convergence Divergence) crossover patterns with EMA trend confirmation.

## Strategy

- **BUY Signal**: When MACD histogram crosses bullish and EMA trend confirms upward movement
- **SELL Signal**: When MACD histogram crosses bearish and EMA trend confirms downward movement
- **Weak Signal**: When MACD direction aligns but EMA doesn't confirm (standard confidence)
- **Counter-trend**: When MACD conflicts with signal direction (reduced confidence)

## How It Works

1. Generates base signals using the core signal engine
2. Filters for signals where MACD shows clear bullish/bearish direction
3. Cross-references with EMA trend (20/50/200) for confirmation
4. Boosts confidence by +12% when both MACD and EMA confirm the direction
5. Reduces confidence by -20% for counter-trend signals

## Configuration

This skill is loaded automatically when listed in your `.tradeclaw/config.json`:

```json
{
  "skills": ["macd-crossover"]
}
```

## Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| MACD Fast | 12 | Fast EMA period |
| MACD Slow | 26 | Slow EMA period |
| MACD Signal | 9 | Signal line period |
| EMA Periods | 20, 50, 200 | Trend confirmation periods |
| Confidence Boost | +12% | When MACD + EMA both confirm |
| Counter-trend Penalty | -20% | When MACD conflicts with direction |
