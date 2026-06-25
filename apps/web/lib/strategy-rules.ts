export type RuleGroupOperator = 'AND' | 'OR';
export type RuleMetric = 'RSI' | 'MACD' | 'EMA_SPREAD' | 'BOLLINGER_POSITION' | 'STOCHASTIC' | 'PRICE_CHANGE';
export type ComparisonOperator = '>' | '>=' | '<' | '<=' | '=' | '!=';

export interface RuleConditionNode {
  id: string;
  type: 'condition';
  metric: RuleMetric;
  operator: ComparisonOperator;
  value: number;
}

export interface RuleGroupNode {
  id: string;
  type: 'group';
  operator: RuleGroupOperator;
  children: RuleNode[];
}

export type RuleNode = RuleConditionNode | RuleGroupNode;

export interface IndicatorSnapshot {
  rsi: number;
  macd: number;
  emaSpread: number;
  bollingerPosition: number;
  stochastic: number;
  priceChange: number;
}

export interface RuleEvaluationResult {
  matches: boolean;
  explanation: string;
}

const METRIC_LABELS: Record<RuleMetric, string> = {
  RSI: 'RSI',
  MACD: 'MACD',
  EMA_SPREAD: 'EMA spread',
  BOLLINGER_POSITION: 'Bollinger position',
  STOCHASTIC: 'Stochastic',
  PRICE_CHANGE: 'Price change',
};

const SNAPSHOT_LOOKUP: Record<RuleMetric, keyof IndicatorSnapshot> = {
  RSI: 'rsi',
  MACD: 'macd',
  EMA_SPREAD: 'emaSpread',
  BOLLINGER_POSITION: 'bollingerPosition',
  STOCHASTIC: 'stochastic',
  PRICE_CHANGE: 'priceChange',
};

const COMPARISON_TEXT: Record<ComparisonOperator, string> = {
  '>': '>',
  '>=': '≥',
  '<': '<',
  '<=': '≤',
  '=': '=',
  '!=': '≠',
};

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'NaN';
  const rounded = Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(2);
  return rounded.replace(/\.00$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function compare(actual: number, operator: ComparisonOperator, expected: number): boolean {
  switch (operator) {
    case '>': return actual > expected;
    case '>=': return actual >= expected;
    case '<': return actual < expected;
    case '<=': return actual <= expected;
    case '=': return actual === expected;
    case '!=': return actual !== expected;
  }
}

function evaluateCondition(node: RuleConditionNode, snapshot: IndicatorSnapshot): RuleEvaluationResult {
  const actual = snapshot[SNAPSHOT_LOOKUP[node.metric]];
  const matches = compare(actual, node.operator, node.value);
  return {
    matches,
    explanation: `${METRIC_LABELS[node.metric]} ${COMPARISON_TEXT[node.operator]} ${formatNumber(node.value)} (${formatNumber(actual)}) ${matches ? '✓' : '✗'}`,
  };
}

function evaluateGroup(node: RuleGroupNode, snapshot: IndicatorSnapshot): RuleEvaluationResult {
  if (node.children.length === 0) {
    return { matches: false, explanation: `${node.operator} group is empty` };
  }

  const childResults = node.children.map((child) => evaluateRuleNode(child, snapshot));

  if (node.operator === 'AND') {
    const failed = childResults.find((result) => !result.matches);
    return failed
      ? { matches: false, explanation: `AND failed: ${failed.explanation}` }
      : { matches: true, explanation: `AND passed: ${childResults.map((result) => result.explanation).join(' · ')}` };
  }

  const passed = childResults.find((result) => result.matches);
  return passed
    ? { matches: true, explanation: `OR matched: ${passed.explanation}` }
    : { matches: false, explanation: `OR failed: ${childResults.map((result) => result.explanation).join(' · ')}` };
}

function evaluateRuleNode(node: RuleNode, snapshot: IndicatorSnapshot): RuleEvaluationResult {
  return node.type === 'condition' ? evaluateCondition(node, snapshot) : evaluateGroup(node, snapshot);
}

export function evaluateRuleTree(tree: RuleNode, snapshot: IndicatorSnapshot): RuleEvaluationResult {
  return evaluateRuleNode(tree, snapshot);
}

export function describeRuleTree(tree: RuleNode): string {
  return tree.type === 'condition'
    ? `${METRIC_LABELS[tree.metric]} ${COMPARISON_TEXT[tree.operator]} ${formatNumber(tree.value)}`
    : `(${tree.children.map((child) => describeRuleTree(child)).join(` ${tree.operator} `)})`;
}
