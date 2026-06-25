import { evaluateRuleTree, type RuleGroupNode } from '../strategy-rules';

const baseTree: RuleGroupNode = {
  id: 'root',
  type: 'group',
  operator: 'AND',
  children: [
    { id: 'rsi', type: 'condition', metric: 'RSI', operator: '<', value: 30 },
    {
      id: 'sub',
      type: 'group',
      operator: 'OR',
      children: [
        { id: 'macd', type: 'condition', metric: 'MACD', operator: '>', value: 0 },
        { id: 'ema', type: 'condition', metric: 'EMA_SPREAD', operator: '>', value: 0.1 },
      ],
    },
  ],
};

describe('evaluateRuleTree', () => {
  it('matches nested groups and reports a short explanation', () => {
    const result = evaluateRuleTree(baseTree, {
      rsi: 26,
      macd: -0.2,
      emaSpread: 0.18,
      bollingerPosition: 0.7,
      stochastic: 63,
      priceChange: 1.1,
    });

    expect(result.matches).toBe(true);
    expect(result.explanation).toContain('AND passed');
    expect(result.explanation).toContain('OR matched');
  });

  it('fails fast when a required condition is not met', () => {
    const result = evaluateRuleTree(baseTree, {
      rsi: 43,
      macd: 0.4,
      emaSpread: 0.2,
      bollingerPosition: 0.5,
      stochastic: 51,
      priceChange: 0.3,
    });

    expect(result.matches).toBe(false);
    expect(result.explanation).toContain('RSI');
    expect(result.explanation).toContain('AND failed');
  });
});
