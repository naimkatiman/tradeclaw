import { generateSignals } from '../../dist/signals/engine.js';

/**
 * MACD Crossover Strategy Skill
 *
 * Focuses on MACD histogram crossover signals:
 * - BUY when MACD is bullish and histogram is positive
 * - SELL when MACD is bearish and histogram is negative
 *
 * Combines MACD with EMA trend for confirmation.
 */
export class MACDCrossoverSkill {
  name = 'macd-crossover';
  description = 'MACD crossover strategy with EMA trend confirmation. Identifies momentum shifts.';
  version = '0.1.0';

  analyze(symbol, timeframes) {
    const baseSignals = generateSignals(symbol, timeframes, this.name);
    const filtered = [];

    for (const signal of baseSignals) {
      const macd = signal.indicators.macd;
      const ema = signal.indicators.ema;

      // Only keep signals where MACD shows clear direction
      if (macd.signal === 'neutral') continue;

      // MACD bullish + EMA uptrend + BUY = strong confirmation
      if (macd.signal === 'bullish' && ema.trend === 'up' && signal.direction === 'BUY') {
        const boostedConfidence = Math.min(signal.confidence + 12, 100);
        filtered.push({
          ...signal,
          confidence: boostedConfidence,
          skill: this.name,
        });
        continue;
      }

      // MACD bearish + EMA downtrend + SELL = strong confirmation
      if (macd.signal === 'bearish' && ema.trend === 'down' && signal.direction === 'SELL') {
        const boostedConfidence = Math.min(signal.confidence + 12, 100);
        filtered.push({
          ...signal,
          confidence: boostedConfidence,
          skill: this.name,
        });
        continue;
      }

      // MACD bullish but EMA not confirming
      if (macd.signal === 'bullish' && signal.direction === 'BUY') {
        filtered.push({
          ...signal,
          confidence: signal.confidence,
          skill: this.name,
        });
        continue;
      }

      // MACD bearish but EMA not confirming
      if (macd.signal === 'bearish' && signal.direction === 'SELL') {
        filtered.push({
          ...signal,
          confidence: signal.confidence,
          skill: this.name,
        });
        continue;
      }

      // Counter-trend
      if (
        (macd.signal === 'bullish' && signal.direction === 'SELL') ||
        (macd.signal === 'bearish' && signal.direction === 'BUY')
      ) {
        filtered.push({
          ...signal,
          confidence: Math.max(signal.confidence - 20, 25),
          skill: this.name,
        });
      }
    }

    return filtered;
  }
}

export default MACDCrossoverSkill;
