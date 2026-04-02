/**
 * EarningsEdge — Railway PostgreSQL client
 * Replaces Supabase with direct pg connection
 */
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.EE_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('EE_DATABASE_URL or DATABASE_URL environment variable not set');
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('railway.app')
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params?: unknown[]): Promise<void> {
  await query(sql, params);
}

export type UserTier = 'free' | 'basic' | 'pro';

export interface EarningsEdgeUser {
  id: string;
  email: string;
  tier: UserTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  analyses_count: number;
  created_at: string;
  updated_at: string;
}

export interface AnalysisRecord {
  id: string;
  user_id: string | null;
  symbol: string;
  company_name: string;
  transcript_hash: string;
  analysis_json: Record<string, unknown>;
  created_at: string;
}

export async function getUserByEmail(email: string): Promise<EarningsEdgeUser | null> {
  return queryOne<EarningsEdgeUser>(
    'SELECT * FROM ee_users WHERE email = $1',
    [email],
  );
}

export async function upsertUser(
  user: Partial<EarningsEdgeUser> & { email: string },
): Promise<EarningsEdgeUser | null> {
  const { email, tier, stripe_customer_id, stripe_subscription_id } = user;
  return queryOne<EarningsEdgeUser>(
    `INSERT INTO ee_users (email, tier, stripe_customer_id, stripe_subscription_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET
       tier = COALESCE(EXCLUDED.tier, ee_users.tier),
       stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, ee_users.stripe_customer_id),
       stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, ee_users.stripe_subscription_id),
       updated_at = now()
     RETURNING *`,
    [email, tier ?? 'free', stripe_customer_id ?? null, stripe_subscription_id ?? null],
  );
}

export async function saveAnalysis(
  record: Omit<AnalysisRecord, 'id' | 'created_at'>,
): Promise<void> {
  await execute(
    `INSERT INTO ee_analyses (user_id, symbol, company_name, transcript_hash, analysis_json)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      record.user_id ?? null,
      record.symbol,
      record.company_name,
      record.transcript_hash,
      JSON.stringify(record.analysis_json),
    ],
  );
}

export async function getUserAnalyses(userId: string): Promise<AnalysisRecord[]> {
  return query<AnalysisRecord>(
    `SELECT * FROM ee_analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId],
  );
}

export async function incrementAnalysisCount(userId: string): Promise<void> {
  await execute(
    `UPDATE ee_users SET analyses_count = analyses_count + 1, updated_at = now() WHERE id = $1`,
    [userId],
  );
}

export async function getUserByStripeCustomer(
  stripeCustomerId: string,
): Promise<EarningsEdgeUser | null> {
  return queryOne<EarningsEdgeUser>(
    'SELECT * FROM ee_users WHERE stripe_customer_id = $1',
    [stripeCustomerId],
  );
}

export async function updateUserTier(
  email: string,
  tier: UserTier,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string,
): Promise<void> {
  await execute(
    `UPDATE ee_users
     SET tier = $2,
         stripe_customer_id = COALESCE($3, stripe_customer_id),
         stripe_subscription_id = COALESCE($4, stripe_subscription_id),
         updated_at = now()
     WHERE email = $1`,
    [email, tier, stripeCustomerId ?? null, stripeSubscriptionId ?? null],
  );
}
