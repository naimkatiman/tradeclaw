// Pine Script v4/v5 → TradeClaw Strategy JSON parser

type ConditionType = 'RSI' | 'MACD' | 'EMA_CROSS' | 'BB' | 'STOCH' | 'PRICE_ACTION';
type ActionType = 'ENTRY_LONG' | 'ENTRY_SHORT' | 'EXIT' | 'ALERT';
type Operator = '>' | '<' | '>=' | '<=' | 'crosses_above' | 'crosses_below';

interface StrategyBlock {
  id: string;
  type: 'IF' | 'AND' | 'OR' | 'THEN';
  condition?: {
    indicator: ConditionType;
    operator: Operator;
    value: number;
  };
  action?: {
    type: ActionType;
    param?: number;
  };
}

interface Strategy {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  blocks: StrategyBlock[];
}

export interface PineParseResult {
  strategy: Strategy;
  detected: {
    indicators: string[];
    conditions: string[];
    direction: string;
  };
  warnings: string[];
  unsupported: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────

let blockCounter = 0;
function uid(): string {
  blockCounter++;
  return `blk_${Date.now().toString(36)}_${blockCounter}`;
}

function stripComments(src: string): string {
  // Remove single-line comments
  let result = src.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  return result;
}

// Map of Pine variable names → indicator info
interface VarInfo {
  indicator: ConditionType;
  label: string;
  period?: number;
}

const INDICATOR_PATTERNS: {
  regex: RegExp;
  indicator: ConditionType;
  label: (m: RegExpMatchArray) => string;
  period: (m: RegExpMatchArray) => number | undefined;
}[] = [
  {
    regex: /(?:ta\.)?rsi\(\s*\w+\s*,\s*(\d+)\s*\)/,
    indicator: 'RSI',
    label: (m) => `RSI(${m[1]})`,
    period: (m) => parseInt(m[1], 10),
  },
  {
    regex: /(?:ta\.)?ema\(\s*\w+\s*,\s*(\d+)\s*\)/,
    indicator: 'EMA_CROSS',
    label: (m) => `EMA(${m[1]})`,
    period: (m) => parseInt(m[1], 10),
  },
  {
    regex: /(?:ta\.)?sma\(\s*\w+\s*,\s*(\d+)\s*\)/,
    indicator: 'EMA_CROSS',
    label: (m) => `SMA(${m[1]})`,
    period: (m) => parseInt(m[1], 10),
  },
  {
    regex: /(?:ta\.)?macd\(\s*\w+\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/,
    indicator: 'MACD',
    label: (m) => `MACD(${m[1]},${m[2]},${m[3]})`,
    period: () => undefined,
  },
  {
    regex: /(?:ta\.)?bb\(\s*\w+\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/,
    indicator: 'BB',
    label: (m) => `BB(${m[1]},${m[2]})`,
    period: (m) => parseInt(m[1], 10),
  },
  {
    regex: /(?:ta\.)?stoch\(\s*\w+\s*,\s*\w+\s*,\s*\w+\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/,
    indicator: 'STOCH',
    label: (m) => `Stoch(${m[1]},${m[2]},${m[3]})`,
    period: (m) => parseInt(m[1], 10),
  },
];

// ── Main parser ────────────────────────────────────────────────────────

export function parsePineScript(script: string): PineParseResult {
  blockCounter = 0;
  const warnings: string[] = [];
  const unsupported: string[] = [];
  const indicators: string[] = [];
  const conditions: string[] = [];
  const blocks: StrategyBlock[] = [];
  const varMap = new Map<string, VarInfo>();

  if (!script || !script.trim()) {
    return {
      strategy: { id: uid(), name: 'Untitled Strategy', symbol: 'BTCUSD', timeframe: 'H1', blocks: [] },
      detected: { indicators: [], conditions: [], direction: 'none' },
      warnings: ['Empty script provided'],
      unsupported: [],
    };
  }

  const clean = stripComments(script);
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

  // ── Extract strategy name ──
  let strategyName = 'Imported Pine Strategy';
  const titleMatch = clean.match(/strategy\(\s*["']([^"']+)["']/);
  if (titleMatch) {
    strategyName = titleMatch[1];
  } else {
    const indicatorTitle = clean.match(/indicator\(\s*["']([^"']+)["']/);
    if (indicatorTitle) {
      strategyName = indicatorTitle[1];
    }
  }

  // ── Extract variables & indicators ──
  for (const line of lines) {
    // Variable assignments: varName = ta.indicator(...)
    const assignMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (!assignMatch) continue;

    const varName = assignMatch[1];
    const rhs = assignMatch[2];

    for (const pat of INDICATOR_PATTERNS) {
      const m = rhs.match(pat.regex);
      if (m) {
        const label = pat.label(m);
        if (!indicators.includes(label)) indicators.push(label);
        varMap.set(varName, { indicator: pat.indicator, label, period: pat.period(m) });
        break;
      }
    }

    // Destructured MACD: [macdLine, signalLine, hist] = ta.macd(...)
    const destructMatch = line.match(/^\[(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\]\s*=\s*(.+)$/);
    if (destructMatch) {
      const rhs2 = destructMatch[4];
      const macdMatch = rhs2.match(/(?:ta\.)?macd\(\s*\w+\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (macdMatch) {
        const label = `MACD(${macdMatch[1]},${macdMatch[2]},${macdMatch[3]})`;
        if (!indicators.includes(label)) indicators.push(label);
        varMap.set(destructMatch[1], { indicator: 'MACD', label, period: undefined });
        varMap.set(destructMatch[2], { indicator: 'MACD', label, period: undefined });
        varMap.set(destructMatch[3], { indicator: 'MACD', label, period: undefined });
      }
    }
  }

  // Also scan globally for indicators not assigned to named variables
  for (const pat of INDICATOR_PATTERNS) {
    const globalRegex = new RegExp(pat.regex.source, 'g');
    let gm;
    while ((gm = globalRegex.exec(clean)) !== null) {
      const label = pat.label(gm);
      if (!indicators.includes(label)) indicators.push(label);
    }
  }

  // ── Extract conditions (crossover, crossunder, comparisons) ──
  const crossoverRegex = /(?:ta\.)?crossover\(\s*(\w+)\s*,\s*(\w+)\s*\)/g;
  const crossunderRegex = /(?:ta\.)?crossunder\(\s*(\w+)\s*,\s*(\w+)\s*\)/g;
  const comparisonRegex = /(\w+)\s*(>=|<=|>|<|==)\s*([0-9.]+)/g;

  let cm;
  while ((cm = crossoverRegex.exec(clean)) !== null) {
    const left = varMap.get(cm[1]);
    const right = varMap.get(cm[2]);
    const leftLabel = left?.label ?? cm[1];
    const rightLabel = right?.label ?? cm[2];
    const condStr = `${leftLabel} crosses above ${rightLabel}`;
    conditions.push(condStr);

    const indicator = left?.indicator ?? right?.indicator ?? 'EMA_CROSS';
    blocks.push({
      id: uid(),
      type: blocks.length === 0 ? 'IF' : 'AND',
      condition: { indicator, operator: 'crosses_above', value: right?.period ?? 0 },
    });
  }

  while ((cm = crossunderRegex.exec(clean)) !== null) {
    const left = varMap.get(cm[1]);
    const right = varMap.get(cm[2]);
    const leftLabel = left?.label ?? cm[1];
    const rightLabel = right?.label ?? cm[2];
    const condStr = `${leftLabel} crosses below ${rightLabel}`;
    conditions.push(condStr);

    const indicator = left?.indicator ?? right?.indicator ?? 'EMA_CROSS';
    blocks.push({
      id: uid(),
      type: blocks.length === 0 ? 'IF' : 'AND',
      condition: { indicator, operator: 'crosses_below', value: right?.period ?? 0 },
    });
  }

  while ((cm = comparisonRegex.exec(clean)) !== null) {
    const varInfo = varMap.get(cm[1]);
    if (!varInfo) continue;
    const op = cm[2] as '>' | '<' | '>=' | '<=';
    const val = parseFloat(cm[3]);
    const condStr = `${varInfo.label} ${op} ${val}`;
    if (!conditions.includes(condStr)) {
      conditions.push(condStr);
      blocks.push({
        id: uid(),
        type: blocks.length === 0 ? 'IF' : 'AND',
        condition: { indicator: varInfo.indicator, operator: op, value: val },
      });
    }
  }

  // ── Detect direction from strategy.entry / strategy.exit / alertcondition ──
  let direction = 'none';
  const entryLongRegex = /strategy\.entry\(\s*["'][^"']*["']\s*,\s*(?:strategy\.long|["']long["']|["']Long["'])/gi;
  const entryShortRegex = /strategy\.entry\(\s*["'][^"']*["']\s*,\s*(?:strategy\.short|["']short["']|["']Short["'])/gi;
  const exitRegex = /strategy\.(?:exit|close)\s*\(/g;
  const alertRegex = /alertcondition\s*\(/g;

  const hasLong = entryLongRegex.test(clean);
  const hasShort = entryShortRegex.test(clean);
  const hasExit = exitRegex.test(clean);
  const hasAlert = alertRegex.test(clean);

  if (hasLong && hasShort) direction = 'both';
  else if (hasLong) direction = 'long';
  else if (hasShort) direction = 'short';
  else if (hasAlert) direction = 'alert';

  // Add action blocks
  if (hasLong) {
    blocks.push({ id: uid(), type: 'THEN', action: { type: 'ENTRY_LONG' } });
  }
  if (hasShort) {
    blocks.push({ id: uid(), type: 'THEN', action: { type: 'ENTRY_SHORT' } });
  }
  if (hasExit) {
    blocks.push({ id: uid(), type: 'THEN', action: { type: 'EXIT' } });
  }
  if (hasAlert && !hasLong && !hasShort) {
    blocks.push({ id: uid(), type: 'THEN', action: { type: 'ALERT' } });
  }

  // If no conditions were found but indicators were, add a generic IF block
  if (blocks.filter((b) => b.type !== 'THEN').length === 0 && indicators.length > 0) {
    const firstVar = Array.from(varMap.values())[0];
    if (firstVar) {
      blocks.unshift({
        id: uid(),
        type: 'IF',
        condition: { indicator: firstVar.indicator, operator: '>', value: 0 },
      });
      warnings.push('Could not parse specific conditions — added placeholder IF block');
    }
  }

  // If no THEN blocks, add a default
  if (blocks.filter((b) => b.type === 'THEN').length === 0 && blocks.length > 0) {
    blocks.push({ id: uid(), type: 'THEN', action: { type: 'ALERT' } });
    warnings.push('No strategy.entry/exit found — defaulting to ALERT action');
  }

  // ── Detect unsupported constructs ──
  if (/security\s*\(/.test(clean)) unsupported.push('security() — multi-timeframe not supported');
  if (/request\.security\s*\(/.test(clean)) unsupported.push('request.security() — multi-timeframe not supported');
  if (/plot\s*\(/.test(clean)) warnings.push('plot() calls detected — visual only, skipped');
  if (/input\s*\(/.test(clean) || /input\.\w+\s*\(/.test(clean)) warnings.push('input() parameters detected — using hardcoded values');
  if (/strategy\.risk/.test(clean)) unsupported.push('strategy.risk — risk management not mapped');
  if (/for\s+/.test(clean)) warnings.push('Loop detected — complex logic may not be fully captured');
  if (/f_\w+\s*\(/.test(clean) || /\w+\(\s*\w+\s*\)\s*=>/.test(clean)) unsupported.push('Custom functions detected — only built-in ta.* functions are supported');

  const strategy: Strategy = {
    id: `pine_${Date.now().toString(36)}`,
    name: strategyName,
    symbol: 'BTCUSD',
    timeframe: 'H1',
    blocks,
  };

  return { strategy, detected: { indicators, conditions, direction }, warnings, unsupported };
}

// ── Preset Pine Scripts ────────────────────────────────────────────────

export const PINE_PRESETS: { label: string; code: string }[] = [
  {
    label: 'RSI Strategy',
    code: `//@version=5
strategy("RSI Oversold/Overbought", overlay=false)

length = input.int(14, "RSI Length")
overbought = input.int(70, "Overbought Level")
oversold = input.int(30, "Oversold Level")

myRsi = ta.rsi(close, 14)

if myRsi < 30
    strategy.entry("Long", strategy.long)

if myRsi > 70
    strategy.entry("Short", strategy.short)

strategy.exit("Exit Long", "Long", profit=200, loss=100)
strategy.exit("Exit Short", "Short", profit=200, loss=100)`,
  },
  {
    label: 'EMA Cross',
    code: `//@version=5
strategy("EMA 9/21 Crossover", overlay=true)

emaFast = ta.ema(close, 9)
emaSlow = ta.ema(close, 21)

longCondition = ta.crossover(emaFast, emaSlow)
shortCondition = ta.crossunder(emaFast, emaSlow)

if longCondition
    strategy.entry("Long", strategy.long)

if shortCondition
    strategy.entry("Short", strategy.short)`,
  },
  {
    label: 'MACD',
    code: `//@version=5
strategy("MACD Zero Cross", overlay=false)

[macdLine, signalLine, hist] = ta.macd(close, 12, 26, 9)

longCondition = ta.crossover(macdLine, signalLine)
shortCondition = ta.crossunder(macdLine, signalLine)

if longCondition
    strategy.entry("Buy", strategy.long)

if shortCondition
    strategy.entry("Sell", strategy.short)

strategy.exit("Exit Buy", "Buy", profit=150, loss=75)`,
  },
  {
    label: 'Bollinger',
    code: `//@version=5
strategy("Bollinger Band Bounce", overlay=true)

[middle, upper, lower] = ta.bb(close, 20, 2.0)
myRsi = ta.rsi(close, 14)

longCondition = close < lower
shortCondition = close > upper

if longCondition
    strategy.entry("BB Long", strategy.long)

if shortCondition
    strategy.entry("BB Short", strategy.short)`,
  },
  {
    label: 'Custom',
    code: `//@version=5
strategy("Multi-Indicator Strategy", overlay=false)

myRsi = ta.rsi(close, 14)
emaFast = ta.ema(close, 9)
emaSlow = ta.ema(close, 21)
[macdLine, signalLine, hist] = ta.macd(close, 12, 26, 9)

emaCross = ta.crossover(emaFast, emaSlow)

if emaCross and myRsi < 40
    strategy.entry("Long", strategy.long)

if myRsi > 75
    strategy.exit("Take Profit", "Long")

alertcondition(emaCross, "EMA Crossover Alert")`,
  },
];
