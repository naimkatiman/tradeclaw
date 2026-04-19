import { query, queryOne, execute } from './db-pool';

export interface TelegramSubscriber {
  chatId: string;
  username?: string;
  firstName?: string;
  /** Trading pair symbols like ['XAUUSD'] or the string 'all' for everything */
  subscribedPairs: string[] | 'all';
  minConfidence: number; // 0-100
  createdAt: string; // ISO 8601
}

interface SubscriberRow {
  chat_id: string;
  username: string | null;
  first_name: string | null;
  subscribed_pairs: unknown;
  min_confidence: number;
  created_at: string;
}

function toSubscriber(row: SubscriberRow): TelegramSubscriber {
  const pairs = row.subscribed_pairs === 'all'
    ? ('all' as const)
    : Array.isArray(row.subscribed_pairs)
      ? row.subscribed_pairs.filter((p): p is string => typeof p === 'string')
      : ('all' as const);
  return {
    chatId: row.chat_id,
    username: row.username ?? undefined,
    firstName: row.first_name ?? undefined,
    subscribedPairs: pairs,
    minConfidence: row.min_confidence,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

const SELECT_COLS = `chat_id, username, first_name, subscribed_pairs,
                     min_confidence, created_at`;

export async function readSubscribers(): Promise<TelegramSubscriber[]> {
  try {
    const rows = await query<SubscriberRow>(
      `SELECT ${SELECT_COLS} FROM telegram_subscribers ORDER BY created_at DESC`,
    );
    return rows.map(toSubscriber);
  } catch {
    // Fail-closed: unreachable DB returns empty list rather than crashing
    // the broadcast path. Callers see 0 subscribers; no rows leak either way.
    return [];
  }
}

export async function getSubscriber(chatId: string): Promise<TelegramSubscriber | null> {
  const row = await queryOne<SubscriberRow>(
    `SELECT ${SELECT_COLS} FROM telegram_subscribers WHERE chat_id = $1`,
    [chatId],
  );
  return row ? toSubscriber(row) : null;
}

export async function addSubscriber(
  chatId: string,
  opts?: { username?: string; firstName?: string },
): Promise<TelegramSubscriber> {
  // UPSERT: new chat → insert, existing chat → reset prefs to defaults.
  const row = await queryOne<SubscriberRow>(
    `INSERT INTO telegram_subscribers
       (chat_id, username, first_name, subscribed_pairs, min_confidence)
     VALUES ($1, $2, $3, '"all"'::jsonb, 70)
     ON CONFLICT (chat_id) DO UPDATE SET
       username          = EXCLUDED.username,
       first_name        = EXCLUDED.first_name,
       subscribed_pairs  = '"all"'::jsonb,
       min_confidence    = 70,
       updated_at        = NOW()
     RETURNING ${SELECT_COLS}`,
    [chatId, opts?.username ?? null, opts?.firstName ?? null],
  );
  if (!row) throw new Error('addSubscriber: upsert returned no row');
  return toSubscriber(row);
}

export async function removeSubscriber(chatId: string): Promise<boolean> {
  const rows = await query<{ chat_id: string }>(
    `DELETE FROM telegram_subscribers WHERE chat_id = $1 RETURNING chat_id`,
    [chatId],
  );
  return rows.length > 0;
}

export async function updateSubscriberPairs(
  chatId: string,
  pairs: string[] | 'all',
): Promise<TelegramSubscriber | null> {
  const row = await queryOne<SubscriberRow>(
    `UPDATE telegram_subscribers
       SET subscribed_pairs = $2::jsonb, updated_at = NOW()
     WHERE chat_id = $1
     RETURNING ${SELECT_COLS}`,
    [chatId, JSON.stringify(pairs)],
  );
  return row ? toSubscriber(row) : null;
}

export async function updateSubscriberConfidence(
  chatId: string,
  minConfidence: number,
): Promise<TelegramSubscriber | null> {
  const clamped = Math.max(0, Math.min(100, minConfidence));
  const row = await queryOne<SubscriberRow>(
    `UPDATE telegram_subscribers
       SET min_confidence = $2, updated_at = NOW()
     WHERE chat_id = $1
     RETURNING ${SELECT_COLS}`,
    [chatId, clamped],
  );
  return row ? toSubscriber(row) : null;
}

/** Current subscriber count (for status endpoints). */
export async function countSubscribers(): Promise<number> {
  try {
    const row = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM telegram_subscribers`,
    );
    return row ? Number(row.count) : 0;
  } catch {
    return 0;
  }
}

// Silence unused-export warning when execute is tree-shaken out of tests.
void execute;
