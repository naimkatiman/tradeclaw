import 'server-only';
import { query } from './db-pool';
import type { TradingSignal } from '@tradeclaw/signals';

// Inlined to break the dependency on ./licenses during the license→tier
// migration (see docs/plans/2026-05-01-monetization-consolidation.md, Phase B).
// Phase D removes ./licenses entirely; the value never changes.
const FREE_STRATEGY = 'classic';

/**
 * Structural shape of any caller carrying a strategy access set. Accepts
 * `LicenseContext` (legacy), `AccessContext` (canonical), or any literal
 * `{ unlockedStrategies: Set<string> }` constructed by tests / server pages.
 * Avoids importing concrete types from licenses.ts or tier.ts so this module
 * survives the license-system removal in Phase D.
 */
interface StrategyAccess {
  unlockedStrategies: Set<string> | ReadonlySet<string>;
}

interface Row {
  id: string;
  strategy_id: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: string;
  entry: string;
  stop_loss: string | null;
  take_profit_1: string | null;
  signal_ts: string;
}

export interface GetPremiumParams {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  limit?: number;
}

export async function getPremiumSignalsFor(
  access: StrategyAccess,
  params: GetPremiumParams = {},
): Promise<TradingSignal[]> {
  const unlocked = [...access.unlockedStrategies].filter((s) => s !== FREE_STRATEGY);
  if (unlocked.length === 0) return [];

  const conds: string[] = ['strategy_id = ANY($1)'];
  const args: unknown[] = [unlocked];
  if (params.symbol) {
    args.push(params.symbol.toUpperCase());
    conds.push(`symbol = $${args.length}`);
  }
  if (params.timeframe) {
    args.push(params.timeframe.toUpperCase());
    conds.push(`timeframe = $${args.length}`);
  }
  if (params.direction) {
    args.push(params.direction.toUpperCase());
    conds.push(`direction = $${args.length}`);
  }
  const limit = Math.min(params.limit ?? 50, 200);

  const rows = await query<Row>(
    `SELECT id, strategy_id, symbol, timeframe, direction, confidence,
            entry, stop_loss, take_profit_1, signal_ts
     FROM premium_signals
     WHERE ${conds.join(' AND ')}
     ORDER BY signal_ts DESC
     LIMIT ${limit}`,
    args,
  );

  return rows.map(rowToSignal);
}

export async function listPremiumSignalsSince(
  access: StrategyAccess,
  sinceMs: number,
  limit = 50,
): Promise<TradingSignal[]> {
  const unlocked = [...access.unlockedStrategies].filter((s) => s !== FREE_STRATEGY);
  if (unlocked.length === 0) return [];
  const rows = await query<Row>(
    `SELECT id, strategy_id, symbol, timeframe, direction, confidence,
            entry, stop_loss, take_profit_1, signal_ts
     FROM premium_signals
     WHERE strategy_id = ANY($1) AND signal_ts > to_timestamp($2 / 1000.0)
     ORDER BY signal_ts DESC
     LIMIT $3`,
    [unlocked, sinceMs, Math.min(limit, 200)],
  );
  return rows.map(rowToSignal);
}

function rowToSignal(r: Row): TradingSignal {
  return {
    id: r.id,
    strategyId: r.strategy_id,
    symbol: r.symbol,
    timeframe: r.timeframe,
    direction: r.direction,
    confidence: parseFloat(r.confidence),
    entry: parseFloat(r.entry),
    stopLoss: r.stop_loss ? parseFloat(r.stop_loss) : 0,
    takeProfit1: r.take_profit_1 ? parseFloat(r.take_profit_1) : 0,
    timestamp: new Date(r.signal_ts).getTime(),
    source: 'real',
    dataQuality: 'real',
  } as unknown as TradingSignal;
}
