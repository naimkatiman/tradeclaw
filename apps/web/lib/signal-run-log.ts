/**
 * signal_run_log — per-cron-run audit row.
 *
 * Replaces the GitHub Actions json-commit job that snapshotted signal_history
 * on every run (4× daily, polluting main and slowing CI diffs). The
 * "each commit proves signals existed before outcomes were known" claim is
 * preserved by writing one immutable row per cron run with a SHA-256 over the
 * canonicalised signal_history snapshot. Anyone holding a prior row can
 * re-hash the rows that existed at run_started_at and detect tampering.
 *
 * Migration: apps/web/migrations/026_signal_run_log.sql
 *
 * Defensive shape — if the table does not yet exist (migration unapplied) the
 * helper logs once and resolves; the caller (cron route) MUST not fail because
 * the audit insert failed.
 */
import { createHash } from 'node:crypto';
import { execute, query } from './db-pool';

interface HistoryRowForHash {
  id: string;
  created_at: string;
  outcome_4h: unknown;
  outcome_24h: unknown;
}

interface RunCounts {
  total: number;
  verified: number;
  wins: number;
  losses: number;
  pending: number;
}

function canonicaliseValue(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(canonicaliseValue);
  const obj = v as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = canonicaliseValue(obj[key]);
  }
  return sorted;
}

function computeHashAndCounts(rows: HistoryRowForHash[]): { hash: string; counts: RunCounts } {
  const counts: RunCounts = { total: rows.length, verified: 0, wins: 0, losses: 0, pending: 0 };
  for (const r of rows) {
    const o4h = r.outcome_4h as { hit?: boolean } | null;
    const o24h = r.outcome_24h as { hit?: boolean } | null;
    if (o4h === null && o24h === null) {
      counts.pending += 1;
      continue;
    }
    counts.verified += 1;
    if (o24h?.hit === true || o4h?.hit === true) {
      counts.wins += 1;
    } else {
      counts.losses += 1;
    }
  }
  const canonical = JSON.stringify(canonicaliseValue(rows));
  const hash = createHash('sha256').update(canonical).digest('hex');
  return { hash, counts };
}

interface RecordRunArgs {
  /** ISO timestamp of when the cron run began. */
  runStartedAt: Date;
  /** Where this run was triggered from. */
  triggerSource?: string;
  /** Optional notes (max 1024 chars at the SQL layer). */
  notes?: string;
}

let warnedMissingTable = false;

/**
 * Snapshot signal_history at the moment of call, compute counts + SHA-256, and
 * insert one row into signal_run_log. Resolves to the inserted row id, or null
 * if the audit insert was skipped (e.g. table missing pre-migration).
 *
 * Errors are logged but never thrown — the caller is the cron, and a failed
 * audit must not break signal recording.
 */
export async function recordSignalRun(args: RecordRunArgs): Promise<bigint | null> {
  try {
    const rows = await query<HistoryRowForHash>(
      `SELECT id, created_at::text AS created_at, outcome_4h, outcome_24h
       FROM signal_history
       WHERE created_at <= $1
       ORDER BY id`,
      [args.runStartedAt.toISOString()],
    );
    const { hash, counts } = computeHashAndCounts(rows);

    const inserted = await query<{ id: string }>(
      `INSERT INTO signal_run_log (
         run_started_at, run_finished_at,
         total_signals, verified_signals, win_count, loss_count, pending_count,
         history_sha256, notes, trigger_source
       ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        args.runStartedAt.toISOString(),
        counts.total,
        counts.verified,
        counts.wins,
        counts.losses,
        counts.pending,
        hash,
        args.notes ?? null,
        args.triggerSource ?? 'unknown',
      ],
    );
    const idStr = inserted[0]?.id;
    return idStr != null ? BigInt(idStr) : null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('signal_run_log') && msg.includes('does not exist')) {
      if (!warnedMissingTable) {
        console.warn(
          '[signal-run-log] signal_run_log table not present — apply migration 026_signal_run_log.sql. Skipping audit row insert.',
        );
        warnedMissingTable = true;
      }
      return null;
    }
    console.error('[signal-run-log] failed to record run:', msg);
    return null;
  }
}

/** Test seam — reset the once-only "missing table" warning. */
export function _resetMissingTableWarning(): void {
  warnedMissingTable = false;
}

/** Exposed for tests — same logic as the recorder uses. */
export const _internal = { computeHashAndCounts, canonicaliseValue };
