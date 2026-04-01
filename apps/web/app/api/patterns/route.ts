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
  reliability: number; // percentage
  shortDesc: string;
  fullDesc: string;
  howToTrade: string;
  tradeClawDetects: boolean;
  svgType: string; // key for client-side SVG renderer
}

export const PATTERNS: TradingPattern[] = [
  {
    id: 'rsi-divergence',
    name: 'RSI Divergence',
    category: 'Indicator',
    direction: 'EITHER',
    reliability: 71,
    shortDesc: 'Price makes a new high/low but RSI fails to confirm, signaling momentum exhaustion.',
    fullDesc: 'RSI Divergence occurs when price action and the RSI indicator move in opposite directions. Bullish divergence: price makes lower lows while RSI makes higher lows — suggesting selling pressure is weakening. Bearish divergence: price makes higher highs while RSI makes lower highs — suggesting buying momentum is fading.',
    howToTrade: 'Wait for divergence to complete (RSI turning). Enter on confirmation candle. Place stop below the recent swing low/high. Target the prior swing in the opposite direction. Works best on H4 and Daily timeframes.',
    tradeClawDetects: true,
    svgType: 'divergence',
  },
  {
    id: 'macd-golden-cross',
    name: 'MACD Golden Cross',
    category: 'Indicator',
    direction: 'BUY',
    reliability: 68,
    shortDesc: 'MACD line crosses above the signal line, indicating bullish momentum shift.',
    fullDesc: 'The MACD Golden Cross happens when the faster MACD line crosses above the slower signal line from below. This indicates a shift from bearish to bullish momentum. The signal is strongest when it occurs below the zero line (oversold territory) and when the histogram transitions from red to green bars.',
    howToTrade: 'Enter long on the candle after the crossover is confirmed. Set stop loss below the recent swing low. Target the next resistance level. Use confluence with EMA direction for higher-probability setups.',
    tradeClawDetects: true,
    svgType: 'macd-cross-bull',
  },
  {
    id: 'macd-death-cross',
    name: 'MACD Death Cross',
    category: 'Indicator',
    direction: 'SELL',
    reliability: 66,
    shortDesc: 'MACD line crosses below the signal line, indicating bearish momentum shift.',
    fullDesc: 'The MACD Death Cross is the bearish counterpart — the MACD line crosses below the signal line from above. This signals that downward momentum is accelerating. Most reliable when occurring above the zero line (overbought territory) and accompanied by increasing red histogram bars.',
    howToTrade: 'Enter short on confirmation of the crossover. Stop loss above the recent swing high. Target the next support level or previous demand zone. Combine with RSI < 50 for added confluence.',
    tradeClawDetects: true,
    svgType: 'macd-cross-bear',
  },
  {
    id: 'ema-golden-cross',
    name: 'EMA Golden Cross',
    category: 'Price Action',
    direction: 'BUY',
    reliability: 72,
    shortDesc: 'The 20 EMA crosses above the 50 EMA, confirming a bullish trend change.',
    fullDesc: 'The EMA Golden Cross occurs when a shorter-period EMA (20) crosses above a longer-period EMA (50). This is one of the most widely followed trend signals and often triggers a significant rally, especially on daily timeframes. The crossover confirms that recent price action is outpacing the broader trend.',
    howToTrade: 'Enter long when the 20 EMA cleanly crosses above the 50 EMA. Pullbacks to the 20 EMA after the cross offer secondary entries. Stop below the 50 EMA. Hold for the duration of the trend with trailing stop.',
    tradeClawDetects: true,
    svgType: 'ema-cross',
  },
  {
    id: 'head-and-shoulders',
    name: 'Head & Shoulders',
    category: 'Price Action',
    direction: 'SELL',
    reliability: 74,
    shortDesc: 'A three-peak reversal pattern marking the end of an uptrend.',
    fullDesc: 'The Head & Shoulders pattern consists of three peaks: a left shoulder, a higher head, and a lower right shoulder — all above a "neckline" support. It is a classic topping reversal pattern. The pattern completes when price breaks below the neckline after forming the right shoulder.',
    howToTrade: 'Wait for neckline break and retest. Enter short on the retest of the neckline from below. Stop above the right shoulder high. Price target = distance from head to neckline, projected downward from breakout.',
    tradeClawDetects: false,
    svgType: 'head-shoulders',
  },
  {
    id: 'double-bottom',
    name: 'Double Bottom',
    category: 'Candlestick',
    direction: 'BUY',
    reliability: 70,
    shortDesc: 'Two consecutive lows at the same level form a strong support reversal pattern.',
    fullDesc: 'The Double Bottom (W pattern) forms when price tests the same support level twice and bounces both times. This indicates strong buyer interest at that level. Volume often decreases on the second bottom, showing sellers are exhausted. The pattern confirms on a break above the peak between the two lows.',
    howToTrade: 'Enter long on break above the neckline (peak between bottoms) with stop below the second bottom. Target = distance from bottom to neckline projected upward. Use RSI divergence on the second bottom for confirmation.',
    tradeClawDetects: false,
    svgType: 'double-bottom',
  },
  {
    id: 'double-top',
    name: 'Double Top',
    category: 'Candlestick',
    direction: 'SELL',
    reliability: 70,
    shortDesc: 'Two consecutive highs at the same level form a strong resistance reversal pattern.',
    fullDesc: 'The Double Top (M pattern) forms when price hits the same resistance level twice and fails both times. It signals that buyers lack the strength to push higher and sellers are absorbing supply at that level. Confirmed on a break below the trough between the two peaks.',
    howToTrade: 'Enter short on neckline (trough) break. Stop above the second top. Target = distance from top to neckline projected downward. Bearish RSI divergence on the second top adds confidence.',
    tradeClawDetects: false,
    svgType: 'double-top',
  },
  {
    id: 'bollinger-squeeze',
    name: 'Bollinger Band Squeeze',
    category: 'Indicator',
    direction: 'EITHER',
    reliability: 65,
    shortDesc: 'Bands contract sharply, signaling low volatility before an explosive breakout.',
    fullDesc: 'The Bollinger Band Squeeze occurs when the upper and lower bands converge tightly, indicating a period of compressed volatility. Markets historically follow periods of low volatility with high-volatility breakout moves. The squeeze does not indicate direction — the first bar that breaks outside the bands after a squeeze often signals the direction.',
    howToTrade: 'Watch for bandwidth to reach multi-month lows. Enter in the direction of the first band breakout. Place stop inside the bands. Target 1-3× the band width as profit target. Use volume surge as confirmation.',
    tradeClawDetects: true,
    svgType: 'bb-squeeze',
  },
  {
    id: 'rsi-oversold-bounce',
    name: 'RSI Oversold Bounce',
    category: 'Indicator',
    direction: 'BUY',
    reliability: 69,
    shortDesc: 'RSI drops below 30 and turns upward, signaling exhausted selling and potential reversal.',
    fullDesc: 'When RSI falls below 30, the asset is considered oversold — price has declined too far too fast. A bullish signal fires when RSI turns upward from below 30, indicating selling pressure is exhausting. The signal strengthens when accompanied by a positive MACD histogram divergence or a support level bounce.',
    howToTrade: 'Wait for RSI to cross back above 30 from below. Enter on the candle after the cross. Stop below the swing low that produced the RSI reading. Target the 50-60 RSI zone or nearest resistance.',
    tradeClawDetects: true,
    svgType: 'rsi-oversold',
  },
  {
    id: 'rsi-overbought-reversal',
    name: 'RSI Overbought Reversal',
    category: 'Indicator',
    direction: 'SELL',
    reliability: 67,
    shortDesc: 'RSI climbs above 70 and turns downward, signaling exhausted buying and potential pullback.',
    fullDesc: 'The RSI Overbought Reversal mirrors the oversold signal — when RSI exceeds 70, the asset may be overbought. A bearish signal fires when RSI turns down from above 70. In strong trending markets RSI can stay overbought for extended periods, so always combine with other signals.',
    howToTrade: 'Enter short when RSI crosses back below 70 from above. Stop above the swing high. Target RSI 40-50 zone or nearest support. Avoid during strong uptrends — best used in range-bound conditions.',
    tradeClawDetects: true,
    svgType: 'rsi-overbought',
  },
  {
    id: 'stochastic-crossover',
    name: 'Stochastic Crossover',
    category: 'Indicator',
    direction: 'EITHER',
    reliability: 64,
    shortDesc: '%K crosses %D in oversold/overbought zones for high-probability reversal signals.',
    fullDesc: 'The Stochastic Oscillator generates crossover signals when the fast %K line crosses the slow %D line. Bullish: %K crosses above %D while both are below 20 (oversold zone). Bearish: %K crosses below %D while both are above 80 (overbought zone). Most reliable on higher timeframes (H4/Daily).',
    howToTrade: 'Enter on the crossover candle when both lines are in the extreme zone. Exit when the Stochastic reaches the opposite extreme or crosses back. Use tight stops as false signals occur in trending markets.',
    tradeClawDetects: true,
    svgType: 'stochastic',
  },
  {
    id: 'support-resistance-breakout',
    name: 'S/R Breakout',
    category: 'Price Action',
    direction: 'EITHER',
    reliability: 75,
    shortDesc: 'Price breaks through a key support or resistance level with momentum and volume.',
    fullDesc: 'Support/Resistance Breakouts occur when price breaches a well-established level that has been tested multiple times. The more times a level has been tested without breaking, the more significant the breakout. A true breakout is confirmed by a full candle close beyond the level and ideally increased volume.',
    howToTrade: 'Wait for a confirmed candle close beyond the level. Enter on a retest of the broken level (now flipped support/resistance). Stop below/above the retest candle. Target the next major S/R level.',
    tradeClawDetects: false,
    svgType: 'breakout',
  },
];

export async function GET() {
  return NextResponse.json(
    { patterns: PATTERNS, total: PATTERNS.length },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=86400',
      },
    }
  );
}
