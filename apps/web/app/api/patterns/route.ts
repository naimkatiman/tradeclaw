import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 86400;

export type PatternCategory = 'Candlestick' | 'Indicator' | 'Price Action';
export type SignalDirection = 'BUY' | 'SELL' | 'EITHER';

export interface TradingPattern {
  id: string;
  name: string;
  category: PatternCategory;
  direction: SignalDirection;
  shortDesc: string;
  fullDesc: string;
  textbookInterpretation: string;
  svgType: string; // key for client-side SVG renderer
}

export const PATTERNS: TradingPattern[] = [
  {
    id: 'rsi-divergence',
    name: 'RSI Divergence',
    category: 'Indicator',
    direction: 'EITHER',
    shortDesc: 'Price makes a new high/low but RSI fails to confirm, signaling momentum exhaustion.',
    fullDesc: 'RSI Divergence occurs when price action and the RSI indicator move in opposite directions. Bullish divergence: price makes lower lows while RSI makes higher lows — suggesting selling pressure is weakening. Bearish divergence: price makes higher highs while RSI makes lower highs — suggesting buying momentum is fading.',
    textbookInterpretation: 'Textbook descriptions wait for a completed divergence and a confirming candle, then compare price with the prior swing. TradeClaw has not validated this interpretation by timeframe.',
    svgType: 'divergence',
  },
  {
    id: 'macd-golden-cross',
    name: 'MACD Golden Cross',
    category: 'Indicator',
    direction: 'BUY',
    shortDesc: 'MACD line crosses above the signal line, indicating bullish momentum shift.',
    fullDesc: 'The MACD Golden Cross happens when the faster MACD line crosses above the slower signal line from below. This indicates a shift from bearish to bullish momentum. The signal is strongest when it occurs below the zero line (oversold territory) and when the histogram transitions from red to green bars.',
    textbookInterpretation: 'Textbook descriptions treat a confirmed upward crossover as bullish and may compare it with EMA direction and nearby resistance. This catalog does not measure its predictive value.',
    svgType: 'macd-cross-bull',
  },
  {
    id: 'macd-death-cross',
    name: 'MACD Death Cross',
    category: 'Indicator',
    direction: 'SELL',
    shortDesc: 'MACD line crosses below the signal line, indicating bearish momentum shift.',
    fullDesc: 'The MACD Death Cross is the bearish counterpart — the MACD line crosses below the signal line from above. Textbook analysis treats this as a possible sign of accelerating downward momentum, often considered alongside the zero line and histogram bars.',
    textbookInterpretation: 'Textbook descriptions treat a confirmed downward crossover as bearish and may compare it with RSI and nearby support. This catalog does not measure its predictive value.',
    svgType: 'macd-cross-bear',
  },
  {
    id: 'ema-golden-cross',
    name: 'EMA Golden Cross',
    category: 'Price Action',
    direction: 'BUY',
    shortDesc: 'The 20 EMA crosses above the 50 EMA, confirming a bullish trend change.',
    fullDesc: 'The EMA Golden Cross occurs when a shorter-period EMA (20) crosses above a longer-period EMA (50). This is one of the most widely followed trend signals and often triggers a significant rally, especially on daily timeframes. The crossover confirms that recent price action is outpacing the broader trend.',
    textbookInterpretation: 'Textbook descriptions read a clean 20-over-50 EMA cross as a possible bullish trend change and observe subsequent pullbacks. TradeClaw has not measured returns from that interpretation.',
    svgType: 'ema-cross',
  },
  {
    id: 'head-and-shoulders',
    name: 'Head & Shoulders',
    category: 'Price Action',
    direction: 'SELL',
    shortDesc: 'A three-peak reversal pattern marking the end of an uptrend.',
    fullDesc: 'The Head & Shoulders pattern consists of three peaks: a left shoulder, a higher head, and a lower right shoulder — all above a "neckline" support. It is a classic topping reversal pattern. The pattern completes when price breaks below the neckline after forming the right shoulder.',
    textbookInterpretation: 'Textbook descriptions look for a neckline break and retest, then use the head-to-neckline distance as an illustrative projection. That projection is not a validated target.',
    svgType: 'head-shoulders',
  },
  {
    id: 'double-bottom',
    name: 'Double Bottom',
    category: 'Candlestick',
    direction: 'BUY',
    shortDesc: 'Two consecutive lows at the same level form a strong support reversal pattern.',
    fullDesc: 'The Double Bottom (W pattern) forms when price tests the same support level twice and bounces both times. This indicates strong buyer interest at that level. Volume often decreases on the second bottom, showing sellers are exhausted. The pattern confirms on a break above the peak between the two lows.',
    textbookInterpretation: 'Textbook descriptions look for a break above the peak between bottoms and sometimes compare the setup with RSI divergence. The projected pattern height is illustrative, not validated.',
    svgType: 'double-bottom',
  },
  {
    id: 'double-top',
    name: 'Double Top',
    category: 'Candlestick',
    direction: 'SELL',
    shortDesc: 'Two consecutive highs at the same level form a strong resistance reversal pattern.',
    fullDesc: 'The Double Top (M pattern) forms when price hits the same resistance level twice and fails both times. It signals that buyers lack the strength to push higher and sellers are absorbing supply at that level. Confirmed on a break below the trough between the two peaks.',
    textbookInterpretation: 'Textbook descriptions look for a break below the trough between tops and sometimes compare the setup with RSI divergence. The projected pattern height is illustrative, not validated.',
    svgType: 'double-top',
  },
  {
    id: 'bollinger-squeeze',
    name: 'Bollinger Band Squeeze',
    category: 'Indicator',
    direction: 'EITHER',
    shortDesc: 'Bands contract sharply, signaling low volatility before an explosive breakout.',
    fullDesc: 'The Bollinger Band Squeeze occurs when the upper and lower bands converge tightly, indicating a period of compressed volatility. Markets historically follow periods of low volatility with high-volatility breakout moves. The squeeze does not indicate direction — the first bar that breaks outside the bands after a squeeze often signals the direction.',
    textbookInterpretation: 'Textbook descriptions compare unusually narrow bandwidth with a later move outside the bands and may inspect volume. The squeeze alone does not establish direction or breakout probability.',
    svgType: 'bb-squeeze',
  },
  {
    id: 'rsi-oversold-bounce',
    name: 'RSI Oversold Bounce',
    category: 'Indicator',
    direction: 'BUY',
    shortDesc: 'RSI drops below 30 and turns upward, signaling exhausted selling and potential reversal.',
    fullDesc: 'When RSI falls below 30, the asset is considered oversold — price has declined too far too fast. A bullish signal fires when RSI turns upward from below 30, indicating selling pressure is exhausting. The signal strengthens when accompanied by a positive MACD histogram divergence or a support level bounce.',
    textbookInterpretation: 'Textbook descriptions treat a move back above 30 as a possible bullish momentum change and compare it with the related swing low and resistance. This is not a measured forecast.',
    svgType: 'rsi-oversold',
  },
  {
    id: 'rsi-overbought-reversal',
    name: 'RSI Overbought Reversal',
    category: 'Indicator',
    direction: 'SELL',
    shortDesc: 'RSI climbs above 70 and turns downward, signaling exhausted buying and potential pullback.',
    fullDesc: 'The RSI Overbought Reversal mirrors the oversold signal — when RSI exceeds 70, the asset may be overbought. A bearish signal fires when RSI turns down from above 70. In strong trending markets RSI can stay overbought for extended periods, so always combine with other signals.',
    textbookInterpretation: 'Textbook descriptions treat a move back below 70 as a possible bearish momentum change and compare it with the related swing high and support. This is not a measured forecast.',
    svgType: 'rsi-overbought',
  },
  {
    id: 'stochastic-crossover',
    name: 'Stochastic Crossover',
    category: 'Indicator',
    direction: 'EITHER',
    shortDesc: '%K crosses %D in oversold/overbought zones, a textbook reversal setup that requires independent validation.',
    fullDesc: 'The Stochastic Oscillator produces crossovers when the fast %K line crosses the slow %D line. Textbook analysis calls a cross above in the lower zone bullish and a cross below in the upper zone bearish. TradeClaw has not measured this catalog entry against historical outcomes.',
    textbookInterpretation: 'Textbook descriptions interpret crossovers in an extreme zone differently from those in the middle of the range and note that trending markets can produce false reversals. No outcome rate is measured here.',
    svgType: 'stochastic',
  },
  {
    id: 'support-resistance-breakout',
    name: 'S/R Breakout',
    category: 'Price Action',
    direction: 'EITHER',
    shortDesc: 'Price breaks through a key support or resistance level with momentum and volume.',
    fullDesc: 'Support/Resistance Breakouts occur when price breaches a well-established level that has been tested multiple times. The more times a level has been tested without breaking, the more significant the breakout. A true breakout is confirmed by a full candle close beyond the level and ideally increased volume.',
    textbookInterpretation: 'Textbook descriptions look for a candle close beyond a level and observe whether a later retest holds. TradeClaw has not validated the level, projection, or expected return.',
    svgType: 'breakout',
  },
];

export async function GET() {
  return NextResponse.json(
    {
      patterns: PATTERNS,
      total: PATTERNS.length,
      evidenceStatus: 'unmeasured',
      detectionStatus: 'not-implemented',
      limitations: 'Educational reference catalog only. No measured reliability or live pattern-detection engine backs these entries.',
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=86400',
      },
    }
  );
}
