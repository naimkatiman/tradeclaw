/**
 * Alert Rules DB — CRUD helpers for alert_rules and alert_channel_configs tables.
 * Uses the same db-pool pattern as signal-history.ts.
 */

import { query, queryOne, execute } from './db-pool';

// ── Types ─────────────────────────────────────────────────────

export interface AlertRule {
  id: string;
  user_id: string;
  name: string;
  symbol: string | null;
  timeframe: string | null;
  direction: 'BUY' | 'SELL' | null;
  min_confidence: number;
  channels: string[];
  enabled: boolean;
}

export interface ChannelConfig {
  id: string;
  user_id: string;
  channel: 'telegram' | 'discord' | 'email' | 'webhook';
  config: Record<string, string>;
  enabled: boolean;
}

interface SignalInput {
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
}

// ── Pure dispatch logic ────────────────────────────────────────

/** Pure function — no I/O. Exported for testing. */
export function signalMatchesRule(signal: SignalInput, rule: AlertRule): boolean {
  if (!rule.enabled) return false;
  if (rule.symbol && rule.symbol.toUpperCase() !== signal.symbol.toUpperCase()) return false;
  if (rule.timeframe && rule.timeframe !== signal.timeframe) return false;
  if (rule.direction && rule.direction !== signal.direction) return false;
  if (signal.confidence < rule.min_confidence) return false;
  return true;
}

// ── DB helpers ─────────────────────────────────────────────────

export async function getAlertRulesForUser(userId: string): Promise<AlertRule[]> {
  return query<AlertRule>(
    `SELECT id, user_id, name, symbol, timeframe, direction, min_confidence, channels, enabled
     FROM alert_rules
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
}

export async function getAllEnabledRules(): Promise<AlertRule[]> {
  return query<AlertRule>(
    `SELECT id, user_id, name, symbol, timeframe, direction, min_confidence, channels, enabled
     FROM alert_rules
     WHERE enabled = true
     ORDER BY created_at DESC`
  );
}

export async function getChannelConfigsForUser(userId: string): Promise<ChannelConfig[]> {
  return query<ChannelConfig>(
    `SELECT id, user_id, channel, config, enabled
     FROM alert_channel_configs
     WHERE user_id = $1`,
    [userId]
  );
}

export async function upsertChannelConfig(
  userId: string,
  channel: ChannelConfig['channel'],
  config: Record<string, string>,
  enabled: boolean
): Promise<ChannelConfig> {
  const row = await queryOne<ChannelConfig>(
    `INSERT INTO alert_channel_configs (user_id, channel, config, enabled)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, channel) DO UPDATE
       SET config = EXCLUDED.config,
           enabled = EXCLUDED.enabled,
           updated_at = now()
     RETURNING id, user_id, channel, config, enabled`,
    [userId, channel, JSON.stringify(config), enabled]
  );
  if (!row) throw new Error('upsertChannelConfig returned no row');
  return row;
}

export async function deleteChannelConfig(
  userId: string,
  channel: ChannelConfig['channel'],
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM alert_channel_configs
     WHERE user_id = $1 AND channel = $2
     RETURNING id`,
    [userId, channel],
  );
  return rows.length > 0;
}

export async function createAlertRule(
  userId: string,
  rule: Omit<AlertRule, 'id' | 'user_id'>
): Promise<AlertRule> {
  const row = await queryOne<AlertRule>(
    `INSERT INTO alert_rules (user_id, name, symbol, timeframe, direction, min_confidence, channels, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, user_id, name, symbol, timeframe, direction, min_confidence, channels, enabled`,
    [
      userId,
      rule.name,
      rule.symbol ?? null,
      rule.timeframe ?? null,
      rule.direction ?? null,
      rule.min_confidence,
      JSON.stringify(rule.channels),
      rule.enabled,
    ]
  );
  if (!row) throw new Error('createAlertRule returned no row');
  return row;
}

export async function updateAlertRule(
  id: string,
  userId: string,
  patch: Partial<Omit<AlertRule, 'id' | 'user_id'>>
): Promise<AlertRule | null> {
  // Build SET clause dynamically from provided patch keys
  const fields = Object.keys(patch) as Array<keyof typeof patch>;
  if (fields.length === 0) return getAlertRuleById(id, userId);

  const setClauses = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
  const values = fields.map((f) => {
    const v = patch[f];
    return Array.isArray(v) ? JSON.stringify(v) : (v ?? null);
  });

  return queryOne<AlertRule>(
    `UPDATE alert_rules
     SET ${setClauses}, updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, name, symbol, timeframe, direction, min_confidence, channels, enabled`,
    [id, userId, ...values]
  );
}

export async function deleteAlertRule(id: string, userId: string): Promise<void> {
  await execute(
    `DELETE FROM alert_rules WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

// Internal helper used by updateAlertRule when no patch keys are provided
async function getAlertRuleById(id: string, userId: string): Promise<AlertRule | null> {
  return queryOne<AlertRule>(
    `SELECT id, user_id, name, symbol, timeframe, direction, min_confidence, channels, enabled
     FROM alert_rules
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}
