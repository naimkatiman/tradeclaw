import { query, queryOne, execute } from './db-pool';

export interface SocialPost {
  id: string;
  kind: 'signal' | 'daily_summary' | 'weekly_summary';
  signalId: string | null;
  payload: Record<string, unknown>;
  imageUrl: string | null;
  copy: string;
  status: 'pending' | 'approved' | 'posted' | 'rejected';
  postUrl: string | null;
  createdAt: string;
  approvedAt: string | null;
  postedAt: string | null;
}

interface Row {
  id: string; kind: string; signal_id: string | null;
  payload: Record<string, unknown>; image_url: string | null;
  copy: string; status: string; post_url: string | null;
  created_at: string; approved_at: string | null; posted_at: string | null;
}

function toPost(r: Row): SocialPost {
  return {
    id: r.id, kind: r.kind as SocialPost['kind'], signalId: r.signal_id,
    payload: r.payload, imageUrl: r.image_url, copy: r.copy,
    status: r.status as SocialPost['status'], postUrl: r.post_url,
    createdAt: r.created_at, approvedAt: r.approved_at, postedAt: r.posted_at,
  };
}

export async function enqueueSignalPost(
  signalId: string, copy: string, imageUrl: string, payload: Record<string, unknown> = {},
): Promise<SocialPost> {
  const rows = await query<Row>(
    `INSERT INTO social_post_queue (kind, signal_id, copy, image_url, payload)
     VALUES ('signal', $1, $2, $3, $4) RETURNING *`,
    [signalId, copy, imageUrl, JSON.stringify(payload)],
  );
  return toPost(rows[0]);
}

export async function enqueueSummaryPost(
  kind: 'daily_summary' | 'weekly_summary', copy: string, imageUrl: string, payload: Record<string, unknown> = {},
): Promise<SocialPost> {
  const rows = await query<Row>(
    `INSERT INTO social_post_queue (kind, copy, image_url, payload, status)
     VALUES ($1, $2, $3, $4, 'approved') RETURNING *`,
    [kind, copy, imageUrl, JSON.stringify(payload)],
  );
  return toPost(rows[0]);
}

export async function listQueue(
  status?: SocialPost['status'], limit = 50,
): Promise<SocialPost[]> {
  const rows = status
    ? await query<Row>(
        `SELECT * FROM social_post_queue WHERE status = $1 ORDER BY created_at DESC LIMIT $2`,
        [status, limit],
      )
    : await query<Row>(
        `SELECT * FROM social_post_queue WHERE status IN ('pending', 'approved') ORDER BY created_at DESC LIMIT $1`,
        [limit],
      );
  return rows.map(toPost);
}

export async function approvePost(id: string): Promise<void> {
  await execute(
    `UPDATE social_post_queue SET status = 'approved', approved_at = NOW() WHERE id = $1 AND status = 'pending'`,
    [id],
  );
}

export async function rejectPost(id: string): Promise<void> {
  await execute(
    `UPDATE social_post_queue SET status = 'rejected' WHERE id = $1 AND status = 'pending'`,
    [id],
  );
}

export async function fetchNextApproved(): Promise<SocialPost | null> {
  const row = await queryOne<Row>(
    `SELECT * FROM social_post_queue WHERE status = 'approved' ORDER BY created_at ASC LIMIT 1`,
  );
  return row ? toPost(row) : null;
}

export async function markPosted(id: string, postUrl: string): Promise<void> {
  await execute(
    `UPDATE social_post_queue SET status = 'posted', posted_at = NOW(), post_url = $2 WHERE id = $1`,
    [id, postUrl],
  );
}

export async function updateCopy(id: string, copy: string): Promise<void> {
  await execute(
    `UPDATE social_post_queue SET copy = $2 WHERE id = $1 AND status = 'pending'`,
    [id, copy],
  );
}
