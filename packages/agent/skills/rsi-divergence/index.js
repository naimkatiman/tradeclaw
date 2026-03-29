import { generateSignals } from '../../dist/signals/engine.js';

/**
 * RSI Divergence Strategy Skill
 *
 * Focuses on RSI-based signals:
 * - BUY when RSI is oversold (<30) and showing bullish divergence
 * - SELL when RSI is overbought (>70) and showing bearish divergence
 *
 * This skill filters signals from the main engine, boosting confidence
 * when RSI conditions align with other indicators.
 */
export class RSIDivergenceSkill {
  name = 'rsi-divergence';
  description = 'RSI divergence-based signal strategy. Identifies oversold/overbought conditions with trend confirmation.';
  version = '0.1.0';

  analyze(symbol, timeframes) {
    const baseSignals = generateSignals(symbol, timeframes, this.name);
    const filtered = [];

    for (const signal of baseSignals) {
      const rsi = signal.indicators.rsi;

      // Only keep signals where RSI shows extreme conditions
      if (rsi.signal === 'neutral') continue;

      // RSI oversold + BUY signal = strong buy
      if (rsi.signal === 'oversold' && signal.direction === 'BUY') {
        const boostedConfidence = Math.min(signal.confidence + 10, 100);
        filtered.push({
          ...signal,
          confidence: boostedConfidence,
          skill: this.name,
        });
        continue;
      }

      // RSI overbought + SELL signal = strong sell
      if (rsi.signal === 'overbought' && signal.direction === 'SELL') {
        const boostedConfidence = Math.min(signal.confidence + 10, 100);
        filtered.push({
          ...signal,
          confidence: boostedConfidence,
          skill: this.name,
        });
        continue;
      }

      // Divergence: RSI says one thing, price says another
      if (rsi.signal === 'oversold' && signal.direction === 'SELL') {
        filtered.push({
          ...signal,
          confidence: Math.max(signal.confidence - 15, 30),
          skill: this.name,
        });
      } else if (rsi.signal === 'overbought' && signal.direction === 'BUY') {
        filtered.push({
          ...signal,
          confidence: Math.max(signal.confidence - 15, 30),
          skill: this.name,
        });
      }
    }

    return filtered;
  }
}

export default RSIDivergenceSkill;
