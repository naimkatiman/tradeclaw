import { query, queryOne, withClient } from '../db-pool';
import type {
  AgentAnalysis,
  FinalVerdict,
  ResearchJobStatus,
  ResearchReport,
  ResearchRequest,
} from './types';

interface JobRow {
  id: string;
  symbol: string;
  timeframe: string;
  requested_by: string;
  status: string;
  analyses: unknown[];
  final_verdict: unknown | null;
  created_at: string;
  completed_at: string | null;
  error: string | null;
}

interface ClaimedJobRow extends JobRow {
  attempt_count: number;
  lease_token: string;
  leased_at: string | null;
  lease_expires_at: string | null;
  next_attempt_at: string | null;
}

export interface ClaimedResearchJob {
  job: ResearchReport;
  attemptCount: number;
  leaseToken: string;
}

const RESEARCH_QUEUE_LOCK_KEY = 448177;
const RESEARCH_JOB_LEASE_MINUTES = 15;
export const MAX_RESEARCH_JOB_ATTEMPTS = 4;
const RETRY_BACKOFF_MINUTES = [1, 5, 15];

function rowToReport(row: JobRow): ResearchReport {
  return {
    id: row.id,
    request: {
      symbol: row.symbol,
      timeframe: row.timeframe,
      requestedBy: row.requested_by,
    },
    status: row.status as ResearchJobStatus,
    analyses: row.analyses as AgentAnalysis[],
    finalVerdict: row.final_verdict as FinalVerdict | undefined,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  };
}

function rowToClaimedJob(row: ClaimedJobRow): ClaimedResearchJob {
  return {
    job: rowToReport(row),
    attemptCount: row.attempt_count,
    leaseToken: row.lease_token,
  };
}

function getRetryBackoffMinutes(attemptCount: number): number {
  const index = Math.max(0, Math.min(RETRY_BACKOFF_MINUTES.length - 1, attemptCount - 1));
  return RETRY_BACKOFF_MINUTES[index];
}

export async function createResearchJob(req: ResearchRequest): Promise<ResearchReport> {
  const rows = await query<JobRow>(
    `INSERT INTO research_jobs (symbol, timeframe, requested_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [req.symbol, req.timeframe, req.requestedBy],
  );
  return rowToReport(rows[0]);
}

export async function getResearchJob(id: string): Promise<ResearchReport | null> {
  const row = await queryOne<JobRow>(
    `SELECT * FROM research_jobs WHERE id = $1`,
    [id],
  );
  return row ? rowToReport(row) : null;
}

export async function listResearchJobs(
  userId: string,
  limit = 20,
): Promise<ResearchReport[]> {
  const rows = await query<JobRow>(
    `SELECT * FROM research_jobs
     WHERE requested_by = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return rows.map(rowToReport);
}

export async function listQueuedResearchJobs(
  limit = 10,
): Promise<ResearchReport[]> {
  const rows = await query<JobRow>(
    `SELECT * FROM research_jobs
     WHERE status = 'queued'
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit],
  );
  return rows.map(rowToReport);
}

export async function claimQueuedResearchJobs(
  limit = 3,
): Promise<ClaimedResearchJob[]> {
  const rows = await query<ClaimedJobRow>(
    `WITH candidate AS (
       SELECT id
       FROM research_jobs
       WHERE status = 'queued'
         AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
         AND (lease_expires_at IS NULL OR lease_expires_at <= NOW())
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     UPDATE research_jobs job
     SET attempt_count = COALESCE(job.attempt_count, 0) + 1,
         leased_at = NOW(),
         lease_expires_at = NOW() + INTERVAL '${RESEARCH_JOB_LEASE_MINUTES} minutes',
         lease_token = gen_random_uuid()::text,
         last_error = NULL,
         error = NULL
     FROM candidate
     WHERE job.id = candidate.id
     RETURNING job.*`,
    [limit],
  );

  return rows.map(rowToClaimedJob);
}

export async function markResearchJobRetry(
  id: string,
  message: string,
  leaseToken: string,
  attemptCount: number,
): Promise<void> {
  const backoffMinutes = getRetryBackoffMinutes(attemptCount);

  const rows = await query<{ id: string }>(
    `UPDATE research_jobs
     SET status = 'queued',
         leased_at = NULL,
         lease_expires_at = NULL,
         lease_token = NULL,
         next_attempt_at = NOW() + ($3 * INTERVAL '1 minute'),
         last_error = $2,
         error = $2
     WHERE id = $1
       AND lease_token = $4
       AND attempt_count < $5
     RETURNING id`,
    [id, message, backoffMinutes, leaseToken, MAX_RESEARCH_JOB_ATTEMPTS],
  );

  if (rows.length === 0) {
    throw new Error(`Research job ${id} could not be re-queued because its lease expired`);
  }
}

export async function markResearchJobFailed(
  id: string,
  message: string,
  leaseToken: string,
): Promise<void> {
  const rows = await query<{ id: string }>(
    `UPDATE research_jobs
     SET status = 'failed',
         leased_at = NULL,
         lease_expires_at = NULL,
         lease_token = NULL,
         completed_at = NOW(),
        next_attempt_at = NULL,
         last_error = $2,
         error = $2
     WHERE id = $1
       AND lease_token = $3
     RETURNING id`,
    [id, message, leaseToken],
  );

  if (rows.length === 0) {
    throw new Error(`Research job ${id} could not be marked failed because its lease expired`);
  }
}

export async function drainQueuedResearchJobs(
  limit = 3,
): Promise<{
  processed: ResearchReport[];
  failed: { id: string; error: string }[];
  skipped: boolean;
}> {
  const processed: ResearchReport[] = [];
  const failed: { id: string; error: string }[] = [];
  let skipped = false;

  await withClient(async (client) => {
    const lock = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [RESEARCH_QUEUE_LOCK_KEY],
    );

    if (!lock.rows[0]?.locked) {
      skipped = true;
      return;
    }

    try {
      const rows = await claimQueuedResearchJobs(limit);
      const { runResearchPipeline } = await import('./mock-pipeline');

      for (const claim of rows) {
        try {
          await runResearchPipeline(
            claim.job.id,
            claim.job.request.symbol,
            claim.job.request.timeframe,
            {
              leaseToken: claim.leaseToken,
              attemptCount: claim.attemptCount,
            },
          );
          const finished = await getResearchJob(claim.job.id);
          processed.push(finished ?? claim.job);
        } catch (error) {
          failed.push({
            id: claim.job.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [RESEARCH_QUEUE_LOCK_KEY]).catch(() => {});
    }
  });

  return { processed, failed, skipped };
}

export async function updateJobStatus(
  id: string,
  status: ResearchJobStatus,
  analyses?: AgentAnalysis[],
  verdict?: FinalVerdict,
  leaseToken?: string,
): Promise<void> {
  const sets: string[] = ['status = $2'];
  const params: unknown[] = [id, status];
  let idx = 3;

  if (analyses !== undefined) {
    sets.push(`analyses = $${idx}`);
    params.push(JSON.stringify(analyses));
    idx++;
  }

  if (verdict !== undefined) {
    sets.push(`final_verdict = $${idx}`);
    params.push(JSON.stringify(verdict));
    idx++;
  }

  if (status === 'complete' || status === 'failed') {
    sets.push('completed_at = NOW()');
    sets.push('leased_at = NULL');
    sets.push('lease_expires_at = NULL');
    sets.push('lease_token = NULL');
    sets.push('next_attempt_at = NULL');
  }

  const leasePredicate = leaseToken ? ` AND lease_token = $${idx}` : '';
  if (leaseToken) {
    params.push(leaseToken);
  }

  const rows = await query<{ id: string }>(
    `UPDATE research_jobs SET ${sets.join(', ')} WHERE id = $1${leasePredicate} RETURNING id`,
    params,
  );

  if (rows.length === 0) {
    throw new Error(`Research job ${id} could not be updated because its lease expired`);
  }
}
