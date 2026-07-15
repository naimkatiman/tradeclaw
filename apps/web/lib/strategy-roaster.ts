export interface RoastResult {
  riskScore: number; // Deterministic text-heuristic score, not measured market risk.
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  edgeAssessment: 'Not measured';
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

function computeRiskScore(parsed: ParsedStrategy): number {
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

  return Math.max(5, Math.min(95, score));
}

function gradeFromRisk(risk: number): RoastResult['grade'] {
  if (risk < 25) return 'A';
  if (risk < 40) return 'B';
  if (risk < 55) return 'C';
  if (risk < 70) return 'D';
  return 'F';
}

const ROAST_OPENERS = [
  'Here is the deterministic parser\'s blunt reading.',
  'This is a text-structure review, not a backtest.',
  'The parser can flag missing rules; it cannot judge profitability.',
];

const ROAST_MIDDLES_HIGH_RISK = [
  'The heuristic found several structural risk flags that need explicit rules and independent testing.',
  'Important assumptions appear absent from the submitted text.',
];

const ROAST_MIDDLES_LOW_RISK = [
  'The heuristic found fewer structural flags, but no market behavior was tested.',
  'Several rule categories were present in the text; their effectiveness remains unmeasured.',
];

const ROAST_CLOSERS = [
  'Document the assumptions and test them on reproducible data.',
  'Treat every suggestion as a hypothesis to test, not an improvement claim.',
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
    specific = 'Martingale-style doubling can compound losses and requires explicit capital and stopping constraints. ';
  } else if (lower.includes('scalp')) {
    specific = 'Short-horizon rules can be sensitive to fees, spread, slippage, latency, and fill assumptions. ';
  } else if (parsed.ifBlocks.length === 0) {
    specific = 'The parser did not find a defined entry condition in the submitted text. ';
  }

  return `${opener} ${specific}${middle} ${closer}`;
}

function buildStrengths(parsed: ParsedStrategy, riskScore: number): string[] {
  const strengths: string[] = [];
  const lower = parsed.raw.toLowerCase();
  const uniqueIndicators = new Set(parsed.ifBlocks.map((b) => b.indicator).filter(Boolean));

  if (uniqueIndicators.size >= 3) strengths.push('The text names multiple indicator conditions');
  if (lower.includes('stop') || lower.includes('sl')) strengths.push('The text mentions a stop or loss rule');
  if (lower.includes('take profit') || lower.includes('tp')) strengths.push('The text mentions a target or take-profit rule');
  if (lower.includes('multi') && lower.includes('timeframe')) strengths.push('The text mentions multiple timeframes');
  if (lower.includes('trend') || lower.includes('ema') || lower.includes('sma')) strengths.push('The text includes a trend or moving-average condition');
  if (lower.includes('volume')) strengths.push('The text includes a volume condition');
  if (riskScore < 40) strengths.push('The text heuristic found fewer missing-rule flags');
  if (parsed.ifBlocks.length >= 2 && parsed.ifBlocks.length <= 4) strengths.push(`The parser found ${parsed.ifBlocks.length} condition blocks`);

  if (strengths.length === 0) {
    strengths.push('The strategy was supplied in a form the parser could inspect');
  }

  return strengths.slice(0, 4);
}

function buildWeaknesses(parsed: ParsedStrategy, riskScore: number): string[] {
  const weaknesses: string[] = [];
  const lower = parsed.raw.toLowerCase();

  if (!lower.includes('stop') && !lower.includes('sl')) {
    weaknesses.push('No stop or loss rule was detected in the submitted text');
  }
  if (!lower.includes('take profit') && !lower.includes('tp')) {
    weaknesses.push('No target or take-profit rule was detected in the submitted text');
  }
  if (parsed.ifBlocks.length === 0) {
    weaknesses.push('No structured entry condition was detected');
  }
  if (parsed.ifBlocks.length === 1) {
    weaknesses.push('Only one indicator condition was detected; its standalone behavior is unmeasured');
  }
  if (parsed.ifBlocks.length >= 6) {
    weaknesses.push('Six or more conditions were detected; measure trigger frequency and overfitting risk out of sample');
  }
  const rsiValues = [...lower.matchAll(/rsi\D+(\d+)/g)].map((m) => parseInt(m[1], 10));
  if (rsiValues.some((v) => v <= 20 || v >= 80)) {
    weaknesses.push('An extreme RSI threshold was detected; its frequency and outcome behavior must be measured');
  }
  if (lower.includes('martingale')) {
    weaknesses.push('Martingale sizing can compound losses rapidly and requires explicit capital and stopping constraints');
  }
  if (lower.includes('scalp') || lower.includes('1m')) {
    weaknesses.push('Short-timeframe execution is sensitive to transaction-cost and fill assumptions');
  }
  if (riskScore >= 60) {
    weaknesses.push('The illustrative rule-based risk score is high; validate assumptions independently before any use');
  }

  if (weaknesses.length === 0) {
    weaknesses.push('Document position sizing, cost, data, and fill assumptions before evaluation');
  }

  return weaknesses.slice(0, 4);
}

function buildSuggestions(parsed: ParsedStrategy): string[] {
  const suggestions: string[] = [];
  const lower = parsed.raw.toLowerCase();

  suggestions.push('Test this strategy across multiple market regimes and document data, cost, and fill assumptions');

  if (!lower.includes('stop')) {
    suggestions.push('Define and test a stop rule; an ATR-based threshold is one hypothesis, not a guaranteed improvement');
  }
  if (!lower.includes('volume')) {
    suggestions.push('Test whether a documented volume filter changes out-of-sample results after costs');
  }
  if (parsed.ifBlocks.length <= 1) {
    suggestions.push('Test a documented trend filter, such as price relative to EMA 200, out of sample');
  }
  if (!lower.includes('multi') && !lower.includes('timeframe')) {
    suggestions.push('Test whether an H4 or D1 confirmation rule changes out-of-sample results');
  }
  if (lower.includes('rsi') && !lower.includes('macd')) {
    suggestions.push('Test an additional momentum condition such as MACD; no reduction in whipsaws is assumed');
  }
  suggestions.push('Use an adequately sized forward paper study before considering real capital');
  suggestions.push('Track signal rules, timestamps, outcomes, and costs so claims can be reproduced');

  return suggestions.slice(0, 4);
}

export function roastStrategy(input: string): RoastResult {
  const seed = hashString(input.trim());
  const rng = seededRandom(seed);

  const parsed = parseStrategy(input);
  const riskScore = computeRiskScore(parsed);
  const grade = gradeFromRisk(riskScore);
  const edgeAssessment = 'Not measured' as const;
  const roastText = buildRoastText(riskScore, parsed, rng);
  const strengths = buildStrengths(parsed, riskScore);
  const weaknesses = buildWeaknesses(parsed, riskScore);
  const suggestions = buildSuggestions(parsed);

  const summaryMap: Record<RoastResult['grade'], string> = {
    A: 'Few text-heuristic flags. Market edge and actual risk remain unmeasured.',
    B: 'Some text-heuristic flags. Market edge and actual risk remain unmeasured.',
    C: 'Several text-heuristic flags. Market edge and actual risk remain unmeasured.',
    D: 'Many text-heuristic flags. Market edge and actual risk remain unmeasured.',
    F: 'Severe text-heuristic flags. Market edge and actual risk remain unmeasured.',
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
