import { query, queryOne } from './db-pool';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RuleCondition {
  indicator: string;
  operator: string;
  value: number;
}

export type RuleAction = 'ENTRY_LONG' | 'ENTRY_SHORT' | 'EXIT_LONG' | 'EXIT_SHORT';

export interface CustomRule {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  conditions: RuleCondition[];
  action: RuleAction;
  enabled: boolean;
  createdAt: string;
}

interface CustomRuleRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  conditions: string | RuleCondition[];
  action: string;
  enabled: boolean;
  created_at: string;
}

function toRule(row: CustomRuleRow): CustomRule {
  const conds = typeof row.conditions === 'string'
    ? JSON.parse(row.conditions)
    : row.conditions;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    conditions: Array.isArray(conds) ? conds : [],
    action: row.action as RuleAction,
    enabled: row.enabled,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

const COLS = 'id, user_id, name, description, conditions, action, enabled, created_at';

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createRule(
  userId: string,
  rule: { name: string; description?: string; conditions: RuleCondition[]; action: RuleAction },
): Promise<CustomRule> {
  const row = await queryOne<CustomRuleRow>(
    `INSERT INTO custom_rules (user_id, name, description, conditions, action)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     RETURNING ${COLS}`,
    [userId, rule.name, rule.description ?? null, JSON.stringify(rule.conditions), rule.action],
  );
  if (!row) throw new Error('createRule: insert returned no row');
  return toRule(row);
}

export async function listRules(userId: string): Promise<CustomRule[]> {
  const rows = await query<CustomRuleRow>(
    `SELECT ${COLS} FROM custom_rules WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map(toRule);
}

export async function toggleRule(
  id: string,
  userId: string,
  enabled: boolean,
): Promise<CustomRule | null> {
  const row = await queryOne<CustomRuleRow>(
    `UPDATE custom_rules SET enabled = $3 WHERE id = $1 AND user_id = $2 RETURNING ${COLS}`,
    [id, userId, enabled],
  );
  return row ? toRule(row) : null;
}

export async function deleteRule(id: string, userId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM custom_rules WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId],
  );
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Evaluate
// ---------------------------------------------------------------------------

export interface MarketData {
  price: number;
  rsi?: number;
  macd?: number;
  ema?: number;
}

function compare(actual: number, operator: string, target: number): boolean {
  switch (operator) {
    case '>': return actual > target;
    case '<': return actual < target;
    case '>=': return actual >= target;
    case '<=': return actual <= target;
    case '==': return actual === target;
    default: return false;
  }
}

function indicatorValue(indicator: string, data: MarketData): number | null {
  switch (indicator.toLowerCase()) {
    case 'price': return data.price;
    case 'rsi': return data.rsi ?? null;
    case 'macd': return data.macd ?? null;
    case 'ema': return data.ema ?? null;
    default: return null;
  }
}

export function evaluateRule(rule: CustomRule, data: MarketData): boolean {
  return rule.conditions.every((c) => {
    const val = indicatorValue(c.indicator, data);
    if (val === null) return false;
    return compare(val, c.operator, c.value);
  });
}
