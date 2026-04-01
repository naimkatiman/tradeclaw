import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_EARNINGSEDGE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_EARNINGSEDGE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.EARNINGSEDGE_SUPABASE_SERVICE_KEY || '';

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin credentials not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
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
}

export interface AnalysisRecord {
  id: string;
  user_id: string | null;
  symbol: string;
  company_name: string;
  transcript_hash: string;
  analysis_json: string;
  created_at: string;
}

export async function getUserByEmail(email: string): Promise<EarningsEdgeUser | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ee_users')
    .select('*')
    .eq('email', email)
    .single();
  if (error || !data) return null;
  return data as EarningsEdgeUser;
}

export async function upsertUser(user: Partial<EarningsEdgeUser>): Promise<EarningsEdgeUser | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ee_users')
    .upsert(user, { onConflict: 'email' })
    .select()
    .single();
  if (error || !data) return null;
  return data as EarningsEdgeUser;
}

export async function saveAnalysis(record: Omit<AnalysisRecord, 'id' | 'created_at'>): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from('ee_analyses').insert(record);
}

export async function getUserAnalyses(userId: string): Promise<AnalysisRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('ee_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data as AnalysisRecord[]) || [];
}

export async function incrementAnalysisCount(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.rpc('increment_ee_analysis_count', { user_id_arg: userId });
}
