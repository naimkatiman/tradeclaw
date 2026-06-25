import { query, queryOne } from './db-pool';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WatchlistItem {
  symbol: string;
  bias: string;
  keyLevels: string;
}

export interface GamePlan {
  id: string;
  userId: string;
  date: string;
  watchlist: WatchlistItem[];
  notes: string | null;
  createdAt: string;
}

interface GamePlanRow {
  id: string;
  user_id: string;
  date: string;
  watchlist: string | WatchlistItem[];
  notes: string | null;
  created_at: string;
}

function toPlan(row: GamePlanRow): GamePlan {
  const wl = typeof row.watchlist === 'string'
    ? JSON.parse(row.watchlist)
    : row.watchlist;
  return {
    id: row.id,
    userId: row.user_id,
    date: typeof row.date === 'string' ? row.date.slice(0, 10) : String(row.date),
    watchlist: Array.isArray(wl) ? wl : [],
    notes: row.notes,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

const COLS = 'id, user_id, date, watchlist, notes, created_at';

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getTodayPlan(userId: string): Promise<GamePlan | null> {
  const row = await queryOne<GamePlanRow>(
    `SELECT ${COLS} FROM game_plans WHERE user_id = $1 AND date = CURRENT_DATE`,
    [userId],
  );
  return row ? toPlan(row) : null;
}

export async function getPlanByDate(userId: string, date: string): Promise<GamePlan | null> {
  const row = await queryOne<GamePlanRow>(
    `SELECT ${COLS} FROM game_plans WHERE user_id = $1 AND date = $2`,
    [userId, date],
  );
  return row ? toPlan(row) : null;
}

export async function upsertPlan(
  userId: string,
  input: { date: string; watchlist: WatchlistItem[]; notes?: string },
): Promise<GamePlan> {
  const row = await queryOne<GamePlanRow>(
    `INSERT INTO game_plans (user_id, date, watchlist, notes)
     VALUES ($1, $2, $3::jsonb, $4)
     ON CONFLICT (user_id, date)
     DO UPDATE SET watchlist = EXCLUDED.watchlist, notes = EXCLUDED.notes
     RETURNING ${COLS}`,
    [userId, input.date, JSON.stringify(input.watchlist), input.notes ?? null],
  );
  if (!row) throw new Error('upsertPlan: insert returned no row');
  return toPlan(row);
}

export async function listPlans(userId: string, limit = 7): Promise<GamePlan[]> {
  const rows = await query<GamePlanRow>(
    `SELECT ${COLS} FROM game_plans WHERE user_id = $1 ORDER BY date DESC LIMIT $2`,
    [userId, limit],
  );
  return rows.map(toPlan);
}

// ---------------------------------------------------------------------------
// Auto-generate briefing from recent signal_history
// ---------------------------------------------------------------------------

interface SignalRow {
  symbol: string;
  direction: string;
  maxConfidence: number;
  cnt: string;
}

export async function generateBriefing(userId: string): Promise<GamePlan> {
  const rows = await query<SignalRow>(
    `SELECT
       symbol,
       direction,
       MAX(confidence)::int AS "maxConfidence",
       COUNT(*)::text AS cnt
     FROM signal_history
     WHERE created_at > NOW() - INTERVAL '24 hours'
     GROUP BY symbol, direction
     ORDER BY COUNT(*) DESC, MAX(confidence) DESC, symbol ASC
     LIMIT 5`,
    [],
  );

  const watchlist: WatchlistItem[] = rows.map((r) => ({
    symbol: r.symbol,
    bias: r.direction === 'BUY' ? 'Bullish' : r.direction === 'SELL' ? 'Bearish' : 'Neutral',
    keyLevels: `${Number(r.cnt)} signals · top ${r.maxConfidence}% confidence`,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const focusPairs = watchlist.map((item) => item.symbol).filter(Boolean).join(', ');

  return upsertPlan(userId, {
    date: today,
    watchlist,
    notes: watchlist.length > 0
      ? [
        'Auto-generated pre-market briefing from the last 24h signal tape.',
        focusPairs ? `Focus pairs: ${focusPairs}.` : null,
        'Review key levels before the session opens.',
      ].filter(Boolean).join('\n')
      : 'Auto-generated pre-market briefing from the last 24h signal tape. No high-conviction signals found yet.',
  });
}
