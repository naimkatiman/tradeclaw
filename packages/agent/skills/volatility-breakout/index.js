import { generateSignals } from '../../dist/signals/engine.js';

/**
 * Volatility Breakout Strategy Skill
 *
 * Targets EXPANDING/VOLATILE markets:
 * - BUY when price breaks above resistance + Bollinger squeeze expansion + ADX > 20 + +DI > -DI
 * - SELL when price breaks below support + Bollinger squeeze expansion + ADX > 20 + -DI > +DI
 *
 * Bollinger bandwidth < 2 = squeeze state, breakout from squeeze gets extra confidence.
 */
export class VolatilityBreakoutSkill {
  name = 'volatility-breakout';
  description = 'Breakout trading on Bollinger squeeze expansion with ADX/DI confirmation and volume.';
  version = '0.1.0';

  analyze(symbol, timeframes) {
    const baseSignals = generateSignals(symbol, timeframes, this.name);
    const filtered = [];

    for (const signal of baseSignals) {
      const { support, resistance, bollingerBands, adx, volume } = signal.indicators;

      // Require ADX data and minimum momentum
      if (!adx || adx.value < 20) continue;

      const squeezed = bollingerBands.bandwidth < 2;
      const volumeConfirmed = volume ? volume.confirmed : false;

      const nearestResistance = resistance.length > 0 ? Math.min(...resistance) : Infinity;
      const nearestSupport = support.length > 0 ? Math.max(...support) : 0;

      const breakingResistance = signal.entry > nearestResistance;
      const breakingSupport = signal.entry < nearestSupport;

      // Bullish breakout
      if (signal.direction === 'BUY' && (breakingResistance || bollingerBands.position === 'upper')) {
        if (adx.plusDI <= adx.minusDI) continue; // DI must confirm

        let boost = 10;
        if (breakingResistance) boost += 8;
        if (squeezed) boost += 5;
        if (volumeConfirmed) boost += 5;

        filtered.push({
          ...signal,
          confidence: Math.min(signal.confidence + boost, 100),
          skill: this.name,
        });
        continue;
      }

      // Bearish breakout
      if (signal.direction === 'SELL' && (breakingSupport || bollingerBands.position === 'lower')) {
        if (adx.minusDI <= adx.plusDI) continue; // DI must confirm

        let boost = 10;
        if (breakingSupport) boost += 8;
        if (squeezed) boost += 5;
        if (volumeConfirmed) boost += 5;

        filtered.push({
          ...signal,
          confidence: Math.min(signal.confidence + boost, 100),
          skill: this.name,
        });
        continue;
      }
    }

    return filtered;
  }
}

export default VolatilityBreakoutSkill;
