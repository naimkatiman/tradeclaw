/**
 * Signal Explanation Engine — deterministic natural language reasoning
 * Generates deterministic markdown descriptions from technical indicator data.
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

function fmt(p: number | null | undefined): string {
  if (p == null) return '—';
  if (p >= 10000) return p.toFixed(2);
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

function rrRatio(entry: number, sl: number, tp: number | null | undefined): string {
  if (tp == null) return '—';
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk === 0) return '∞';
  return (reward / risk).toFixed(2);
}

function distLabel(entry: number, level: number | null | undefined): string {
  if (level == null) return '—';
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
  (v) => `RSI is **${v.toFixed(1)}**, which the configured rule classifies as oversold`,
  (v) => `The configured RSI threshold labels **${v.toFixed(1)}** as oversold; it does not predict a rebound`,
];

const RSI_SELL: PhraseOrFn[] = [
  (v) => `RSI is **${v.toFixed(1)}**, which the configured rule classifies as overbought`,
  (v) => `The configured RSI threshold labels **${v.toFixed(1)}** as overbought; it does not predict a decline`,
];

const RSI_NEUTRAL: PhraseOrFn[] = [
  (v) => `RSI is **${v.toFixed(1)}**, inside the configured neutral range`,
  (v) => `The configured RSI thresholds do not label **${v.toFixed(1)}** as overbought or oversold`,
];

const MACD_BULL = [
  'The current MACD rule is **bullish**; this describes the computed EMA relationship and does not establish future direction',
];

const MACD_BEAR = [
  'The current MACD rule is **bearish**; this describes the computed EMA relationship and does not establish future direction',
];

const MACD_NEUTRAL = [
  'The current MACD rule is neutral under the configured thresholds',
];

const EMA_BULL = [
  'The configured EMA ordering rule labels the current values as an uptrend',
];

const EMA_BEAR = [
  'The configured EMA ordering rule labels the current values as a downtrend',
];

const EMA_NEUTRAL = [
  'The EMA values do not meet the configured uptrend or downtrend ordering rule',
];

const STOCH_BUY = [
  'The configured Stochastic threshold labels the current reading as oversold; this is not a reversal forecast',
];

const STOCH_SELL = [
  'The configured Stochastic threshold labels the current reading as overbought; this is not a reversal forecast',
];

const STOCH_NEUTRAL = [
  'The Stochastic reading is inside the configured neutral range',
];

const BB_LOWER = [
  'The current price is in the configured lower-band region; band position alone does not imply a rebound',
];

const BB_UPPER = [
  'The current price is in the configured upper-band region; band position alone does not imply a decline',
];

const BB_MID = [
  'The current price is inside the configured middle-band region',
];

const RISK_BUY = [
  'The input contains candles and indicators, not news, order-book depth, spread, liquidity, or account constraints',
  'The displayed levels are outputs of a fixed model and are not observed broker fills or guaranteed executable prices',
  'Indicator thresholds can remain in the same state while price continues against the label',
];

const RISK_SELL = [
  'The input contains candles and indicators, not news, order-book depth, spread, liquidity, or account constraints',
  'The displayed levels are outputs of a fixed model and are not observed broker fills or guaranteed executable prices',
  'Indicator thresholds can remain in the same state while price continues against the label',
];

const CONTEXT_BULL = [
  'The engine assigned a BUY label from the displayed technical rules. It did not evaluate macro sentiment, portfolio exposure, or execution conditions.',
];

const CONTEXT_BEAR = [
  'The engine assigned a SELL label from the displayed technical rules. It did not evaluate macro sentiment, portfolio exposure, or execution conditions.',
];

const EDU_RSI = [
  'RSI maps smoothed recent gains and losses to a 0-100 oscillator. Threshold labels describe the lookback window; they do not measure fair value or reversal probability.',
];

const EDU_MACD = [
  'MACD derives values from exponential moving averages and a signal line. Its sign is a description of those lagging calculations, not a forecast.',
];

const EDU_EMA = [
  'Exponential moving averages weight recent closes more heavily. Ordering several EMA windows summarizes past price relationships; it does not prove a persistent trend.',
];

const EDU_STOCH = [
  'The Stochastic Oscillator locates a close within its recent high-low range. Overbought and oversold are threshold names, not probabilities.',
];

const EDU_BB = [
  'Bollinger Bands place volatility-scaled envelopes around a moving average. Market returns are not normally distributed, so a band touch is not a calibrated probability or trade instruction.',
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
  return {
    bullish,
    bearish,
    aligning,
    total: 5,
    label: `${aligning}-rule`,
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

  const summaryLine = `${symbol} ${timeframe} — ${direction} analytical label (${confidence}/100 rule score)`;

  // Risk calculations
  const riskDist = Math.abs(entry - stopLoss);
  const pctRisk = ((riskDist / entry) * 100).toFixed(2);
  const rr1 = rrRatio(entry, stopLoss, takeProfit1);
  const rr2 = rrRatio(entry, stopLoss, takeProfit2);
  const rr3 = rrRatio(entry, stopLoss, takeProfit3);

  // Nearest levels
  const nearS = ind.support[0] ?? null;
  const nearR = ind.resistance[0] ?? null;

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
  ? `> **High rule agreement.** Four or more configured indicators point in the ${direction} direction. Agreement is descriptive and does not establish predictive edge.`
  : confluence.aligning >= 3
  ? `> **Moderate rule agreement.** Three configured indicators point in the same direction. This is not evidence that the signal will be profitable.`
  : `> **Low rule agreement.** Fewer than three configured indicators align. The output remains an analytical label, not a trade instruction.`}

---

### 🗺️ Model Levels

| Level | Price | Distance from Entry |
|-------|-------|---------------------|
| **Reference price** | ${fmt(entry)} | — |
| Model invalidation | ${fmt(stopLoss)} | ${distLabel(entry, stopLoss)} |
| Model target 1 | ${fmt(takeProfit1)} | ${distLabel(entry, takeProfit1)} |
| Model target 2 | ${fmt(takeProfit2)} | ${distLabel(entry, takeProfit2)} |
| Model target 3 | ${fmt(takeProfit3)} | ${distLabel(entry, takeProfit3)} |
| Nearest Support | ${fmt(nearS)} | ${distLabel(entry, nearS)} |
| Nearest Resistance | ${fmt(nearR)} | ${distLabel(entry, nearR)} |

${ind.support.length > 1 ? `Additional support levels: ${ind.support.slice(1).map(fmt).join(' · ')}` : ''}
${ind.resistance.length > 1 ? `Additional resistance levels: ${ind.resistance.slice(1).map(fmt).join(' · ')}` : ''}

---

### 💡 Outcome Model

**Reference price:** ${fmt(entry)} — captured from the signal input, not a broker fill or order instruction

**Invalidation level:** ${fmt(stopLoss)} — ${pctRisk}% price distance · ${fmt(riskDist)} absolute distance

| Target | Price | Risk : Reward |
|--------|-------|---------------|
| Model target 1 | ${fmt(takeProfit1)} | **${rr1} : 1** |
| Model target 2 | ${fmt(takeProfit2)} | **${rr2} : 1** |
| Model target 3 | ${fmt(takeProfit3)} | **${rr3} : 1** |

> These unsized levels support a disclosed outcome study. They do not specify whether an order was executable or what a portfolio should hold.

---

### ⚠️ Risk Factors

1. ${risk1}
2. ${risk2}
3. No account, position size, fee, spread, slippage, or market-impact information is present in this explanation.

---

### 🌐 Scope Limits

${contextText}

The **${timeframe}** label reports the candle interval used by the rule engine. It does not establish continuation, reversal, favorable execution, or expected return.

---

### 🎓 Educational Note

**Key indicator driving this signal: ${keyIndicator}**

${eduText}

---

*Deterministic rule explanation generated ${new Date().toISOString().split('T')[0]}. It is not broker execution, portfolio performance, a calibrated probability, or financial advice.*`;

  return {
    markdown: markdown.trim(),
    summary: summaryLine,
    confluenceScore: confluence.aligning,
    riskReward: { tp1: rr1, tp2: rr2, tp3: rr3 },
  };
}
