import { generateSignals } from '../../dist/signals/engine.js';

/**
 * Market Regime Detector Skill
 *
 * Classifies current market into one of three regimes:
 * - TRENDING: ADX > 25 + normal Bollinger bandwidth (>= 1.5%)
 * - RANGING: ADX < 25 (no directional conviction)
 * - VOLATILE: ADX >= 20 + compressed Bollinger bands (< 1.5%) — squeeze/breakout setup
 *
 * Applies regime-specific confidence adjustments:
 * - Trending: boost trend-aligned, penalize counter-trend
 * - Ranging: boost mean-reversion, penalize trend-chasing
 * - Volatile: boost breakout signals
 */
export class RegimeDetectorSkill {
  name = 'regime-detector';
  description = 'Classifies market as trending/ranging/volatile using ADX + Bollinger bandwidth.';
  version = '0.1.0';

  classifyRegime(adxValue, adxTrending, bbBandwidth) {
    if (adxTrending && bbBandwidth >= 1.5) return 'trending';
    if (adxValue >= 20 && bbBandwidth < 1.5) return 'volatile';
    if (!adxTrending) return 'ranging';
    return 'trending';
  }

  analyze(symbol, timeframes) {
    const baseSignals = generateSignals(symbol, timeframes, this.name);
    const tagged = [];

    for (const signal of baseSignals) {
      const { adx, bollingerBands, ema, rsi } = signal.indicators;

      const adxValue = adx ? adx.value : 15;
      const adxTrending = adx ? adx.trending : false;
      const regime = this.classifyRegime(adxValue, adxTrending, bollingerBands.bandwidth);

      let confidenceAdj = 0;

      if (regime === 'trending') {
        if (signal.direction === 'BUY' && ema.trend === 'up') confidenceAdj = 8;
        else if (signal.direction === 'SELL' && ema.trend === 'down') confidenceAdj = 8;
        else if (signal.direction === 'BUY' && ema.trend === 'down') confidenceAdj = -15;
        else if (signal.direction === 'SELL' && ema.trend === 'up') confidenceAdj = -15;
      }

      if (regime === 'ranging') {
        if (signal.direction === 'BUY' && rsi.signal === 'oversold') confidenceAdj = 8;
        else if (signal.direction === 'SELL' && rsi.signal === 'overbought') confidenceAdj = 8;
        if (signal.direction === 'BUY' && rsi.signal === 'overbought') confidenceAdj = -10;
        else if (signal.direction === 'SELL' && rsi.signal === 'oversold') confidenceAdj = -10;
      }

      if (regime === 'volatile') {
        if (signal.direction === 'BUY' && bollingerBands.position === 'upper') confidenceAdj = 10;
        else if (signal.direction === 'SELL' && bollingerBands.position === 'lower') confidenceAdj = 10;
      }

      const adjusted = Math.max(25, Math.min(100, signal.confidence + confidenceAdj));

      tagged.push({
        ...signal,
        confidence: adjusted,
        skill: `${this.name}:${regime}`,
      });
    }

    return tagged;
  }
}

export default RegimeDetectorSkill;
