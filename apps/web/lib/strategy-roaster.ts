export interface RoastResult {
  riskScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  edgeAssessment: 'Positive Edge' | 'Neutral' | 'Negative Edge';
  roastText: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary: string;
}

interface StrategyBlock {
  type: string;
  indicator?: string;
  operator?: string;
  value?: number | string;
}

interface ParsedStrategy {
  ifBlocks: StrategyBlock[];
  thenBlocks: StrategyBlock[];
  name?: string;
  description?: string;
  raw: string;
}

// Simple hash for seeding
function hashString(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
  }
  return Math.abs(hash);
}

// Seeded RNG
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function parseStrategy(input: string): ParsedStrategy {
  let obj: Record<string, unknown> | null = null;

  // Try JSON parse
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === 'object') {
      obj = parsed as Record<string, unknown>;
    }
  } catch {
    // Not JSON — treat as plain text
  }

  if (obj) {
    const ifBlocks = Array.isArray(obj.if) ? (obj.if as StrategyBlock[]) :
      Array.isArray(obj.conditions) ? (obj.conditions as StrategyBlock[]) : [];
    const thenBlocks = Array.isArray(obj.then) ? (obj.then as StrategyBlock[]) :
      Array.isArray(obj.actions) ? (obj.actions as StrategyBlock[]) : [];
    return {
      ifBlocks,
      thenBlocks,
      name: typeof obj.name === 'string' ? obj.name : undefined,
      description: typeof obj.description === 'string' ? obj.description : undefined,
      raw: input,
    };
  }

  // Plain text: extract hints
  const lower = input.toLowerCase();
  const ifBlocks: StrategyBlock[] = [];
  const thenBlocks: StrategyBlock[] = [];

  const indicators = ['rsi', 'macd', 'ema', 'sma', 'bollinger', 'stochastic', 'atr', 'vwap', 'obv'];
  for (const ind of indicators) {
    if (lower.includes(ind)) {
      ifBlocks.push({ type: 'condition', indicator: ind.toUpperCase() });
    }
  }

  if (lower.includes('buy') || lower.includes('long')) {
    thenBlocks.push({ type: 'action', indicator: 'BUY' });
  }
  if (lower.includes('sell') || lower.includes('short')) {
    thenBlocks.push({ type: 'action', indicator: 'SELL' });
  }

  return { ifBlocks, thenBlocks, raw: input };
}

function computeRiskScore(parsed: ParsedStrategy, rng: () => number): number {
  let score = 30; // baseline

  const { ifBlocks, thenBlocks, raw } = parsed;
  const lower = raw.toLowerCase();

  // Too many conditions = overfit
  if (ifBlocks.length === 0) score += 20; // no conditions = pure guess
  else if (ifBlocks.length === 1) score += 5; // single indicator = weak
  else if (ifBlocks.length >= 5) score += 15; // overfitted
  else score -= 5; // 2-4 conditions sweet spot

  // Check for RSI extreme thresholds
  const rsiValues = [...raw.matchAll(/rsi\D+(\d+)/gi)].map((m) => parseInt(m[1], 10));
  for (const v of rsiValues) {
    if (v <= 20 || v >= 80) score += 10; // extreme = chasing
    else if (v >= 25 && v <= 75) score -= 5; // moderate = safer
  }

  // No stop loss = dangerous
  if (!lower.includes('stop') && !lower.includes('sl') && !lower.includes('loss')) {
    score += 20;
  }

  // No take profit = leaving money on table
  if (!lower.includes('take profit') && !lower.includes('tp') && !lower.includes('target')) {
    score += 10;
  }

  // Conflicting directions
  const hasBuy = thenBlocks.some((b) => b.indicator === 'BUY') || lower.includes('buy');
  const hasSell = thenBlocks.some((b) => b.indicator === 'SELL') || lower.includes('sell');
  if (hasBuy && hasSell && ifBlocks.length < 3) score += 15;

  // Single indicator strategies
  const uniqueIndicators = new Set(ifBlocks.map((b) => b.indicator).filter(Boolean));
  if (uniqueIndicators.size === 1) score += 10;

  // High-frequency keywords
  if (lower.includes('scalp') || lower.includes('1m') || lower.includes('m1')) score += 15;
  if (lower.includes('martingale') || lower.includes('double down')) score += 25;

  // Good signals
  if (lower.includes('confluence')) score -= 10;
  if (lower.includes('multi') && lower.includes('timeframe')) score -= 10;
  if (uniqueIndicators.size >= 3) score -= 5;

  // Small random variance ±5
  score += Math.floor((rng() - 0.5) * 10);

  return Math.max(5, Math.min(95, score));
}

function gradeFromRisk(risk: number): RoastResult['grade'] {
  if (risk < 25) return 'A';
  if (risk < 40) return 'B';
  if (risk < 55) return 'C';
  if (risk < 70) return 'D';
  return 'F';
}

function edgeFromRisk(risk: number, rng: () => number): RoastResult['edgeAssessment'] {
  const roll = rng();
  if (risk < 30) return roll < 0.7 ? 'Positive Edge' : 'Neutral';
  if (risk < 55) return roll < 0.4 ? 'Positive Edge' : roll < 0.7 ? 'Neutral' : 'Negative Edge';
  return roll < 0.2 ? 'Neutral' : 'Negative Edge';
}

const ROAST_OPENERS = [
  "Okay, I've seen worse. But not by much.",
  "Bold strategy. Let's see if the market agrees.",
  "This strategy has the confidence of a beginner and the complexity of a professional. Unfortunately, those don't mix.",
  "Ah yes, the classic 'I watched 3 YouTube videos and now I trade' setup.",
  "I admire the ambition. The execution, less so.",
  "Your strategy is like a diet — sounds good in theory, brutal in practice.",
  "Let's be honest: the market has eaten strategies like this for breakfast.",
  "This is either genius or a lesson in progress. Probably the latter.",
  "You asked for brutal honesty. Buckle up.",
  "I've reviewed 1000 strategies. This one is... memorable.",
];

const ROAST_MIDDLES_HIGH_RISK = [
  "The lack of a stop loss here is basically handing the market your wallet and walking away.",
  "Trading without a stop loss is like skydiving without a parachute — you feel free until you don't.",
  "Without defined risk management, this is less of a strategy and more of a prayer.",
  "Single-indicator strategies are like judging a book by its cover — occasionally right, usually wrong.",
  "Chasing RSI extremes is a great way to learn expensive lessons.",
];

const ROAST_MIDDLES_LOW_RISK = [
  "There's actually some solid structure here. The risk framework shows real thought.",
  "Multi-indicator confluence is the right move — you're thinking about this correctly.",
  "The risk management setup here is notably better than 80% of what I see.",
  "You've clearly done your homework on indicator confluence. That matters.",
];

const ROAST_CLOSERS = [
  "The market is a ruthless teacher. Let's make sure you graduate.",
  "Every legend started with a bad strategy. Keep iterating.",
  "Paper trade this first. Seriously.",
  "The fact that you're seeking feedback puts you ahead of most traders.",
  "Risk management is the only edge that survives long term. Build that first.",
];

function buildRoastText(riskScore: number, parsed: ParsedStrategy, rng: () => number): string {
  const opener = pick(ROAST_OPENERS, rng);
  const middle = riskScore >= 50
    ? pick(ROAST_MIDDLES_HIGH_RISK, rng)
    : pick(ROAST_MIDDLES_LOW_RISK, rng);
  const closer = pick(ROAST_CLOSERS, rng);

  const lower = parsed.raw.toLowerCase();
  let specific = '';
  if (lower.includes('martingale')) {
    specific = 'Martingale-style doubling is statistically guaranteed to blow up eventually — the math is not on your side. ';
  } else if (lower.includes('scalp')) {
    specific = 'Scalping sounds fast and exciting, but transaction costs and slippage will eat your edge before the market does. ';
  } else if (parsed.ifBlocks.length === 0) {
    specific = 'No defined entry conditions means you\'re essentially trading on feel. Markets don\'t care about feelings. ';
  }

  return `${opener} ${specific}${middle} ${closer}`;
}

function buildStrengths(parsed: ParsedStrategy, riskScore: number): string[] {
  const strengths: string[] = [];
  const lower = parsed.raw.toLowerCase();
  const uniqueIndicators = new Set(parsed.ifBlocks.map((b) => b.indicator).filter(Boolean));

  if (uniqueIndicators.size >= 3) strengths.push('Uses multiple indicators for confluence — reduces false signals');
  if (lower.includes('stop') || lower.includes('sl')) strengths.push('Includes stop loss — critical for capital preservation');
  if (lower.includes('take profit') || lower.includes('tp')) strengths.push('Has a take profit target — defines your exit before entering');
  if (lower.includes('multi') && lower.includes('timeframe')) strengths.push('Multi-timeframe analysis reduces noise and improves signal quality');
  if (lower.includes('trend') || lower.includes('ema') || lower.includes('sma')) strengths.push('Trend-following component — aligns with the market direction');
  if (lower.includes('volume')) strengths.push('Volume confirmation helps validate signal strength');
  if (riskScore < 40) strengths.push('Overall risk structure is sound — this can be backtested meaningfully');
  if (parsed.ifBlocks.length >= 2 && parsed.ifBlocks.length <= 4) strengths.push('Condition count in the optimal range — not over-fitted');

  if (strengths.length === 0) {
    strengths.push('You wrote down a strategy — that alone puts you ahead of most traders');
  }

  return strengths.slice(0, 4);
}

function buildWeaknesses(parsed: ParsedStrategy, riskScore: number): string[] {
  const weaknesses: string[] = [];
  const lower = parsed.raw.toLowerCase();

  if (!lower.includes('stop') && !lower.includes('sl')) {
    weaknesses.push('No stop loss defined — a single bad trade can wipe out weeks of gains');
  }
  if (!lower.includes('take profit') && !lower.includes('tp')) {
    weaknesses.push('No take profit — you\'ll never know when to exit a winning trade');
  }
  if (parsed.ifBlocks.length === 0) {
    weaknesses.push('No entry conditions — without clear signals, this is discretionary guessing');
  }
  if (parsed.ifBlocks.length === 1) {
    weaknesses.push('Single indicator strategy — easily fooled by noise and false signals');
  }
  if (parsed.ifBlocks.length >= 6) {
    weaknesses.push('Too many conditions — this will rarely trigger, and when it does, may be curve-fitted to past data');
  }
  const rsiValues = [...lower.matchAll(/rsi\D+(\d+)/g)].map((m) => parseInt(m[1], 10));
  if (rsiValues.some((v) => v <= 20 || v >= 80)) {
    weaknesses.push('Extreme RSI thresholds (≤20 or ≥80) rarely trigger and often signal continued momentum, not reversal');
  }
  if (lower.includes('martingale')) {
    weaknesses.push('Martingale position sizing has a theoretical 100% ruin probability given unlimited time');
  }
  if (lower.includes('scalp') || lower.includes('1m')) {
    weaknesses.push('Short-timeframe scalping has high transaction costs and is difficult to execute consistently');
  }
  if (riskScore >= 60) {
    weaknesses.push('High overall risk score — this strategy needs significant refinement before live trading');
  }

  if (weaknesses.length === 0) {
    weaknesses.push('Minor: document your position sizing rules to make this fully systematic');
  }

  return weaknesses.slice(0, 4);
}

function buildSuggestions(parsed: ParsedStrategy): string[] {
  const suggestions: string[] = [];
  const lower = parsed.raw.toLowerCase();

  suggestions.push('Backtest this strategy on at least 6 months of data before trading live');

  if (!lower.includes('stop')) {
    suggestions.push('Add a stop loss at ATR×1.5 below entry — this single change improves Sharpe dramatically');
  }
  if (!lower.includes('volume')) {
    suggestions.push('Add volume confirmation: require above-average volume to validate breakout entries');
  }
  if (parsed.ifBlocks.length <= 1) {
    suggestions.push('Add a trend filter: only take signals when price is above/below the 200 EMA');
  }
  if (!lower.includes('multi') && !lower.includes('timeframe')) {
    suggestions.push('Confirm signals on a higher timeframe (H4 or D1) before executing on H1');
  }
  if (lower.includes('rsi') && !lower.includes('macd')) {
    suggestions.push('Combine RSI with MACD for better momentum confirmation — reduces whipsaws by ~30%');
  }
  suggestions.push('Paper trade for 2-4 weeks to validate signal frequency and win rate before risking capital');
  suggestions.push('Track every signal in a journal: entry, exit, reason, outcome — patterns emerge fast');

  return suggestions.slice(0, 4);
}

export function roastStrategy(input: string): RoastResult {
  const seed = hashString(input.trim());
  const rng = seededRandom(seed);

  const parsed = parseStrategy(input);
  const riskScore = computeRiskScore(parsed, rng);
  const grade = gradeFromRisk(riskScore);
  const edgeAssessment = edgeFromRisk(riskScore, rng);
  const roastText = buildRoastText(riskScore, parsed, rng);
  const strengths = buildStrengths(parsed, riskScore);
  const weaknesses = buildWeaknesses(parsed, riskScore);
  const suggestions = buildSuggestions(parsed);

  const summaryMap: Record<RoastResult['grade'], string> = {
    A: 'Solid strategy with good risk management. Backtest and refine.',
    B: 'Above average with some gaps. Address weaknesses before going live.',
    C: 'Average risk profile. Significant improvements needed.',
    D: 'High risk. Major structural issues need fixing first.',
    F: 'Do not trade this live. Rebuild from scratch with risk management as the foundation.',
  };

  return {
    riskScore,
    grade,
    edgeAssessment,
    roastText,
    strengths,
    weaknesses,
    suggestions,
    summary: summaryMap[grade],
  };
}

export const PRESET_STRATEGIES = [
  {
    label: 'RSI Oversold Bounce',
    value: JSON.stringify({
      name: 'RSI Oversold Bounce',
      if: [{ type: 'condition', indicator: 'RSI', operator: '<', value: 30 }],
      then: [{ type: 'action', indicator: 'BUY' }],
    }, null, 2),
  },
  {
    label: 'MACD Crossover + EMA Trend',
    value: JSON.stringify({
      name: 'MACD Crossover + EMA Trend',
      if: [
        { type: 'condition', indicator: 'MACD', operator: 'crosses_above', value: 'signal' },
        { type: 'condition', indicator: 'EMA', operator: 'price_above', value: 50 },
      ],
      then: [{ type: 'action', indicator: 'BUY' }],
      stopLoss: 'ATR×1.5',
      takeProfit: 'ATR×3',
    }, null, 2),
  },
  {
    label: 'RSI + Bollinger Reversal',
    value: JSON.stringify({
      name: 'RSI + Bollinger Reversal',
      if: [
        { type: 'condition', indicator: 'RSI', operator: '<', value: 25 },
        { type: 'condition', indicator: 'BOLLINGER', operator: 'price_below', value: 'lower_band' },
        { type: 'condition', indicator: 'STOCHASTIC', operator: '<', value: 20 },
      ],
      then: [{ type: 'action', indicator: 'BUY' }],
      stopLoss: '2% below entry',
    }, null, 2),
  },
  {
    label: 'Martingale RSI (Risky!)',
    value: JSON.stringify({
      name: 'Martingale RSI',
      if: [{ type: 'condition', indicator: 'RSI', operator: '<', value: 20 }],
      then: [{ type: 'action', indicator: 'BUY' }],
      positionSizing: 'martingale double-down on loss',
    }, null, 2),
  },
  {
    label: 'Multi-TF Confluence (Best Practice)',
    value: JSON.stringify({
      name: 'Multi-TF Confluence',
      if: [
        { type: 'condition', indicator: 'EMA', operator: 'price_above', value: 200 },
        { type: 'condition', indicator: 'MACD', operator: 'crosses_above', value: 'signal' },
        { type: 'condition', indicator: 'RSI', operator: '>', value: 50 },
        { type: 'condition', indicator: 'VOLUME', operator: 'above_average', value: '20bar' },
      ],
      then: [{ type: 'action', indicator: 'BUY' }],
      stopLoss: 'swing_low',
      takeProfit: '2R',
      timeframe: 'H4 signal confirmed on D1 trend',
    }, null, 2),
  },
];
