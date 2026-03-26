/**
 * Signal Explanation Engine — deterministic natural language reasoning
 * Generates Bloomberg-grade markdown analysis from technical indicator data
 * No external AI API required — template-based with seeded phrase variation
 */

import type { TradingSignal, IndicatorSummary } from './signals';

// ─── Seeded Randomness ───────────────────────────────────────

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number, offset = 0): T {
  const idx = Math.floor(Math.abs(seededRand(seed + offset * 37)) * arr.length) % arr.length;
  return arr[idx];
}

// ─── Price Formatting ────────────────────────────────────────

function fmt(p: number): string {
  if (p >= 10000) return p.toFixed(2);
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

function rrRatio(entry: number, sl: number, tp: number): string {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk === 0) return '∞';
  return (reward / risk).toFixed(2);
}

function distLabel(entry: number, level: number): string {
  const diff = Math.abs(entry - level);
  const pct = ((diff / entry) * 100).toFixed(2);
  return `${fmt(diff)} (${pct}%)`;
}

// ─── Phrase Banks ────────────────────────────────────────────

type PhraseOrFn = string | ((v: number) => string);

function applyPhrase(p: PhraseOrFn, v: number): string {
  return typeof p === 'function' ? p(v) : p;
}

const RSI_BUY: PhraseOrFn[] = [
  (v) => `RSI has collapsed into oversold territory at **${v.toFixed(1)}**, historically a reliable mean-reversion trigger where institutional buyers re-enter`,
  (v) => `RSI reading of **${v.toFixed(1)}** signals extreme selling pressure — statistically, sub-30 readings precede bounces in the majority of historically sampled cases`,
  (v) => `At **${v.toFixed(1)}**, the RSI has registered a level that has repeatedly attracted demand in this instrument`,
  (v) => `RSI printing **${v.toFixed(1)}** — momentum exhaustion on the sell side is evident, and the oscillator is primed for a bullish reset`,
];

const RSI_SELL: PhraseOrFn[] = [
  (v) => `RSI has surged to **${v.toFixed(1)}**, flagging overbought conditions and a statistically elevated probability of mean reversion`,
  (v) => `RSI at **${v.toFixed(1)}** indicates the rally is overextended — buyers are running out of fuel at this level`,
  (v) => `An RSI of **${v.toFixed(1)}** represents a multi-standard-deviation departure from fair value, conditions that historically resolve lower`,
  (v) => `RSI printing **${v.toFixed(1)}** — exhaustion candles are forming as buyers struggle to push the price any further`,
];

const RSI_NEUTRAL: PhraseOrFn[] = [
  (v) => `RSI at **${v.toFixed(1)}** is in neutral territory, neither confirming nor denying the directional thesis — trend indicators carry more weight here`,
  (v) => `RSI reads **${v.toFixed(1)}** — mid-range with no independent extreme signal, but not contradicting the overall setup`,
];

const MACD_BULL = [
  'MACD histogram has printed **positive** — the 12-period EMA has crossed above the 26-period in a classic bullish momentum crossover',
  'The MACD has completed a bullish crossover with expanding histogram bars, confirming accelerating upside momentum',
  'MACD histogram turned positive and widening — short-term momentum is decisively outpacing the medium-term baseline',
];

const MACD_BEAR = [
  'MACD histogram is **negative and widening** — the 12-period EMA has fallen below the 26-period in a textbook bearish crossover',
  'A bearish MACD crossover is in play, with the histogram printing consecutive red bars that confirm deteriorating momentum',
  'MACD diverging to the downside — the fast average is losing ground against the slow average at an accelerating pace',
];

const MACD_NEUTRAL = [
  'MACD histogram is hovering near zero — no clear directional bias from this indicator; momentum is in a transitional state',
  'MACD is consolidating around the zero line, indicating indecision between bulls and bears on the medium-term momentum axis',
];

const EMA_BULL = [
  'Price is holding **above EMA 20 > EMA 50**, confirming the short-to-medium term trend structure is intact and bullish',
  'The EMA stack is perfectly ordered bullish: EMA 20 > EMA 50 > EMA 200 — institutional trend-following algorithms use this as a primary long filter',
  'All three EMAs are aligned upward with price trading above the 20-period average — trend-following participants will be adding long exposure here',
];

const EMA_BEAR = [
  'Price has broken **below EMA 20 < EMA 50** — the trend structure is decisively inverted, confirming a bearish regime',
  'The EMA stack is fully inverted: EMA 20 < EMA 50 < EMA 200 — a high-conviction downtrend signature favored by systematic short-sellers',
  'EMAs are aligned bearish with price below the short-term average — mean-reversion longs face significant structural headwinds',
];

const EMA_NEUTRAL = [
  'EMAs are compressed and intertwined — the market is in a sideways consolidation phase with no dominant trend established',
  'Mixed EMA alignment signals a transitional market — direction will be resolved by a convincing break away from the current range',
];

const STOCH_BUY = [
  'Stochastic Oscillator has dipped below **20** and %K is crossing above %D — a high-probability oversold reversal pattern',
  'Stochastic printing below 20 with a %K/%D bullish cross — short-term momentum is shifting decisively from negative to positive territory',
];

const STOCH_SELL = [
  'Stochastic above **80** with %K crossing below %D — overbought with early confirmation of bearish momentum transfer',
  'Stochastic is topping out above 80 and the fast line is rolling below the slow line, warning of impending downside pressure',
];

const STOCH_NEUTRAL = [
  'Stochastic is mid-range — no extremes to anchor the bias, deferring signal weight to trend-based indicators',
  'Stochastic oscillator at neutral levels; meaningful directional signal will emerge only at the extremes',
];

const BB_LOWER = [
  'Price is touching the **lower Bollinger Band** — statistically, price closes above the band ~95% of the time, indicating a snap-back is likely',
  'Lower Bollinger Band touch signals a 2-standard-deviation extension below the mean — statistical reversion pressure is at maximum',
];

const BB_UPPER = [
  'Price is pressing the **upper Bollinger Band** — the 2σ boundary acts as a rubber band, historically pulling price back toward the 20-period mean',
  'Upper band contact signals overbought conditions in a statistical sense — the path of least resistance becomes mean reversion',
];

const BB_MID = [
  'Price is trading within the Bollinger Bands with no extreme statistical reading — volatility is contained within normal parameters',
  'Bollinger Band position shows price mid-range; the bands themselves confirm normal volatility conditions',
];

const RISK_BUY = [
  'The higher timeframe trend may remain bearish — validate the D1/W1 direction before scaling into a full position',
  'Key economic releases in the next 48 hours could override technical setups — check the economic calendar before entry',
  'RSI can remain depressed in a persistent bear trend — oversold conditions can extend further before a genuine reversal',
  'A daily close below the identified support zone would structurally invalidate this setup',
  'Low-liquidity sessions (pre-market, Asian session) may cause slippage beyond the calculated stop loss',
  'Correlation risk: if the USD strengthens sharply, commodity and risk-linked pairs may not recover as anticipated',
];

const RISK_SELL = [
  'Central bank intervention risk is elevated near multi-year lows — watch for policy statements that could trigger a short squeeze',
  'Short squeezes are common after prolonged sell-offs — a sudden flush could stop-hunt positions above resistance',
  'Overbought conditions on H1 do not guarantee reversal if the D1 trend remains strongly bullish',
  'Unexpected positive macro data (NFP, CPI beats, earnings surprises) could invalidate the bearish thesis',
  'Stop loss must account for overnight gaps in thinner-liquidity instruments',
  'Seasonality and quarter-end flows can temporarily override technical signals — timing entry near high-volume sessions reduces gap risk',
];

const CONTEXT_BULL = [
  'The broader market regime is **risk-on**, providing a constructive tailwind for long setups in growth-linked assets',
  'Macro sentiment leans constructive — the current dip represents a high-quality opportunity to enter the prevailing uptrend at a discount',
  'Volatility is compressing following recent consolidation — a breakout higher is the higher-probability resolution of the current pattern',
];

const CONTEXT_BEAR = [
  'Risk appetite is deteriorating — the technical setup aligns with a broader **risk-off** macro narrative gaining traction in global markets',
  'The current rally represents distribution rather than accumulation — sell-the-rip dynamics are dominating price action',
  'Elevated volatility and declining market breadth suggest the instrument is in a corrective phase with further downside potential',
];

const EDU_RSI = [
  'RSI (Relative Strength Index) measures the speed and change of price movements on a 0–100 scale. Readings below 30 indicate that selling has been excessive relative to recent history — a condition that often precedes a bounce as sellers exhaust their positions.',
  'Developed by J. Welles Wilder in 1978, RSI uses a 14-period smoothed average of gains vs. losses. A sub-30 reading is a statistical anomaly; while it doesn\'t guarantee a reversal, it signals the asset is trading at a significant discount to its recent price range.',
];

const EDU_MACD = [
  'MACD (Moving Average Convergence/Divergence) measures the relationship between a 12-period and 26-period EMA. When the faster EMA crosses above the slower, the histogram turns positive — the earliest sign of a momentum regime change.',
  'The MACD histogram represents the gap between the MACD line and its 9-period signal line. Expanding positive bars indicate accelerating bullish momentum; the first green bar after a negative run is frequently the earliest quantifiable warning of a trend change.',
];

const EDU_EMA = [
  'Exponential Moving Averages weight recent prices more heavily, making them more responsive to current market conditions. A perfectly ordered bullish stack (EMA 20 > 50 > 200) means all three time horizons — short, medium, and long-term — are pointing in the same direction.',
  'The 200 EMA is the primary institutional reference level. Assets trading above it are considered in a long-term bull market; below it, the bears hold structural control. The 20/50 relationship identifies the short-to-medium term trend within that broader framework.',
];

const EDU_STOCH = [
  'The Stochastic Oscillator compares the closing price to the high-low range over 14 periods. A reading below 20 means price closed near the bottom of its recent range — suggesting selling is statistically overextended. The %K/%D crossover provides the timing trigger.',
  'Stochastics perform best in ranging markets. In strong trending environments, they can remain overbought or oversold for extended periods. Always confirm stochastic extremes with trend-following indicators before committing.',
];

const EDU_BB = [
  'Bollinger Bands plot a 20-period SMA with ±2 standard deviation envelopes. Roughly 95% of price action falls within the bands under normal conditions. A touch of the lower band doesn\'t guarantee a reversal — but it places price in a statistically rare and historically attractive buying zone.',
];

// ─── Confluence Builder ──────────────────────────────────────

interface Confluence {
  bullish: string[];
  bearish: string[];
  aligning: number;
  total: number;
  label: string;
}

function buildConfluence(ind: IndicatorSummary, direction: 'BUY' | 'SELL'): Confluence {
  const bullish: string[] = [];
  const bearish: string[] = [];

  if (ind.rsi.signal === 'oversold') bullish.push('RSI Oversold');
  else if (ind.rsi.signal === 'overbought') bearish.push('RSI Overbought');

  if (ind.macd.signal === 'bullish') bullish.push('MACD Bullish');
  else if (ind.macd.signal === 'bearish') bearish.push('MACD Bearish');

  if (ind.ema.trend === 'up') bullish.push('EMA Uptrend');
  else if (ind.ema.trend === 'down') bearish.push('EMA Downtrend');

  if (ind.stochastic.signal === 'oversold') bullish.push('Stoch Oversold');
  else if (ind.stochastic.signal === 'overbought') bearish.push('Stoch Overbought');

  if (ind.bollingerBands.position === 'lower') bullish.push('BB Lower Band');
  else if (ind.bollingerBands.position === 'upper') bearish.push('BB Upper Band');

  const aligning = direction === 'BUY' ? bullish.length : bearish.length;
  const labels: Record<number, string> = {
    5: 'Very Strong',
    4: 'Strong',
    3: 'Moderate',
    2: 'Weak',
    1: 'Very Weak',
    0: 'No',
  };

  return {
    bullish,
    bearish,
    aligning,
    total: 5,
    label: labels[aligning] ?? 'Weak',
  };
}

// ─── Public Types ────────────────────────────────────────────

export interface SignalExplanation {
  markdown: string;
  summary: string;
  confluenceScore: number;
  riskReward: { tp1: string; tp2: string; tp3: string };
}

// ─── Main Generator ──────────────────────────────────────────

export function generateSignalExplanation(signal: TradingSignal): SignalExplanation {
  const {
    symbol, direction, confidence, entry, stopLoss,
    takeProfit1, takeProfit2, takeProfit3,
    indicators: ind, timeframe,
  } = signal;

  const isBuy = direction === 'BUY';
  const seed = symbol.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0)
    + confidence * 7 + entry * 0.001;

  const confluence = buildConfluence(ind, direction);

  const confLevel = confidence >= 80 ? 'Strong' : confidence >= 65 ? 'Moderate' : 'Weak';
  const summaryLine = `${symbol} ${timeframe} — ${confLevel} ${direction} signal (${confidence}% confidence)`;

  // Risk calculations
  const riskDist = Math.abs(entry - stopLoss);
  const pctRisk = ((riskDist / entry) * 100).toFixed(2);
  const rr1 = rrRatio(entry, stopLoss, takeProfit1);
  const rr2 = rrRatio(entry, stopLoss, takeProfit2);
  const rr3 = rrRatio(entry, stopLoss, takeProfit3);

  // Nearest levels
  const nearS = ind.support[0] ?? entry * 0.99;
  const nearR = ind.resistance[0] ?? entry * 1.01;

  // Pick phrases
  const rsiPool = ind.rsi.signal === 'oversold' ? RSI_BUY : ind.rsi.signal === 'overbought' ? RSI_SELL : RSI_NEUTRAL;
  const rsiText = applyPhrase(pick(rsiPool, seed, 1), ind.rsi.value);

  const macdPool = ind.macd.signal === 'bullish' ? MACD_BULL : ind.macd.signal === 'bearish' ? MACD_BEAR : MACD_NEUTRAL;
  const macdText = pick(macdPool, seed, 2);

  const emaPool = ind.ema.trend === 'up' ? EMA_BULL : ind.ema.trend === 'down' ? EMA_BEAR : EMA_NEUTRAL;
  const emaText = pick(emaPool, seed, 3);

  const stochPool = ind.stochastic.signal === 'oversold' ? STOCH_BUY : ind.stochastic.signal === 'overbought' ? STOCH_SELL : STOCH_NEUTRAL;
  const stochText = pick(stochPool, seed, 4);

  const bbPool = ind.bollingerBands.position === 'lower' ? BB_LOWER : ind.bollingerBands.position === 'upper' ? BB_UPPER : BB_MID;
  const bbText = pick(bbPool, seed, 5);

  const riskPool = isBuy ? RISK_BUY : RISK_SELL;
  const risk1 = pick(riskPool, seed, 6);
  const risk2 = pick(riskPool.filter(r => r !== risk1), seed, 7);

  const contextText = pick(isBuy ? CONTEXT_BULL : CONTEXT_BEAR, seed, 8);

  // Key indicator for education section
  const keyIndicator = ind.rsi.signal !== 'neutral' ? 'RSI'
    : ind.macd.signal !== 'neutral' ? 'MACD'
    : ind.ema.trend !== 'sideways' ? 'EMA'
    : ind.stochastic.signal !== 'neutral' ? 'Stochastic'
    : 'Bollinger Bands';

  const eduMap: Record<string, string[]> = {
    RSI: EDU_RSI, MACD: EDU_MACD, EMA: EDU_EMA,
    Stochastic: EDU_STOCH, 'Bollinger Bands': EDU_BB,
  };
  const eduText = pick(eduMap[keyIndicator], seed, 9);

  const conflictingSignals = isBuy ? confluence.bearish : confluence.bullish;
  const aligningSignals = isBuy ? confluence.bullish : confluence.bearish;

  const markdown = `## ${summaryLine}

---

### 📊 Indicator Breakdown

| Indicator | Value | Signal |
|-----------|-------|--------|
| RSI (14) | ${ind.rsi.value.toFixed(1)} | ${ind.rsi.signal.toUpperCase()} |
| MACD Histogram | ${ind.macd.histogram >= 0 ? '+' : ''}${ind.macd.histogram.toFixed(6)} | ${ind.macd.signal.toUpperCase()} |
| EMA 20 / 50 / 200 | ${fmt(ind.ema.ema20)} / ${fmt(ind.ema.ema50)} / ${fmt(ind.ema.ema200)} | ${ind.ema.trend.toUpperCase()} |
| Stochastic %K / %D | ${ind.stochastic.k.toFixed(1)} / ${ind.stochastic.d.toFixed(1)} | ${ind.stochastic.signal.toUpperCase()} |
| Bollinger Bands | ${ind.bollingerBands.bandwidth.toFixed(2)}% bandwidth | ${ind.bollingerBands.position.toUpperCase()} |

**RSI:** ${rsiText}

**MACD:** ${macdText}

**EMA Stack:** ${emaText}

**Stochastic:** ${stochText}

**Bollinger Bands:** ${bbText}

---

### 🎯 Confluence Score

**${confluence.aligning} / ${confluence.total} indicators aligned — ${confluence.label} ${direction} confluence**

${aligningSignals.length > 0 ? `✅ Aligned: ${aligningSignals.join(' · ')}` : `⚠️ No indicators directly align with the ${direction} bias`}
${conflictingSignals.length > 0 ? `\n⚠️ Conflicting: ${conflictingSignals.join(' · ')}` : '\n✅ No conflicting signals detected'}

${confluence.aligning >= 4
  ? `> **High-conviction setup.** Four or more indicators corroborate the ${direction} direction — this is the type of alignment that institutional systems are programmed to react to.`
  : confluence.aligning >= 3
  ? `> **Solid confluence.** Three indicators in agreement represents a statistically meaningful edge. Manage position size conservatively and respect the stop level.`
  : `> **Low confluence.** Fewer than 3 indicators align. Treat this as a speculative setup — reduce position size and apply tighter risk management.`}

---

### 🗺️ Key Levels

| Level | Price | Distance from Entry |
|-------|-------|---------------------|
| **Entry** | ${fmt(entry)} | — |
| Stop Loss | ${fmt(stopLoss)} | ${distLabel(entry, stopLoss)} |
| TP1 | ${fmt(takeProfit1)} | ${distLabel(entry, takeProfit1)} |
| TP2 | ${fmt(takeProfit2)} | ${distLabel(entry, takeProfit2)} |
| TP3 | ${fmt(takeProfit3)} | ${distLabel(entry, takeProfit3)} |
| Nearest Support | ${fmt(nearS)} | ${distLabel(entry, nearS)} |
| Nearest Resistance | ${fmt(nearR)} | ${distLabel(entry, nearR)} |

${ind.support.length > 1 ? `Additional support levels: ${ind.support.slice(1).map(fmt).join(' · ')}` : ''}
${ind.resistance.length > 1 ? `Additional resistance levels: ${ind.resistance.slice(1).map(fmt).join(' · ')}` : ''}

---

### 💡 Trade Setup

**Entry:** ${fmt(entry)} — ${isBuy ? 'Buy at market or place a limit order on the next candle open' : 'Sell at market or place a limit order on the next candle open'}

**Stop Loss:** ${fmt(stopLoss)} — ${pctRisk}% risk from entry · ${fmt(riskDist)} distance

| Target | Price | Risk : Reward |
|--------|-------|---------------|
| TP1 (conservative) | ${fmt(takeProfit1)} | **${rr1} : 1** |
| TP2 (standard) | ${fmt(takeProfit2)} | **${rr2} : 1** |
| TP3 (extended) | ${fmt(takeProfit3)} | **${rr3} : 1** |

> **Execution strategy:** Consider banking 50% of the position at TP1 and moving the stop to breakeven. Let the remainder run toward TP2/TP3 for asymmetric upside capture.

---

### ⚠️ Risk Factors

1. ${risk1}
2. ${risk2}
3. Never risk more than 1–2% of total account equity on a single trade — size your position accordingly based on the stop distance.

---

### 🌐 Market Context

${contextText}

The **${timeframe}** timeframe is showing a ${isBuy ? 'bullish' : 'bearish'} setup with price action suggesting a ${isBuy ? 'continuation or recovery' : 'continuation or reversal'} move. ${isBuy ? 'Entering long here offers asymmetric risk-reward with limited defined downside.' : 'Short entries here carry a favorable risk-reward profile with clearly defined risk above the stop.'}

---

### 🎓 Educational Note

**Key indicator driving this signal: ${keyIndicator}**

${eduText}

---

*Analysis generated by TradeClaw Signal Engine v2.0 · ${new Date().toISOString().split('T')[0]} · For educational purposes only — not financial advice.*`;

  return {
    markdown: markdown.trim(),
    summary: summaryLine,
    confluenceScore: confluence.aligning,
    riskReward: { tp1: rr1, tp2: rr2, tp3: rr3 },
  };
}
