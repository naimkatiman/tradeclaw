import { generateSignals } from '../../dist/signals/engine.js';

/**
 * Support/Resistance Bounce Strategy Skill
 *
 * Targets RANGING markets (ADX < 25):
 * - BUY when price is near support + RSI/Stochastic oversold
 * - SELL when price is near resistance + RSI/Stochastic overbought
 *
 * Penalizes counter-S/R trades (buying at resistance, selling at support).
 * Self-gates: skips all signals when ADX indicates a trending market.
 */
export class SRBounceSkill {
  name = 'sr-bounce';
  description = 'Buy on support, sell on resistance in ranging markets. Uses ADX < 25 as regime filter.';
  version = '0.1.0';

  analyze(symbol, timeframes) {
    const baseSignals = generateSignals(symbol, timeframes, this.name);
    const filtered = [];

    for (const signal of baseSignals) {
      const { support, resistance, rsi, stochastic, adx } = signal.indicators;

      // Self-gate: only operate in non-trending markets
      if (adx && adx.trending) continue;

      const nearestSupport = support.length > 0 ? Math.max(...support) : 0;
      const nearestResistance = resistance.length > 0 ? Math.min(...resistance) : Infinity;
      const priceRange = nearestResistance - nearestSupport;

      if (priceRange <= 0) continue;

      const supportProximity = (signal.entry - nearestSupport) / priceRange;
      const resistanceProximity = (nearestResistance - signal.entry) / priceRange;

      // BUY near support
      if (signal.direction === 'BUY' && supportProximity < 0.2) {
        let boost = 15;
        if (rsi.signal === 'oversold') boost += 5;
        if (stochastic.signal === 'oversold') boost += 5;
        filtered.push({
          ...signal,
          confidence: Math.min(signal.confidence + boost, 100),
          skill: this.name,
        });
        continue;
      }

      // SELL near resistance
      if (signal.direction === 'SELL' && resistanceProximity < 0.2) {
        let boost = 15;
        if (rsi.signal === 'overbought') boost += 5;
        if (stochastic.signal === 'overbought') boost += 5;
        filtered.push({
          ...signal,
          confidence: Math.min(signal.confidence + boost, 100),
          skill: this.name,
        });
        continue;
      }

      // Counter-S/R penalty: buying at resistance or selling at support
      if (signal.direction === 'BUY' && resistanceProximity < 0.2) {
        filtered.push({
          ...signal,
          confidence: Math.max(signal.confidence - 20, 25),
          skill: this.name,
        });
        continue;
      }

      if (signal.direction === 'SELL' && supportProximity < 0.2) {
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

export default SRBounceSkill;
