import 'server-only';

import { query, queryOne } from './db-pool';

/**
 * Typed CRUD helpers over the `operator_memory` table (migration 032).
 *
 * Each entry is one (user_id, key) slot holding an arbitrary JSON document.
 * Callers own the shape — this module deliberately keeps `value` as
 * `unknown` so different memory namespaces (watchlists, notes, prefs) can
 * share the same table without a shared schema.
 */

export interface OperatorMemoryEntry {
  userId: string;
  key: string;
  value: unknown;
  updatedAt: Date;
}

interface OperatorMemoryRow {
  user_id: string;
  key: string;
  value: unknown;
  updated_at: string;
}

const COLUMNS = `user_id, key, value, updated_at`;

function toEntry(row: OperatorMemoryRow): OperatorMemoryEntry {
  return {
    userId: row.user_id,
    key: row.key,
    value: row.value,
    updatedAt: new Date(row.updated_at),
  };
}

export async function listOperatorMemory(userId: string): Promise<OperatorMemoryEntry[]> {
  const rows = await query<OperatorMemoryRow>(
    `SELECT ${COLUMNS}
       FROM operator_memory
      WHERE user_id = $1
   ORDER BY updated_at DESC`,
    [userId],
  );
  return rows.map(toEntry);
}

export async function getOperatorMemory(
  userId: string,
  key: string,
): Promise<OperatorMemoryEntry | null> {
  const row = await queryOne<OperatorMemoryRow>(
    `SELECT ${COLUMNS}
       FROM operator_memory
      WHERE user_id = $1 AND key = $2`,
    [userId, key],
  );
  return row ? toEntry(row) : null;
}

export async function putOperatorMemory(
  userId: string,
  key: string,
  value: unknown,
): Promise<OperatorMemoryEntry> {
  const row = await queryOne<OperatorMemoryRow>(
    `INSERT INTO operator_memory (user_id, key, value)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (user_id, key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_at = NOW()
     RETURNING ${COLUMNS}`,
    [userId, key, JSON.stringify(value)],
  );
  if (!row) throw new Error('putOperatorMemory: upsert returned no row');
  return toEntry(row);
}

export async function deleteOperatorMemory(
  userId: string,
  key: string,
): Promise<boolean> {
  const rows = await query<{ user_id: string }>(
    `DELETE FROM operator_memory
      WHERE user_id = $1 AND key = $2
   RETURNING user_id`,
    [userId, key],
  );
  return rows.length > 0;
}
